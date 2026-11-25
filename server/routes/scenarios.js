import { Router } from 'express';

export function createScenariosRouter(store) {
  const router = Router();

  router.get('/', (request, response) => {
    const module = typeof request.query.module === 'string' ? request.query.module : undefined;
    response.json({ status: 'success', scenarios: store.list(module) });
  });

  router.get('/:module/:id', (request, response) => {
    const scenario = store.get(request.params.module, request.params.id);
    if (!scenario) {
      return response.status(404).json({
        status: 'error',
        error: { code: 'SCENARIO_NOT_FOUND', message: 'That predefined scenario does not exist.' },
      });
    }
    return response.json({ status: 'success', scenario });
  });

  return router;
}
