import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { Role } from '@proofline/shared';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { AUTH_COOKIE_NAME, signToken } from '../src/modules/auth/auth.utils.js';

describe('Auth Endpoints & Routes', () => {
  describe('GET /api/health', () => {
    it('returns 200 with status ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('404 Handler', () => {
    it('returns structured 404 error for unknown routes', async () => {
      const res = await request(app).get('/api/unknown-endpoint');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/auth/login Validation', () => {
    it('returns 400 when email is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'Password123!' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@proofline.dev', password: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/demo-switch', () => {
    it('returns 400 when role is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/demo-switch')
        .send({ role: 'SUPERUSER' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 403 when demo mode is disabled', async () => {
      const { env } = await import('../src/config/env.js');
      const originalValue = env.ENABLE_DEMO_MODE;
      (env as { ENABLE_DEMO_MODE: boolean }).ENABLE_DEMO_MODE = false;

      const res = await request(app)
        .post('/api/auth/demo-switch')
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');

      (env as { ENABLE_DEMO_MODE: boolean }).ENABLE_DEMO_MODE = originalValue;
    });

    it('switches to demo role and sets auth cookie', async () => {
      // Mock prisma.user.findUnique
      const mockUser = {
        id: 'admin-user-id',
        email: 'admin@proofline.dev',
        name: 'Alex Rivera (Admin)',
        role: Role.ADMIN,
        createdAt: new Date(),
      };

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(
        mockUser as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>
      );

      const res = await request(app)
        .post('/api/auth/demo-switch')
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('admin@proofline.dev');
      expect(res.body.user.role).toBe('ADMIN');
      // Must not leak passwordHash
      expect(res.body.user.passwordHash).toBeUndefined();

      // Verify cookie is set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const authCookie = cookies.find((c: string) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
      expect(authCookie).toBeDefined();
      expect(authCookie).toContain('HttpOnly');
      expect(authCookie).toContain('SameSite=Lax');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('returns 200 and clears proofline_token cookie', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Logged out');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const authCookie = cookies.find((c: string) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
      expect(authCookie).toBeDefined();
      // Cleared cookies typically have Max-Age=0 or expires in past
      expect(authCookie).toMatch(/Max-Age=0|expires=/i);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns current user when valid cookie is provided', async () => {
      const token = signToken({
        userId: 'admin-user-id',
        email: 'admin@proofline.dev',
        role: Role.ADMIN,
      });

      const mockUser = {
        id: 'admin-user-id',
        email: 'admin@proofline.dev',
        name: 'Alex Rivera (Admin)',
        role: Role.ADMIN,
        createdAt: new Date().toISOString(),
      };

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(
        mockUser as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBe('admin-user-id');
      expect(res.body.user.role).toBe('ADMIN');
      expect(res.body.user.passwordHash).toBeUndefined();
    });
  });
});
