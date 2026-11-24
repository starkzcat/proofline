import { describe, it, expect } from 'vitest';
import {
  auditLogQuerySchema,
  createAssetSchema,
  createCampaignSchema,
  createCommentSchema,
  createVersionSchema,
  demoSwitchSchema,
  loginSchema,
  presignUploadSchema,
  requestChangesSchema,
  updateCampaignSchema,
} from '../src/schemas.js';

describe('Shared Schemas', () => {
  describe('loginSchema', () => {
    it('accepts valid credentials', () => {
      const res = loginSchema.safeParse({
        email: 'admin@proofline.dev',
        password: 'Password123!',
      });
      expect(res.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const res = loginSchema.safeParse({
        email: 'invalid-email',
        password: 'Password123!',
      });
      expect(res.success).toBe(false);
    });

    it('rejects empty password', () => {
      const res = loginSchema.safeParse({
        email: 'admin@proofline.dev',
        password: '',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('demoSwitchSchema', () => {
    it('accepts valid roles', () => {
      expect(demoSwitchSchema.safeParse({ role: 'ADMIN' }).success).toBe(true);
      expect(demoSwitchSchema.safeParse({ role: 'MARKETER' }).success).toBe(true);
      expect(demoSwitchSchema.safeParse({ role: 'CLIENT' }).success).toBe(true);
    });

    it('rejects invalid role', () => {
      expect(demoSwitchSchema.safeParse({ role: 'SUPERUSER' }).success).toBe(false);
    });
  });

  describe('createCampaignSchema', () => {
    it('validates minimal valid campaign', () => {
      const res = createCampaignSchema.safeParse({
        name: 'Q4 Holiday Paid Social',
        clientName: 'Acme Corp',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.memberIds).toEqual([]);
      }
    });

    it('rejects empty name or clientName', () => {
      expect(
        createCampaignSchema.safeParse({ name: '', clientName: 'Acme Corp' }).success
      ).toBe(false);
      expect(
        createCampaignSchema.safeParse({ name: 'Valid', clientName: '' }).success
      ).toBe(false);
    });
  });

  describe('updateCampaignSchema', () => {
    it('accepts partial updates', () => {
      expect(
        updateCampaignSchema.safeParse({ status: 'COMPLETED' }).success
      ).toBe(true);
      expect(
        updateCampaignSchema.safeParse({ description: null }).success
      ).toBe(true);
    });
  });

  describe('presignUploadSchema', () => {
    it('accepts valid image upload requests', () => {
      const res = presignUploadSchema.safeParse({
        fileName: 'hero-banner.png',
        mimeType: 'image/png',
        fileSizeBytes: 2 * 1024 * 1024,
      });
      expect(res.success).toBe(true);
    });

    it('accepts PDF upload requests', () => {
      const res = presignUploadSchema.safeParse({
        fileName: 'brand-guide.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 5 * 1024 * 1024,
      });
      expect(res.success).toBe(true);
    });

    it('rejects unsupported MIME types', () => {
      const res = presignUploadSchema.safeParse({
        fileName: 'malicious.exe',
        mimeType: 'application/x-msdownload',
        fileSizeBytes: 1024,
      });
      expect(res.success).toBe(false);
    });

    it('rejects files exceeding 10MB', () => {
      const res = presignUploadSchema.safeParse({
        fileName: 'giant-video.png',
        mimeType: 'image/png',
        fileSizeBytes: 10 * 1024 * 1024 + 1,
      });
      expect(res.success).toBe(false);
    });

    it('rejects 0 or negative file sizes', () => {
      expect(
        presignUploadSchema.safeParse({
          fileName: 'empty.png',
          mimeType: 'image/png',
          fileSizeBytes: 0,
        }).success
      ).toBe(false);
    });
  });

  describe('createAssetSchema and createVersionSchema', () => {
    it('validates asset creation payload', () => {
      const res = createAssetSchema.safeParse({
        title: 'Hero Banner',
        description: 'Main landing page banner',
        fileName: 'hero.png',
        fileKey: 'campaign-1/asset-1/v1/hero.png',
        fileUrl: 'https://pub-r2.dev/campaign-1/asset-1/v1/hero.png',
        mimeType: 'image/png',
        fileSizeBytes: 1024 * 1024,
        changeNotes: 'Initial draft',
      });
      expect(res.success).toBe(true);
    });

    it('validates version creation payload', () => {
      const res = createVersionSchema.safeParse({
        fileName: 'hero-v2.png',
        fileKey: 'campaign-1/asset-1/v2/hero.png',
        fileUrl: 'https://pub-r2.dev/campaign-1/asset-1/v2/hero.png',
        mimeType: 'image/png',
        fileSizeBytes: 1024 * 1024,
        changeNotes: 'Updated CTA contrast',
      });
      expect(res.success).toBe(true);
    });
  });

  describe('requestChangesSchema', () => {
    it('accepts valid reason', () => {
      const res = requestChangesSchema.safeParse({
        reason: 'Please increase font size of headline',
      });
      expect(res.success).toBe(true);
    });

    it('rejects empty or whitespace reason', () => {
      expect(requestChangesSchema.safeParse({ reason: '' }).success).toBe(false);
      expect(requestChangesSchema.safeParse({ reason: '   ' }).success).toBe(false);
    });
  });

  describe('createCommentSchema', () => {
    it('accepts non-empty comment body', () => {
      const res = createCommentSchema.safeParse({
        body: 'The color palette looks much better now.',
      });
      expect(res.success).toBe(true);
    });

    it('rejects empty or whitespace comment body', () => {
      expect(createCommentSchema.safeParse({ body: '' }).success).toBe(false);
      expect(createCommentSchema.safeParse({ body: '   ' }).success).toBe(false);
    });
  });

  describe('auditLogQuerySchema', () => {
    it('defaults limit to 20 and coerces numeric string', () => {
      const res = auditLogQuerySchema.safeParse({});
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.limit).toBe(20);
      }

      const resWithLimit = auditLogQuerySchema.safeParse({ limit: '50' });
      expect(resWithLimit.success).toBe(true);
      if (resWithLimit.success) {
        expect(resWithLimit.data.limit).toBe(50);
      }
    });

    it('caps limit at 100', () => {
      const res = auditLogQuerySchema.safeParse({ limit: 101 });
      expect(res.success).toBe(false);
    });
  });
});
