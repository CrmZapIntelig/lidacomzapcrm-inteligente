import { mkdir, open, readFile, rename, unlink, lstat, realpath } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { NormalizedProviderEvent, AutoReplyDraft, MessagingAudit } from '../../src/application/messagingReadiness';
import { createInboundState, projectInbound } from '../../src/application/inboundProjection';
import type { InboundState } from '../../src/application/inboundProjection';
import { prepareAutoReplyDraft } from '../../src/application/messagingReadiness';
import { businessKey, timestamp } from '../../src/domain/offlinePrimitives';

interface Work { key: string; event: NormalizedProviderEvent; state: 'QUEUED' | 'RESERVED' | 'COMPLETED' | 'FAILED_FINAL'; attempt: number; token?: string; owner?: string; leaseUntil?: string; retryAt?: string }
export interface Journal { version: 1; tenantId: string; accountId: string; mode: 'SIMULATION'; work: Work[]; projection: InboundState; drafts: AutoReplyDraft[]; audit: MessagingAudit[] }
export interface AutoReplyConfiguration { content: string; humanEscalation: string; blocked: boolean; optedOut: boolean; consent: 'ALLOWED' | 'DENIED' | 'UNKNOWN' }

/** Local synthetic durable reference, NOT a staging/production database adapter. */
export class LocalInboundJournal {
  readonly root: string;
  constructor(root: string, readonly tenantId: string, readonly accountId: string) {
    if (!/^demo(?:-|$)/.test(tenantId) || !/^\d+$/.test(accountId)) throw new Error('SYNTHETIC_CONTEXT_REQUIRED');
    this.root = resolve(root);
  }
  protected fresh(): Journal { return { version: 1, tenantId: this.tenantId, accountId: this.accountId, mode: 'SIMULATION', work: [], projection: createInboundState(this.tenantId, this.accountId, 'SIMULATION'), drafts: [], audit: [] }; }
  protected validateEvent(e: NormalizedProviderEvent) {
    if (!['INBOUND', 'STATUS'].includes(e.kind) || !((e.channel === 'WHATSAPP' && e.provider === 'WHATSAPP_META_OFFICIAL') || (e.channel === 'RCS' && e.provider === 'RCS_GOOGLE')) || (e.kind === 'STATUS' && !['SENT', 'DELIVERED', 'READ', 'FAILED'].includes(e.status ?? ''))) throw new Error('SYNTHETIC_EVENT_INVALID');
    if (e.mode !== 'SIMULATION' || e.tenantId !== this.tenantId || e.accountId !== this.accountId || !/^synthetic-[A-Za-z0-9:_-]{1,200}$/.test(e.messageId) || !/^synthetic-[A-Za-z0-9:_-]{1,250}$/.test(e.eventId) || (e.kind === 'INBOUND' && !/^\+1202555010[0-6]$/.test(e.address ?? ''))) throw new Error('SYNTHETIC_EVENT_REQUIRED');
    timestamp(new Date(e.occurredAt));
  }
  private async load(): Promise<Journal> {
    try {
      const file = join(this.root, 'inbound.json'); if ((await lstat(file)).isSymbolicLink()) throw new Error('JOURNAL_SYMLINK');
      const j = JSON.parse(await readFile(file, 'utf8')) as Journal;
      return this.restore(j);
    } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return this.fresh(); throw e; }
  }
  protected restore(j: Journal): Journal {
      if (j.version !== 1 || j.tenantId !== this.tenantId || j.accountId !== this.accountId || j.mode !== 'SIMULATION' || !Array.isArray(j.work) || !Array.isArray(j.drafts) || !Array.isArray(j.audit) || j.projection.tenantId !== this.tenantId || j.projection.mode !== 'SIMULATION' || j.projection.accountId !== this.accountId) throw new Error('JOURNAL_CONTEXT_MISMATCH');
      if (j.work.length > 10000 || new Set(j.work.map(w => w.key)).size !== j.work.length) throw new Error('JOURNAL_INVALID');
      for (const w of j.work) {
        this.validateEvent(w.event);
        if (!['QUEUED', 'RESERVED', 'COMPLETED', 'FAILED_FINAL'].includes(w.state) || !Number.isInteger(w.attempt) || w.attempt < 0 || w.attempt > 3 || (w.state === 'RESERVED' && (!w.token || !w.owner || !w.leaseUntil || !Number.isFinite(Date.parse(w.leaseUntil))))) throw new Error('JOURNAL_INVALID');
      }
      j.projection.contacts = j.projection.contacts.map(c => ({ ...c, createdAt: new Date(c.createdAt), updatedAt: new Date(c.updatedAt) }));
      j.projection.conversations = j.projection.conversations.map(c => ({ ...c, createdAt: new Date(c.createdAt), updatedAt: new Date(c.updatedAt) }));
      j.projection.messages = j.projection.messages.map(m => ({ ...m, createdAt: new Date(m.createdAt) }));
      return j;
  }
  protected async transaction<T>(fn: (j: Journal) => T): Promise<T> {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    if ((await realpath(this.root)) !== this.root) throw new Error('JOURNAL_ROOT_SYMLINK');
    const lockPath = join(this.root, 'inbound.lock'); const lock = await open(lockPath, 'wx', 0o600);
    const temporary = join(this.root, `inbound-${randomUUID()}.tmp`);
    try {
      const j = await this.load(), result = fn(j);
      const file = await open(temporary, 'wx', 0o600);
      try { await file.writeFile(JSON.stringify(j)); await file.sync(); } finally { await file.close(); }
      await rename(temporary, join(this.root, 'inbound.json'));
      return structuredClone(result);
    } finally {
      await lock.close(); await unlink(lockPath);
      await unlink(temporary).catch(e => { if (e.code !== 'ENOENT') throw e; });
    }
  }
  async snapshot() { return this.transaction(j => j); }
  async admitBatch(events: readonly NormalizedProviderEvent[], at: string) {
    timestamp(new Date(at)); if (!events.length || events.length > 1000) throw new Error('BATCH_INVALID'); events.forEach(e => this.validateEvent(e));
    return this.transaction(j => {
      let admitted = 0, duplicates = 0;
      for (const event of events) {
        const key = businessKey(event.tenantId, event.accountId, event.provider, event.kind, event.kind === 'INBOUND' ? event.messageId : event.eventId);
        if (j.work.some(w => w.key === key)) { duplicates++; continue; }
        if (j.work.length >= 10000) throw new Error('JOURNAL_CAPACITY');
        j.work.push({ key, event: structuredClone(event), state: 'QUEUED', attempt: 0 }); admitted++;
        j.audit.push({ tenantId: this.tenantId, entryId: key, action: 'ADMISSION', mode: 'SIMULATION', occurredAt: at, reason: 'DURABLE_LOCAL_ADMISSION' });
      }
      return { admitted, duplicates };
    });
  }
  async reserve(owner: string, at: string, leaseMs = 30000) {
    timestamp(new Date(at)); if (!owner.trim() || !Number.isFinite(leaseMs) || leaseMs < 1 || leaseMs > 300000) throw new Error('INVALID_LEASE');
    return this.transaction(j => {
      const now = Date.parse(at);
      for (const w of j.work) {
        if (w.state === 'COMPLETED' || w.state === 'FAILED_FINAL' || (w.state === 'RESERVED' && Date.parse(w.leaseUntil!) > now) || (w.retryAt && Date.parse(w.retryAt) > now)) continue;
        if (w.attempt >= 3) { w.state = 'FAILED_FINAL'; w.token = undefined; continue; }
        w.state = 'RESERVED'; w.owner = owner; w.attempt++; w.token = randomUUID(); w.leaseUntil = new Date(now + leaseMs).toISOString(); w.retryAt = undefined;
        return { event: w.event, token: w.token, attempt: w.attempt };
      }
      return undefined;
    });
  }
  async process(token: string, at: string, autoReply?: AutoReplyConfiguration) {
    timestamp(new Date(at));
    return this.transaction(j => {
      const w = j.work.find(w => w.token === token && w.state === 'RESERVED');
      if (!w || Date.parse(w.leaseUntil!) <= Date.parse(at)) throw new Error('STALE_LEASE');
      if (w.event.kind === 'INBOUND') {
        const result = projectInbound(j.projection, w.event, randomUUID); j.projection = result.state;
        if (!result.duplicate && autoReply && result.contactId && result.conversationId) {
          const draft = prepareAutoReplyDraft({ contactId: result.contactId, conversationId: result.conversationId, source: w.event, content: autoReply.content, humanEscalation: autoReply.humanEscalation, policy: { ...autoReply, tenantId: this.tenantId, contactId: result.contactId, mode: 'SIMULATION', channel: w.event.channel, provider: w.event.provider, purpose: 'SERVICE_REPLY', messageType: 'TEXT', now: at, lastInboundAt: w.event.occurredAt, inboundEvidence: 'SIMULATION' } });
          if (draft) { j.drafts.push(draft); j.audit.push({ tenantId: this.tenantId, entryId: w.key, mode: 'SIMULATION', action: 'DRAFT', occurredAt: at, reason: 'AUTO_REPLY_DRAFT_ONLY' }); }
        }
      } else {
        // No outbound exists locally. Keep receipt evidence without manufacturing a correlated send.
        j.audit.push({ tenantId: this.tenantId, entryId: w.key, mode: 'SIMULATION', action: 'PROVIDER_RESULT', occurredAt: at, reason: 'UNBOUND_RECEIPT_NOT_APPLIED' });
      }
      w.state = 'COMPLETED'; w.token = undefined; w.owner = undefined; w.leaseUntil = undefined;
      return { state: 'COMPLETED' as const, canSend: false as const };
    });
  }
  async fail(token: string, at: string, retryable: boolean) {
    timestamp(new Date(at));
    return this.transaction(j => {
      const w = j.work.find(w => w.token === token && w.state === 'RESERVED');
      if (!w || Date.parse(w.leaseUntil!) <= Date.parse(at)) throw new Error('STALE_LEASE');
      w.state = retryable && w.attempt < 3 ? 'QUEUED' : 'FAILED_FINAL';
      w.retryAt = w.state === 'QUEUED' ? new Date(Date.parse(at) + 1000 * 2 ** (w.attempt - 1)).toISOString() : undefined;
      w.token = undefined; w.owner = undefined; w.leaseUntil = undefined;
    });
  }
}
