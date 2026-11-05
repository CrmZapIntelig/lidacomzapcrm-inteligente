import type { Auth } from 'firebase-admin/auth';
import type { OrderEnvironment } from '../services/staging/operationalOrderStore';
import { requireOrderEnvironment } from '../services/staging/operationalOrderStore';
import type { VerifiedTestOrderPrincipal } from '../services/staging/testOrderAccessService';
import { fixtureId } from '../src/application/stagingOperationalOrders';
import { testOrderCapabilities } from '../src/application/testOrderAccess';
import type { TestOrderCapability } from '../src/application/testOrderAccess';

export interface TestOrderMembership {
  tenantId: string;
  actorId: string;
  capabilities: readonly TestOrderCapability[];
  expiresAt: number;
}
/** Server-owned membership source, indexed only by the UID verified by Firebase Admin.
 * No memberships or role defaults are provisioned by this adapter. */
export type TestOrderMembershipLookup = (uid: string) => Promise<TestOrderMembership | null>;

/** Instantiate with getAuth(an explicitly configured staging Admin app) at the HTTP boundary.
 * Each request verifies signature, project, expiry, disabled user and revocation through Admin.
 * Unit tests substitute Auth; they do not prove a live Firebase login. No endpoint is exported. */
export function createFirebaseTestOrderResolver(auth: Pick<Auth, 'app' | 'verifyIdToken'>,
  environment: OrderEnvironment, tenantId: string, lookup: TestOrderMembershipLookup, now = Date.now) {
  const config = { ...environment }, projectId = 'lidacomzapcrm-staging';
  function guard() {
    requireOrderEnvironment(config, tenantId);
    if (auth.app.options.projectId !== projectId || process.env.FIREBASE_AUTH_EMULATOR_HOST !== undefined || process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT !== projectId) throw new Error('ORDER_IDENTITY_CONFIGURATION_INVALID');
  }
  guard();
  return async (authorization: string | undefined): Promise<VerifiedTestOrderPrincipal | null> => {
    guard();
    // Accept a single bounded bearer token, never cookies, query tokens or custom identity headers.
    if (typeof authorization !== 'string' || authorization.length > 8192 || authorization.trim() !== authorization || !/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/i.test(authorization)) throw new Error('ORDER_ACCESS_UNAUTHENTICATED');
    let token;
    try { token = await auth.verifyIdToken(authorization.slice(7), true); }
    catch { throw new Error('ORDER_ACCESS_UNAUTHENTICATED'); }
    guard();
    const time = now();
    if (!Number.isFinite(time) || !token || typeof token.uid !== 'string' || token.uid.length < 1 || token.uid.length > 128 || token.sub !== token.uid || token.aud !== projectId || token.iss !== `https://securetoken.google.com/${projectId}` || !Number.isSafeInteger(token.exp) || token.exp * 1000 <= time || !Number.isSafeInteger(token.iat) || token.iat * 1000 > time || !Number.isSafeInteger(token.auth_time) || token.auth_time * 1000 > time || !token.firebase || token.firebase.sign_in_provider === 'anonymous' || token.firebase.tenant !== undefined) throw new Error('ORDER_ACCESS_UNAUTHENTICATED');
    // Firebase identity alone grants nothing; browser roles/custom claims are deliberately unused.
    const membership = structuredClone(await lookup(token.uid));
    guard();
    if (!membership) return null;
    if (Object.keys(membership).some(k => !['tenantId', 'actorId', 'capabilities', 'expiresAt'].includes(k)) || membership.tenantId !== tenantId || typeof membership.actorId !== 'string' || !fixtureId(membership.actorId) || !Array.isArray(membership.capabilities) || membership.capabilities.some(c => !testOrderCapabilities.includes(c)) || new Set(membership.capabilities).size !== membership.capabilities.length || !Number.isFinite(membership.expiresAt)) throw new Error('ORDER_ACCESS_DENIED');
    const expiresAt = Math.min(token.exp * 1000, membership.expiresAt), checkedAt = now();
    if (!Number.isFinite(checkedAt) || expiresAt <= checkedAt) throw new Error('ORDER_ACCESS_EXPIRED');
    return { mode: 'TEST', tenantId, actorId: membership.actorId, expiresAt, capabilities: membership.capabilities };
  };
}
