import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
const project='project-1300957a-ea82-4645-845';
const compiled=buildSync({entryPoints:[fileURLToPath(new URL('./operationalDiagnostics.ts',import.meta.url))],bundle:true,platform:'node',format:'cjs',write:false,external:['firebase-functions/*','firebase-admin/*']}).outputFiles[0].text;
function fixture(env:Record<string,string|undefined>={GCLOUD_PROJECT:project}){
 const module={exports:{} as any};let options:any,initializations=0,verifications=0;
 runInNewContext(compiled,{module,exports:module.exports,process:{env},require:(name:string)=>{
  if(name==='firebase-functions/v2/https')return {onRequest:(opts:any,handler:any)=>{options=opts;return handler;}};
  if(name==='firebase-admin/app')return {applicationDefault:()=>({}),initializeApp:(settings:any)=>{initializations++;assert.equal(settings.projectId,project);return {};}};
  if(name==='firebase-admin/auth')return {getAuth:()=>({verifyIdToken:async(token:string,revoked:boolean)=>{verifications++;assert.equal(revoked,true);if(token!=='operator.token')throw Error('Invalid');return {uid:'Wdt1sjpnHYhJgH8rkB7J2zKuEYt1',email_verified:true};}})};
  throw Error('Unexpected module '+name);
 },URL,fetch:()=>{throw Error('Network must not run');},setTimeout,clearTimeout,AbortController,TextDecoder,Uint8Array});
 return {options,counts:()=>({initializations,verifications}),async invoke(token?:string){
  const result={status:0,body:undefined as any,headers:{} as any};
  const response={set:(h:any)=>{result.headers=h;return response;},status:(s:number)=>{result.status=s;return response;},json:(b:any)=>{result.body=b;return response;}};
  await module.exports.operationalProviderDiagnostics({method:'GET',query:{},rawBody:Buffer.alloc(0),get:()=>token},response);
  return result;
 }};
}
test('deployed adapter rejects other projects and auth emulator before SDK initialization',async()=>{
 for(const env of [{GCLOUD_PROJECT:'lidacomzapcrm-staging'},{GCLOUD_PROJECT:project,FIREBASE_AUTH_EMULATOR_HOST:'localhost:9099'}]){
  const f=fixture(env);assert.equal((await f.invoke('Bearer operator.token')).status,503);assert.equal(f.counts().initializations,0);
 }
});
test('adapter checks Firebase operator token and reports unconfigured provider without network',async()=>{
 const f=fixture();
 assert.equal((await f.invoke()).status,401);
 assert.equal((await f.invoke('Bearer invalid.token')).status,401);
 const result=await f.invoke('Bearer operator.token');
 assert.equal(result.status,200);assert.equal(result.body.status,'NOT_CONFIGURED');assert.equal(result.body.canSend,false);
 assert.equal(f.counts().initializations,1);assert.equal(f.counts().verifications,2);
 assert.equal(f.options.maxInstances,1);assert.equal(f.options.cors,false);
 assert.equal(f.options.serviceAccount,`crm-provider-diagnostics@${project}.iam.gserviceaccount.com`);
});
