import { Router } from 'express';
import { createCommentSchema } from '@proofline/shared';
import { authenticate } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { addCommentToVersion } from './comments.controller.js';

export const commentsRouter = Router();

commentsRouter.use(authenticate);

commentsRouter.post(
  '/:versionId/comments',
  validateBody(createCommentSchema),
  addCommentToVersion
);
