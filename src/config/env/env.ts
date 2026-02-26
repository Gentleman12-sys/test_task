import { z } from 'zod';

// Схема валидации переменных окружения
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
    // Server
    PORT: z.string().default('3000'),

    // Database (используем DB_* как в compose.yaml)
    DB_HOST: z.string().default('postgres'),
    DB_PORT: z.string().default('5432'),
    DB_NAME: z.string().default('postgres'),
    DB_USER: z.string().default('postgres'),
    DB_PASSWORD: z.string().default('postgres'),

    // Wildberries API
    WB_API_BASE: z.string().url().default('https://common-api.wildberries.ru/api/v1/tariffs/box'),

    // Google Sheets (опционально)
    GOOGLE_SERVICE_ACCOUNT: z.string().optional(),
    GOOGLE_SHEETS_CONFIG: z.string().optional(),

    // Scheduler
    TARIFF_SYNC_CRON: z.string().default('0 * * * *'),
    SHEETS_SYNC_CRON: z.string().default('0 */6 * * *'),
    TIMEZONE: z.string().default('Europe/Moscow'),

    // Logging
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

// Парсинг и экспорт
export const env = envSchema.parse(process.env);