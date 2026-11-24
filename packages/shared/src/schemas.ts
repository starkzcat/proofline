import { z } from 'zod';
import {
  ALLOWED_MIME_TYPES,
  AUDIT_ACTIONS,
  CAMPAIGN_STATUSES,
  ASSET_STATUSES,
  MAX_FILE_SIZE_BYTES,
  ROLES,
} from './enums.js';

// Base Enum Schemas
export const roleSchema = z.enum(ROLES);
export const campaignStatusSchema = z.enum(CAMPAIGN_STATUSES);
export const assetStatusSchema = z.enum(ASSET_STATUSES);
export const auditActionSchema = z.enum(AUDIT_ACTIONS);
export const mimeTypeSchema = z.enum(ALLOWED_MIME_TYPES);

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const demoSwitchSchema = z.object({
  role: roleSchema,
});
export type DemoSwitchInput = z.infer<typeof demoSwitchSchema>;

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: roleSchema,
  createdAt: z.string().or(z.date()),
});
export type UserResponse = z.infer<typeof userResponseSchema>;

// Campaign Schemas
export const createCampaignSchema = z.object({
  name: z.string().trim().min(1, 'Campaign name is required').max(100, 'Campaign name too long'),
  clientName: z.string().trim().min(1, 'Client name is required').max(100, 'Client name too long'),
  description: z.string().trim().max(1000, 'Description too long').optional(),
  memberIds: z.array(z.string().min(1)).optional().default([]),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  clientName: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  status: campaignStatusSchema.optional(),
  memberIds: z.array(z.string().min(1)).optional(),
});
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

export const campaignQuerySchema = z.object({
  status: campaignStatusSchema.optional(),
  search: z.string().trim().optional(),
});
export type CampaignQueryInput = z.infer<typeof campaignQuerySchema>;

// Upload / Presign Schemas
export const presignUploadSchema = z.object({
  fileName: z.string().trim().min(1, 'File name is required').max(255, 'File name too long'),
  mimeType: mimeTypeSchema,
  fileSizeBytes: z
    .number()
    .int('File size must be an integer')
    .positive('File size must be greater than 0')
    .max(MAX_FILE_SIZE_BYTES, 'File size cannot exceed 10MB'),
});
export type PresignUploadInput = z.infer<typeof presignUploadSchema>;

export const presignResponseSchema = z.object({
  uploadUrl: z.string().url(),
  fileKey: z.string().min(1),
  publicUrl: z.string().url(),
});
export type PresignResponse = z.infer<typeof presignResponseSchema>;

// Asset & Version Schemas
export const createAssetSchema = z.object({
  title: z.string().trim().min(1, 'Asset title is required').max(100, 'Title too long'),
  description: z.string().trim().max(1000).optional(),
  fileName: z.string().trim().min(1, 'File name is required'),
  fileKey: z.string().trim().min(1, 'File key is required'),
  fileUrl: z.string().url('Invalid file URL'),
  mimeType: mimeTypeSchema,
  fileSizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE_BYTES, 'File size cannot exceed 10MB'),
  changeNotes: z.string().trim().max(1000).optional(),
});
export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const createVersionSchema = z.object({
  fileName: z.string().trim().min(1, 'File name is required'),
  fileKey: z.string().trim().min(1, 'File key is required'),
  fileUrl: z.string().url('Invalid file URL'),
  mimeType: mimeTypeSchema,
  fileSizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE_BYTES, 'File size cannot exceed 10MB'),
  changeNotes: z.string().trim().max(1000).optional(),
});
export type CreateVersionInput = z.infer<typeof createVersionSchema>;

export const requestChangesSchema = z.object({
  reason: z.string().trim().min(1, 'Reason is required').max(2000, 'Reason too long'),
});
export type RequestChangesInput = z.infer<typeof requestChangesSchema>;

// Comment Schemas
export const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'Comment body cannot be empty').max(2000, 'Comment too long'),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

// Audit Log Schemas
export const auditLogQuerySchema = z.object({
  campaignId: z.string().optional(),
  assetId: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().optional(),
});
export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;

// Structured API Error Schema
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;
