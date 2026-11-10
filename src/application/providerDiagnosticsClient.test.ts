import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchEvolutionDiagnostics} from './providerDiagnosticsClient';
const signal=new AbortController().signal;
test('diagnostic uses fixed same-site route and authorization header without cookies',async()=>{
 const status=await fetchEvolutionDiagnostics('test-token',signal,async(url,init)=>{
  assert.equal(url,'/api/providers/evolution');assert.equal(init?.method,'GET');assert.equal(init?.credentials,'omit');assert.equal(init?.redirect,'error');assert.equal(init?.cache,'no-store');assert.equal((init?.headers as any).Authorization,'Bearer test-token');
  return new Response(JSON.stringify({provider:'WHATSAPP_EVOLUTION_OPTIONAL',status:'NOT_CONFIGURED',canSend:false}));
 });assert.equal(status,'NOT_CONFIGURED');
});
test('refuses missing token, unauthorized responses and fabricated send authority',async()=>{
 await assert.rejects(fetchEvolutionDiagnostics('',signal,async()=>{throw Error('must not call');}));
 for(const code of [401,403,500])await assert.rejects(fetchEvolutionDiagnostics('test',signal,async()=>new Response('',{status:code})));
 for(const data of [{provider:'OTHER',status:'CONNECTED',canSend:false},{provider:'WHATSAPP_EVOLUTION_OPTIONAL',status:'CONNECTED',canSend:true},{provider:'WHATSAPP_EVOLUTION_OPTIONAL',status:'FAKE',canSend:false}])await assert.rejects(fetchEvolutionDiagnostics('test',signal,async()=>new Response(JSON.stringify(data))));
});
