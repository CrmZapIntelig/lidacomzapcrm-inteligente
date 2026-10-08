import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { info } from 'firebase-functions/logger';
import { GoogleAuth } from 'google-auth-library';
import { MetaWhatsAppCloudProvider } from '../services/messaging/metaWhatsAppCloudProvider';
import { FirestoreAtomicJsonPort } from '../services/staging/firestoreAtomicPort';
import { StagingFirestoreHttp } from '../services/staging/firestoreHttp';
import { StagingMetaTestJournal, createMetaTestReceiver, runMetaTestWorker, metaVerificationAudit, metaTestBinding as binding } from '../services/staging/metaTestIngress';

const appSecret = defineSecret('meta-test-app-secret'), verifyToken = defineSecret('meta-test-verify-token');
const receiverIdentity = 'crm-meta-test-receiver@lidacomzapcrm-staging.iam.gserviceaccount.com';
const workerIdentity = 'crm-staging-runtime@lidacomzapcrm-staging.iam.gserviceaccount.com';
const auth = new GoogleAuth({ projectId: binding.projectId, scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
const http = new StagingFirestoreHttp({ appEnv: 'staging', projectId: binding.projectId }, async () => {
  if (await auth.getProjectId() !== binding.projectId) throw Error('STAGING_IDENTITY_REQUIRED');
  const token = await auth.getAccessToken(); if (!token) throw Error('STAGING_IDENTITY_REQUIRED'); return token;
});
// Empty human sender allowlist deliberately rejects every real sender until a human gate.
const journal = new StagingMetaTestJournal(new FirestoreAtomicJsonPort(http, binding.tenantId, binding.wabaId), { appEnv: 'staging', projectId: binding.projectId, metaMode: 'TEST' });
const validation = new MetaWhatsAppCloudProvider({ mode: 'STAGING', tenantId: binding.tenantId, wabaId: binding.wabaId, phoneNumberId: binding.phoneNumberId, appSecretRef: 'meta-test-app-secret', verifyTokenRef: 'meta-test-verify-token' }, {
  async resolve(tenant, ref) { if (tenant !== binding.tenantId) return undefined; return ref === 'meta-test-app-secret' ? appSecret.value() : ref === 'meta-test-verify-token' ? verifyToken.value() : undefined; }
});
const receiver = createMetaTestReceiver(validation, journal);
const limits = { region: 'southamerica-east1', minInstances: 0, maxInstances: 1, concurrency: 1, timeoutSeconds: 60, memory: '256MiB' as const, cpu: 1, cors: false };

export const metaTestReceiver = onRequest({ ...limits, invoker: 'public', serviceAccount: receiverIdentity, secrets: [appSecret, verifyToken] }, async (req, res) => {
  if (process.env.GCLOUD_PROJECT !== binding.projectId) { if (req.method === 'GET') info('META_TEST_VERIFICATION', { httpStatus: 503, reason: 'ENVIRONMENT_REJECTED' }); res.status(503).end(); return; }
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.query)) { if (typeof value !== 'string') { if (req.method === 'GET') info('META_TEST_VERIFICATION', { httpStatus: 400, reason: 'QUERY_NOT_SCALAR' }); res.status(400).end(); return; } query[key] = value; }
  const result = await receiver({ method: req.method, path: req.path, query, contentType: req.get('content-type'), signature: req.get('x-hub-signature-256'), raw: req.rawBody ?? new Uint8Array() });
  if (req.method === 'GET') {
    const tokenAvailable = !!verifyToken.value();
    // Compare only inside the receiver using the existing verifier; never export a credential.
    const tokenMatches = !!await validation.verifyChallenge({ 'hub.mode': 'subscribe', 'hub.challenge': '1', 'hub.verify_token': query['hub.verify_token'] ?? '' }, binding.tenantId);
    info('META_TEST_VERIFICATION', metaVerificationAudit({ method: 'GET', path: req.path, query, raw: new Uint8Array() }, result.status, tokenAvailable, tokenMatches));
  }
  res.set('Cache-Control', 'no-store').set('X-Content-Type-Options', 'nosniff').status(result.status).type('text/plain').send(result.body);
});

// No secret binding on worker, no public route, same admission journal and engine.
export const metaTestWorker = onRequest({ ...limits, invoker: [workerIdentity], serviceAccount: workerIdentity }, async (req, res) => {
  if (process.env.GCLOUD_PROJECT !== binding.projectId) { res.status(503).end(); return; }
  if (req.path !== '/worker') { res.status(404).end(); return; }
  if (req.method !== 'POST' || req.rawBody.length !== 0) { res.status(400).end(); return; }
  try { const result = await runMetaTestWorker(journal, new Date().toISOString()); res.set('Cache-Control', 'no-store').status(200).json(result); }
  catch { res.status(503).end(); }
});
