/**
 * Tiny fetch wrapper so every module reports errors the same way.
 * Raw server strings never leak into the interface.
 */
export async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new Error('The local service could not be reached. Check that the API process is running.');
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('The local service returned a response that could not be read.');
  }

  if (!response.ok) {
    const error = new Error(payload?.error?.message ?? 'The request could not be completed.');
    // Callers need the server code (for example MEASUREMENT_IN_PROGRESS) to
    // choose the right state, but the message stays user-facing.
    error.code = payload?.error?.code ?? 'REQUEST_FAILED';
    error.status = response.status;
    throw error;
  }
  return payload;
}

export const getHealth = () => request('/api/health');

export function getScenarios(module) {
  const query = module ? `?module=${encodeURIComponent(module)}` : '';
  return request(`/api/scenarios${query}`);
}

export const getScenario = (module, id) =>
  request(`/api/scenarios/${encodeURIComponent(module)}/${encodeURIComponent(id)}`);

export function execute(payload) {
  return request('/api/execute', { method: 'POST', body: JSON.stringify(payload) });
}

/** Real Ookla speed test. Resolves with { status, measurement }. */
export const measureNetwork = () => request('/api/measure', { method: 'POST', body: JSON.stringify({}) });

/** Static MATLAB setup guidance. The payload never contains a token. */
export const getMatlabSetup = () => request('/api/matlab/setup');

/** Verify one exported fixture without persisting it on the server. */
export const verifyMatlabExport = (fixture) =>
  request('/api/matlab/verify-export', {
    method: 'POST',
    body: JSON.stringify({ fixture }),
  });
