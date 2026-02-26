import cron from 'node-cron';
import { WbApiService } from './WbApiService.js';
import { TariffDataService } from './TariffDataService.js';
import { GoogleSheetsService } from './GoogleSheetsService.js';
import type { SheetConfig } from '#types/tariff.js';
import { logger } from '#utils/logger.js';

export class SchedulerService {
  private static tasks: cron.ScheduledTask[] = [];

  static startTariffSync(cronExpr = '0 * * * *') {
    const job = cron.schedule(cronExpr, this.runTariffSync.bind(this), {
      scheduled: false,
      timezone: process.env.TIMEZONE || 'Europe/Moscow',
    });
    this.tasks.push(job);
    this.runTariffSync();
    job.start();
    logger.info(`Tariff sync scheduled: ${cronExpr}`);
  }

  private static async runTariffSync() {
    try {
      logger.info('Starting tariff sync...');

      // Передаём сегодняшнюю дату в YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0];
      const items = await WbApiService.fetchTariffs(today);

      const count = await TariffDataService.saveTariffData(items, today);
      logger.info(`Sync done: ${count} records for ${today}`);
    } catch (err: any) {
      logger.error(`Tariff sync failed: ${err.message}`);
    }
  }

  static startSheetsSync(configs: SheetConfig[], cronExpr = '0 */6 * * *') {
    const job = cron.schedule(cronExpr, () => this.runSheetsSync(configs), {
      scheduled: false,
      timezone: process.env.TIMEZONE || 'Europe/Moscow',
    });
    this.tasks.push(job);
    this.runSheetsSync(configs);
    job.start();
    logger.info(`Sheets sync scheduled: ${cronExpr}`);
  }

  private static async runSheetsSync(configs: SheetConfig[]) {
    try {
      logger.info('Starting sheets export...');
      const data = await TariffDataService.getLatestSnapshot();
      if (!data.length) {
        logger.warn('No data to export');
        return;
      }
      for (const cfg of configs) {
        try {
          await GoogleSheetsService.clearSheet(cfg);
          await GoogleSheetsService.updateSheet(cfg, data);
        } catch (err: any) {
          logger.error(`Failed to update ${cfg.spreadsheetId}: ${err.message}`);
        }
      }
      logger.info('Sheets export complete');
    } catch (err: any) {
      logger.error(`Sheets sync failed: ${err.message}`);
    }
  }

  static stopAll() {
    this.tasks.forEach(t => t.stop());
    this.tasks = [];
    logger.info('All scheduled tasks stopped');
  }
}