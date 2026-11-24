import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { env } from './env.js';
import { PRESIGNED_URL_EXPIRES_SECONDS } from '@proofline/shared';

export const s3Client = new S3Client({
  region: env.S3_REGION || 'auto',
  endpoint: env.S3_ENDPOINT || undefined,
  credentials:
    env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
      ? {
          accessKeyId: env.S3_ACCESS_KEY_ID,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        }
      : undefined,
  forcePathStyle: true,
});

export interface PresignUploadOptions {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
}

export interface PresignUploadResult {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
}

export async function createPresignedUploadUrl(
  options: PresignUploadOptions
): Promise<PresignUploadResult> {
  const sanitizedName = options.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileKey = `uploads/${Date.now()}-${crypto.randomUUID()}-${sanitizedName}`;

  let uploadUrl: string;
  if (env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY) {
    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: fileKey,
      ContentType: options.mimeType,
      ContentLength: options.fileSizeBytes,
    });
    uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRES_SECONDS,
    });
  } else {
    // In local dev/testing without active S3/R2 credentials:
    uploadUrl = `https://${env.S3_BUCKET}.mock-storage.local/${fileKey}?expires=${PRESIGNED_URL_EXPIRES_SECONDS}`;
  }

  const publicUrl = env.S3_PUBLIC_BASE_URL
    ? `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${fileKey}`
    : `https://${env.S3_BUCKET}.mock-storage.local/${fileKey}`;

  return {
    uploadUrl,
    fileKey,
    publicUrl,
  };
}
