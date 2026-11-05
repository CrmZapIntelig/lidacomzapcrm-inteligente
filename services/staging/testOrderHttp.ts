import type { AtomicJsonPort } from './durableInboundJournal';
import { requireOrderEnvironment } from './operationalOrderStore';
import type { OrderEnvironment } from './operationalOrderStore';
import { TestOrderAccessService } from './testOrderAccessService';
import type { TestCheckoutBinding, VerifiedTestOrderPrincipal } from './testOrderAccessService';
import type { TestCheckoutImportRequest, TestOrderRequest } from '../../src/application/testOrderAccess';
import { requireTestOrderOrigin, testOrderApiPath, testOrderHttpErrors } from '../../src/application/testOrderProtocol';

export interface TestOrderHttpRequest {
  method: string; path: string; origin?: string; authorization?: string; contentType?: string;
  cookie?: string; query?: Record<string, unknown>; raw: Uint8Array;
}
export interface TestOrderHttpResponse { status: number; headers: Record<string, string>; body: string }
export interface TestOrderHttpOptions {
  environment: OrderEnvironment; tenantId: string; origin: string; allowLoopback?: boolean;
  port: AtomicJsonPort; checkout?: TestCheckoutBinding;
  resolvePrincipal: (authorization: string | undefined) => Promise<VerifiedTestOrderPrincipal | null>;
  now?: () => number;
}
/** Framework-independent HTTP boundary. A runtime wrapper must forward the raw body/headers
 * and inject the Firebase Admin resolver. This does not export a public Cloud Function. */
export function createTestOrderHttpHandler(options: TestOrderHttpOptions) {
  const environment = { ...options.environment }, tenantId = options.tenantId;
  requireOrderEnvironment(environment, tenantId);
  const origin = requireTestOrderOrigin(options.origin, options.allowLoopback);
  const port = options.port, resolvePrincipal = options.resolvePrincipal, now = options.now ?? Date.now;
  const checkout = options.checkout ? { ...options.checkout, environment: { ...options.checkout.environment } } : undefined;
  let enabled = true;
  const active = new Set<TestOrderAccessService>();
  const response = (status: number, body: unknown): TestOrderHttpResponse => ({ status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin' }, body: JSON.stringify(body) });
  const error = (status: number, code: string) => response(status, { mode: 'TEST', error: code });
  return {
    disable() { enabled = false; for (const service of active) service.disable(); },
    async handle(request: TestOrderHttpRequest): Promise<TestOrderHttpResponse> {
      let service: TestOrderAccessService | undefined;
      try {
        if (!enabled) return error(503, 'ORDER_ACCESS_DISABLED');
        requireOrderEnvironment(environment, tenantId);
        if (request.path !== testOrderApiPath) return error(404, 'ORDER_ACCESS_NOT_FOUND');
        if (request.method !== 'POST') return error(405, 'ORDER_ACCESS_METHOD_INVALID');
        if (request.origin !== origin || request.cookie) return error(403, 'ORDER_ACCESS_DENIED');
        if (Object.keys(request.query ?? {}).length || !/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.contentType ?? '')) return error(400, 'ORDER_ACCESS_REQUEST_INVALID');
        if (!(request.raw instanceof Uint8Array) || request.raw.byteLength === 0 || request.raw.byteLength > 16384) return error(413, 'ORDER_ACCESS_PAYLOAD_TOO_LARGE');
        let input: Record<string, unknown>;
        try { input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(request.raw)); }
        catch { return error(400, 'ORDER_ACCESS_REQUEST_INVALID'); }
        if (!input || Array.isArray(input) || typeof input !== 'object' || Object.keys(input).some(k => !['action', 'request'].includes(k)) || !['list', 'execute', 'print', 'importCheckout'].includes(String(input.action))) return error(400, 'ORDER_ACCESS_REQUEST_INVALID');
        if (input.action === 'list' ? input.request !== undefined : !input.request || typeof input.request !== 'object' || Array.isArray(input.request)) return error(400, 'ORDER_ACCESS_REQUEST_INVALID');
        const authorization = request.authorization;
        let identity: VerifiedTestOrderPrincipal | null = null;
        service = new TestOrderAccessService(port, environment, tenantId, async () => {
          identity = structuredClone(await resolvePrincipal(authorization)); return identity;
        }, now, checkout);
        active.add(service);
        let data: unknown;
        if (input.action === 'list') data = await service.list();
        else if (input.action === 'execute') data = await service.execute(input.request as TestOrderRequest);
        else if (input.action === 'importCheckout') data = await service.importCheckout(input.request as TestCheckoutImportRequest);
        else {
          const print = input.request as Record<string, unknown>;
          if (Object.keys(print).some(k => !['orderId', 'expectedRevision'].includes(k)) || typeof print.orderId !== 'string') return error(400, 'ORDER_ACCESS_REQUEST_INVALID');
          data = await service.print(print.orderId, print.expectedRevision as number);
        }
        if (!enabled) return error(503, 'ORDER_ACCESS_DISABLED');
        // A successful service call has validated the captured principal. Do not infer actor from request data.
        const principal = identity as VerifiedTestOrderPrincipal | null;
        if (!principal) return error(403, 'ORDER_ACCESS_DENIED');
        return response(200, { mode: 'TEST', tenantId, actorId: principal.actorId, data });
      } catch (cause) {
        const code = cause instanceof Error ? cause.message : '';
        if (Object.hasOwn(testOrderHttpErrors, code)) return error(testOrderHttpErrors[code as keyof typeof testOrderHttpErrors], code);
        if (['ORDER_STAGING_WRITES_DISABLED', 'PILOT_ORDER_WRITES_DISABLED', 'ORDER_IDENTITY_CONFIGURATION_INVALID', 'ORDER_ACCESS_CHECKOUT_DISABLED'].includes(code)) return error(503, 'ORDER_ACCESS_DISABLED');
        if (/^(?:ORDER|PILOT)_[A-Z_]+$/.test(code)) return error(422, 'ORDER_ACTION_REJECTED');
        // Unknown failures may occur after commit. Preserve the original command for an explicit retry.
        return error(503, 'TEST_ORDER_TRANSPORT_UNAVAILABLE');
      } finally { if (service) active.delete(service); }
    },
  };
}
