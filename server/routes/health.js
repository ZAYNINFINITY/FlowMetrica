import { Router } from 'express';

export function createHealthRouter(service) {
  const router = Router();
  router.get('/', (_request, response) => {
    response.json(service());
  });
  return router;
}
