import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Role } from '@proofline/shared';
import { app } from '../src/app.js';
import { AUTH_COOKIE_NAME, signToken } from '../src/modules/auth/auth.utils.js';

describe('Uploads API', () => {
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

  describe('POST /api/uploads/presign', () => {
    it('allows MARKETER to request presigned upload URL for valid image', async () => {
      const res = await request(app)
        .post('/api/uploads/presign')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${marketerToken}`])
        .send({
          fileName: 'banner.png',
          mimeType: 'image/png',
          fileSizeBytes: 2 * 1024 * 1024,
        });

      expect(res.status).toBe(200);
      expect(res.body.uploadUrl).toBeDefined();
      expect(res.body.fileKey).toBeDefined();
      expect(res.body.publicUrl).toBeDefined();
    });

    it('rejects CLIENT from requesting presigned upload URL (403)', async () => {
      const res = await request(app)
        .post('/api/uploads/presign')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${clientToken}`])
        .send({
          fileName: 'banner.png',
          mimeType: 'image/png',
          fileSizeBytes: 2 * 1024 * 1024,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects file sizes exceeding 10MB (400)', async () => {
      const res = await request(app)
        .post('/api/uploads/presign')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${marketerToken}`])
        .send({
          fileName: 'oversized.png',
          mimeType: 'image/png',
          fileSizeBytes: 10 * 1024 * 1024 + 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects disallowed MIME types (400)', async () => {
      const res = await request(app)
        .post('/api/uploads/presign')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${marketerToken}`])
        .send({
          fileName: 'script.sh',
          mimeType: 'text/x-shellscript',
          fileSizeBytes: 1024,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
