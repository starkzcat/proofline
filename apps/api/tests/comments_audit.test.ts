import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { Role } from '@proofline/shared';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { AUTH_COOKIE_NAME, signToken } from '../src/modules/auth/auth.utils.js';

describe('Comments & Audit Logs API', () => {
  const adminToken = signToken({
    userId: 'admin-id',
    email: 'admin@proofline.dev',
    role: Role.ADMIN,
  });

  const clientToken = signToken({
    userId: 'client-id',
    email: 'client@proofline.dev',
    role: Role.CLIENT,
  });

  describe('POST /api/versions/:versionId/comments', () => {
    it('adds comment and writes audit log', async () => {
      vi.spyOn(prisma.assetVersion, 'findUnique').mockResolvedValueOnce({
        id: 'ver-1',
        versionNumber: 1,
        asset: { id: 'asset-1', campaignId: 'camp-1' },
      } as unknown as Awaited<ReturnType<typeof prisma.assetVersion.findUnique>>);

      const mockComment = {
        id: 'comm-1',
        assetVersionId: 'ver-1',
        authorId: 'admin-id',
        body: 'Looks good!',
        createdAt: new Date(),
        author: { id: 'admin-id', name: 'Admin', email: 'admin@proofline.dev', role: Role.ADMIN },
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: unknown) => {
        const fn = callback as (tx: unknown) => Promise<unknown>;
        return fn({
          comment: { create: vi.fn().mockResolvedValue(mockComment) },
          auditLog: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const res = await request(app)
        .post('/api/versions/ver-1/comments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`])
        .send({ body: 'Looks good!' });

      expect(res.status).toBe(201);
      expect(res.body.comment.body).toBe('Looks good!');
    });

    it('rejects empty comment body (400)', async () => {
      const res = await request(app)
        .post('/api/versions/ver-1/comments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`])
        .send({ body: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 403 if CLIENT is not assigned to the campaign', async () => {
      vi.spyOn(prisma.assetVersion, 'findUnique').mockResolvedValueOnce({
        id: 'ver-1',
        versionNumber: 1,
        asset: { id: 'asset-1', campaignId: 'camp-unassigned' },
      } as unknown as Awaited<ReturnType<typeof prisma.assetVersion.findUnique>>);

      vi.spyOn(prisma.campaignMember, 'findUnique').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/versions/ver-1/comments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${clientToken}`])
        .send({ body: 'Test comment' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/audit-logs', () => {
    it('scopes audit logs to assigned campaigns for CLIENT', async () => {
      vi.spyOn(prisma.campaignMember, 'findMany').mockResolvedValueOnce([
        { campaignId: 'camp-client' },
      ] as unknown as Awaited<ReturnType<typeof prisma.campaignMember.findMany>>);

      const mockLogs = [
        {
          id: 'log-1',
          campaignId: 'camp-client',
          action: 'CAMPAIGN_CREATED',
          createdAt: new Date(),
          actor: { id: 'admin-id', name: 'Admin', email: 'admin@proofline.dev', role: Role.ADMIN },
          campaign: { id: 'camp-client', name: 'Client Campaign', clientName: 'Client' },
          asset: null,
        },
      ];

      vi.spyOn(prisma.auditLog, 'findMany').mockResolvedValueOnce(
        mockLogs as unknown as Awaited<ReturnType<typeof prisma.auditLog.findMany>>
      );

      const res = await request(app)
        .get('/api/audit-logs')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${clientToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.auditLogs).toHaveLength(1);
    });

    it('returns 403 if CLIENT queries audit logs of an unassigned campaign', async () => {
      vi.spyOn(prisma.campaignMember, 'findMany').mockResolvedValueOnce([
        { campaignId: 'camp-assigned' },
      ] as unknown as Awaited<ReturnType<typeof prisma.campaignMember.findMany>>);

      const res = await request(app)
        .get('/api/audit-logs?campaignId=camp-unassigned')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${clientToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
