/** One same-origin TEST route. No production endpoint or Firebase client is selected here. */
export const testOrderApiPath = '/api/test/orders';
export const testOrderHttpErrors = Object.freeze({
  ORDER_ACCESS_UNAUTHENTICATED: 401, ORDER_ACCESS_EXPIRED: 401, ORDER_ACCESS_DENIED: 403,
  ORDER_ACCESS_NOT_FOUND: 404, ORDER_ACCESS_REQUEST_INVALID: 400, ORDER_ACCESS_DISABLED: 503,
  ORDER_ACCESS_METHOD_INVALID: 405, ORDER_ACCESS_PAYLOAD_TOO_LARGE: 413,
  ORDER_REVISION_CONFLICT: 409, ORDER_TIMESTAMP_REGRESSION: 409, ORDER_IDEMPOTENCY_CONFLICT: 409,
  ORDER_ACTION_REJECTED: 422, TEST_ORDER_TRANSPORT_UNAVAILABLE: 503,
});
export function requireTestOrderOrigin(origin: string, allowLoopback = false) {
  let url: URL; try { url = new URL(origin); } catch { throw new Error('ORDER_ACCESS_ENDPOINT_INVALID'); }
  const staging = url.protocol === 'https:' && !url.port && (['lidacomzapcrm-staging.web.app', 'lidacomzapcrm-staging.firebaseapp.com'].includes(url.hostname) || /^lidacomzapcrm-staging--[a-z0-9-]+\.web\.app$/.test(url.hostname));
  const local = allowLoopback && url.protocol === 'http:' && url.hostname === '127.0.0.1';
  if ((!staging && !local) || url.origin !== origin || url.username || url.password || url.search || url.hash) throw new Error('ORDER_ACCESS_ENDPOINT_INVALID');
  return url.origin;
}
