import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { Role } from '@proofline/shared';
import { env } from '../../config/env.js';

export const AUTH_COOKIE_NAME = 'proofline_token';

export interface AuthJwtPayload {
  userId: string;
  email: string;
  role: Role;
}

export function signToken(payload: AuthJwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

export function verifyToken(token: string): AuthJwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthJwtPayload;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
  });
}
