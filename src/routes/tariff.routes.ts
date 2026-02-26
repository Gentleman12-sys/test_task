import { Router } from 'express';
import { TariffController } from '#controllers/tariff.controller.js';

const router = Router();

router.get('/dates', async (req, res, next) => {
  try {
    const { TariffDataService } = await import('#services/TariffDataService.js');
    const dates = await TariffDataService.getAllDates();
    res.json({ count: dates.length, dates });
  } catch (err) { next(err); }
});

router.get('/latest', TariffController.getLatest);
router.get('/all', TariffController.getAll);
router.get('/range', TariffController.getByRange);
router.get('/:date(\\d{4}-\\d{2}-\\d{2})', TariffController.getByDate);

router.post('/:date(\\d{4}-\\d{2}-\\d{2})', TariffController.save);
router.post('/sync', TariffController.triggerSync);

export default router;