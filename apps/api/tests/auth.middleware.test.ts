import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { Role } from '@proofline/shared';
import { authenticate, requireRole } from '../src/middleware/auth.js';
import { AUTH_COOKIE_NAME, signToken } from '../src/modules/auth/auth.utils.js';

describe('Auth Middleware', () => {
  describe('authenticate', () => {
    it('returns 401 when no token is present in cookies or Authorization header', () => {
      const req = { cookies: {}, headers: {} } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please log in.',
        },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when token is invalid', () => {
      const req = { cookies: { [AUTH_COOKIE_NAME]: 'tampered.token' }, headers: {} } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired session token.',
        },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('authenticates successfully from cookie and populates req.user', () => {
      const token = signToken({
        userId: 'admin-1',
        email: 'admin@proofline.dev',
        role: Role.ADMIN,
      });

      const req = { cookies: { [AUTH_COOKIE_NAME]: token }, headers: {} } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user?.userId).toBe('admin-1');
      expect(req.user?.role).toBe(Role.ADMIN);
    });

    it('authenticates successfully from Bearer header', () => {
      const token = signToken({
        userId: 'marketer-1',
        email: 'marketer@proofline.dev',
        role: Role.MARKETER,
      });

      const req = {
        cookies: {},
        headers: { authorization: `Bearer ${token}` },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user?.role).toBe(Role.MARKETER);
    });
  });

  describe('requireRole', () => {
    it('returns 401 if user is not attached to request', () => {
      const req = {} as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      requireRole(Role.ADMIN)(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 if user role is not in allowedRoles', () => {
      const req = {
        user: { userId: 'client-1', email: 'client@proofline.dev', role: Role.CLIENT },
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      requireRole(Role.ADMIN, Role.MARKETER)(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'FORBIDDEN',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next if user role is allowed', () => {
      const req = {
        user: { userId: 'admin-1', email: 'admin@proofline.dev', role: Role.ADMIN },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      requireRole(Role.ADMIN)(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
