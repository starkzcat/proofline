import express, { Router } from 'express';
import { Role, presignUploadSchema } from '@proofline/shared';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { getLocalUploadedFile, handleLocalUpload, presignUpload } from './uploads.controller.js';

export const uploadsRouter = Router();

// Local file endpoints (for development/offline storage)
uploadsRouter.put(
  '/local/*',
  express.raw({ type: '*/*', limit: '15mb' }),
  handleLocalUpload
);
uploadsRouter.get('/local/*', getLocalUploadedFile);

// Presign endpoint
uploadsRouter.post(
  '/presign',
  authenticate,
  requireRole(Role.ADMIN, Role.MARKETER),
  validateBody(presignUploadSchema),
  presignUpload
);
