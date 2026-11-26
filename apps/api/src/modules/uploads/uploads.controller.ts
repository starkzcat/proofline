import type { Request, Response } from 'express';
import type { PresignUploadInput } from '@proofline/shared';
import fs from 'fs';
import path from 'path';
import { createPresignedUploadUrl } from '../../config/s3.js';

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), '.uploads');

export async function presignUpload(req: Request, res: Response): Promise<void> {
  const { fileName, mimeType, fileSizeBytes } = req.body as PresignUploadInput;

  const result = await createPresignedUploadUrl({
    fileName,
    mimeType,
    fileSizeBytes,
  });

  res.status(200).json(result);
}

export function handleLocalUpload(req: Request, res: Response): void {
  const key = req.params[0];
  if (!key) {
    res.status(400).json({ error: { code: 'INVALID_KEY', message: 'Missing file key' } });
    return;
  }

  const targetPath = path.join(LOCAL_STORAGE_DIR, key);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  const bodyData = req.body as Buffer;
  if (Buffer.isBuffer(bodyData)) {
    fs.writeFileSync(targetPath, bodyData);
  } else {
    // Write empty or fallback
    fs.writeFileSync(targetPath, Buffer.from([]));
  }

  res.status(200).json({ success: true, key });
}

export function getLocalUploadedFile(req: Request, res: Response): void {
  const key = req.params[0];
  const targetPath = path.join(LOCAL_STORAGE_DIR, key);

  if (!fs.existsSync(targetPath)) {
    res.status(404).send('File not found');
    return;
  }

  res.sendFile(targetPath);
}
