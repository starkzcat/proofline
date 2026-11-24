import { Router } from 'express';
import { auditLogQuerySchema } from '@proofline/shared';
import { authenticate } from '../../middleware/auth.js';
import { validateQuery } from '../../middleware/validate.js';
import { listAuditLogs } from './audit.controller.js';

export const auditRouter = Router();

auditRouter.use(authenticate);

auditRouter.get('/', validateQuery(auditLogQuerySchema), listAuditLogs);
