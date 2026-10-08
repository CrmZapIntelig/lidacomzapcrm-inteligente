import type { NormalizedProviderEvent } from '../../src/application/messagingReadiness';
import { timestamp } from '../../src/domain/offlinePrimitives';
import { StagingDurableInboundJournal } from './durableInboundJournal';
import type { AtomicJsonPort } from './durableInboundJournal';
import type { MetaWhatsAppCloudProvider } from '../messaging/metaWhatsAppCloudProvider';
import type { SyntheticRequest, SyntheticResponse } from './syntheticIngress';

export const metaTestBinding = Object.freeze({ projectId: 'lidacomzapcrm-staging', tenantId: 'demo-meta-TEST', appId: '1480563193903800', wabaId: '1670383058144564', phoneNumberId: '1406670279191899' });
export const metaTestLimits = Object.freeze({ bodyBytes: 65536, batchSize: 10, leaseMs: 30000 });

/** Explicit STAGING envelope. Same transaction/queue/lease/projection implementation;
 * never converts a real provider event to SIMULATION to evade fixture guards. */
export class StagingMetaTestJournal extends StagingDurableInboundJournal {
  private readonly senders: ReadonlySet<string>;
  constructor(port: AtomicJsonPort, environment: { appEnv: string; projectId: string; metaMode: string }, allowedTestSenders: readonly string[] = []) {
    if (environment.appEnv !== 'staging' || environment.projectId !== metaTestBinding.projectId || environment.metaMode !== 'TEST') throw new Error('META_TEST_ENVIRONMENT_REQUIRED');
    if (allowedTestSenders.length > 5 || allowedTestSenders.some(s => !/^\+[1-9]\d{7,14}$/.test(s))) throw new Error('TEST_ALLOWLIST_INVALID');
    super(port, metaTestBinding.tenantId, metaTestBinding.wabaId);
    this.senders = new Set(allowedTestSenders);
  }
  protected override get executionMode(): 'STAGING' { return 'STAGING'; }
  protected override validateEvent(e: NormalizedProviderEvent) {
    const fixture = /^wamid\.TEST-[A-Za-z0-9_-]{1,120}$/.test(e.messageId) && /^\+1202555010[0-6]$/.test(e.address ?? '');
    if (e.kind !== 'INBOUND' || e.mode !== 'STAGING' || e.provider !== 'WHATSAPP_META_OFFICIAL' || e.channel !== 'WHATSAPP' || e.tenantId !== this.tenantId || e.accountId !== this.accountId || !/^wamid\.[A-Za-z0-9_=-]{1,200}$/.test(e.messageId) || e.eventId !== `${e.messageId}:inbound` || e.text !== 'TEST inbound staging' || e.inReplyToMessageId !== undefined || (!fixture && !this.senders.has(e.address ?? ''))) throw new Error('META_TEST_EVENT_REQUIRED');
    timestamp(new Date(e.occurredAt));
  }
}

type Validation = Pick<MetaWhatsAppCloudProvider, 'verifyChallenge' | 'verifyWebhook' | 'parseWebhook'>;
type Admission = Pick<StagingMetaTestJournal, 'tenantId' | 'accountId' | 'admitBatch'>;

/** Public receiver only. No worker path, credentials, sender or second queue. */
export function createMetaTestReceiver(validation: Validation, journal: Admission, now = () => new Date().toISOString()) {
  if (journal.tenantId !== metaTestBinding.tenantId || journal.accountId !== metaTestBinding.wabaId) throw new Error('META_TEST_BINDING_REQUIRED');
  return async (request: SyntheticRequest): Promise<SyntheticResponse> => {
    const result = (status: number, body = '') => ({ status, body });
    if (request.path !== '/webhooks/meta') return result(404);
    try {
      if (request.method === 'GET') {
        const q = request.query ?? {};
        if (Object.keys(q).some(k => !['hub.mode', 'hub.verify_token', 'hub.challenge'].includes(k))) return result(400);
        const challenge = await validation.verifyChallenge(q, journal.tenantId);
        return result(challenge ? 200 : 403, challenge ?? '');
      }
      if (request.method !== 'POST') return result(405);
      if (!/^application\/json(?:;|$)/i.test(request.contentType ?? '')) return result(415);
      if (request.raw.length > metaTestLimits.bodyBytes) return result(413);
      if (!request.raw.length) return result(400);
      if (!await validation.verifyWebhook(request.raw, request.signature, journal.tenantId)) return result(403);
      let events: readonly NormalizedProviderEvent[];
      try { events = validation.parseWebhook(request.raw, journal.tenantId, 'STAGING'); } catch { return result(400); }
      if (events.length > metaTestLimits.batchSize) return result(413);
      // Do not silently discard receipts or unsupported events from a batch.
      if (events.some(e => e.kind !== 'INBOUND')) return result(400);
      try { await journal.admitBatch(events, now()); } catch (e) {
        if (e instanceof Error && e.message === 'META_TEST_EVENT_REQUIRED') return result(400);
        return result(503);
      }
      return result(200, 'META_TEST_DURABLE_ACK');
    } catch { return result(503); }
  };
}

export async function runMetaTestWorker(journal: StagingMetaTestJournal, at: string) {
  const work = await journal.reserve('TEST-meta-private-worker', at, metaTestLimits.leaseMs);
  if (!work) return { state: 'NO_WORK', canSend: false as const };
  try {
    return await journal.process(work.token, at, { content: 'TEST resposta apenas draft', humanEscalation: 'TEST atendimento humano', blocked: false, optedOut: false, consent: 'ALLOWED' });
  } catch {
    await journal.fail(work.token, at, true).catch(() => undefined);
    return { state: 'RETRY', canSend: false as const };
  }
}
