import { describe, it, expect, vi } from 'vitest';
import type { Response } from 'express';
import { Role } from '@proofline/shared';
import {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
  comparePassword,
  hashPassword,
  setAuthCookie,
  signToken,
  verifyToken,
} from '../src/modules/auth/auth.utils.js';

describe('Auth Utilities', () => {
  describe('Password Hashing', () => {
    it('hashes passwords using bcrypt with salt rounds', async () => {
      const password = 'Password123!';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true);

      const isMatch = await comparePassword(password, hash);
      expect(isMatch).toBe(true);

      const isMismatch = await comparePassword('WrongPassword', hash);
      expect(isMismatch).toBe(false);
    });
  });

  describe('JWT Signing & Verification', () => {
    it('signs and verifies payload correctly', () => {
      const payload = {
        userId: 'user-cuid-123',
        email: 'admin@proofline.dev',
        role: Role.ADMIN,
      };

      const token = signToken(payload);
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);

      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(Role.ADMIN);
    });

    it('throws when verifying a tampered or invalid token', () => {
      expect(() => verifyToken('invalid.token.here')).toThrow();
    });
  });

  describe('Auth Cookie Utilities', () => {
    it('sets cookie with httpOnly, lax sameSite, and path /', () => {
      const mockRes = {
        cookie: vi.fn(),
      } as unknown as Response;

      setAuthCookie(mockRes, 'jwt-test-token');

      expect(mockRes.cookie).toHaveBeenCalledWith(
        AUTH_COOKIE_NAME,
        'jwt-test-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        })
      );
    });

    it('clears auth cookie with matching path', () => {
      const mockRes = {
        clearCookie: vi.fn(),
      } as unknown as Response;

      clearAuthCookie(mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        AUTH_COOKIE_NAME,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        })
      );
    });
  });
});
