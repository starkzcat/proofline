import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { AssetStatus, Role } from '@proofline/shared';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { AUTH_COOKIE_NAME, signToken } from '../src/modules/auth/auth.utils.js';

describe('Assets & State Machine Transitions API', () => {
  const adminToken = signToken({
    userId: 'admin-id',
    email: 'admin@proofline.dev',
    role: Role.ADMIN,
  });

  const marketerToken = signToken({
    userId: 'marketer-id',
    email: 'marketer@proofline.dev',
    role: Role.MARKETER,
  });

  const clientToken = signToken({
    userId: 'client-id',
    email: 'client@proofline.dev',
    role: Role.CLIENT,
  });

  describe('GET /api/assets/:id', () => {
    it('returns asset details when authorized', async () => {
      vi.spyOn(prisma.asset, 'findUnique').mockResolvedValueOnce({
        id: 'asset-1',
        campaignId: 'camp-1',
        title: 'Hero Banner',
        status: AssetStatus.IN_REVIEW,
        currentVersion: 1,
        campaign: { id: 'camp-1', name: 'Q4 Launch', clientName: 'Client' },
        versions: [],
        auditLogs: [],
      } as unknown as Awaited<ReturnType<typeof prisma.asset.findUnique>>);

      const res = await request(app)
        .get('/api/assets/asset-1')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${marketerToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.asset.id).toBe('asset-1');
    });

    it('returns 403 when CLIENT is not assigned to the asset campaign', async () => {
      vi.spyOn(prisma.asset, 'findUnique').mockResolvedValueOnce({
        id: 'asset-unassigned',
        campaignId: 'camp-unassigned',
        title: 'Internal Banner',
        status: AssetStatus.DRAFT,
        currentVersion: 1,
        campaign: { id: 'camp-unassigned', name: 'Internal', clientName: 'Internal' },
        versions: [],
        auditLogs: [],
      } as unknown as Awaited<ReturnType<typeof prisma.asset.findUnique>>);

      vi.spyOn(prisma.campaignMember, 'findUnique').mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/assets/asset-unassigned')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${clientToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 when asset does not exist', async () => {
      vi.spyOn(prisma.asset, 'findUnique').mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/assets/nonexistent-id')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/campaigns/:campaignId/assets', () => {
    it('creates asset in DRAFT status with initial version', async () => {
      vi.spyOn(prisma.campaign, 'findUnique').mockResolvedValueOnce({
        id: 'camp-1',
      } as unknown as Awaited<ReturnType<typeof prisma.campaign.findUnique>>);

      const mockAsset = {
        id: 'asset-1',
        campaignId: 'camp-1',
        title: 'Hero Banner',
        status: AssetStatus.DRAFT,
        currentVersion: 1,
        versions: [{ id: 'ver-1', versionNumber: 1 }],
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: unknown) => {
        const fn = callback as (tx: unknown) => Promise<unknown>;
        return fn({
          asset: { create: vi.fn().mockResolvedValue(mockAsset) },
          auditLog: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const res = await request(app)
        .post('/api/campaigns/camp-1/assets')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${marketerToken}`])
        .send({
          title: 'Hero Banner',
          fileName: 'hero.png',
          fileKey: 'uploads/hero.png',
          fileUrl: 'https://cdn.example.com/hero.png',
          mimeType: 'image/png',
          fileSizeBytes: 102400,
        });

      expect(res.status).toBe(201);
      expect(res.body.asset.status).toBe('DRAFT');
      expect(res.body.asset.currentVersion).toBe(1);
    });

    it('rejects CLIENT from creating assets (403)', async () => {
      const res = await request(app)
        .post('/api/campaigns/camp-1/assets')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${clientToken}`])
        .send({
          title: 'Hero Banner',
          fileName: 'hero.png',
          fileKey: 'uploads/hero.png',
          fileUrl: 'https://cdn.example.com/hero.png',
          mimeType: 'image/png',
          fileSizeBytes: 102400,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/assets/:id/submit', () => {
    it('transitions DRAFT to IN_REVIEW atomically', async () => {
      vi.spyOn(prisma.asset, 'findUnique').mockResolvedValueOnce({
        id: 'asset-1',
        campaignId: 'camp-1',
        status: AssetStatus.DRAFT,
        currentVersion: 1,
      } as unknown as Awaited<ReturnType<typeof prisma.asset.findUnique>>);

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: unknown) => {
        const fn = callback as (tx: unknown) => Promise<unknown>;
        return fn({
          asset: {
            update: vi.fn().mockResolvedValue({
              id: 'asset-1',
              status: AssetStatus.IN_REVIEW,
            }),
          },
          auditLog: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const res = await request(app)
        .post('/api/assets/asset-1/submit')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${marketerToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.asset.status).toBe('IN_REVIEW');
    });

    it('rejects submitting an already IN_REVIEW asset with 409 Conflict', async () => {
      vi.spyOn(prisma.asset, 'findUnique').mockResolvedValueOnce({
        id: 'asset-1',
        campaignId: 'camp-1',
        status: AssetStatus.IN_REVIEW,
        currentVersion: 1,
      } as unknown as Awaited<ReturnType<typeof prisma.asset.findUnique>>);

      const res = await request(app)
        .post('/api/assets/asset-1/submit')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${marketerToken}`]);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });
  });

  describe('POST /api/assets/:id/approve', () => {
    it('allows assigned CLIENT to approve an IN_REVIEW asset', async () => {
      vi.spyOn(prisma.asset, 'findUnique').mockResolvedValueOnce({
        id: 'asset-1',
        campaignId: 'camp-1',
        status: AssetStatus.IN_REVIEW,
        currentVersion: 1,
      } as unknown as Awaited<ReturnType<typeof prisma.asset.findUnique>>);

      vi.spyOn(prisma.campaignMember, 'findUnique').mockResolvedValueOnce({
        id: 'member-1',
      } as unknown as Awaited<ReturnType<typeof prisma.campaignMember.findUnique>>);

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: unknown) => {
        const fn = callback as (tx: unknown) => Promise<unknown>;
        return fn({
          asset: {
            update: vi.fn().mockResolvedValue({
              id: 'asset-1',
              status: AssetStatus.APPROVED,
            }),
          },
          auditLog: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const res = await request(app)
        .post('/api/assets/asset-1/approve')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${clientToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.asset.status).toBe('APPROVED');
    });

    it('rejects MARKETER from approving an asset (403)', async () => {
      const res = await request(app)
        .post('/api/assets/asset-1/approve')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${marketerToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects approving a DRAFT asset with 409 Conflict', async () => {
      vi.spyOn(prisma.asset, 'findUnique').mockResolvedValueOnce({
        id: 'asset-1',
        campaignId: 'camp-1',
        status: AssetStatus.DRAFT,
        currentVersion: 1,
      } as unknown as Awaited<ReturnType<typeof prisma.asset.findUnique>>);

      const res = await request(app)
        .post('/api/assets/asset-1/approve')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`]);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });
  });

  describe('POST /api/assets/:id/request-changes', () => {
    it('requires a non-empty reason and transitions IN_REVIEW to CHANGES_REQUESTED', async () => {
      vi.spyOn(prisma.asset, 'findUnique').mockResolvedValueOnce({
        id: 'asset-1',
        campaignId: 'camp-1',
        status: AssetStatus.IN_REVIEW,
        currentVersion: 1,
        versions: [{ id: 'ver-1', versionNumber: 1 }],
      } as unknown as Awaited<ReturnType<typeof prisma.asset.findUnique>>);

      vi.spyOn(prisma.campaignMember, 'findUnique').mockResolvedValueOnce({
        id: 'member-1',
      } as unknown as Awaited<ReturnType<typeof prisma.campaignMember.findUnique>>);

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: unknown) => {
        const fn = callback as (tx: unknown) => Promise<unknown>;
        return fn({
          asset: {
            update: vi.fn().mockResolvedValue({
              id: 'asset-1',
              status: AssetStatus.CHANGES_REQUESTED,
            }),
          },
          comment: { create: vi.fn().mockResolvedValue({}) },
          auditLog: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const res = await request(app)
        .post('/api/assets/asset-1/request-changes')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${clientToken}`])
        .send({ reason: 'Headline text is too small.' });

      expect(res.status).toBe(200);
      expect(res.body.asset.status).toBe('CHANGES_REQUESTED');
    });

    it('rejects empty reason with 400', async () => {
      const res = await request(app)
        .post('/api/assets/asset-1/request-changes')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${clientToken}`])
        .send({ reason: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/assets/:id/versions', () => {
    it('uploading v2 on CHANGES_REQUESTED asset atomically increments currentVersion and resets status to IN_REVIEW', async () => {
      vi.spyOn(prisma.asset, 'findUnique').mockResolvedValueOnce({
        id: 'asset-1',
        campaignId: 'camp-1',
        status: AssetStatus.CHANGES_REQUESTED,
        currentVersion: 1,
      } as unknown as Awaited<ReturnType<typeof prisma.asset.findUnique>>);

      const mockVersion = { id: 'ver-2', versionNumber: 2 };
      const mockUpdatedAsset = {
        id: 'asset-1',
        status: AssetStatus.IN_REVIEW,
        currentVersion: 2,
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: unknown) => {
        const fn = callback as (tx: unknown) => Promise<unknown>;
        return fn({
          assetVersion: { create: vi.fn().mockResolvedValue(mockVersion) },
          asset: { update: vi.fn().mockResolvedValue(mockUpdatedAsset) },
          auditLog: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const res = await request(app)
        .post('/api/assets/asset-1/versions')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${marketerToken}`])
        .send({
          fileName: 'hero-v2.png',
          fileKey: 'uploads/hero-v2.png',
          fileUrl: 'https://cdn.example.com/hero-v2.png',
          mimeType: 'image/png',
          fileSizeBytes: 200000,
          changeNotes: 'Increased headline font size',
        });

      expect(res.status).toBe(201);
      expect(res.body.asset.currentVersion).toBe(2);
      expect(res.body.asset.status).toBe('IN_REVIEW');
    });

    it('rejects uploading new version to an ARCHIVED asset with 409', async () => {
      vi.spyOn(prisma.asset, 'findUnique').mockResolvedValueOnce({
        id: 'asset-1',
        campaignId: 'camp-1',
        status: AssetStatus.ARCHIVED,
        currentVersion: 2,
      } as unknown as Awaited<ReturnType<typeof prisma.asset.findUnique>>);

      const res = await request(app)
        .post('/api/assets/asset-1/versions')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${marketerToken}`])
        .send({
          fileName: 'hero-v3.png',
          fileKey: 'uploads/hero-v3.png',
          fileUrl: 'https://cdn.example.com/hero-v3.png',
          mimeType: 'image/png',
          fileSizeBytes: 200000,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });
  });

  describe('POST /api/assets/:id/archive', () => {
    it('allows ADMIN to archive an asset', async () => {
      vi.spyOn(prisma.asset, 'findUnique').mockResolvedValueOnce({
        id: 'asset-1',
        campaignId: 'camp-1',
        status: AssetStatus.APPROVED,
      } as unknown as Awaited<ReturnType<typeof prisma.asset.findUnique>>);

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: unknown) => {
        const fn = callback as (tx: unknown) => Promise<unknown>;
        return fn({
          asset: {
            update: vi.fn().mockResolvedValue({
              id: 'asset-1',
              status: AssetStatus.ARCHIVED,
            }),
          },
          auditLog: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const res = await request(app)
        .post('/api/assets/asset-1/archive')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.asset.status).toBe('ARCHIVED');
    });

    it('rejects MARKETER from archiving an asset (403)', async () => {
      const res = await request(app)
        .post('/api/assets/asset-1/archive')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${marketerToken}`]);

      expect(res.status).toBe(403);
    });
  });
});
