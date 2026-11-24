import type { Request, Response } from 'express';
import { Role } from '@proofline/shared';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import {
  clearAuthCookie,
  comparePassword,
  setAuthCookie,
  signToken,
} from './auth.utils.js';

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      },
    });
    return;
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      },
    });
    return;
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role as Role,
  });

  setAuthCookie(res, token);

  res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
}

export function logout(_req: Request, res: Response): void {
  clearAuthCookie(res);
  res.status(200).json({
    message: 'Logged out successfully',
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'User account not found',
      },
    });
    return;
  }

  res.status(200).json({ user });
}

const DEMO_EMAILS: Record<Role, string> = {
  ADMIN: 'admin@proofline.dev',
  MARKETER: 'marketer@proofline.dev',
  CLIENT: 'client@proofline.dev',
};

export async function demoSwitch(req: Request, res: Response): Promise<void> {
  if (!env.ENABLE_DEMO_MODE) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Demo mode is disabled in this environment',
      },
    });
    return;
  }

  const { role } = req.body as { role: Role };
  const demoEmail = DEMO_EMAILS[role];

  if (!demoEmail) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: `Invalid demo role: ${role}`,
      },
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: demoEmail },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Demo user for role ${role} not found. Please run database seed.`,
      },
    });
    return;
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role as Role,
  });

  setAuthCookie(res, token);

  res.status(200).json({ user });
}
