import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const errorObj = err as { status?: number; statusCode?: number; code?: string; message?: string; stack?: string };
  const statusCode = errorObj.status || errorObj.statusCode || 500;
  const message = errorObj.message || 'Internal server error';
  const code = errorObj.code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');

  res.status(statusCode).json({
    error: {
      code,
      message: env.NODE_ENV === 'production' && statusCode === 500 ? 'Internal server error' : message,
      ...(env.NODE_ENV !== 'production' && errorObj.stack ? { stack: errorObj.stack } : {}),
    },
  });
}
