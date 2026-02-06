import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { logAudit } from '../utils/audit';

const router = Router();

// List institutions (public)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, province, search, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = { ...(type && { type }), ...(province && { province }) };
    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }

    const [institutions, total] = await Promise.all([
      prisma.institution.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: { _count: { select: { programmes: true } } },
      }),
      prisma.institution.count({ where }),
    ]);

    res.json({ institutions, total, page: parseInt(page as string), pages: Math.ceil(total / take) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch institutions' });
  }
});

// Get single institution (public)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const institution = await prisma.institution.findUnique({
      where: { id: req.params.id },
      include: {
        programmes: {
          where: { isActive: true },
          include: { intakes: { where: { isOpen: true } } },
        },
      },
    });
    if (!institution) {
      res.status(404).json({ error: 'Institution not found' });
      return;
    }
    res.json(institution);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch institution' });
  }
});

// Create institution (admin/verifier only)
const createSchema = z.object({
  name: z.string().min(2),
  type: z.enum([
    'UNIVERSITY', 'POLYTECHNIC', 'TEACHERS_COLLEGE',
    'VOCATIONAL', 'SECONDARY_SCHOOL', 'PRIVATE_COLLEGE',
  ]),
  province: z.string(),
  city: z.string(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  description: z.string().optional(),
  portalUrl: z.string().url().optional(),
});

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'DATA_VERIFIER'),
  validate(createSchema),
  async (req: Request, res: Response) => {
    try {
      const institution = await prisma.institution.create({ data: req.body });
      await logAudit({
        userId: req.user!.userId,
        action: 'CREATE_INSTITUTION',
        entity: 'Institution',
        entityId: institution.id,
      });
      res.status(201).json(institution);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create institution' });
    }
  }
);

// Update institution
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'DATA_VERIFIER', 'INSTITUTION_STAFF'),
  async (req: Request, res: Response) => {
    try {
      const institution = await prisma.institution.update({
        where: { id: req.params.id },
        data: req.body,
      });
      await logAudit({
        userId: req.user!.userId,
        action: 'UPDATE_INSTITUTION',
        entity: 'Institution',
        entityId: institution.id,
      });
      res.json(institution);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update institution' });
    }
  }
);

export default router;
