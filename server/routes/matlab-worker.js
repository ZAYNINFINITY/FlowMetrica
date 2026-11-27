import { Router } from 'express';

/** All worker calls authenticate with the short-lived token shown in Settings. */
function readToken(request) {
  const header = request.get('authorization') ?? '';
  const match = /^Bearer\s+([^\s]+)$/i.exec(header);
  return match?.[1] ?? request.body?.token ?? request.query?.token ?? null;
}

function sendError(response, error) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  response.status(status).json({
    status: 'error',
    error: {
      code: error.code ?? 'MATLAB_WORKER_FAILED',
      message: status >= 500 && !error.code
        ? 'The MATLAB worker could not complete the request.'
        : error.message,
    },
  });
}

function wrap(handler) {
  return async (request, response) => {
    try {
      await handler(request, response);
    } catch (error) {
      sendError(response, error);
    }
  };
}

export function createMatlabWorkerRouter(worker) {
  const router = Router();

  function requireWorker(response) {
    if (!worker?.available) {
      response.status(503).json({
        status: 'error',
        error: {
          code: 'MATLAB_WORKER_UNAVAILABLE',
          message: worker?.reason ?? 'The MATLAB Online worker is not configured.',
        },
      });
      return false;
    }
    return true;
  }

  router.post('/session', wrap(async (request, response) => {
    if (!requireWorker(response)) return;
    const apiBase = request.body?.apiBase
      ?? `${request.protocol}://${request.get('host')}/api/matlab/worker`;
    const session = await worker.createSession({ apiBase });
    // The token is returned exactly once. It is never written to Redis in clear text.
    response.json({ status: 'success', ...session });
  }));

  router.get('/session', wrap(async (request, response) => {
    if (!requireWorker(response)) return;
    response.json({ status: 'success', ...(await worker.getSessionStatus(readToken(request))) });
  }));

  router.post('/job', wrap(async (request, response) => {
    if (!requireWorker(response)) return;
    const job = await worker.enqueue({ ...request.body, token: readToken(request) });
    response.json({ status: 'success', ...job });
  }));

  // Called by the MATLAB Online worker itself through webread.
  router.get('/next', wrap(async (request, response) => {
    if (!requireWorker(response)) return;
    response.json({ status: 'success', ...(await worker.nextJob(readToken(request))) });
  }));

  // Called by the MATLAB Online worker itself through webwrite.
  router.post('/result', wrap(async (request, response) => {
    if (!requireWorker(response)) return;
    const submitted = await worker.submitResult(readToken(request), request.body ?? {});
    response.json({ status: 'success', ...submitted });
  }));

  // Called by the browser while a worker job is running.
  router.get('/poll', wrap(async (request, response) => {
    if (!requireWorker(response)) return;
    response.json({ status: 'success', ...(await worker.poll(readToken(request), request.query?.jobId)) });
  }));

  return router;
}
