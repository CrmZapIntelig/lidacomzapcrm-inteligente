import test from 'node:test';
import assert from 'node:assert/strict';
import {createProviderDiagnostics} from './providerDiagnostics';
const request={method:'GET',authorization:'Bearer token.test',hasQuery:false,hasBody:false};
function fixture(){
 let verified=0,probes=0;
 const deps={tenantId:'restaurant',operatorUid:'operator',verifyIdToken:async(token:string,revoked:true)=>{verified++;assert.equal(token,'token.test');assert.equal(revoked,true);return {uid:'operator',email_verified:true};},evolution:async(tenant:string)=>{probes++;assert.equal(tenant,'restaurant');return {provider:'WHATSAPP_EVOLUTION_OPTIONAL' as const,status:'CONNECTED' as const,canSend:false as const,secret:'must not escape'};}};
 return {deps,counts:()=>({verified,probes})};
}
test('verified operator gets status only, with revoked-token check and no-store',async()=>{
 const f=fixture(),result=await createProviderDiagnostics(f.deps)(request);
 assert.equal(result.status,200);assert.equal(result.headers['Cache-Control'],'no-store');
 assert.deepEqual(result.body,{provider:'WHATSAPP_EVOLUTION_OPTIONAL',status:'CONNECTED',canSend:false});
 assert.deepEqual(f.counts(),{verified:1,probes:1});
});
test('unsupported method and client-supplied scope cause no authentication or provider I/O',async()=>{
 for(const patch of [{method:'POST'},{hasQuery:true},{hasBody:true}]){
  const f=fixture(),result=await createProviderDiagnostics(f.deps)({...request,...patch});
  assert.ok([400,405].includes(result.status));assert.deepEqual(f.counts(),{verified:0,probes:0});
 }
});
test('missing or malformed tokens never reach verifier or provider',async()=>{
 for(const authorization of [undefined,'Basic abc','Bearer ','Bearer token\nextra','Bearer '+ 'a'.repeat(8193)]){
  const f=fixture();assert.equal((await createProviderDiagnostics(f.deps)({...request,authorization})).status,401);assert.deepEqual(f.counts(),{verified:0,probes:0});
 }
});
test('expired/revoked tokens and unverified/foreign users cannot probe',async()=>{
 for(const identity of [{uid:'other',email_verified:true},{uid:'operator',email_verified:false}]){
  const f=fixture();f.deps.verifyIdToken=async()=>identity;
  assert.equal((await createProviderDiagnostics(f.deps)(request)).status,403);assert.equal(f.counts().probes,0);
 }
 const f=fixture();f.deps.verifyIdToken=async()=>{throw Error('revoked token detail');};
 assert.deepEqual((await createProviderDiagnostics(f.deps)(request)).body,{error:'AUTHENTICATION_REQUIRED'});assert.equal(f.counts().probes,0);
});
test('upstream exceptions and authority escalation are refused without leaking details',async()=>{
 const f=fixture();
 const exception=createProviderDiagnostics({...f.deps,evolution:async()=>{throw Error('credential-value');}});
 assert.deepEqual((await exception(request)).body,{error:'DIAGNOSTICS_UNAVAILABLE'});
 const escalation=createProviderDiagnostics({...f.deps,evolution:async()=>({provider:'WHATSAPP_EVOLUTION_OPTIONAL',status:'CONNECTED',canSend:true} as any)});
 assert.equal((await escalation(request)).status,503);
});
