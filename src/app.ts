import 'dotenv/config';
import express from 'express';
import knex from '#postgres/knex.js';
import tariffRoutes from '#routes/tariff.routes.js';
import { SchedulerService } from '#services/SchedulerService.js';
import { GoogleSheetsService } from '#services/GoogleSheetsService.js';
import { logger } from '#utils/logger.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

app.use(express.json());
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.use('/api/tariff', tariffRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error:');
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Server error' : err.message });
});

async function bootstrap() {
  try {
    // Миграции уже в entrypoint.sh — не запускаем здесь

    if (process.env.GOOGLE_SERVICE_ACCOUNT) {
      const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
      await GoogleSheetsService.init(creds);
      
      const sheets = process.env.GOOGLE_SHEETS_CONFIG 
        ? JSON.parse(process.env.GOOGLE_SHEETS_CONFIG) 
        : [];
    }

    // Сначала запустить синхронизацию тарифов
    SchedulerService.startTariffSync(process.env.TARIFF_SYNC_CRON);

    // Подождать 5 секунд, чтобы данные успели сохраниться
    if (process.env.GOOGLE_SERVICE_ACCOUNT && process.env.GOOGLE_SHEETS_CONFIG) {
      setTimeout(() => {
        SchedulerService.startSheetsSync(
          JSON.parse(process.env.GOOGLE_SHEETS_CONFIG!), 
          process.env.SHEETS_SYNC_CRON
        );
      }, 5000); // 5 секунд задержки
    }

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server listening on port ${PORT}`);
    });

  } catch (err) {
    logger.error({ err }, 'Bootstrap failed');
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  SchedulerService.stopAll();
  knex.destroy().then(() => process.exit(0));
});

bootstrap();

export default app;