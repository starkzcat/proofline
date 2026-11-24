import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { Role } from '@proofline/shared';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { AUTH_COOKIE_NAME, signToken } from '../src/modules/auth/auth.utils.js';

describe('Campaigns API', () => {
  const adminToken = signToken({
    userId: 'admin-user-id',
    email: 'admin@proofline.dev',
    role: Role.ADMIN,
  });

  const marketerToken = signToken({
    userId: 'marketer-user-id',
    email: 'marketer@proofline.dev',
    role: Role.MARKETER,
  });

  const clientToken = signToken({
    userId: 'client-user-id',
    email: 'client@proofline.dev',
    role: Role.CLIENT,
  });

  describe('POST /api/campaigns', () => {
    it('allows ADMIN to create a campaign and writes audit log', async () => {
      const mockCampaign = {
        id: 'camp-1',
        name: 'Fall Promo',
        clientName: 'Acme Corp',
        description: 'Promo launch',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: unknown) => {
        const fn = callback as (tx: unknown) => Promise<unknown>;
        return fn({
          campaign: {
            create: vi.fn().mockResolvedValue(mockCampaign),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
          },
        });
      });

      const res = await request(app)
        .post('/api/campaigns')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`])
        .send({
          name: 'Fall Promo',
          clientName: 'Acme Corp',
          description: 'Promo launch',
        });

      expect(res.status).toBe(201);
      expect(res.body.campaign.id).toBe('camp-1');
    });

    it('rejects MARKETER from creating a campaign (403)', async () => {
      const res = await request(app)
        .post('/api/campaigns')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${marketerToken}`])
        .send({
          name: 'Fall Promo',
          clientName: 'Acme Corp',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects CLIENT from creating a campaign (403)', async () => {
      const res = await request(app)
        .post('/api/campaigns')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${clientToken}`])
        .send({
          name: 'Fall Promo',
          clientName: 'Acme Corp',
        });

      expect(res.status).toBe(403);
    });

    it('rejects invalid body (empty name)', async () => {
      const res = await request(app)
        .post('/api/campaigns')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`])
        .send({
          name: '',
          clientName: 'Acme Corp',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/campaigns', () => {
    it('scopes campaigns to assigned campaigns for CLIENT', async () => {
      const mockCampaigns = [
        {
          id: 'camp-client-assigned',
          name: 'Client Campaign',
          clientName: 'Client Co',
          description: null,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
          members: [{ user: { id: 'client-user-id', name: 'Casey', email: 'client@proofline.dev', role: Role.CLIENT } }],
          assets: [{ id: 'asset-1', status: 'IN_REVIEW' }],
          _count: { assets: 1 },
        },
      ];

      vi.spyOn(prisma.campaign, 'findMany').mockResolvedValueOnce(
        mockCampaigns as unknown as Awaited<ReturnType<typeof prisma.campaign.findMany>>
      );

      const res = await request(app)
        .get('/api/campaigns')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${clientToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.campaigns).toHaveLength(1);
      expect(res.body.campaigns[0].pendingReviewCount).toBe(1);
      expect(res.body.campaigns[0].assetCount).toBe(1);
    });
  });

  describe('GET /api/campaigns/:id', () => {
    it('returns 403 if CLIENT is not assigned to the campaign', async () => {
      vi.spyOn(prisma.campaignMember, 'findUnique').mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/campaigns/unassigned-camp-id')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${clientToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
