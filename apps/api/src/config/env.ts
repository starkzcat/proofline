import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/proofline'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').default('ci-test-secret-key-min-32-characters-proofline'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  ENABLE_DEMO_MODE: z
    .string()
    .default('true')
    .transform((val) => val === 'true' || val === '1'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().default('proofline-assets'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);
