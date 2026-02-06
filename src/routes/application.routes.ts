import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { logAudit } from '../utils/audit';
import { generatePaymentReference } from '../utils/payment';

const router = Router();

// List user's applications
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = { userId: req.user!.userId };
    if (status) where.status = status;

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          institution: { select: { id: true, name: true, type: true } },
          programme: { select: { id: true, name: true, qualificationLevel: true } },
          documents: { include: { document: true } },
          agentJob: true,
          payments: true,
          timeline: { orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.application.count({ where }),
    ]);

    res.json({ applications, total, page: parseInt(page as string), pages: Math.ceil(total / take) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get single application
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const application = await prisma.application.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      include: {
        institution: true,
        programme: { include: { intakes: true } },
        documents: { include: { document: true } },
        agentJob: true,
        payments: true,
        timeline: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }
    res.json(application);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// Create application (self-apply)
const createSchema = z.object({
  programmeId: z.string(),
  mode: z.enum(['SELF', 'AGENT']).default('SELF'),
});

router.post('/', authenticate, validate(createSchema), async (req: Request, res: Response) => {
  try {
    const { programmeId, mode } = req.body;

    const programme = await prisma.programme.findUnique({
      where: { id: programmeId },
      include: { institution: true, intakes: { where: { isOpen: true } } },
    });
    if (!programme) {
      res.status(404).json({ error: 'Programme not found' });
      return;
    }
    if (programme.intakes.length === 0) {
      res.status(400).json({ error: 'No open intakes for this programme' });
      return;
    }

    // Check for duplicate application
    const existing = await prisma.application.findFirst({
      where: {
        userId: req.user!.userId,
        programmeId,
        status: { notIn: ['WITHDRAWN', 'REJECTED'] },
      },
    });
    if (existing) {
      res.status(409).json({ error: 'You already have an active application for this programme' });
      return;
    }

    const application = await prisma.application.create({
      data: {
        userId: req.user!.userId,
        institutionId: programme.institutionId,
        programmeId,
        mode,
        status: 'DRAFT',
      },
      include: {
        institution: { select: { name: true } },
        programme: { select: { name: true, requiredDocuments: true } },
      },
    });

    // Create timeline entry
    await prisma.applicationTimeline.create({
      data: {
        applicationId: application.id,
        status: 'DRAFT',
        note: 'Application created',
        createdBy: req.user!.userId,
      },
    });

    // If agent mode, create agent job
    if (mode === 'AGENT') {
      const fee = programme.applicationFee ? programme.applicationFee + 10 : 15;
      await prisma.agentJob.create({
        data: {
          applicationId: application.id,
          userId: req.user!.userId,
          fee,
          status: 'PENDING',
          slaDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        },
      });
    }

    await logAudit({
      userId: req.user!.userId,
      action: 'CREATE_APPLICATION',
      entity: 'Application',
      entityId: application.id,
      details: { programmeId, mode },
    });

    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// Attach document to application
router.post('/:id/documents', authenticate, async (req: Request, res: Response) => {
  try {
    const { documentId } = req.body;
    const application = await prisma.application.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    const doc = await prisma.applicationDocument.create({
      data: { applicationId: application.id, documentId },
      include: { document: true },
    });

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ error: 'Failed to attach document' });
  }
});

// Submit application
router.post('/:id/submit', authenticate, async (req: Request, res: Response) => {
  try {
    const application = await prisma.application.findFirst({
      where: { id: req.params.id, userId: req.user!.userId, status: 'DRAFT' },
      include: {
        programme: { select: { requiredDocuments: true, applicationFee: true } },
        documents: true,
      },
    });
    if (!application) {
      res.status(404).json({ error: 'Application not found or already submitted' });
      return;
    }

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });

    await prisma.applicationTimeline.create({
      data: {
        applicationId: application.id,
        status: 'SUBMITTED',
        note: 'Application submitted',
        createdBy: req.user!.userId,
      },
    });

    // Create payment record if fee required
    if (application.programme.applicationFee) {
      await prisma.payment.create({
        data: {
          userId: req.user!.userId,
          applicationId: application.id,
          type: 'APPLICATION_FEE',
          amount: application.programme.applicationFee,
          reference: generatePaymentReference(),
        },
      });
    }

    await logAudit({
      userId: req.user!.userId,
      action: 'SUBMIT_APPLICATION',
      entity: 'Application',
      entityId: application.id,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Withdraw application
router.post('/:id/withdraw', authenticate, async (req: Request, res: Response) => {
  try {
    const application = await prisma.application.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
        status: { in: ['DRAFT', 'SUBMITTED', 'DOCUMENTS_PENDING'] },
      },
    });
    if (!application) {
      res.status(404).json({ error: 'Application not found or cannot be withdrawn' });
      return;
    }

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: { status: 'WITHDRAWN' },
    });

    await prisma.applicationTimeline.create({
      data: {
        applicationId: application.id,
        status: 'WITHDRAWN',
        note: req.body.reason || 'Withdrawn by applicant',
        createdBy: req.user!.userId,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to withdraw application' });
  }
});

// Institution: review application
router.patch(
  '/:id/review',
  authenticate,
  authorize('INSTITUTION_STAFF', 'ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const { status, decisionNotes } = req.body;
      const validStatuses = ['UNDER_REVIEW', 'ACCEPTED', 'CONDITIONALLY_ACCEPTED', 'REJECTED', 'WAITLISTED'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }

      const application = await prisma.application.update({
        where: { id: req.params.id },
        data: {
          status,
          decisionNotes,
          ...((['ACCEPTED', 'CONDITIONALLY_ACCEPTED', 'REJECTED'].includes(status)) && {
            decisionAt: new Date(),
          }),
        },
      });

      await prisma.applicationTimeline.create({
        data: {
          applicationId: application.id,
          status,
          note: decisionNotes,
          createdBy: req.user!.userId,
        },
      });

      await logAudit({
        userId: req.user!.userId,
        action: 'REVIEW_APPLICATION',
        entity: 'Application',
        entityId: application.id,
        details: { status, decisionNotes },
      });

      res.json(application);
    } catch (error) {
      res.status(500).json({ error: 'Failed to review application' });
    }
  }
);

export default router;
