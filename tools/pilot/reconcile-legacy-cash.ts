import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { reconstructLegacyCashEntry } from '../../src/application/legacyCashLedgerReconciliation';
import { reconcileCashLedger } from '../../src/application/productionCashLedger';
import { validateSnapshot } from '../../src/application/productionOrders';

// One existing dedicated pilot database. Never selects the original/default database.
const project = 'project-1300957a-ea82-4645-845', database = 'lidacomzapcrm-work-20261021';
const tenant = 'prato-mineiro', root = `projects/${project}/databases/${database}/documents`;
const require = createRequire(import.meta.url);
const base = 'C:/Users/dfant/AppData/Roaming/npm/node_modules/firebase-tools/lib/';
const { requireAuth } = require(base + 'requireAuth');
const { getGlobalDefaultAccount } = require(base + 'auth');
const { Client } = require(base + 'apiv2');
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
function decode(v: any): any {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
  return Object.fromEntries(Object.entries(v.mapValue?.fields || {}).map(([k, x]) => [k, decode(x)]));
}
const fields = (doc: any) => decode({ mapValue: { fields: doc.fields } });
function encode(v: any): any {
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number' && Number.isSafeInteger(v)) return { integerValue: String(v) };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (v && typeof v === 'object' && !Array.isArray(v)) return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)])) } };
  throw Error('UNSUPPORTED_VALUE');
}
await requireAuth({ project, ...getGlobalDefaultAccount(), nonInteractive: true });
const client = new Client({ urlPrefix: 'https://firestore.googleapis.com', apiVersion: 'v1' });
const tx = (await client.post('/' + root + ':beginTransaction', {})).body.transaction;
let committed = false;
try {
  const get = async (name: string) => (await client.get('/' + name, {queryParams:{transaction:tx}})).body;
  const query = async (parent: string, collectionId: string) => {
    const rows = (await client.post('/' + parent + ':runQuery', {transaction:tx,structuredQuery:{from:[{collectionId}],limit:1001}})).body;
    const docs = rows.filter((row:any)=>row.document).map((row:any)=>row.document);
    if(docs.length>1000) throw Error('QUERY_LIMIT_EXCEEDED');
    return docs;
  };
  const cashDoc = await get(root + '/unified_cash/current'), cash = fields(cashDoc);
  const history = fields(await get(root + '/unified_cash_sessions/' + cash.id));
  if(!isDeepStrictEqual(cash.expected,history.expected) || cash.id!==history.id || cash.status!=='OPEN' || history.status!=='OPEN') throw Error('CASH_HISTORY_MISMATCH');
  const existing = (await query(root,'unified_cash_entries')).map(fields).filter((x:any)=>x.cashSessionId===cash.id);
  const candidates:any[]=[];
  for(const orderDoc of await query(root,'unified_orders')) {
    const saved = fields(orderDoc), snapshot=JSON.parse(saved.payload);
    snapshot.canonical.createdAt=new Date(snapshot.canonical.createdAt);
    snapshot.canonical.updatedAt=new Date(snapshot.canonical.updatedAt);
    validateSnapshot(snapshot,tenant);
    if(saved.revision!==snapshot.revision || saved.tenantId!==tenant) throw Error('ORDER_METADATA_MISMATCH');
    for(const eventDoc of await query(orderDoc.name,'events')) {
      const event = fields(eventDoc);
      if(!['RECEIVE','REFUND'].includes(event.operation) || event.cashSessionId!==cash.id) continue;
      const id=hash(JSON.stringify([tenant,event.orderId,event.commandId]));
      const evidenceFingerprint=hash(event.evidenceId.trim().toUpperCase());
      const commandRecord=fields(await get(orderDoc.name+'/commands/'+event.commandId));
      const evidenceRecord=fields(await get(root+'/unified_receipt_evidence/'+evidenceFingerprint));
      console.log(JSON.stringify({evidenceCheck:{result:event.result,confirmation:event.confirmation,eventIdMatches:event.id===event.commandId,commandRevisionMatches:event.revision===commandRecord.revision,versionsMatch:event.newVersion===event.revision&&event.previousVersion===event.revision-1,snapshotRevisionValid:snapshot.revision>=event.revision,actorMatches:commandRecord.actor===event.actor,proofFields:Object.keys(evidenceRecord),proofTenantMatches:evidenceRecord.tenantId===tenant,proofOrderMatches:evidenceRecord.orderId===event.orderId,proofCommandMatches:evidenceRecord.commandId===event.commandId,proofActorMatches:evidenceRecord.actor===event.actor,proofKindMatches:evidenceRecord.kind===event.operation,eventAfterOpen:Date.parse(event.at)>=Date.parse(cash.openedAt)}}));
      const entry=reconstructLegacyCashEntry({id,evidenceFingerprint,tenantId:tenant,legacyDedicatedDatabase:database,session:cash,snapshot,event,commandRecord,evidenceRecord} as any);
      const prior=existing.find((x:any)=>x.id===id);
      if(prior) { if(prior.commandId!==entry.commandId || prior.netAmountCents!==entry.netAmountCents || prior.evidenceFingerprint!==evidenceFingerprint) throw Error('EXISTING_LEDGER_CONFLICT'); }
      else candidates.push(entry);
    }
  }
  if(!reconcileCashLedger(tenant,cash,[...existing,...candidates]).reconciled) throw Error('CASH_RECONCILIATION_FAILED');
  const report={at:new Date().toISOString(),database,mode:process.argv.includes('--apply')?'APPLY':'DRY_RUN',existing:existing.length,created:0,planned:candidates.length,expected:cash.expected,totalsChanged:false,orderStateChanged:false};
  if(process.argv.includes('--apply') && candidates.length) {
    if(candidates.length>100) throw Error('MIGRATION_LIMIT_EXCEEDED');
    await client.post('/'+root+':commit',{transaction:tx,writes:candidates.map(entry=>({update:{name:root+'/unified_cash_entries/'+entry.id,fields:encode(entry).mapValue.fields},currentDocument:{exists:false}}))});
    committed=true;report.created=candidates.length;
  }
  writeFileSync('C:/Users/dfant/.codex/.chatgpt-projects/g-p-6aad2a2277748191ab507213f832c619/execution/platform-completion-20261030/cash-'+report.mode.toLowerCase()+'.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
} finally {
  if(!committed) await client.post('/'+root+':rollback',{transaction:tx});
}
