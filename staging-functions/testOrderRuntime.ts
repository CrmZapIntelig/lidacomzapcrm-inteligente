import type { Auth } from 'firebase-admin/auth';
import type { Request } from 'firebase-functions/v2/https';
import type { AtomicJsonPort } from '../services/staging/durableInboundJournal';
import type { OrderEnvironment } from '../services/staging/operationalOrderStore';
import { requireOrderEnvironment } from '../services/staging/operationalOrderStore';
import type { TestCheckoutBinding } from '../services/staging/testOrderAccessService';
import { TestOrderAccessService } from '../services/staging/testOrderAccessService';
import { createTestOrderHttpHandler } from '../services/staging/testOrderHttp';
import type { TestOrderHttpResponse } from '../services/staging/testOrderHttp';
import { fixtureId } from '../src/application/stagingOperationalOrders';
import { testOrderCapabilities } from '../src/application/testOrderAccess';
import { requireTestOrderOrigin } from '../src/application/testOrderProtocol';
import { createFirebaseTestOrderResolver } from './testOrderIdentity';
import type { TestOrderMembership } from './testOrderIdentity';

export interface TestOrderRuntimeDependencies {
  auth: Pick<Auth, 'app' | 'verifyIdToken'>;
  port: AtomicJsonPort;
  checkout?: TestCheckoutBinding;
}
/** Structural subset of the Firebase onRequest request/Express response. Never re-encode req.body. */
export type TestOrderRuntimeRequest = Pick<Request, 'method' | 'originalUrl' | 'rawHeaders' | 'headers' | 'rawBody'>;
export interface TestOrderRuntimeResponse {
  status(code: number): unknown;
  set(headers: Record<string, string>): unknown;
  send(body: string): unknown;
}
interface EnabledConfiguration {
  schema: 1; mode: 'TEST'; enabled: true; environment: OrderEnvironment;
  tenantId: string; origin: string;
  memberships: (TestOrderMembership & { uid: string })[];
}
const fail = (): never => { throw new Error('ORDER_RUNTIME_CONFIGURATION_INVALID'); };
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const keys = (value: Record<string, unknown>, allowed: string[]) => Object.keys(value).every(k => allowed.includes(k));

/** Only a server-owned JSON string is accepted. Missing config is disabled; there are no role defaults,
 * environment-variable fallbacks, fixture identities, credential loading or cloud discovery here. */
function configuration(raw: string | undefined, now: () => number): EnabledConfiguration | null {
  if (raw === undefined) return null;
  if (typeof raw !== 'string' || Buffer.byteLength(raw, 'utf8') > 65536) return fail();
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return fail(); }
  if (!object(value) || value.schema !== 1 || value.mode !== 'TEST' || typeof value.enabled !== 'boolean') return fail();
  if (!value.enabled) {
    if (!keys(value, ['schema', 'mode', 'enabled'])) return fail();
    return null;
  }
  if (!keys(value, ['schema', 'mode', 'enabled', 'environment', 'tenantId', 'origin', 'memberships']) ||
      !object(value.environment) || !keys(value.environment, ['appEnv', 'projectId', 'operationalOrderWrites']) ||
      typeof value.tenantId !== 'string' || typeof value.origin !== 'string' ||
      !Array.isArray(value.memberships) || value.memberships.length < 1 || value.memberships.length > 128) return fail();
  try { requireOrderEnvironment(value.environment as unknown as OrderEnvironment, value.tenantId); requireTestOrderOrigin(value.origin); }
  catch { return fail(); }
  const checkedAt = now(), uids = new Set<string>(), actors = new Set<string>();
  if (!Number.isSafeInteger(checkedAt)) return fail();
  for (const member of value.memberships) {
    if (!object(member) || !keys(member, ['uid', 'tenantId', 'actorId', 'capabilities', 'expiresAt']) ||
        typeof member.uid !== 'string' || member.uid.length < 1 || member.uid.length > 128 || member.uid.trim() !== member.uid || /[\x00-\x1f\x7f]/.test(member.uid) ||
        uids.has(member.uid) || member.tenantId !== value.tenantId || typeof member.actorId !== 'string' || !fixtureId(member.actorId) || actors.has(member.actorId) ||
        !Array.isArray(member.capabilities) || !member.capabilities.includes('orders.read') ||
        member.capabilities.some(c => !testOrderCapabilities.includes(c)) || new Set(member.capabilities).size !== member.capabilities.length ||
        typeof member.expiresAt !== 'number' || !Number.isSafeInteger(member.expiresAt) || member.expiresAt <= checkedAt) return fail();
    uids.add(member.uid); actors.add(member.actorId);
  }
  return value as unknown as EnabledConfiguration;
}

const errorResponse = (status: number, code: string): TestOrderHttpResponse => ({ status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Origin' },
  body: JSON.stringify({ mode: 'TEST', error: code }),
});
/** Header duplicates must not be hidden by the framework's normalization (notably Authorization).
 * Proxy identity headers and req.body are intentionally unused. */
function headers(request: TestOrderRuntimeRequest): Record<string, string | undefined> {
  if (!Array.isArray(request.rawHeaders) || request.rawHeaders.length % 2 || !object(request.headers)) throw new Error('ORDER_ACCESS_REQUEST_INVALID');
  const selected = ['authorization', 'origin', 'content-type', 'cookie', 'content-length', 'transfer-encoding'];
  const result: Record<string, string | undefined> = {};
  for (let i = 0; i < request.rawHeaders.length; i += 2) {
    if (typeof request.rawHeaders[i] !== 'string' || typeof request.rawHeaders[i + 1] !== 'string') throw new Error('ORDER_ACCESS_REQUEST_INVALID');
    const name = request.rawHeaders[i].toLowerCase();
    if (!selected.includes(name)) continue;
    if (Object.hasOwn(result, name)) throw new Error('ORDER_ACCESS_REQUEST_INVALID');
    result[name] = request.rawHeaders[i + 1];
  }
  for (const name of selected) if (request.headers[name] !== result[name]) throw new Error('ORDER_ACCESS_REQUEST_INVALID');
  return result;
}

/** Composition artifact only: not imported by index.ts and never exports an onRequest function.
 * The reviewed deployment wrapper must supply real staging Auth/ports, without IAM changes here.
 * connect runs once, only after complete explicit configuration validation. */
export function createTestOrderRuntime(rawConfiguration?: string,
  connect?: (binding: { environment: OrderEnvironment; tenantId: string }) => TestOrderRuntimeDependencies,
  now: () => number = Date.now) {
  const config = configuration(rawConfiguration, now);
  let handler: ReturnType<typeof createTestOrderHttpHandler> | undefined;
  if (config) {
    if (!connect) return fail();
    try {
      const dependencies = connect({ environment: { ...config.environment }, tenantId: config.tenantId });
      const registry = new Map(config.memberships.map(({ uid, ...member }) => [uid, member]));
      const resolver = createFirebaseTestOrderResolver(dependencies.auth, config.environment, config.tenantId,
        async uid => structuredClone(registry.get(uid) ?? null), now);
      // Catch wrong checkout project/port/creation mode before serving any request, without I/O.
      new TestOrderAccessService(dependencies.port, config.environment, config.tenantId, async () => null, now, dependencies.checkout);
      if (!dependencies.port || typeof dependencies.port.transaction !== 'function') return fail();
      handler = createTestOrderHttpHandler({ environment: config.environment, tenantId: config.tenantId, origin: config.origin,
        port: dependencies.port, checkout: dependencies.checkout, resolvePrincipal: resolver, now });
    } catch { return fail(); }
  }
  let enabled = !!handler;
  return Object.freeze({
    disable() { enabled = false; handler?.disable(); },
    async handleHttp(request: TestOrderRuntimeRequest, response: TestOrderRuntimeResponse): Promise<void> {
      let result: TestOrderHttpResponse;
      if (!enabled || !handler) result = errorResponse(503, 'ORDER_ACCESS_DISABLED');
      else {
        try {
          const h = headers(request);
          result = await handler.handle({ method: request.method, path: request.originalUrl, origin: h.origin,
            authorization: h.authorization, contentType: h['content-type'], cookie: h.cookie, raw: request.rawBody });
        } catch { result = errorResponse(400, 'ORDER_ACCESS_REQUEST_INVALID'); }
      }
      response.status(result.status); response.set(result.headers); response.send(result.body);
    },
  });
}
