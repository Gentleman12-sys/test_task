import type { Request, Response, NextFunction } from 'express';
import { TariffDataService } from '#services/TariffDataService.js';
import { WbApiService } from '#services/WbApiService.js';

export class TariffController {
  static async getByDate(req: Request, res: Response, next: NextFunction) {
    try {
      const { date } = req.params;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Date format: YYYY-MM-DD' });
      }
      const data = await TariffDataService.getByDate(date);
      res.json({ date, count: data.length, data });
    } catch (err) { next(err); }
  }

  static async getLatest(req: Request, res: Response, next: NextFunction) {
    try {
      const date = await TariffDataService.getLatestDate();
      if (!date) return res.status(404).json({ message: 'No data' });
      const data = await TariffDataService.getByDate(date);
      res.json({ date, count: data.length, data });
    } catch (err) { next(err); }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await TariffDataService.getAllSorted();
      res.json({ count: data.length, data });
    } catch (err) { next(err); }
  }

  static async getByRange(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate required' });
      }
      const data = await TariffDataService.getByRange(String(startDate), String(endDate));
      res.json({ startDate, endDate, count: data.length, data });
    } catch (err) { next(err); }
  }

  static async save(req: Request, res: Response, next: NextFunction) {
    try {
      const { date } = req.params;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Date format: YYYY-MM-DD' });
      }
      if (!Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Body must be array' });
      }
      const count = await TariffDataService.saveTariffData(req.body, date);
      res.json({ message: 'Saved', count, date });
    } catch (err) { next(err); }
  }

  static async triggerSync(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await WbApiService.fetchTariffs();
      const today = new Date().toISOString().split('T')[0];
      const count = await TariffDataService.saveTariffData(items, today);
      res.json({ message: 'Manual sync complete', count, date: today });
    } catch (err) { next(err); }
  }
}