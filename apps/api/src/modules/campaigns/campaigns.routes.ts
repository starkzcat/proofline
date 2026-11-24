import { Router } from 'express';
import { Role, campaignQuerySchema, createCampaignSchema, updateCampaignSchema } from '@proofline/shared';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import {
  createCampaign,
  getCampaignById,
  listCampaigns,
  updateCampaign,
} from './campaigns.controller.js';

export const campaignsRouter = Router();

campaignsRouter.use(authenticate);

campaignsRouter.get('/', validateQuery(campaignQuerySchema), listCampaigns);
campaignsRouter.post('/', requireRole(Role.ADMIN), validateBody(createCampaignSchema), createCampaign);
campaignsRouter.get('/:id', getCampaignById);
campaignsRouter.patch('/:id', requireRole(Role.ADMIN), validateBody(updateCampaignSchema), updateCampaign);
