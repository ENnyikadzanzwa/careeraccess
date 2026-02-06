import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/database';
import { config } from '../config';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { logAudit } from '../utils/audit';

const router = Router();

const registerSchema = z.object({
  phone: z.string().min(10).max(15),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  role: z.enum(['LEARNER', 'PARENT']).default('LEARNER'),
  dateOfBirth: z.string().optional(),
  nationalId: z.string().optional(),
});

const loginSchema = z.object({
  phone: z.string(),
  password: z.string(),
});

// Register
router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { phone, password, firstName, lastName, email, role, dateOfBirth, nationalId } = req.body;

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      res.status(409).json({ error: 'Phone number already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        phone,
        passwordHash,
        firstName,
        lastName,
        email,
        role,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        nationalId,
      },
      select: { id: true, phone: true, firstName: true, lastName: true, role: true },
    });

    if (role === 'LEARNER') {
      await prisma.learnerProfile.create({
        data: { userId: user.id, educationLevel: 'O_LEVEL' },
      });
    } else if (role === 'PARENT') {
      await prisma.parentProfile.create({
        data: { userId: user.id },
      });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    await logAudit({ userId: user.id, action: 'REGISTER', entity: 'User', entityId: user.id });

    res.status(201).json({ user, token });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated' });
      return;
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    await logAudit({ userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id });

    res.json({
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        dateOfBirth: true,
        isVerified: true,
        createdAt: true,
        learnerProfile: true,
        parentProfile: true,
      },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile
router.patch('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, dateOfBirth, nationalId } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(nationalId && { nationalId }),
      },
      select: { id: true, phone: true, email: true, firstName: true, lastName: true, role: true },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update learner profile
router.patch('/me/learner', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      educationLevel, school, province, city, budgetMin, budgetMax,
      studyMode, interests, strengths, oLevelResults, aLevelResults,
    } = req.body;

    const profile = await prisma.learnerProfile.upsert({
      where: { userId: req.user!.userId },
      update: {
        ...(educationLevel && { educationLevel }),
        ...(school !== undefined && { school }),
        ...(province !== undefined && { province }),
        ...(city !== undefined && { city }),
        ...(budgetMin !== undefined && { budgetMin }),
        ...(budgetMax !== undefined && { budgetMax }),
        ...(studyMode !== undefined && { studyMode }),
        ...(interests && { interests }),
        ...(strengths && { strengths }),
        ...(oLevelResults !== undefined && { oLevelResults }),
        ...(aLevelResults !== undefined && { aLevelResults }),
      },
      create: {
        userId: req.user!.userId,
        educationLevel: educationLevel || 'O_LEVEL',
        school, province, city, budgetMin, budgetMax,
        studyMode, interests, strengths, oLevelResults, aLevelResults,
      },
    });

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update learner profile' });
  }
});

export default router;
