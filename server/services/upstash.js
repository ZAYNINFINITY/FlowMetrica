/**
 * Minimal Upstash Redis REST client.
 *
 * The app needs only five commands and a pipeline, so a dependency-free fetch
 * wrapper keeps the Vercel function small. Credentials stay server-side.
 */
const REQUEST_TIMEOUT_MS = 8_000;

export function createUpstashRestClient({
  url,
  token,
  fetchImpl = globalThis.fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) {
  const baseUrl = String(url ?? '').trim().replace(/\/+$/, '');
  const secret = String(token ?? '').trim();

  if (!/^https:\/\/[^\s]+$/.test(baseUrl)) {
    throw new Error('UPSTASH_REDIS_REST_URL must be an HTTPS URL.');
  }
  if (!secret) throw new Error('UPSTASH_REDIS_REST_TOKEN is missing.');
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.');

  async function send(path, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Upstash returned HTTP ${response.status}.`);
      const payload = await response.json();
      if (payload?.error) throw new Error(String(payload.error));
      return payload;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    /** Single command: result is the value Redis returned. */
    async command(...args) {
      const payload = await send('', args);
      return payload.result;
    },

    /** Pipeline: keeps per-command errors instead of failing the whole batch. */
    async pipeline(commands) {
      const rows = await send('/pipeline', commands);
      if (!Array.isArray(rows)) throw new Error('Upstash pipeline returned an unexpected response.');
      return rows.map((row) =>
        row && Object.hasOwn(row, 'error') ? { error: String(row.error) } : { result: row?.result },
      );
    },
  };
}
