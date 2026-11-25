import { Router } from 'express';

import { MATLAB_ONLINE_HANDOFF, MATLAB_SETUP_CODE, MATLAB_SETUP_STEPS } from '../services/capabilities.js';

export function createMatlabRouter(matlabBridge) {
  const router = Router();

  // Static guidance only — this endpoint never echoes a token or certificate.
  router.get('/setup', (_request, response) => {
    response.json({
      status: 'success',
      bridge: matlabBridge.status(),
      instructions: MATLAB_SETUP_STEPS,
      setupCode: MATLAB_SETUP_CODE,
      matlabOnlineHandoff: MATLAB_ONLINE_HANDOFF,
    });
  });

  return router;
}
