import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Dashboard stats
router.get('/stats', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalApplications,
      totalInstitutions,
      totalProgrammes,
      pendingApplications,
      completedPayments,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.application.count(),
      prisma.institution.count(),
      prisma.programme.count(),
      prisma.application.count({ where: { status: 'SUBMITTED' } }),
      prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: {
        id: true, firstName: true, lastName: true, phone: true, role: true, createdAt: true,
      }}),
    ]);

    res.json({
      totalUsers,
      totalApplications,
      totalInstitutions,
      totalProgrammes,
      pendingApplications,
      totalRevenue: completedPayments._sum.amount || 0,
      recentUsers,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// List all users
router.get('/users', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { role, search, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, phone: true, email: true, firstName: true, lastName: true,
          role: true, isVerified: true, isActive: true, createdAt: true,
          _count: { select: { applications: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page: parseInt(page as string), pages: Math.ceil(total / take) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user role / status
router.patch('/users/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { role, isActive, isVerified } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(isVerified !== undefined && { isVerified }),
      },
      select: { id: true, firstName: true, lastName: true, role: true, isActive: true, isVerified: true },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Audit logs
router.get('/audit', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { entity, action, userId, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ logs, total, page: parseInt(page as string), pages: Math.ceil(total / take) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Playbooks
router.get('/playbooks', authenticate, authorize('ADMIN', 'APPLICATION_AGENT'), async (_req: Request, res: Response) => {
  try {
    const playbooks = await prisma.applicationPlaybook.findMany({ orderBy: { institutionName: 'asc' } });
    res.json(playbooks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch playbooks' });
  }
});

router.post('/playbooks', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const playbook = await prisma.applicationPlaybook.create({ data: req.body });
    res.status(201).json(playbook);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create playbook' });
  }
});

export default router;
