import type { Auth } from 'firebase-admin/auth';
import type { OrderCreationMode } from '../src/domain/types';
import { createFirestoreOrderPort } from '../services/staging/operationalOrderStore';
import { createFirestoreCheckoutPort } from '../services/staging/pilotCheckoutStore';
import { createTestOrderRuntime } from './testOrderRuntime';

/** Concrete staging ports, initialized only after enabled runtime configuration passes validation.
 * Credentials must be supplied explicitly by the host. No key file/discovery or live call on construction. */
export function createDurableTestOrderRuntime(rawConfiguration: string | undefined, dependencies: {
  auth: () => Pick<Auth, 'app' | 'verifyIdToken'>;
  freshAccessToken: () => Promise<string>;
  checkout?: { creationMode: OrderCreationMode };
}, now: () => number = Date.now) {
  const checkout = dependencies.checkout ? { ...dependencies.checkout } : undefined;
  const freshAccessToken = dependencies.freshAccessToken;
  return createTestOrderRuntime(rawConfiguration, ({ environment, tenantId }) => {
    const auth = dependencies.auth();
    const port = createFirestoreOrderPort(environment, tenantId, freshAccessToken);
    const sourceEnvironment = { appEnv: environment.appEnv, projectId: environment.projectId, pilotOrderWrites: 'TEST_ONLY' as const };
    return { auth, port, ...(checkout ? { checkout: {
      port: createFirestoreCheckoutPort(sourceEnvironment, tenantId, freshAccessToken), environment: sourceEnvironment, creationMode: checkout.creationMode,
    } } : {}) };
  }, now);
}
