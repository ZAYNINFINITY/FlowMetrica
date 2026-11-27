import { Router } from 'express';

export function createExecuteRouter(executor) {
  const router = Router();

  router.post('/', async (request, response, next) => {
    try {
      const outcome = await executor.execute(request.body);
      // worker_pending is a normal polling state, not a failed request.
      const statusCode =
        outcome.status === 'success' || outcome.status === 'worker_pending'
          ? 200
          : outcome.status === 'unavailable'
            ? 503
            : 400;
      response.status(statusCode).json(outcome);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
