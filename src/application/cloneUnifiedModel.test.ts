import test from 'node:test';
import assert from 'node:assert/strict';
import { newCloneTestOrder, reduceCloneTest, reviveCloneAggregate, prepareCloneSalesDraft, TEST_TENANT } from './cloneUnifiedModel';
import type { CloneTestAggregate } from './cloneUnifiedModel';
import type { OperationalCommand, OrderOperation } from './stagingOperationalOrders';
import { projectTestCash, projectTestConsumers } from './operationalOrderProjections';
import type { Client } from '../types';
const at=new Date('2026-10-21T10:00:00.000Z');
const client:Client={id:'clone-client',name:'Cliente Teste',phone:'+5511999990000',type:'salvo',stage:'Lead',tags:[],totalBought:0,notes:[],dispatched:false,avatarColor:'green'};
const draft=()=>({id:'draft-test',actorUid:'operator',clients:[client],template:'Olá, {{nome}}',provider:'WHATSAPP_META_OFFICIAL' as const,at});
test('commercial draft preserves consent uncertainty and never authorizes send',()=>{const d=prepareCloneSalesDraft(draft());assert.equal(d.canSend,false);assert.equal(d.status,'DRAFT');assert.equal(d.contacts[0].consent,'unknown');assert.equal(d.contacts[0].content,'Olá, Cliente');assert.equal(client.dispatched,false);});
test('blocked, groups and revoked contacts cannot be prepared',()=>{for(const c of [{...client,type:'bloqueado' as const},{...client,type:'grupo' as const},{...client,contactPreferences:{marketingStatus:'revoked' as const}}])assert.throws(()=>prepareCloneSalesDraft({...draft(),clients:[c]}));});
test('duplicate audience, unresolved template and unrecognized provider fail closed',()=>{assert.throws(()=>prepareCloneSalesDraft({...draft(),clients:[client,client]}));assert.throws(()=>prepareCloneSalesDraft({...draft(),template:'Olá {{unknown}}'}));assert.throws(()=>prepareCloneSalesDraft({...draft(),provider:'UNKNOWN' as never}));});
function scenario(method:'PIX'|'NOTA'='PIX'){
 let state:CloneTestAggregate|undefined;let sequence=0;
 function command(operation:OrderOperation):OperationalCommand{const key=`demo-TEST-command-${++sequence}`;return {commandId:key,idempotencyKey:key,actor:'demo-TEST-operator',tenantId:TEST_TENANT,orderId:'demo-TEST-order',expectedRevision:state?.revision??0,at:at.toISOString(),operation};}
 function execute(operation:OrderOperation){const c=command(operation);state=reduceCloneTest(state,c).state;return c;}
 execute({kind:'CREATE',snapshot:newCloneTestOrder('demo-TEST-order',method,at)});
 return {execute,command,get:()=>state!,set:(s:CloneTestAggregate)=>{state=s;}};
}
test('persisted round-trip, replay and stale revision remain safe',()=>{
 const s=scenario();const c=s.execute({kind:'CONFIRM'});s.set(reviveCloneAggregate(JSON.stringify(s.get())));
 const replay=reduceCloneTest(s.get(),c);assert.equal(replay.replay,true);assert.equal(replay.state.events.filter(e=>e.fact==='SALE').length,1);
 assert.throws(()=>reduceCloneTest(s.get(),{...c,at:'2026-10-21T10:00:01.000Z'}));
 assert.throws(()=>reduceCloneTest(s.get(),{...s.command({kind:'PRODUCTION',state:'PREPARING'}),expectedRevision:0}));
});
test('production and delivery retain one order without manufacturing a receipt',()=>{
 const s=scenario();s.execute({kind:'CONFIRM'});s.execute({kind:'PRODUCTION',state:'PREPARING'});s.execute({kind:'PRODUCTION',state:'READY'});
 for(const state of ['ASSIGNED','IN_TRANSIT','DELIVERED'] as const)s.execute({kind:'DELIVERY',state,courierId:'demo-TEST-courier'});
 const snapshot=s.get().snapshot!,projection=projectTestConsumers(snapshot);assert.equal(snapshot.paymentState,'PENDING');assert.equal(snapshot.receivedCents,0);assert.equal(projection.kds!.orderId,projection.delivery!.orderId);assert.equal(projection.orderId,'demo-TEST-order');assert.equal(projectTestCash(s.get().events).expected.PIX,0);
});
test('NOTA sale is separate from collection and rollback retains audit',()=>{
 const s=scenario('NOTA');assert.throws(()=>s.execute({kind:'CONFIRM'}));s.execute({kind:'NOTA_APPROVE'});s.execute({kind:'CONFIRM'});
 assert.equal(projectTestCash(s.get().events).openCreditCents,4000);
 s.execute({kind:'RECEIVE',amountCents:1500,method:'PIX',evidenceId:'demo-TEST-receipt-a'});
 assert.equal(s.get().snapshot!.notaState,'PARTIALLY_PAID');assert.equal(projectTestCash(s.get().events).openCreditCents,2500);
 s.execute({kind:'RECEIVE',amountCents:2500,method:'PIX',evidenceId:'demo-TEST-receipt-b'});
 assert.equal(s.get().snapshot!.notaState,'PAID');assert.equal(s.get().events.filter(e=>e.fact==='SALE').length,1);
 const prior=s.get().events.length;s.execute({kind:'ROLLBACK_TEST'});assert.equal(s.get().snapshot,null);assert.equal(s.get().events.length,prior);assert.equal(s.get().rolledBack,true);assert.throws(()=>s.execute({kind:'CONFIRM'}));
});
test('real identities and unsupported external linking are rejected by TEST store',()=>{const s=scenario();assert.throws(()=>reduceCloneTest(s.get(),{...s.command({kind:'CONFIRM'}),tenantId:'real'}));assert.throws(()=>s.execute({kind:'LINK_EXTERNAL_REFERENCE',reference:{} as never}));});

test('marketing handoff has distinct dispatch identity and no executions',()=>{
 const campaign={id:'marketing-clone',name:'TEST campanha',messageTemplate:'Olá {{nome}}',sentCount:10,responseCount:2,status:'ativo' as const,createdAt:at.toISOString()};
 const result=prepareCloneSalesDraft({...draft(),sourceCampaign:campaign});
 const payload=JSON.parse(result.preparationPayload);
 assert.equal(result.kind,'MARKETING_DISPATCH_DRAFT');assert.equal(result.marketingCampaignId,campaign.id);
 assert.notEqual(payload.dispatch.campaign.id,campaign.id);assert.equal(payload.dispatch.audience.marketingCampaignId,campaign.id);
 assert.equal(payload.dispatch.mode,'SIMULATION');assert.equal(payload.dispatch.executions.length,0);assert.equal(campaign.sentCount,10);
});
test('textual preparation neither infers country code nor stores recipient address',()=>{
 const result=prepareCloneSalesDraft({...draft(),clients:[{...client,phone:'11999990000'}]});
 assert.equal('phone' in result.contacts[0],false);assert.equal('recipientAddress' in result.contacts[0],false);
});
test('a financial evidence cannot be consumed twice with different command keys',()=>{
 const s=scenario();s.execute({kind:'CONFIRM'});s.execute({kind:'RECEIVE',amountCents:1000,method:'PIX',evidenceId:'demo-TEST-proof'});
 assert.throws(()=>s.execute({kind:'RECEIVE',amountCents:1000,method:'PIX',evidenceId:'demo-TEST-proof'}));
 assert.equal(s.get().snapshot!.receivedCents,1000);
});
