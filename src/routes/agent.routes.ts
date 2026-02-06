import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { logAudit } from '../utils/audit';

const router = Router();

// List agent jobs (for agents)
router.get(
  '/jobs',
  authenticate,
  authorize('APPLICATION_AGENT', 'ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const { status, page = '1', limit = '20' } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where: any = {};
      if (req.user!.role === 'APPLICATION_AGENT') {
        where.OR = [{ agentId: req.user!.userId }, { agentId: null, status: 'PENDING' }];
      }
      if (status) where.status = status;

      const [jobs, total] = await Promise.all([
        prisma.agentJob.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            application: {
              include: {
                programme: { select: { name: true } },
                institution: { select: { name: true, portalUrl: true } },
              },
            },
            user: { select: { firstName: true, lastName: true, phone: true } },
          },
        }),
        prisma.agentJob.count({ where }),
      ]);

      res.json({ jobs, total, page: parseInt(page as string), pages: Math.ceil(total / take) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch agent jobs' });
    }
  }
);

// Claim a job
router.post(
  '/jobs/:id/claim',
  authenticate,
  authorize('APPLICATION_AGENT'),
  async (req: Request, res: Response) => {
    try {
      const job = await prisma.agentJob.findFirst({
        where: { id: req.params.id, status: 'PENDING', agentId: null },
      });
      if (!job) {
        res.status(404).json({ error: 'Job not available' });
        return;
      }

      const updated = await prisma.agentJob.update({
        where: { id: job.id },
        data: { agentId: req.user!.userId, status: 'ASSIGNED' },
      });

      await logAudit({
        userId: req.user!.userId,
        action: 'CLAIM_AGENT_JOB',
        entity: 'AgentJob',
        entityId: job.id,
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to claim job' });
    }
  }
);

// Update job status
router.patch(
  '/jobs/:id/status',
  authenticate,
  authorize('APPLICATION_AGENT', 'ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const { status, notes, evidenceUrls } = req.body;
      const validStatuses = ['IN_PROGRESS', 'AWAITING_OTP', 'SUBMITTED', 'COMPLETED', 'FAILED'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }

      const job = await prisma.agentJob.findFirst({
        where: { id: req.params.id, agentId: req.user!.userId },
      });
      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      const data: any = { status };
      if (notes) data.notes = notes;
      if (evidenceUrls) data.evidenceUrls = evidenceUrls;
      if (status === 'IN_PROGRESS') data.startedAt = new Date();
      if (status === 'COMPLETED' || status === 'FAILED') data.completedAt = new Date();

      const updated = await prisma.agentJob.update({
        where: { id: job.id },
        data,
      });

      // Update application status accordingly
      if (status === 'COMPLETED') {
        await prisma.application.update({
          where: { id: job.applicationId },
          data: { status: 'SUBMITTED', submittedAt: new Date() },
        });
        await prisma.applicationTimeline.create({
          data: {
            applicationId: job.applicationId,
            status: 'SUBMITTED',
            note: 'Submitted by agent',
            createdBy: req.user!.userId,
          },
        });
      }

      await logAudit({
        userId: req.user!.userId,
        action: 'UPDATE_AGENT_JOB',
        entity: 'AgentJob',
        entityId: job.id,
        details: { status, notes },
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update job' });
    }
  }
);

// User provides consent for agent application
router.post('/consent/:jobId', authenticate, async (req: Request, res: Response) => {
  try {
    const job = await prisma.agentJob.findFirst({
      where: { id: req.params.jobId, userId: req.user!.userId },
    });
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    await prisma.agentJob.update({
      where: { id: job.id },
      data: { consentGiven: true, consentAt: new Date() },
    });

    await prisma.consent.create({
      data: {
        userId: req.user!.userId,
        type: 'AGENT_APPLICATION',
        granted: true,
        details: `Consent for agent to apply on behalf for job ${job.id}`,
      },
    });

    res.json({ message: 'Consent granted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record consent' });
  }
});

export default router;
