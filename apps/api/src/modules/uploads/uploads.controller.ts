import type { Request, Response } from 'express';
import type { PresignUploadInput } from '@proofline/shared';
import { createPresignedUploadUrl } from '../../config/s3.js';

export async function presignUpload(req: Request, res: Response): Promise<void> {
  const { fileName, mimeType, fileSizeBytes } = req.body as PresignUploadInput;

  const result = await createPresignedUploadUrl({
    fileName,
    mimeType,
    fileSizeBytes,
  });

  res.status(200).json(result);
}
