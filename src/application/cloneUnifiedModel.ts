import type { Client, Campaign } from '../types';
import type { ChannelProvider } from '../domain/omnichannel';
import { messageProviderChannel } from '../domain/messageChannelCatalog';
import { getUnifiedContact, getMarketingCampaign } from './unifiedDomainFacade';
import { createActiveSalesState } from './activeSalesOffline';
import { prepareMarketingDispatchHandoff } from './marketingDispatchBridge';
import { applyOrderCommand, validateCommand, validateSnapshot } from './stagingOperationalOrders';
import type { OperationalCommand, OperationalSnapshot, OperationalEvent } from './stagingOperationalOrders';
import type { PaymentMethod } from './orderOperations';

export const CLONE_TENANT = 'prato-mineiro-clone';
export const TEST_TENANT = 'demo-TEST-clone';
export interface SavedSalesDraft {
  id: string; schema: 1; kind: 'ACTIVE_SALES_DRAFT' | 'MARKETING_DISPATCH_DRAFT'; status: 'DRAFT'; canSend: false;
  tenantId: string; actorUid: string; createdAt: string; provider: ChannelProvider;
  contacts: { id: string; name: string; content: string; consent: string }[];
  preparationPayload: string; marketingCampaignId: string | null;
}
export function prepareCloneSalesDraft(input: { id: string; actorUid: string; clients: Client[]; template: string; provider: ChannelProvider; at: Date; sourceCampaign?: Campaign }): SavedSalesDraft {
  messageProviderChannel(input.provider);
  if (!input.id || !input.actorUid || !Number.isFinite(input.at.getTime()) || !input.template.trim() || input.template.length > 4000 || !input.clients.length || input.clients.length > 50 || new Set(input.clients.map(c=>c.id)).size !== input.clients.length) throw Error('Revise a mensagem e selecione entre 1 e 50 clientes diferentes.');
  const contacts = input.clients.map(client => {
    if (client.type === 'bloqueado' || client.type === 'grupo' || client.contactPreferences?.globalStatus === 'blocked' || ['denied','revoked'].includes(client.contactPreferences?.marketingStatus ?? '')) throw Error('Contato bloqueado, grupo ou consentimento revogado não pode entrar nesta preparação.');
    // A textual draft has no recipient address and cannot infer a country code.
    const projected=getUnifiedContact({...client,phone:''},{tenantId:CLONE_TENANT,observedAt:input.at});
    if(projected.status!=='PROJECTED')throw Error('Cadastro incompleto: '+client.name);
    const content=input.template.replace(/\{\{nome\}\}/g,projected.value.contact.name.split(/\s+/)[0]);
    if(/\{\{[^}]+\}\}/.test(content))throw Error('Use somente a variável {{nome}}.');
    return {id:client.id,name:client.name,content,consent:client.contactPreferences?.marketingStatus ?? 'unknown'};
  });
  const campaignId='dispatch-'+input.id, audienceId='audience-'+input.id;
  const strategy=input.provider==='RCS_GOOGLE'?'GOOGLE_RCS' as const:'WHATSAPP' as const;
  let preparation:unknown;
  if(input.sourceCampaign){
    const marketing=getMarketingCampaign(input.sourceCampaign,{tenantId:CLONE_TENANT,observedAt:input.at});
    if(marketing.status!=='PROJECTED')throw Error('Campanha incompatível com o domínio unificado.');
    preparation=prepareMarketingDispatchHandoff(marketing.value.marketingCampaign,{id:audienceId,tenantId:CLONE_TENANT,marketingCampaignId:input.sourceCampaign.id,rationale:'Público escolhido explicitamente pelo operador no clone',contactIds:contacts.map(c=>c.id)},
      {dispatchCampaignId:campaignId,dispatchAudienceId:audienceId,audienceRevision:'1',template:input.template,dailyLimit:50,strategy,selectedProvider:input.provider,minimumIntervalMs:60000,timeZone:'America/Sao_Paulo',preparedAt:input.at});
  }else{
    preparation=createActiveSalesState({campaign:{id:campaignId,tenantId:CLONE_TENANT,name:'Venda Ativa manual',template:input.template,dailyLimit:50,createdAt:input.at,updatedAt:input.at},audience:{id:audienceId,tenantId:CLONE_TENANT,campaignId,sourceAudienceId:audienceId,revision:'1',contactIds:contacts.map(c=>c.id),capturedAt:input.at.toISOString()},strategy,selectedProvider:input.provider,minimumIntervalMs:60000,timeZone:'America/Sao_Paulo'});
  }
  return {id:input.id,schema:1,kind:input.sourceCampaign?'MARKETING_DISPATCH_DRAFT':'ACTIVE_SALES_DRAFT',status:'DRAFT',canSend:false,tenantId:CLONE_TENANT,actorUid:input.actorUid,createdAt:input.at.toISOString(),provider:input.provider,contacts,preparationPayload:JSON.stringify(preparation),marketingCampaignId:input.sourceCampaign?.id??null};
}

export interface CloneTestAggregate {
  schema: 1; orderId: string; revision: number; snapshot: OperationalSnapshot | null;
  events: OperationalEvent[]; rolledBack: boolean;
  commands: { key: string; id: string; fingerprint: string; revision: number }[];
}
export function reviveCloneAggregate(raw: string): CloneTestAggregate {
  const state=JSON.parse(raw) as CloneTestAggregate;
  if(state.schema!==1 || !Array.isArray(state.events)||!Array.isArray(state.commands)||typeof state.rolledBack!=='boolean')throw Error('Registro de teste inválido.');
  if(state.snapshot){state.snapshot.canonical.createdAt=new Date(state.snapshot.canonical.createdAt);state.snapshot.canonical.updatedAt=new Date(state.snapshot.canonical.updatedAt);validateSnapshot(state.snapshot,TEST_TENANT);if(state.snapshot.canonical.id!==state.orderId||state.snapshot.revision!==state.revision)throw Error('Identidade de teste inconsistente.');}
  return state;
}
export function reduceCloneTest(state: CloneTestAggregate | undefined, command: OperationalCommand) {
  validateCommand(command);
  if(command.tenantId!==TEST_TENANT || command.operation.kind==='LINK_EXTERNAL_REFERENCE')throw Error('Operação fora do escopo deste teste.');
  if(state && state.orderId!==command.orderId)throw Error('Identidade de pedido divergente.');
  const fingerprint=JSON.stringify(command);
  const previous=state?.commands.find(c=>c.key===command.idempotencyKey||c.id===command.commandId);
  if(previous){if(previous.fingerprint!==fingerprint)throw Error('Conflito de repetição.');return {state:structuredClone(state!),replay:true};}
  if(state?.rolledBack)throw Error('Teste já revertido; crie um novo teste.');
  if((state?.commands.length??0)>=80 && command.operation.kind!=='ROLLBACK_TEST')throw Error('Limite do teste atingido; reverta e inicie outro.');
  if(command.operation.kind==='RECEIVE'||command.operation.kind==='REFUND'){
    const evidenceId=command.operation.evidenceId;
    if(state?.events.some(e=>e.evidenceId===evidenceId))throw Error('Comprovante TEST já utilizado.');
  }
  if(command.expectedRevision!==(state?.revision??0))throw Error('Pedido mudou em outra sessão. Recarregue antes de repetir.');
  let next:CloneTestAggregate;
  if(command.operation.kind==='ROLLBACK_TEST'){
    if(!state?.snapshot)throw Error('Pedido de teste não encontrado.');
    next={...structuredClone(state),snapshot:null,rolledBack:true,revision:state.revision+1};
  }else{
    const result=applyOrderCommand(state?.snapshot??undefined,command);
    next={schema:1,orderId:command.orderId,revision:result.snapshot.revision,snapshot:result.snapshot,events:[...(state?.events??[]),result.event],commands:[...(state?.commands??[])],rolledBack:false};
  }
  next.commands.push({key:command.idempotencyKey,id:command.commandId,fingerprint,revision:next.revision});
  if(new TextEncoder().encode(JSON.stringify(next)).length>700000)throw Error('Limite de tamanho do teste atingido.');
  return {state:next,replay:false};
}
export function newCloneTestOrder(id: string, method: PaymentMethod, at: Date): OperationalSnapshot {
  const s:OperationalSnapshot={schema:1,mode:'SIMULATION',revision:0,
    canonical:{id,tenantId:TEST_TENANT,contactId:'demo-TEST-customer',entryPoint:'POS',channel:'NONE',creationMode:'HUMAN_OPERATOR',total:40,paymentMethod:method,status:'CREATED',createdAt:at,updatedAt:at},
    customer:{id:'demo-TEST-customer',name:'Cliente TEST Exemplo'},conversation:null,modality:'DELIVERY',
    items:[{id:'demo-TEST-line',productId:'demo-TEST-plate',name:'TEST Prato',size:'TEST Padrao',unitCents:2000,quantity:2,addons:[],removed:[],utensils:[],observation:'TEST',subtotalCents:4000}],
    subtotalCents:4000,feeCents:0,discountCents:0,totalCents:4000,address:{street:'TEST Rua',number:'TEST Um',district:'TEST Bairro',zip:'TEST CEP'},table:null,legacyRefs:[],method,
    orderState:'DRAFT',paymentState:'PENDING',receivedCents:0,productionState:'WAITING',deliveryState:'NOT_APPLICABLE',courierId:null,notaState:method==='NOTA'?'REQUESTED':'NOT_REQUESTED'};
  validateSnapshot(s,TEST_TENANT);return s;
}
