/**
 * The worker token is a short-lived browser session secret, not an Upstash
 * credential. sessionStorage keeps it across reloads but not across browsers.
 */
const STORAGE_KEY = 'flowmetrica.matlab-worker.v1';

const isSession = (value) =>
  value &&
  typeof value.token === 'string' &&
  typeof value.apiBase === 'string' &&
  typeof value.expiresAt === 'string' &&
  Number.isFinite(Date.parse(value.expiresAt));

export function readWorkerSession() {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? 'null');
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveWorkerSession({ token, apiBase, expiresAt, command, sessionId }) {
  const session = {
    token,
    apiBase,
    expiresAt,
    command,
    sessionId,
    startedAt: new Date().toISOString(),
  };
  if (!isSession(session)) return null;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage can be disabled; the current page still keeps the token in state.
  }
  return session;
}

export function clearWorkerSession() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

export function isWorkerSessionActive(session) {
  return Boolean(session && Date.parse(session.expiresAt) > Date.now());
}
