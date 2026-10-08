import type { LocalInboundJournal } from '../messaging/localInboundJournal';
import type { MetaWhatsAppCloudProvider } from '../messaging/metaWhatsAppCloudProvider';

export const syntheticRuntimeLimits = Object.freeze({ maxBodyBytes: 65536, maxBatchSize: 10, workerLeaseMs: 30000 });
type ValidationPort = Pick<MetaWhatsAppCloudProvider, 'verifyChallenge' | 'verifyWebhook' | 'parseWebhook'>;
type JournalPort = Pick<LocalInboundJournal, 'tenantId' | 'accountId' | 'admitBatch' | 'reserve' | 'process' | 'fail'>;
export interface SyntheticRequest { method: string; path: string; query?: Record<string, string>; contentType?: string; signature?: string; raw: Uint8Array }
export interface SyntheticResponse { status: number; body: string }
// Closed fixture subset: unused raw fields cannot carry real contact/profile data.
function fixtureEnvelope(raw: Uint8Array) {
  const fields = (value: unknown, allowed: string[]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !allowed.includes(k))) throw new Error('TEST_FIELDS_REQUIRED');
    return value as Record<string, unknown>;
  };
  const root = fields(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)), ['object', 'entry']);
  for (const entry of root.entry as unknown[]) {
    const e = fields(entry, ['id', 'changes']);
    for (const change of e.changes as unknown[]) {
      const c = fields(change, ['field', 'value']), v = fields(c.value, ['messaging_product', 'metadata', 'messages', 'statuses']);
      fields(v.metadata, ['phone_number_id']);
      for (const message of (v.messages ?? []) as unknown[]) {
        const m = fields(message, ['id', 'from', 'timestamp', 'type', 'text', 'context']);
        if (!['TEST fixture only', 'TEST managed HTTPS fixture'].includes(String(fields(m.text, ['body']).body))) throw new Error('TEST_TEXT_REQUIRED');
        if (m.context !== undefined) fields(m.context, ['id']);
      }
      for (const status of (v.statuses ?? []) as unknown[]) fields(status, ['id', 'timestamp', 'status']);
    }
  }
}

/** Admission ACK and explicit single-step worker share the existing transactional journal.
 * No listener, background-after-response work, second queue, send or provider credential. */
export function createSyntheticStagingIngress(validation: ValidationPort, journal: JournalPort, now = () => new Date().toISOString()) {
  if (!/^demo(?:-|$)/.test(journal.tenantId) || !/^\d+$/.test(journal.accountId)) throw new Error('SYNTHETIC_CONTEXT_REQUIRED');
  return async (request: SyntheticRequest): Promise<SyntheticResponse> => {
    const result = (status: number, body = '') => ({ status, body });
    if (!['/webhooks/meta', '/worker'].includes(request.path)) return result(404);
    try {
      if (request.method === 'GET' && request.path === '/webhooks/meta') {
        const fields = request.query ?? {};
        if (Object.keys(fields).some(k => !['hub.mode', 'hub.verify_token', 'hub.challenge'].includes(k))) return result(400);
        const challenge = await validation.verifyChallenge(fields, journal.tenantId);
        return result(challenge ? 200 : 403, challenge ?? '');
      }
      if (request.method !== 'POST') return result(405);
      if (!/^application\/json(?:;|$)/i.test(request.contentType ?? '')) return result(415);
      if (request.raw.byteLength > syntheticRuntimeLimits.maxBodyBytes) return result(413);
      if (!request.raw.byteLength) return result(400);
      if (!(await validation.verifyWebhook(request.raw, request.signature, journal.tenantId))) return result(403);
      if (request.path === '/webhooks/meta') {
        let events;
        try { fixtureEnvelope(request.raw); events = validation.parseWebhook(request.raw, journal.tenantId, 'SIMULATION'); } catch { return result(400); }
        if (events.length > syntheticRuntimeLimits.maxBatchSize) return result(413);
        // Even a valid fixture signature cannot promote arbitrary content/identity to staging data.
        if (events.some(e => e.mode !== 'SIMULATION' || e.tenantId !== journal.tenantId || e.accountId !== journal.accountId || !/^synthetic-TEST-[A-Za-z0-9:_-]+$/.test(e.messageId) || (e.inReplyToMessageId !== undefined && !/^synthetic-TEST-[A-Za-z0-9:_-]+$/.test(e.inReplyToMessageId)) || (e.kind === 'INBOUND' && (!/^\+1202555010[0-6]$/.test(e.address ?? '') || !e.text?.startsWith('TEST '))))) return result(400);
        await journal.admitBatch(events, now());
        return result(200, 'STAGING_SYNTHETIC_DURABLE_ACK');
      }
      let action: Record<string, unknown>;
      try { action = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(request.raw)); } catch { return result(400); }
      if (!action || Array.isArray(action) || Object.keys(action).length !== 1 || !['TEST_PROCESS', 'TEST_CLAIM_ONLY', 'TEST_RETRYABLE_FAILURE', 'TEST_FINAL_FAILURE'].includes(String(action.action))) return result(400);
      const work = await journal.reserve('TEST-managed-staging-worker', now(), syntheticRuntimeLimits.workerLeaseMs);
      if (!work) return result(200, 'TEST_NO_WORK');
      if (action.action === 'TEST_CLAIM_ONLY') return result(200, 'TEST_LEASE_RESERVED'); // Intentional synthetic crash/recovery probe; token never exposed.
      if (action.action !== 'TEST_PROCESS') {
        await journal.fail(work.token, now(), action.action === 'TEST_RETRYABLE_FAILURE');
        return result(200, 'TEST_FAILURE_RECORDED');
      }
      try {
        await journal.process(work.token, now(), { content: 'TEST resposta apenas draft', humanEscalation: 'TEST atender com operador humano', blocked: false, optedOut: false, consent: 'ALLOWED' });
      } catch {
        await journal.fail(work.token, now(), true).catch(() => undefined);
        return result(503);
      }
      return result(200, 'TEST_PROJECTION_COMPLETE_NO_SEND');
    } catch { return result(503); } // No raw provider/data/credential error escapes to response or logs.
  };
}
