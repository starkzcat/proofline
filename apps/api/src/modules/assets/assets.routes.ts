import { Router } from 'express';
import {
  Role,
  createAssetSchema,
  createVersionSchema,
  requestChangesSchema,
} from '@proofline/shared';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import {
  approveAsset,
  archiveAsset,
  createAsset,
  getAssetById,
  listAssets,
  requestChanges,
  submitAsset,
  uploadNewVersion,
} from './assets.controller.js';

export const assetsRouter = Router();

assetsRouter.use(authenticate);

// Asset CRUD and detail
assetsRouter.get('/', listAssets);
assetsRouter.get('/:id', getAssetById);
assetsRouter.post('/:id/versions', requireRole(Role.ADMIN, Role.MARKETER), validateBody(createVersionSchema), uploadNewVersion);
assetsRouter.post('/:id/submit', requireRole(Role.ADMIN, Role.MARKETER), submitAsset);
assetsRouter.post('/:id/approve', requireRole(Role.ADMIN, Role.CLIENT), approveAsset);
assetsRouter.post('/:id/request-changes', requireRole(Role.ADMIN, Role.CLIENT), validateBody(requestChangesSchema), requestChanges);
assetsRouter.post('/:id/archive', requireRole(Role.ADMIN), archiveAsset);

// Nested route helper for creating asset under campaign
export const campaignAssetsRouter = Router({ mergeParams: true });
campaignAssetsRouter.use(authenticate);
campaignAssetsRouter.post(
  '/',
  requireRole(Role.ADMIN, Role.MARKETER),
  validateBody(createAssetSchema),
  createAsset
);
