import { Router } from 'express';

import { MATLAB_ONLINE_HANDOFF, MATLAB_SETUP_CODE, MATLAB_SETUP_STEPS } from '../services/capabilities.js';

export function createMatlabRouter(matlabBridge, executionMode) {
  const router = Router();

  // Static guidance only — this endpoint never echoes a token or certificate.
  router.get('/setup', (_request, response) => {
    response.json({
      status: 'success',
      bridge: matlabBridge.status(),
      execution: executionMode.get(),
      instructions: MATLAB_SETUP_STEPS,
      setupCode: MATLAB_SETUP_CODE,
      matlabOnlineHandoff: MATLAB_ONLINE_HANDOFF,
    });
  });

  // A runtime opt-in: OFF is always safe, ON requires a configured bridge.
  // Credentials are never accepted here — they belong to the server environment.
  router.post('/enable', (request, response) => {
    const enabled = request.body?.enabled;
    if (typeof enabled !== 'boolean') {
      response.status(400).json({
        status: 'error',
        error: { code: 'INVALID_INPUT', message: 'enabled must be true or false.' },
      });
      return;
    }

    const bridge = matlabBridge.status();
    if (enabled && !bridge.configured) {
      response.status(409).json({
        status: 'error',
        error: {
          code: 'MATLAB_NOT_CONFIGURED',
          message: 'Configure a desktop MATLAB REST Function Service before enabling live execution.',
          reason: bridge.reason,
        },
      });
      return;
    }

    response.json({
      status: 'success',
      bridge,
      execution: executionMode.setMatlabLive(enabled),
    });
  });

  return router;
}
