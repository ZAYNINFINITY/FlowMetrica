/**
 * API responses are stateful: health flags, saved fixtures and measurement ids can
 * change while the browser stays open. A cached 304 would keep showing stale data,
 * so every /api response must be fetched fresh.
 */
export function noStore(_request, response, next) {
  response.set('Cache-Control', 'no-store');
  next();
}
