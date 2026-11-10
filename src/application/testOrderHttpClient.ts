import type { PrintSnapshot } from './operationsFinance';
import type { TestCheckoutImportRequest, TestOrderClient, TestOrderPage, TestOrderReply, TestOrderRequest } from './testOrderAccess';
import { fixtureId } from './stagingOperationalOrders';
import { requireTestOrderOrigin, testOrderApiPath, testOrderHttpErrors } from './testOrderProtocol';

export interface TestOrderHttpClientOptions {
  origin: string; allowLoopback?: boolean; contextKey: string; tenantId: string; actorId: string;
  /** UID/session generation/tenant binding owned by the authenticated UI, never a visual role. */
  currentContextKey: () => string | null;
  getIdToken: () => Promise<string | null>;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}
/** Inject into the existing OrdersView. Tokens are held only for this request; no storage or retries. */
export function createTestOrderHttpClient(options: TestOrderHttpClientOptions): TestOrderClient & { importCheckout(request: TestCheckoutImportRequest): Promise<TestOrderReply> } {
  const origin = requireTestOrderOrigin(options.origin, options.allowLoopback);
  if (typeof window !== 'undefined' && window.location.origin !== origin) throw new Error('ORDER_ACCESS_ENDPOINT_INVALID');
  const { contextKey, tenantId, actorId, currentContextKey, getIdToken } = options;
  if (!contextKey || !fixtureId(tenantId) || !fixtureId(actorId)) throw new Error('ORDER_VIEW_CONTEXT_MISMATCH');
  const fetcher = options.fetch ?? globalThis.fetch, timeoutMs = options.timeoutMs ?? 15000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) throw new Error('ORDER_ACCESS_REQUEST_INVALID');
  const check = () => { if (currentContextKey() !== contextKey) throw new Error('ORDER_ACCESS_SESSION_CHANGED'); };
  async function send(action: string, request?: unknown) {
    check(); const body = JSON.stringify({ action, ...(request === undefined ? {} : { request: structuredClone(request) }) });
    if (new TextEncoder().encode(body).byteLength > 16384) throw new Error('ORDER_ACCESS_PAYLOAD_TOO_LARGE');
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      let token: string | null;
      try { token = await getIdToken(); } catch { throw new Error('ORDER_ACCESS_UNAUTHENTICATED'); }
      check(); if (controller.signal.aborted) throw new Error('TEST_ORDER_TRANSPORT_UNAVAILABLE');
      if (typeof token !== 'string' || token.length > 8185 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token) || token.trim() !== token) throw new Error('ORDER_ACCESS_UNAUTHENTICATED');
      const result = await fetcher(origin + testOrderApiPath, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body, credentials: 'omit', cache: 'no-store', redirect: 'error', mode: 'same-origin', referrerPolicy: 'no-referrer', signal: controller.signal });
      check(); if (controller.signal.aborted) throw new Error('TEST_ORDER_TRANSPORT_UNAVAILABLE');
      if (result.redirected || !/^application\/json(?:;|$)/i.test(result.headers.get('content-type') ?? '') || !result.body) throw new Error('TEST_ORDER_TRANSPORT_UNAVAILABLE');
      const reader = result.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
      try {
        while (true) { const chunk = await reader.read(); check(); if (controller.signal.aborted) throw new Error('TEST_ORDER_TRANSPORT_UNAVAILABLE'); if (chunk.done) break; size += chunk.value.byteLength; if (size > 524288) throw new Error('ORDER_VIEW_CONTEXT_MISMATCH'); chunks.push(chunk.value); }
      } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
      const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      let envelope; try { envelope = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { throw new Error('TEST_ORDER_TRANSPORT_UNAVAILABLE'); }
      check();
      if (!envelope || envelope.mode !== 'TEST') throw new Error('ORDER_VIEW_CONTEXT_MISMATCH');
      if (result.status !== 200) {
        const code = envelope.error;
        if (typeof code === 'string' && Object.hasOwn(testOrderHttpErrors, code) && testOrderHttpErrors[code as keyof typeof testOrderHttpErrors] === result.status) throw new Error(code);
        throw new Error('TEST_ORDER_TRANSPORT_UNAVAILABLE');
      }
      if (envelope.tenantId !== tenantId || envelope.actorId !== actorId || !envelope.data || typeof envelope.data !== 'object' || Array.isArray(envelope.data)) throw new Error('ORDER_VIEW_CONTEXT_MISMATCH');
      return envelope.data;
    };
    try {
      return await Promise.race([run(), new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('TEST_ORDER_TRANSPORT_UNAVAILABLE')); }, timeoutMs); })]);
    } catch (cause) {
      check();
      if (cause instanceof Error && /^(?:ORDER_[A-Z_]+|TEST_ORDER_TRANSPORT_UNAVAILABLE)$/.test(cause.message)) throw cause;
      throw new Error('TEST_ORDER_TRANSPORT_UNAVAILABLE');
    } finally { if (timer !== undefined) clearTimeout(timer); controller.abort(); }
  }
  return Object.freeze({ contextKey, tenantId, actorId,
    list: async (): Promise<TestOrderPage> => send('list'),
    execute: async (request: TestOrderRequest): Promise<TestOrderReply> => send('execute', request),
    print: async (orderId: string, expectedRevision: number): Promise<PrintSnapshot> => send('print', { orderId, expectedRevision }),
    importCheckout: async (request: TestCheckoutImportRequest): Promise<TestOrderReply> => send('importCheckout', request),
  });
}
