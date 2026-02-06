import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import logger from './config/logger';
import { initWhatsApp } from './whatsapp/client';

// Routes
import authRoutes from './routes/auth.routes';
import institutionRoutes from './routes/institution.routes';
import programmeRoutes from './routes/programme.routes';
import applicationRoutes from './routes/application.routes';
import documentRoutes from './routes/document.routes';
import guidanceRoutes from './routes/guidance.routes';
import assessmentRoutes from './routes/assessment.routes';
import agentRoutes from './routes/agent.routes';
import paymentRoutes from './routes/payment.routes';
import adminRoutes from './routes/admin.routes';

const app = express();

// Middleware
app.use(cors({ origin: config.platform.url, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), platform: config.platform.name });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/programmes', programmeRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/guidance', guidanceRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    app.listen(config.port, () => {
      logger.info(`API server running on port ${config.port}`);
    });

    // Initialize WhatsApp
    await initWhatsApp();
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

start();

export default app;
