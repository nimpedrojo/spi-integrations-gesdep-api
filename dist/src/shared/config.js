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
    GESDEP_CHROMIUM_PATH: z.string().optional(),
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
