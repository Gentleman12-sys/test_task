import knex from '#postgres/knex.js';
import type { TariffRecord, WbTariffItem } from '#types/tariff.js';
import { logger } from '#utils/logger.js';

const TABLE = 'tariff_data';

export class TariffDataService {
  static async saveTariffData(items: WbTariffItem[], date: string): Promise<number> {
    if (items.length === 0) return 0;

    const now = new Date();
    const records = items.map(item => ({
      ...item,
      date,
      created_at: now,
      updated_at: now,
    }));

    const result = await knex(TABLE)
      .insert(records)
      .onConflict(['date', 'nmid', 'warehouse_id', 'region_id'])
      .merge({
        box_type_name: knex.ref('excluded.box_type_name'),
        size: knex.ref('excluded.size'),
        warehouse_name: knex.ref('excluded.warehouse_name'),
        coef: knex.ref('excluded.coef'),
        amount: knex.ref('excluded.amount'),
        region_name: knex.ref('excluded.region_name'),
        updated_at: knex.ref('excluded.updated_at'),
      })
      .returning('id');

    return result.length;
  }

  static async getByDate(date: string): Promise<TariffRecord[]> {
    return knex(TABLE).where('date', date).orderBy('coef', 'asc');
  }

  static async getAllDates(): Promise<string[]> {
    const rows = await knex(TABLE).distinct('date').orderBy('date', 'desc');
    return rows.map((r: any) => r.date);
  }

  static async getLatestDate(): Promise<string | null> {
    const row = await knex(TABLE).max('date as latest').first();
    return row?.latest ?? null;
  }

  static async getAllSorted(): Promise<TariffRecord[]> {
    return knex(TABLE).orderBy('date', 'desc').orderBy('coef', 'asc');
  }

  static async getByRange(start: string, end: string): Promise<TariffRecord[]> {
    return knex(TABLE)
      .whereBetween('date', [start, end])
      .orderBy('date', 'desc')
      .orderBy('coef', 'asc');
  }

  static async getLatestSnapshot(): Promise<TariffRecord[]> {
    try {
      logger.info('Getting latest snapshot from DB...');

      // Сначала проверить, есть ли вообще данные
      const count = await knex('tariff_data').count('* as total').first();
      logger.info({ totalRecords: count?.total }, 'Total records in DB');

      // Проверить последние даты
      const dates = await knex('tariff_data').distinct('date').orderBy('date', 'desc').limit(5);
      logger.info({ availableDates: dates.map(d => d.date) }, 'Available dates');

      // Raw SQL запрос (оригинальный)
      const result = await knex.raw(`
      SELECT DISTINCT ON (nmid, warehouse_id, region_id) *
      FROM ??
      ORDER BY nmid, warehouse_id, region_id, date DESC, coef ASC
    `, ['tariff_data']);

      const rows = result?.rows || [];
      logger.info({ rawResult: !!result, rowCount: rows?.length }, 'Raw query result');

      if (!rows || rows.length === 0) {
        // 🔍 fallback: попробовать простой запрос
        logger.warn('Raw query returned empty, trying fallback query...');
        const fallback = await knex('tariff_data')
          .orderBy('date', 'desc')
          .orderBy('coef', 'asc')
          .limit(100);
        logger.info({ fallbackCount: fallback.length }, 'Fallback query result');
        return fallback;
      }

      logger.info({ count: rows.length }, 'Got snapshot data');
      return rows;

    } catch (err: any) {
      logger.error({ err: err.message, stack: err.stack }, 'getLatestSnapshot failed');
      return [];
    }
  }
}