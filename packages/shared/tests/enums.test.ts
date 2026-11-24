import { describe, it, expect } from 'vitest';
import {
  ALLOWED_MIME_TYPES,
  ASSET_STATUS_BADGE_CONFIG,
  ASSET_STATUSES,
  AUDIT_ACTIONS,
  CAMPAIGN_STATUSES,
  MAX_FILE_SIZE_BYTES,
  PRESIGNED_URL_EXPIRES_SECONDS,
  ROLES,
} from '../src/enums.js';

describe('Enums & Constants', () => {
  it('should define exact expected roles', () => {
    expect(ROLES).toEqual(['ADMIN', 'MARKETER', 'CLIENT']);
  });

  it('should define exact campaign statuses', () => {
    expect(CAMPAIGN_STATUSES).toEqual(['ACTIVE', 'COMPLETED', 'ARCHIVED']);
  });

  it('should define exact asset statuses', () => {
    expect(ASSET_STATUSES).toEqual([
      'DRAFT',
      'IN_REVIEW',
      'CHANGES_REQUESTED',
      'APPROVED',
      'ARCHIVED',
    ]);
  });

  it('should define exact audit actions', () => {
    expect(AUDIT_ACTIONS).toEqual([
      'CAMPAIGN_CREATED',
      'CAMPAIGN_UPDATED',
      'ASSET_CREATED',
      'VERSION_UPLOADED',
      'ASSET_SUBMITTED',
      'CHANGES_REQUESTED',
      'ASSET_APPROVED',
      'ASSET_ARCHIVED',
      'COMMENT_ADDED',
    ]);
  });

  it('should restrict uploads to allowed MIME types', () => {
    expect(ALLOWED_MIME_TYPES).toEqual([
      'image/png',
      'image/jpeg',
      'image/webp',
      'application/pdf',
    ]);
  });

  it('should enforce 10MB upload limit and 300s presign expiration', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
    expect(PRESIGNED_URL_EXPIRES_SECONDS).toBe(300);
  });

  it('should map badge styles strictly according to frontend-design skill', () => {
    for (const status of ASSET_STATUSES) {
      const config = ASSET_STATUS_BADGE_CONFIG[status];
      expect(config).toBeDefined();
      expect(config.label).toBeTruthy();
      expect(config.badgeClasses).toContain('border');
      expect(config.dotClass).toBeTruthy();
    }

    expect(ASSET_STATUS_BADGE_CONFIG.DRAFT.badgeClasses).toContain('bg-slate-100');
    expect(ASSET_STATUS_BADGE_CONFIG.IN_REVIEW.badgeClasses).toContain('bg-amber-50');
    expect(ASSET_STATUS_BADGE_CONFIG.CHANGES_REQUESTED.badgeClasses).toContain('bg-rose-50');
    expect(ASSET_STATUS_BADGE_CONFIG.APPROVED.badgeClasses).toContain('bg-emerald-50');
    expect(ASSET_STATUS_BADGE_CONFIG.ARCHIVED.badgeClasses).toContain('bg-zinc-100');
  });
});
