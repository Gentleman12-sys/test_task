import { google } from 'googleapis';
import type { TariffRecord, SheetConfig } from '#types/tariff.js';
import { logger } from '#utils/logger.js';

export class GoogleSheetsService {
  private static api: ReturnType<typeof google.sheets> | null = null;

  static async init(credentials: any) {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    this.api = google.sheets({ version: 'v4', auth });
    logger.info('Google Sheets API initialized');
  }

  static async updateSheet(config: SheetConfig, data: TariffRecord[]) {
    if (!this.api) throw new Error('Google Sheets not initialized');

    logger.info({ dataLength: data?.length, dataType: typeof data, isArray: Array.isArray(data) }, 'updateSheet called with');

    if (!data || !Array.isArray(data) || data.length === 0) {
      logger.warn({ data }, 'No data to export');
      return;
    }

    const sorted = [...data].sort((a, b) => a.coef - b.coef);
    const headers = ['Дата', 'NMID', 'Тип короба', 'Размер', 'Склад ID', 'Склад', 'Коэф.', 'Сумма', 'Регион ID', 'Регион'];
    const rows = sorted.map(r => [
      r.date, r.nmid, r.box_type_name, r.size || '',
      r.warehouse_id, r.warehouse_name, r.coef, r.amount,
      r.region_id, r.region_name
    ]);

    await this.api.spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: `${config.sheetName}!${config.range}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [headers, ...rows] },
    });

    logger.info(`Updated sheet ${config.spreadsheetId} (${rows.length} rows)`);
  }

  static async clearSheet(config: SheetConfig) {
    if (!this.api) throw new Error('Google Sheets not initialized');
    await this.api.spreadsheets.values.clear({
      spreadsheetId: config.spreadsheetId,
      range: `${config.sheetName}!${config.range}`,
    });
  }
}