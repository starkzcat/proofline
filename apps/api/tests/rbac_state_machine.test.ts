import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { AssetStatus, Role } from '@proofline/shared';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { AUTH_COOKIE_NAME, signToken } from '../src/modules/auth/auth.utils.js';

describe('PRD Section 9.1: Backend Integration & RBAC Test Suite', () => {
  const adminToken = signToken({
    userId: 'admin-user',
    email: 'admin@proofline.dev',
    role: Role.ADMIN,
  });

  const marketerToken = signToken({
    userId: 'marketer-user',
    email: 'marketer@proofline.dev',
    role: Role.MARKETER,
  });

  const clientToken = signToken({
    userId: 'client-user',
    email: 'client@proofline.dev',
    role: Role.CLIENT,
  });

  describe('1. RBAC Enforcement', () => {
    it('MARKETER attempting POST /api/assets/:id/approve returns 403', async () => {
      const res = await request(app)
        .post('/api/assets/any-asset-id/approve')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${marketerToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('MARKETER attempting POST /api/assets/:id/request-changes returns 403', async () => {
      const res = await request(app)
        .post('/api/assets/any-asset-id/request-changes')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${marketerToken}`])
        .send({ reason: 'Changes required' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('CLIENT attempting GET /api/campaigns/:unassignedId returns 403', async () => {
      vi.spyOn(prisma.campaignMember, 'findUnique').mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/campaigns/unassigned-campaign-id')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${clientToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('CLIENT attempting GET /api/assets/:unassignedAssetId returns 403', async () => {
      vi.spyOn(prisma.asset, 'findUnique').mockResolvedValueOnce({
        id: 'unassigned-asset-id',
        campaignId: 'unassigned-campaign-id',
        title: 'Unassigned Asset',
        status: AssetStatus.IN_REVIEW,
        currentVersion: 1,
        campaign: { id: 'unassigned-campaign-id', name: 'Secret Campaign', clientName: 'Other' },
        versions: [],
        auditLogs: [],
      } as unknown as Awaited<ReturnType<typeof prisma.asset.findUnique>>);

      vi.spyOn(prisma.campaignMember, 'findUnique').mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/assets/unassigned-asset-id')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${clientToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('CLIENT attempting POST /api/campaigns returns 403', async () => {
      const res = await request(app)
        .post('/api/campaigns')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${clientToken}`])
        .send({
          name: 'Unauthorized Campaign',
          clientName: 'Client Corp',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('CLIENT attempting POST /api/campaigns/:campaignId/assets returns 403', async () => {
      const res = await request(app)
        .post('/api/campaigns/some-campaign-id/assets')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${clientToken}`])
        .send({
          title: 'Unauthorized Asset',
          fileName: 'image.png',
          fileKey: 'uploads/image.png',
          fileUrl: 'https://cdn.example.com/image.png',
          mimeType: 'image/png',
          fileSizeBytes: 1024,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('2. State Machine Integrity', () => {
    it('Approving a DRAFT asset returns 409 Conflict with code INVALID_STATE_TRANSITION', async () => {
      vi.spyOn(prisma.asset, 'findUnique').mockResolvedValueOnce({
        id: 'draft-asset-id',
        campaignId: 'camp-1',
        status: AssetStatus.DRAFT,
        currentVersion: 1,
      } as unknown as Awaited<ReturnType<typeof prisma.asset.findUnique>>);

      const res = await request(app)
        .post('/api/assets/draft-asset-id/approve')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`]);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('REQUEST_CHANGES without a reason returns 400 with code VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/assets/asset-1/request-changes')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`])
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('REQUEST_CHANGES on a DRAFT or APPROVED asset returns 409 Conflict', async () => {
      vi.spyOn(prisma.asset, 'findUnique').mockResolvedValueOnce({
        id: 'approved-asset-id',
        campaignId: 'camp-1',
        status: AssetStatus.APPROVED,
        currentVersion: 1,
        versions: [{ id: 'ver-1', versionNumber: 1 }],
      } as unknown as Awaited<ReturnType<typeof prisma.asset.findUnique>>);

      const res = await request(app)
        .post('/api/assets/approved-asset-id/request-changes')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`])
        .send({ reason: 'Need to reopen and change text' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('Uploading v2 on a CHANGES_REQUESTED asset atomically increments currentVersion to 2, transitions status to IN_REVIEW, and writes an AuditLog entry', async () => {
      vi.spyOn(prisma.asset, 'findUnique').mockResolvedValueOnce({
        id: 'asset-cr',
        campaignId: 'camp-1',
        status: AssetStatus.CHANGES_REQUESTED,
        currentVersion: 1,
      } as unknown as Awaited<ReturnType<typeof prisma.asset.findUnique>>);

      const mockNewVersion = {
        id: 'ver-2',
        versionNumber: 2,
        fileName: 'hero-v2.png',
        fileKey: 'uploads/hero-v2.png',
      };

      const mockUpdatedAsset = {
        id: 'asset-cr',
        currentVersion: 2,
        status: AssetStatus.IN_REVIEW,
      };

      const auditLogCreateMock = vi.fn().mockResolvedValue({ id: 'audit-id' });

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: unknown) => {
        const fn = callback as (tx: unknown) => Promise<unknown>;
        return fn({
          assetVersion: { create: vi.fn().mockResolvedValue(mockNewVersion) },
          asset: { update: vi.fn().mockResolvedValue(mockUpdatedAsset) },
          auditLog: { create: auditLogCreateMock },
        });
      });

      const res = await request(app)
        .post('/api/assets/asset-cr/versions')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${marketerToken}`])
        .send({
          fileName: 'hero-v2.png',
          fileKey: 'uploads/hero-v2.png',
          fileUrl: 'https://cdn.example.com/hero-v2.png',
          mimeType: 'image/png',
          fileSizeBytes: 150000,
          changeNotes: 'Addressed typography comments',
        });

      expect(res.status).toBe(201);
      expect(res.body.asset.currentVersion).toBe(2);
      expect(res.body.asset.status).toBe(AssetStatus.IN_REVIEW);
      expect(res.body.version.versionNumber).toBe(2);
      // Confirmed AuditLog entry written
      expect(auditLogCreateMock).toHaveBeenCalled();
    });

    it('Submitting a DRAFT asset with currentVersion < 1 returns 409 Conflict', async () => {
      vi.spyOn(prisma.asset, 'findUnique').mockResolvedValueOnce({
        id: 'asset-no-ver',
        campaignId: 'camp-1',
        status: AssetStatus.DRAFT,
        currentVersion: 0,
      } as unknown as Awaited<ReturnType<typeof prisma.asset.findUnique>>);

      const res = await request(app)
        .post('/api/assets/asset-no-ver/submit')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${marketerToken}`]);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('Any state transition attempt on an ARCHIVED asset returns 409 Conflict', async () => {
      vi.spyOn(prisma.asset, 'findUnique').mockResolvedValueOnce({
        id: 'archived-asset',
        campaignId: 'camp-1',
        status: AssetStatus.ARCHIVED,
        currentVersion: 2,
      } as unknown as Awaited<ReturnType<typeof prisma.asset.findUnique>>);

      const res = await request(app)
        .post('/api/assets/archived-asset/archive')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`]);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });
  });

  describe('3. Unauthenticated Auth Protection (401)', () => {
    const protectedEndpoints: { method: 'get' | 'post' | 'patch'; path: string; body?: unknown }[] = [
      { method: 'get', path: '/api/auth/me' },
      { method: 'get', path: '/api/campaigns' },
      { method: 'post', path: '/api/campaigns', body: { name: 'Test', clientName: 'Client' } },
      { method: 'get', path: '/api/campaigns/camp-1' },
      { method: 'patch', path: '/api/campaigns/camp-1', body: { name: 'Update' } },
      { method: 'post', path: '/api/uploads/presign', body: { fileName: 't.png', mimeType: 'image/png', fileSizeBytes: 100 } },
      { method: 'post', path: '/api/campaigns/camp-1/assets', body: { title: 'Asset' } },
      { method: 'get', path: '/api/assets/asset-1' },
      { method: 'post', path: '/api/assets/asset-1/versions', body: { fileName: 't.png' } },
      { method: 'post', path: '/api/assets/asset-1/submit' },
      { method: 'post', path: '/api/assets/asset-1/approve' },
      { method: 'post', path: '/api/assets/asset-1/request-changes', body: { reason: 'Test' } },
      { method: 'post', path: '/api/assets/asset-1/archive' },
      { method: 'post', path: '/api/versions/ver-1/comments', body: { body: 'Comment' } },
      { method: 'get', path: '/api/audit-logs' },
    ];

    for (const ep of protectedEndpoints) {
      it(`returns 401 for unauthenticated ${ep.method.toUpperCase()} ${ep.path}`, async () => {
        const reqObj = ep.method === 'get'
          ? request(app).get(ep.path)
          : ep.method === 'post'
          ? request(app).post(ep.path).send(ep.body || {})
          : request(app).patch(ep.path).send(ep.body || {});

        const res = await reqObj;
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
      });
    }
  });
});
