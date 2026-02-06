import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { generatePaymentReference } from '../utils/payment';
import { logAudit } from '../utils/audit';

const router = Router();

// List user payments
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        application: {
          select: {
            programme: { select: { name: true } },
            institution: { select: { name: true } },
          },
        },
      },
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Initiate payment
router.post('/initiate', authenticate, async (req: Request, res: Response) => {
  try {
    const { applicationId, type, amount, method } = req.body;

    const payment = await prisma.payment.create({
      data: {
        userId: req.user!.userId,
        applicationId,
        type,
        amount,
        method,
        reference: generatePaymentReference(),
        status: 'PENDING',
      },
    });

    await logAudit({
      userId: req.user!.userId,
      action: 'INITIATE_PAYMENT',
      entity: 'Payment',
      entityId: payment.id,
      details: { amount, type, method },
    });

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

// Confirm payment (webhook / manual)
router.post(
  '/:id/confirm',
  authenticate,
  authorize('ADMIN', 'SUPPORT_AGENT'),
  async (req: Request, res: Response) => {
    try {
      const { providerRef } = req.body;
      const payment = await prisma.payment.update({
        where: { id: req.params.id },
        data: { status: 'COMPLETED', providerRef, paidAt: new Date() },
      });

      await logAudit({
        userId: req.user!.userId,
        action: 'CONFIRM_PAYMENT',
        entity: 'Payment',
        entityId: payment.id,
      });

      res.json(payment);
    } catch (error) {
      res.status(500).json({ error: 'Failed to confirm payment' });
    }
  }
);

// Request refund
router.post('/:id/refund', authenticate, async (req: Request, res: Response) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: { id: req.params.id, userId: req.user!.userId, status: 'COMPLETED' },
    });
    if (!payment) {
      res.status(404).json({ error: 'Payment not found or not eligible for refund' });
      return;
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'REFUNDED' },
    });

    await logAudit({
      userId: req.user!.userId,
      action: 'REQUEST_REFUND',
      entity: 'Payment',
      entityId: payment.id,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

export default router;
