import test from 'node:test';
import assert from 'node:assert/strict';
import {createEvolutionConnectionProbe} from './evolutionConnectionProbe';
const config={tenantId:'tenant-test',baseUrl:'https://evolution.example.test/v2',instanceName:'test-instance',readApiKey:async()=>'test-secret'};
const reply=(state:string,name=config.instanceName)=>new Response(JSON.stringify({instance:{instanceName:name,state}}));
test('disabled and foreign tenant perform no secret lookup or request',async()=>{
 const probe=createEvolutionConnectionProbe({...config,readApiKey:async()=>{throw Error('must not read');}},async()=>{throw Error('must not request');});
 assert.equal((await probe(config.tenantId)).status,'DISABLED');
 await assert.rejects(probe('foreign'),/CONTEXT/);
});
test('read-only request uses secret header and exact instance; connection never authorizes sending',async()=>{
 let calls=0;
 const probe=createEvolutionConnectionProbe({...config,enabled:true},async(url,init)=>{
  calls++;assert.equal(url,'https://evolution.example.test/v2/instance/connectionState/test-instance');
  assert.equal(init?.method,'GET');assert.equal(init?.redirect,'error');assert.equal(init?.body,undefined);
  assert.equal((init?.headers as Record<string,string>).apikey,'test-secret');return reply('open');
 });
 assert.deepEqual(await probe(config.tenantId),{provider:'WHATSAPP_EVOLUTION_OPTIONAL',status:'CONNECTED',canSend:false});assert.equal(calls,1);
});
test('missing credential, auth failures, unknown instance and upstream errors stay distinct',async()=>{
 const missing=createEvolutionConnectionProbe({...config,enabled:true,readApiKey:async()=>undefined},async()=>{throw Error('must not request');});
 assert.equal((await missing(config.tenantId)).status,'NOT_CONFIGURED');
 for(const [code,status] of [[401,'UNAUTHORIZED'],[403,'UNAUTHORIZED'],[404,'NOT_FOUND'],[500,'UNAVAILABLE']] as const){
  const probe=createEvolutionConnectionProbe({...config,enabled:true},async()=>new Response('sensitive body',{status:code}));
  assert.equal((await probe(config.tenantId)).status,status);
 }
});
test('state, identity and response bounds are validated',async()=>{
 for(const [response,status] of [[reply('connecting'),'CONNECTING'],[reply('close'),'DISCONNECTED'],[reply('refused'),'DISCONNECTED'],[reply('unknown'),'INVALID_RESPONSE'],[reply('open','foreign'),'INVALID_RESPONSE'],[new Response('not json'),'INVALID_RESPONSE'],[new Response('x'.repeat(17000)),'INVALID_RESPONSE']] as const){
  const probe=createEvolutionConnectionProbe({...config,enabled:true},async()=>response);
  assert.equal((await probe(config.tenantId)).status,status);
 }
});
test('timeout covers secret lookup and network; exceptions never disclose secrets',async()=>{
 for(const readApiKey of [()=>new Promise<string>(()=>{}),async()=>{throw Error('test-secret');}]){
  const probe=createEvolutionConnectionProbe({...config,enabled:true,timeoutMs:5,readApiKey});
  assert.equal((await probe(config.tenantId)).status,'UNAVAILABLE');
 }
 const probe=createEvolutionConnectionProbe({...config,enabled:true,timeoutMs:5},async()=>new Promise<Response>(()=>{}));
 assert.equal((await probe(config.tenantId)).status,'UNAVAILABLE');
});
test('insecure or credential-bearing URLs and unsafe instances are rejected before I/O',()=>{
 for(const baseUrl of ['http://evolution.example.test','https://user:password@example.test','https://example.test/?token=secret','https://example.test/#secret'])assert.throws(()=>createEvolutionConnectionProbe({...config,baseUrl}));
 for(const instanceName of ['../other','other/path','bad?key=value'])assert.throws(()=>createEvolutionConnectionProbe({...config,instanceName}));
});
