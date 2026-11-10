import { collection, doc, getDocs, limit, onSnapshot, query, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db, isCloneEnvironment, firestoreDatabaseId, cloneOperatorUid } from '../lib/firebase';
import { reduceCloneTest, reviveCloneAggregate } from '../application/cloneUnifiedModel';
import { restoreCloneDraft, validateRestoredCloneDraft } from '../application/cloneDraftPersistence';
import type { CloneTestAggregate, SavedSalesDraft } from '../application/cloneUnifiedModel';
import type { OperationalCommand } from '../application/stagingOperationalOrders';

function guard(){
  if(!isCloneEnvironment||firestoreDatabaseId!=='lidacomzapcrm-work-20261021'||auth.currentUser?.uid!==cloneOperatorUid||!auth.currentUser.emailVerified)throw Error('Acesso restrito ao administrador do clone.');
}
export function watchCloneTests(next:(items:CloneTestAggregate[])=>void,error:(message:string)=>void){
  guard();return onSnapshot(query(collection(db,'clone_unified_order_tests'),limit(50)),snapshot=>{
    try{next(snapshot.docs.map(d=>reviveCloneAggregate(d.data().payload)).sort((a,b)=>b.orderId.localeCompare(a.orderId)));}catch{error('Não foi possível validar os testes salvos.');}
  },()=>error('Falha ao carregar os testes do clone.'));
}
export async function executeCloneTest(command:OperationalCommand){
  guard();const ref=doc(db,'clone_unified_order_tests',command.orderId);
  return runTransaction(db,async transaction=>{
    guard();const existing=await transaction.get(ref);
    const result=reduceCloneTest(existing.exists()?reviveCloneAggregate(existing.data().payload):undefined,command);
    if(!result.replay)transaction.set(ref,{schema:1,mode:'TEST',actorUid:auth.currentUser!.uid,revision:result.state.revision,payload:JSON.stringify(result.state)});
    return {replay:result.replay,revision:result.state.revision};
  });
}
export function watchCloneDrafts(next:(items:SavedSalesDraft[])=>void,error:(message:string)=>void){
  guard();let generation=0;let stopped=false;
  const unsubscribe=onSnapshot(query(collection(db,'clone_unified_sales_drafts'),limit(100)),async snapshot=>{
    const current=++generation;
    try {
      const drafts=await Promise.all(snapshot.docs.map(async record=>{
        const data=record.data();
        if(data.id!==record.id||data.actorUid!==cloneOperatorUid)throw Error('INVALID_DRAFT_IDENTITY');
        if(data.storageVersion===undefined)return validateRestoredCloneDraft(data);
        if(data.storageVersion!==2)throw Error('UNKNOWN_DRAFT_VERSION');
        const contacts=await getDocs(query(collection(record.ref,'contacts'),limit(51)));
        return restoreCloneDraft(data,contacts.docs.map(row=>row.data()));
      }));
      if(stopped||current!==generation)return;
      guard();
      if(drafts.some(d=>d.schema!==1||!['ACTIVE_SALES_DRAFT','MARKETING_DISPATCH_DRAFT'].includes(d.kind)||d.status!=='DRAFT'||d.canSend!==false||!Array.isArray(d.contacts)))throw Error('INVALID_DRAFT');
      next(drafts.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));
    }catch{if(!stopped&&current===generation)error('Não foi possível carregar um rascunho completo. Tente novamente.');}
  },()=>error('Falha ao carregar rascunhos do clone.'));
  return ()=>{stopped=true;generation++;unsubscribe();};
}
export async function saveCloneDraft(draft:SavedSalesDraft){
  guard();if(draft.actorUid!==auth.currentUser!.uid||draft.canSend!==false||draft.status!=='DRAFT')throw Error('Rascunho inválido.');
  return runTransaction(db,async tx=>{guard();const ref=doc(db,'clone_unified_sales_drafts',draft.id);const existing=await tx.get(ref);
    if(existing.exists()){
      const saved=existing.data();
      if(saved.storageVersion!==undefined&&saved.storageVersion!==2)throw Error('UNKNOWN_DRAFT_VERSION');
      const previous=saved.storageVersion===2?restoreCloneDraft(saved,(await Promise.all(draft.contacts.map(contact=>tx.get(doc(ref,'contacts',contact.id))))).map(row=>row.data())):validateRestoredCloneDraft(saved);
      if(canonical({...previous,contacts:[...previous.contacts].sort((a,b)=>a.id.localeCompare(b.id))})!==canonical({...draft,contacts:[...draft.contacts].sort((a,b)=>a.id.localeCompare(b.id))}))throw Error('Rascunho já existe.');return;
    }
    const {contacts,...header}=draft;
    if(!contacts.length||contacts.length>50||new Set(contacts.map(c=>c.id)).size!==contacts.length)throw Error('Contatos inválidos.');
    tx.set(ref,{...header,storageVersion:2,contactCount:contacts.length,persistedAt:serverTimestamp()});
    for(const contact of contacts)tx.set(doc(ref,'contacts',contact.id),contact);
  });
}


function canonical(value: unknown): string { if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]"; if(value && typeof value === "object")return "{"+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+":"+canonical(v)).join(",")+"}"; return JSON.stringify(value); }
