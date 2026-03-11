import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.string().default('info'),
  GESDEP_BASE_URL: z.string().url().default('https://gesdep.net'),
  GESDEP_HEADLESS: z
    .string()
    .optional()
    .default('true')
    .transform((v) => v === 'true' || v === '1')
    .pipe(z.boolean()),
  GESDEP_DETAIL_CONCURRENCY: z.coerce.number().int().min(1).max(12).default(6),
  CACHE_TTL_TEAMS_SECONDS: z.coerce.number().int().min(1).default(300),
  CACHE_TTL_TEAMS_EXTENDED_SECONDS: z.coerce.number().int().min(1).default(1800),
  CACHE_TTL_PLAYER_SECONDS: z.coerce.number().int().min(1).default(3600),
  GESDEP_USERNAME: z.string(),
  GESDEP_PASSWORD: z.string(),
  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z.coerce.number().default(3306),
  DATABASE_USER: z.string(),
  DATABASE_PASSWORD: z.string(),
  DATABASE_NAME: z.string()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type AppConfig = typeof config;
