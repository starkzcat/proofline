import { Router } from 'express';
import { Role, presignUploadSchema } from '@proofline/shared';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { presignUpload } from './uploads.controller.js';

export const uploadsRouter = Router();

uploadsRouter.use(authenticate);

uploadsRouter.post(
  '/presign',
  requireRole(Role.ADMIN, Role.MARKETER),
  validateBody(presignUploadSchema),
  presignUpload
);
