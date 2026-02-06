import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { GuidanceEngine } from '../services/guidance.service';

const router = Router();
const guidance = new GuidanceEngine();

// Get programme recommendations based on profile
router.get('/recommendations', authenticate, async (req: Request, res: Response) => {
  try {
    const profile = await prisma.learnerProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!profile) {
      res.status(400).json({ error: 'Please complete your learner profile first' });
      return;
    }

    const recommendations = await guidance.getRecommendations(profile);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Check eligibility for a specific programme
router.get('/eligibility/:programmeId', authenticate, async (req: Request, res: Response) => {
  try {
    const profile = await prisma.learnerProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!profile) {
      res.status(400).json({ error: 'Please complete your learner profile first' });
      return;
    }

    const programme = await prisma.programme.findUnique({
      where: { id: req.params.programmeId },
      include: { institution: true, intakes: { where: { isOpen: true } } },
    });
    if (!programme) {
      res.status(404).json({ error: 'Programme not found' });
      return;
    }

    const result = guidance.checkEligibility(profile, programme);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check eligibility' });
  }
});

// Get alternative pathways
router.get('/alternatives/:programmeId', authenticate, async (req: Request, res: Response) => {
  try {
    const profile = await prisma.learnerProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!profile) {
      res.status(400).json({ error: 'Please complete your learner profile first' });
      return;
    }

    const programme = await prisma.programme.findUnique({
      where: { id: req.params.programmeId },
    });
    if (!programme) {
      res.status(404).json({ error: 'Programme not found' });
      return;
    }

    const alternatives = await guidance.findAlternatives(profile, programme);
    res.json(alternatives);
  } catch (error) {
    res.status(500).json({ error: 'Failed to find alternatives' });
  }
});

// Get programme value analysis
router.get('/value/:programmeId', async (req: Request, res: Response) => {
  try {
    const programme = await prisma.programme.findUnique({
      where: { id: req.params.programmeId },
      include: { institution: true },
    });
    if (!programme) {
      res.status(404).json({ error: 'Programme not found' });
      return;
    }

    const analysis = guidance.getValueAnalysis(programme);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyse programme value' });
  }
});

export default router;
