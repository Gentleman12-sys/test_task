import axios from 'axios';
import type { WbTariffItem } from '#types/tariff';
import { logger } from '#utils/logger.js';

const API_URL = process.env.WB_API_BASE || 'https://common-api.wildberries.ru/api/v1/tariffs/box';
const API_KEY = process.env.WB_API_KEY;

if (!API_KEY) {
  logger.warn({ missing: 'WB_API_KEY' }, 'API key not set — requests will fail');
}

// 🔹 Тип ответа WB API (реальная структура + индекс для fallback)
interface WbApiResponse {
  response?: {
    data?: {
      dtNextBox?: string;
      dtTillMax?: string;
      warehouseList?: WbWarehouseItem[];
    };
  };
  error?: { code: number; message: string };
  // 🔹 Индекс-сигнатура для fallback-полей (data, tariffs, items...)
  [key: string]: unknown;
}

interface WbWarehouseItem {
  boxDeliveryBase?: string;
  boxDeliveryCoefExpr?: string;
  boxDeliveryLiter?: string;
  boxDeliveryMarketplaceBase?: string;
  boxDeliveryMarketplaceCoefExpr?: string;
  boxDeliveryMarketplaceLiter?: string;
  boxStorageBase?: string;
  boxStorageCoefExpr?: string;
  boxStorageLiter?: string;
  geoName?: string;
  warehouseName?: string;
  [key: string]: unknown; // для любых доп. полей
}

export class WbApiService {
  private static readonly TIMEOUT = 30_000;
  private static readonly RETRIES = 3;

  /**
   * Парсит ответ WB API в наш формат TariffRecord
   */
  private static parseWarehouseItem(
    item: WbWarehouseItem,
    date: string
  ): WbTariffItem | null {
    try {
      // Helper: конвертировать "0,07" → 0.07
      const parseDecimal = (val?: string): number => {
        if (!val) return 0;
        return parseFloat(val.replace(',', '.'));
      };

      // 🔹 Маппинг полей WB → наш формат
      return {
        nmid: 0, // API коробов не возвращает nmid
        box_type_name: 'Box', // заглушка
        size: null,
        warehouse_id: Math.abs(WbApiService.stringHashCode(item.warehouseName ?? '')) % 10000,
        warehouse_name: item.warehouseName || 'Unknown',
        coef: parseDecimal(item.boxDeliveryCoefExpr) / 100, // CoefExpr в сотых → нормализуем
        amount: parseDecimal(item.boxDeliveryBase),
        region_id: Math.abs(WbApiService.stringHashCode(item.geoName ?? '')) % 1000,
        region_name: item.geoName || 'Unknown',
      };
    } catch (err) {
      logger.warn({ error: String(err), item }, 'Failed to parse warehouse item');
      return null;
    }
  }

  /**
   * HashCode helper для string
   */
  private static stringHashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  static async fetchTariffs(date?: string): Promise<WbTariffItem[]> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      throw new Error(`Invalid date format: ${targetDate}. Use YYYY-MM-DD`);
    }

    if (!API_KEY) {
      throw new Error('WB_API_KEY is required but not set');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.RETRIES; attempt++) {
      try {
        logger.info({ date: targetDate, attempt, total: this.RETRIES }, 'Fetching WB tariffs');

        const { data } = await axios.get<WbApiResponse>(API_URL, {
          timeout: this.TIMEOUT,
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
          },
          params: { date: targetDate },
        });

        // Парсинг реальной структуры ответа
        const warehouseList = data?.response?.data?.warehouseList;
        
        if (!Array.isArray(warehouseList)) {
          // Логирование с правильным синтаксисом Pino
          logger.warn(
            { 
              hasResponse: !!data?.response, 
              hasData: !!data?.response?.data,
              warehouseListType: typeof warehouseList,
              rawKeys: Object.keys(data || {}).slice(0, 10)
            }, 
            'Unexpected response structure'
          );
          
          // Fallback: ищем массив в других полях
          const fallback = (data as any)?.data ?? (data as any)?.tariffs ?? (data as any)?.items ?? [];
          if (Array.isArray(fallback) && fallback.length > 0) {
            logger.info({ count: fallback.length }, 'Using fallback array');
            return fallback as WbTariffItem[];
          }
          
          throw new Error('No warehouseList found in API response');
        }

        logger.info({ count: warehouseList.length }, 'Fetched warehouse items');

        // Конвертируем в наш формат
        const parsed = warehouseList
          .map(item => this.parseWarehouseItem(item as WbWarehouseItem, targetDate))
          .filter((item): item is WbTariffItem => item !== null);

        logger.info({ parsed: parsed.length }, 'Parsed tariff records');
        return parsed;

      } catch (error: any) {
        lastError = error;
        const statusCode = error.response?.status;
        const responseData = error.response?.data;
        
        // Логирование ошибки с правильным синтаксисом Pino
        logger.warn(
          { 
            attempt, 
            httpStatus: statusCode, 
            message: error.message,
            responseData: JSON.stringify(responseData)?.substring(0, 300)
          }, 
          'Fetch attempt failed'
        );
        
        if (attempt < this.RETRIES) {
          await new Promise(res => setTimeout(res, 1000 * attempt));
        }
      }
    }

    logger.error({ date: targetDate, attempts: this.RETRIES }, 'Failed to fetch WB tariffs');
    throw lastError || new Error('WB API fetch failed');
  }
}