import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { campaignsRouter } from './modules/campaigns/campaigns.routes.js';
import { assetsRouter, campaignAssetsRouter } from './modules/assets/assets.routes.js';
import { uploadsRouter } from './modules/uploads/uploads.routes.js';
import { commentsRouter } from './modules/comments/comments.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';

export function createApp(): Express {
  const app = express();

  // Security & utility middleware
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount API modules
  app.use('/api/auth', authRouter);
  app.use('/api/campaigns/:campaignId/assets', campaignAssetsRouter);
  app.use('/api/campaigns', campaignsRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/assets', assetsRouter);
  app.use('/api/versions', commentsRouter);
  app.use('/api/audit-logs', auditRouter);

  // 404 handler for undefined routes
  app.use('/api', (_req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
