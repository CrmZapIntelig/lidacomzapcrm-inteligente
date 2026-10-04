import { createHash } from 'node:crypto';
import type { AtomicJsonPort } from './durableInboundJournal';

export interface FirestoreRequestPort {
  request<T>(path: string, method: 'GET' | 'POST', body?: unknown, missingAllowed?: boolean): Promise<T | undefined>;
}
export class FirestoreRequestError extends Error {
  constructor(readonly status: number) { super(`STAGING_FIRESTORE_HTTP_${status}`); }
}
interface Document { fields?: { payload?: { stringValue?: string } } }

/** Bounded staging aggregate: optimistic retries plus Firestore transaction locking.
 * Queue, projection, drafts and audit commit together; no external effect in callback. */
export class FirestoreAtomicJsonPort implements AtomicJsonPort {
  private readonly document: string;
  readonly root = 'projects/lidacomzapcrm-staging/databases/(default)/documents';
  constructor(private readonly http: FirestoreRequestPort, tenantId: string, accountId: string, collection: 'stg_inbound_synthetic' | 'stg_operational_orders' = 'stg_inbound_synthetic') {
    if (!/^demo(?:-|$)/.test(tenantId) || !/^\d+$/.test(accountId)) throw new Error('SYNTHETIC_CONTEXT_REQUIRED');
    const key = createHash('sha256').update(`${tenantId}\0${accountId}`).digest('hex');
    if (!['stg_inbound_synthetic', 'stg_operational_orders'].includes(collection)) throw new Error('STAGING_COLLECTION_FORBIDDEN');
    this.document = `${this.root}/${collection}/${key}`;
  }
  async transaction<T>(update: (current: string | undefined) => { value: string; result: T }): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt++) {
      let transaction: string | undefined;
      try {
        const begin = await this.http.request<{ transaction: string }>(`${this.root}:beginTransaction`, 'POST', { options: { readWrite: {} } });
        if (!begin?.transaction) throw new Error('STAGING_TRANSACTION_REQUIRED');
        transaction = begin.transaction;
        const current = await this.http.request<Document>(`${this.document}?transaction=${encodeURIComponent(transaction)}`, 'GET', undefined, true);
        if (current && typeof current.fields?.payload?.stringValue !== 'string') throw new Error('STAGING_DOCUMENT_INVALID');
        const next = update(current?.fields?.payload?.stringValue);
        if (Buffer.byteLength(next.value, 'utf8') > 256 * 1024) throw new Error('STAGING_DOCUMENT_CAPACITY');
        await this.http.request(`${this.root}:commit`, 'POST', {
          transaction, writes: [{ update: { name: this.document, fields: { payload: { stringValue: next.value } } }, currentDocument: { exists: current !== undefined } }],
        });
        return next.result;
      } catch (error) {
        if (transaction) await this.http.request(`${this.root}:rollback`, 'POST', { transaction }).catch(() => undefined);
        if (!(error instanceof FirestoreRequestError) || error.status !== 409 || attempt === 4) throw error;
        await new Promise(resolve => setTimeout(resolve, 20 * (attempt + 1)));
      }
    }
    throw new Error('STAGING_TRANSACTION_RETRIES_EXHAUSTED');
  }
}
