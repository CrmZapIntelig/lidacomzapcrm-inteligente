import { onRequest } from 'firebase-functions/v2/https';
import { GoogleAuth } from 'google-auth-library';
import { MetaWhatsAppCloudProvider } from '../services/messaging/metaWhatsAppCloudProvider';
import { StagingDurableInboundJournal } from '../services/staging/durableInboundJournal';
import { FirestoreAtomicJsonPort } from '../services/staging/firestoreAtomicPort';
import { StagingFirestoreHttp } from '../services/staging/firestoreHttp';
import { createSyntheticStagingIngress } from '../services/staging/syntheticIngress';
export { metaTestReceiver, metaTestWorker } from './metaTest';

const projectId = 'lidacomzapcrm-staging';
const tenantId = 'demo-staging-TEST-managed';
// Public fixture material is not a Meta credential. IAM is the access boundary.
const fixture = new MetaWhatsAppCloudProvider({mode:'MOCK',tenantId,wabaId:'100',phoneNumberId:'200',appSecretRef:'TEST-signature',verifyTokenRef:'TEST-challenge'}, {
  async resolve(tenant, reference) { return tenant === tenantId ? reference === 'TEST-signature' ? 'TEST-synthetic-HMAC-only' : reference === 'TEST-challenge' ? 'TEST-synthetic-challenge-only' : undefined : undefined; }
});
const auth = new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform'],projectId});
const http = new StagingFirestoreHttp({appEnv:'staging',projectId},async()=>{
  if (await auth.getProjectId() !== projectId) throw new Error('STAGING_IDENTITY_REQUIRED');
  const token = await auth.getAccessToken();
  if (!token) throw new Error('STAGING_IDENTITY_REQUIRED');
  return token;
});
const journal = new StagingDurableInboundJournal(new FirestoreAtomicJsonPort(http,tenantId,'100'),tenantId,'100');
const handle = createSyntheticStagingIngress(fixture,journal);
export const stagingIngress = onRequest({region:'southamerica-east1',minInstances:0,maxInstances:1,concurrency:1,timeoutSeconds:60,memory:'256MiB',cpu:1,
  serviceAccount:'crm-staging-runtime@lidacomzapcrm-staging.iam.gserviceaccount.com',invoker:['crm-staging-runtime@lidacomzapcrm-staging.iam.gserviceaccount.com'],cors:false},async(req,res)=>{
  if (process.env.GCLOUD_PROJECT !== projectId) { res.status(503).end(); return; }
  const query: Record<string,string> = {};
  for (const [key,value] of Object.entries(req.query)) {
    if (typeof value !== 'string') { res.status(400).end(); return; }
    query[key]=value;
  }
  const result=await handle({method:req.method,path:req.path,query,contentType:req.get('content-type'),signature:req.get('x-hub-signature-256'),raw:req.rawBody ?? new Uint8Array()});
  res.set('Cache-Control','no-store').set('X-Content-Type-Options','nosniff').status(result.status).type('text/plain').send(result.body);
});
