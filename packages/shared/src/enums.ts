export const ROLES = ['ADMIN', 'MARKETER', 'CLIENT'] as const;
export type Role = (typeof ROLES)[number];

export const Role = {
  ADMIN: 'ADMIN',
  MARKETER: 'MARKETER',
  CLIENT: 'CLIENT',
} as const satisfies Record<Role, Role>;

export const CAMPAIGN_STATUSES = ['ACTIVE', 'COMPLETED', 'ARCHIVED'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CampaignStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
} as const satisfies Record<CampaignStatus, CampaignStatus>;

export const ASSET_STATUSES = [
  'DRAFT',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'ARCHIVED',
] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const AssetStatus = {
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  APPROVED: 'APPROVED',
  ARCHIVED: 'ARCHIVED',
} as const satisfies Record<AssetStatus, AssetStatus>;

export const AUDIT_ACTIONS = [
  'CAMPAIGN_CREATED',
  'CAMPAIGN_UPDATED',
  'ASSET_CREATED',
  'VERSION_UPLOADED',
  'ASSET_SUBMITTED',
  'CHANGES_REQUESTED',
  'ASSET_APPROVED',
  'ASSET_ARCHIVED',
  'COMMENT_ADDED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AuditAction = {
  CAMPAIGN_CREATED: 'CAMPAIGN_CREATED',
  CAMPAIGN_UPDATED: 'CAMPAIGN_UPDATED',
  ASSET_CREATED: 'ASSET_CREATED',
  VERSION_UPLOADED: 'VERSION_UPLOADED',
  ASSET_SUBMITTED: 'ASSET_SUBMITTED',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  ASSET_APPROVED: 'ASSET_APPROVED',
  ASSET_ARCHIVED: 'ASSET_ARCHIVED',
  COMMENT_ADDED: 'COMMENT_ADDED',
} as const satisfies Record<AuditAction, AuditAction>;

export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const PRESIGNED_URL_EXPIRES_SECONDS = 300; // 5 minutes

export const ERROR_CODES = [
  'INVALID_STATE_TRANSITION',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'CONFLICT',
  'INTERNAL_SERVER_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const ErrorCode = {
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const satisfies Record<ErrorCode, ErrorCode>;

/**
 * Status badge styling strictly following .agent/skills/frontend-design/SKILL.md
 * (Section 3: Status Badges - text-xs font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1.5 with 6px dot)
 */
export interface AssetStatusBadgeConfig {
  label: string;
  badgeClasses: string;
  dotClass: string;
}

export const ASSET_STATUS_BADGE_CONFIG: Record<AssetStatus, AssetStatusBadgeConfig> = {
  DRAFT: {
    label: 'Draft',
    badgeClasses: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-500',
  },
  IN_REVIEW: {
    label: 'In Review',
    badgeClasses: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  CHANGES_REQUESTED: {
    label: 'Changes Requested',
    badgeClasses: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
  APPROVED: {
    label: 'Approved',
    badgeClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  ARCHIVED: {
    label: 'Archived',
    badgeClasses: 'bg-zinc-100 text-zinc-500 border-zinc-200',
    dotClass: 'bg-zinc-500',
  },
} as const;
