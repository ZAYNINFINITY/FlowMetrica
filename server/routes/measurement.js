import { Router } from 'express';

export function createMeasurementRouter(measurementStore) {
  const router = Router();

  router.post('/', async (_request, response, next) => {
    try {
      const measurement = await measurementStore.run();
      response.json({ status: 'success', measurement });
    } catch (error) {
      if (!error.code?.startsWith('MEASUREMENT_')) {
        next(error);
        return;
      }
      response.status(error.code === 'MEASUREMENT_IN_PROGRESS' ? 409 : 503).json({
        status: 'unavailable',
        error: { code: error.code, message: error.publicMessage },
      });
    }
  });

  return router;
}
