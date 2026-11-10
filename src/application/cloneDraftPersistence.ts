import type { SavedSalesDraft } from './cloneUnifiedModel';

/** Validate persisted data before presenting it as a domain draft, including legacy v1. */
export function validateRestoredCloneDraft(data:Record<string,any>):SavedSalesDraft {
  const text=(value:unknown,max:number)=>typeof value==='string'&&value.length>0&&value.length<=max;
  if(data.schema!==1||!['ACTIVE_SALES_DRAFT','MARKETING_DISPATCH_DRAFT'].includes(data.kind)
    ||data.status!=='DRAFT'||data.canSend!==false||data.tenantId!=='prato-mineiro-clone'
    ||!text(data.id,160)||!text(data.actorUid,128)
    ||typeof data.createdAt!=='string'||!Number.isFinite(Date.parse(data.createdAt))
    ||!['WHATSAPP_META_OFFICIAL','WHATSAPP_EVOLUTION_OPTIONAL','RCS_GOOGLE'].includes(data.provider)
    ||!text(data.preparationPayload,500000)
    ||!(data.marketingCampaignId===null||text(data.marketingCampaignId,160))
    ||!Array.isArray(data.contacts)||data.contacts.length<1||data.contacts.length>50
    ||data.contacts.some(c=>!c||!text(c.id,160)||!text(c.name,200)||!text(c.content,8000)||!text(c.consent,100))
    ||new Set(data.contacts.map(c=>c.id)).size!==data.contacts.length)throw Error('INVALID_DRAFT');
  return {...data,contacts:data.contacts.map(c=>({...c}))} as SavedSalesDraft;
}

/** Restores a complete v2 draft; a partial read never becomes a sendable audience. */
export function restoreCloneDraft(data:Record<string,any>,contacts:Record<string,any>[]):SavedSalesDraft {
  if(data.storageVersion!==2||data.schema!==1||data.status!=='DRAFT'||data.canSend!==false
    ||!Number.isInteger(data.contactCount)||data.contactCount<1||data.contactCount>50
    ||contacts.length!==data.contactCount
    ||contacts.some(c=>!c||typeof c.id!=='string'||typeof c.name!=='string'||typeof c.content!=='string'||typeof c.consent!=='string')
    ||new Set(contacts.map(c=>c.id)).size!==contacts.length)throw Error('INCOMPLETE_DRAFT');
  const {storageVersion,contactCount,persistedAt,...header}=data;
  return validateRestoredCloneDraft({...header,contacts:[...contacts].sort((a,b)=>a.id.localeCompare(b.id))});
}
