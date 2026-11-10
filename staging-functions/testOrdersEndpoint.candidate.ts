import { onRequest } from 'firebase-functions/v2/https';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { GoogleAuth } from 'google-auth-library';
import { createDurableTestOrderRuntime } from './testOrderDurableRuntime';

/** REVIEW CANDIDATE ONLY: not imported by the deployed index/package main.
 * Public invocation is necessary for Firebase user tokens and requires an explicit release gate.
 * No key file, IAM modification, provider send or operational project fallback. */
const projectId = 'lidacomzapcrm-staging';
let runtime: ReturnType<typeof createDurableTestOrderRuntime> | undefined;
function getRuntime() {
  if (runtime) return runtime;
  if (process.env.GCLOUD_PROJECT !== projectId || process.env.FIRESTORE_EMULATOR_HOST !== undefined) throw new Error('ORDER_ACCESS_DISABLED');
  // No SDK initialization in disabled mode. Memberships are server-owned configuration, never HTTP input.
  runtime = createDurableTestOrderRuntime(process.env.TEST_ORDER_RUNTIME_CONFIG, {
    auth: () => getAuth(initializeApp({ projectId, credential: applicationDefault() }, 'private-orders-test-server')),
    freshAccessToken: async () => {
      if (process.env.GCLOUD_PROJECT !== projectId || process.env.FIRESTORE_EMULATOR_HOST !== undefined) throw new Error('ORDER_ACCESS_DISABLED');
      const credentials = new GoogleAuth({ projectId, scopes: ['https://www.googleapis.com/auth/datastore'] });
      if (await credentials.getProjectId() !== projectId) throw new Error('ORDER_ACCESS_DISABLED');
      const token = await credentials.getAccessToken();
      if (!token) throw new Error('ORDER_ACCESS_DISABLED');
      return token;
    },
    // Checkout import remains disabled until its trusted creation mode and source population are reviewed.
  });
  return runtime;
}
export const testOrdersApi = onRequest({ region: 'southamerica-east1', minInstances: 0, maxInstances: 1, concurrency: 1,
  timeoutSeconds: 60, memory: '256MiB', cpu: 1, cors: false,
  serviceAccount: 'crm-staging-runtime@lidacomzapcrm-staging.iam.gserviceaccount.com', invoker: 'public',
}, async (request, response) => {
  try { await getRuntime().handleHttp(request, response); }
  catch { response.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }).status(503).json({ mode: 'TEST', error: 'ORDER_ACCESS_DISABLED' }); }
});
