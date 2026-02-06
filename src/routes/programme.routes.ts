import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { logAudit } from '../utils/audit';

const router = Router();

// Search programmes (public)
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      search, institutionId, qualificationLevel, studyMode,
      minFee, maxFee, page = '1', limit = '20', sortBy = 'name',
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { faculty: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (institutionId) where.institutionId = institutionId;
    if (qualificationLevel) where.qualificationLevel = qualificationLevel;
    if (studyMode) where.studyModes = { has: studyMode as string };
    if (minFee) where.tuitionFeeMin = { gte: parseFloat(minFee as string) };
    if (maxFee) where.tuitionFeeMax = { lte: parseFloat(maxFee as string) };

    const orderBy: any =
      sortBy === 'value' ? { overallValueScore: 'desc' } :
      sortBy === 'fee' ? { tuitionFeeMin: 'asc' } :
      { name: 'asc' };

    const [programmes, total] = await Promise.all([
      prisma.programme.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          institution: { select: { id: true, name: true, type: true, city: true, province: true } },
          intakes: { where: { isOpen: true } },
        },
      }),
      prisma.programme.count({ where }),
    ]);

    res.json({ programmes, total, page: parseInt(page as string), pages: Math.ceil(total / take) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch programmes' });
  }
});

// Get single programme (public)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const programme = await prisma.programme.findUnique({
      where: { id: req.params.id },
      include: {
        institution: true,
        intakes: true,
      },
    });
    if (!programme) {
      res.status(404).json({ error: 'Programme not found' });
      return;
    }
    res.json(programme);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch programme' });
  }
});

// Compare programmes (public)
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length < 2 || ids.length > 5) {
      res.status(400).json({ error: 'Provide 2-5 programme IDs to compare' });
      return;
    }

    const programmes = await prisma.programme.findMany({
      where: { id: { in: ids } },
      include: {
        institution: { select: { name: true, type: true, city: true, province: true } },
        intakes: { where: { isOpen: true } },
      },
    });

    res.json({ programmes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to compare programmes' });
  }
});

// Create programme (admin/verifier/staff)
const createSchema = z.object({
  institutionId: z.string(),
  name: z.string().min(2),
  code: z.string().optional(),
  qualificationLevel: z.enum([
    'CERTIFICATE', 'NATIONAL_CERTIFICATE', 'NATIONAL_DIPLOMA',
    'HIGHER_NATIONAL_DIPLOMA', 'DIPLOMA', 'BACHELOR', 'HONOURS',
    'POSTGRADUATE_DIPLOMA', 'MASTERS', 'DOCTORATE',
  ]),
  faculty: z.string().optional(),
  department: z.string().optional(),
  description: z.string().optional(),
  durationMonths: z.number().int().positive(),
  studyModes: z.array(z.enum(['FULL_TIME', 'PART_TIME', 'DISTANCE', 'BLOCK_RELEASE'])),
  tuitionFeeMin: z.number().optional(),
  tuitionFeeMax: z.number().optional(),
  entryRequirements: z.record(z.unknown()),
  oLevelMin: z.number().int().optional(),
  aLevelMin: z.number().int().optional(),
  requiredSubjects: z.array(z.string()).optional(),
  requiredDocuments: z.array(z.string()).optional(),
  applicationFee: z.number().optional(),
  sourceUrl: z.string().url().optional(),
});

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'DATA_VERIFIER', 'INSTITUTION_STAFF'),
  validate(createSchema),
  async (req: Request, res: Response) => {
    try {
      const programme = await prisma.programme.create({ data: req.body });
      await logAudit({
        userId: req.user!.userId,
        action: 'CREATE_PROGRAMME',
        entity: 'Programme',
        entityId: programme.id,
      });
      res.status(201).json(programme);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create programme' });
    }
  }
);

// Update programme
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'DATA_VERIFIER', 'INSTITUTION_STAFF'),
  async (req: Request, res: Response) => {
    try {
      const programme = await prisma.programme.update({
        where: { id: req.params.id },
        data: req.body,
      });
      await logAudit({
        userId: req.user!.userId,
        action: 'UPDATE_PROGRAMME',
        entity: 'Programme',
        entityId: programme.id,
      });
      res.json(programme);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update programme' });
    }
  }
);

export default router;
