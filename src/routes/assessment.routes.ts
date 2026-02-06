import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { AssessmentEngine } from '../services/assessment.service';

const router = Router();
const assessmentEngine = new AssessmentEngine();

// Get assessment questions
router.get('/questions', authenticate, async (_req: Request, res: Response) => {
  try {
    const questions = assessmentEngine.getQuestions();
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Submit assessment
router.post('/submit', authenticate, async (req: Request, res: Response) => {
  try {
    const { responses } = req.body;
    if (!responses || !Array.isArray(responses)) {
      res.status(400).json({ error: 'Responses array required' });
      return;
    }

    const results = assessmentEngine.evaluate(responses);

    const assessment = await prisma.assessment.create({
      data: {
        userId: req.user!.userId,
        type: 'APTITUDE_INTEREST',
        responses,
        results,
        verbal: results.verbal,
        numerical: results.numerical,
        logical: results.logical,
        creative: results.creative,
        practical: results.practical,
        social: results.social,
        completedAt: new Date(),
      },
    });

    // Update learner profile strengths
    await prisma.learnerProfile.updateMany({
      where: { userId: req.user!.userId },
      data: {
        strengths: results.topStrengths,
        interests: results.suggestedFields,
      },
    });

    res.json({ assessment, results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process assessment' });
  }
});

// Get user's past assessments
router.get('/history', authenticate, async (req: Request, res: Response) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assessment history' });
  }
});

export default router;
