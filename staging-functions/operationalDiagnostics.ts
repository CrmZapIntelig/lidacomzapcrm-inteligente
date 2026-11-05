import {onRequest} from 'firebase-functions/v2/https';
import {applicationDefault,initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {createProviderDiagnostics} from '../services/messaging/providerDiagnostics';
import {createEvolutionConnectionProbe} from '../services/messaging/evolutionConnectionProbe';

// Separate deployment artifact. Never exported by the staging entrypoint.
const projectId='project-1300957a-ea82-4645-845';
const tenantId='prato-mineiro';
const operatorUid='Wdt1sjpnHYhJgH8rkB7J2zKuEYt1';
let handler:ReturnType<typeof createProviderDiagnostics>|undefined;
function getHandler(){
  if(process.env.GCLOUD_PROJECT!==projectId||process.env.FIREBASE_AUTH_EMULATOR_HOST!==undefined)throw Error('DIAGNOSTICS_ENVIRONMENT_INVALID');
  if(handler)return handler;
  const auth=getAuth(initializeApp({projectId,credential:applicationDefault()},'operational-diagnostics'));
  handler=createProviderDiagnostics({tenantId,operatorUid,verifyIdToken:(token,checkRevoked)=>auth.verifyIdToken(token,checkRevoked),evolution:async tenant=>{
    const baseUrl=process.env.EVOLUTION_BASE_URL,instanceName=process.env.EVOLUTION_INSTANCE_NAME;
    if(!baseUrl||!instanceName||!process.env.EVOLUTION_API_KEY?.trim())return {provider:'WHATSAPP_EVOLUTION_OPTIONAL',status:'NOT_CONFIGURED',canSend:false};
    return createEvolutionConnectionProbe({tenantId,baseUrl,instanceName,enabled:true,readApiKey:async()=>process.env.EVOLUTION_API_KEY})(tenant);
  }});
  return handler;
}
export const operationalProviderDiagnostics=onRequest({region:'southamerica-east1',minInstances:0,maxInstances:1,concurrency:10,
  memory:'256MiB',timeoutSeconds:30,cors:false,invoker:'public',
  serviceAccount:`crm-provider-diagnostics@${projectId}.iam.gserviceaccount.com`,
},async(req,res)=>{
  try{
    const result=await getHandler()({method:req.method,authorization:req.get('authorization'),hasQuery:Object.keys(req.query).length>0,hasBody:(req.rawBody?.length??0)>0});
    res.set(result.headers).status(result.status).json(result.body);
  }catch{res.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).status(503).json({error:'DIAGNOSTICS_UNAVAILABLE'});}
});
