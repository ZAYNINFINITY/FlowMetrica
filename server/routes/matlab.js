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

  // Credentials are held only in the bridge's memory. The response contains
  // status flags only — never the URL token or certificate contents.
  router.post('/configure', (request, response) => {
    try {
      const bridge = matlabBridge.configure({
        url: request.body?.url,
        token: request.body?.token,
        certificatePath: request.body?.certificatePath,
      });
      // A credential change always requires a fresh explicit opt-in.
      executionMode.setMatlabLive(false);
      response.json({ status: 'success', bridge, execution: executionMode.get() });
    } catch (error) {
      response.status(400).json({
        status: 'error',
        error: {
          code: error.code ?? 'MATLAB_BAD_CONFIG',
          message: error.publicMessage ?? 'MATLAB configuration was rejected.',
        },
      });
    }
  });

  router.post('/clear', (_request, response) => {
    const bridge = matlabBridge.clear();
    executionMode.setMatlabLive(false);
    response.json({ status: 'success', bridge, execution: executionMode.get() });
  });

  // A runtime opt-in: OFF is always safe, ON requires a configured bridge.
  // Credentials are never accepted here — use /configure for those.
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
