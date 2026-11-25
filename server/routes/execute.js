import { Router } from 'express';

export function createExecuteRouter(executor) {
  const router = Router();

  router.post('/', async (request, response, next) => {
    try {
      const outcome = await executor.execute(request.body);
      const statusCode =
        outcome.status === 'success' ? 200 : outcome.status === 'unavailable' ? 503 : 400;
      response.status(statusCode).json(outcome);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
