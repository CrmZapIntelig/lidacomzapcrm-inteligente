import { createHmac, timingSafeEqual } from 'node:crypto';
import type { MessagingProvider, NormalizedProviderEvent, OutboundRequest, ProviderCredentialResolver, SendResult } from '../../src/application/messagingReadiness';
import { evaluateMessagingPolicy } from '../../src/domain/messagingPolicy';
import type { ExecutionMode } from '../../src/domain/messagingPolicy';

export interface MetaConfiguration {
  mode?: 'DISABLED' | 'MOCK' | 'STAGING' | 'LIVE'; tenantId: string; wabaId: string; phoneNumberId: string;
  apiVersion?: string; credentialRef?: string; appSecretRef?: string; verifyTokenRef?: string;
}
const emptySecrets: ProviderCredentialResolver = { async resolve() { return undefined; } };
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_WEBHOOK');
  return value as Record<string, unknown>;
}
function string(value: unknown): string { if (typeof value !== 'string' || !value.trim()) throw new Error('INVALID_WEBHOOK'); return value; }
function array(value: unknown): unknown[] { if (!Array.isArray(value) || !value.length || value.length > 1000) throw new Error('INVALID_WEBHOOK'); return value; }
export function normalizeMetaStatus(value: unknown): 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' {
  if (typeof value !== 'string' || !['sent', 'delivered', 'read', 'failed'].includes(value)) throw new Error('UNSUPPORTED_STATUS');
  return value.toUpperCase() as 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
}
/** No response body, token or provider error message reaches the result/log boundary. */
export function classifyMetaResponse(status: number, body: unknown, mode: ExecutionMode): SendResult {
  if (!Number.isInteger(status)) return { mode, outcome: 'UNCERTAIN', reason: 'INVALID_RESPONSE' };
  if (status >= 200 && status < 300) {
    try { const messages = array(record(body).messages); const id = string(record(messages[0]).id); return { mode, outcome: 'ACCEPTED', providerMessageId: id, reason: 'API_ACCEPTED_NOT_DELIVERED' }; }
    catch { return { mode, outcome: 'UNCERTAIN', reason: 'ACCEPTANCE_ID_MISSING' }; }
  }
  // Conservative: server errors may follow acceptance. Never blindly retry ambiguous sends.
  if (status === 429) return { mode, outcome: 'RETRYABLE_FAILURE', reason: 'RATE_LIMIT' };
  return { mode, outcome: status >= 500 || status === 408 ? 'UNCERTAIN' : 'FINAL_FAILURE', reason: 'PROVIDER_REQUEST_FAILED' };
}
export function classifyTransportFailure(mode: ExecutionMode): SendResult { return { mode, outcome: 'UNCERTAIN', reason: 'TRANSPORT_OUTCOME_UNKNOWN' }; }

export class MetaWhatsAppCloudProvider implements MessagingProvider {
  readonly provider = 'WHATSAPP_META_OFFICIAL';
  readonly configuration: Readonly<MetaConfiguration>;
  #secrets: ProviderCredentialResolver;
  constructor(configuration: MetaConfiguration, secrets: ProviderCredentialResolver = emptySecrets) {
    if (typeof window !== 'undefined') throw new Error('SERVER_ONLY_PROVIDER');
    if (!configuration.tenantId?.trim() || !/^\d+$/.test(configuration.wabaId) || !/^\d+$/.test(configuration.phoneNumberId) || !['DISABLED', 'MOCK', 'STAGING', 'LIVE'].includes(configuration.mode ?? 'DISABLED')) throw new Error('INVALID_PROVIDER_CONFIGURATION');
    this.configuration = Object.freeze({ ...configuration, mode: configuration.mode ?? 'DISABLED' }); this.#secrets = secrets;
  }
  normalizeStatus = normalizeMetaStatus;
  private context(i: OutboundRequest, type: 'TEXT' | 'TEMPLATE') {
    const mode = this.configuration.mode === 'MOCK' ? 'SIMULATION' : this.configuration.mode === 'LIVE' ? 'LIVE' : 'STAGING';
    if (i.tenantId !== this.configuration.tenantId || i.policy.tenantId !== i.tenantId || i.policy.contactId !== i.contactId || i.policy.provider !== this.provider || i.policy.channel !== 'WHATSAPP' || i.policy.messageType !== type || i.policy.mode !== mode || !i.entryId?.trim() || !i.idempotencyKey?.trim() || !/^\+[1-9]\d{7,14}$/.test(i.recipient)) throw new Error('OUTBOUND_CONTEXT_MISMATCH');
    const decision = evaluateMessagingPolicy(i.policy);
    if (!decision.allowedByPolicy) throw new Error('OUTBOUND_POLICY_BLOCKED');
    return decision;
  }
  serializeText(i: OutboundRequest) {
    this.context(i, 'TEXT');
    if (!i.text?.trim() || i.text.length > 4096) throw new Error('INVALID_TEXT');
    return { messaging_product: 'whatsapp', recipient_type: 'individual', to: i.recipient.slice(1), type: 'text', text: { preview_url: false, body: i.text } };
  }
  serializeTemplate(i: OutboundRequest) {
    this.context(i, 'TEMPLATE'); const t = i.policy.template!;
    // Supported subset: positional text parameters in BODY only; no media/buttons/auth special forms.
    if (t.category === 'AUTHENTICATION') throw new Error('TEMPLATE_SERIALIZATION_NOT_SUPPORTED');
    return { messaging_product: 'whatsapp', to: i.recipient.slice(1), type: 'template', template: { name: t.providerTemplateName, language: { code: t.language }, components: t.variables.length ? [{ type: 'body', parameters: i.policy.variables!.map(text => ({ type: 'text', text })) }] : [] } };
  }
  endpoint(): string {
    if (!/^v\d+\.\d+$/.test(this.configuration.apiVersion ?? '')) throw new Error('API_VERSION_NOT_CONFIGURED');
    return `https://graph.facebook.com/${this.configuration.apiVersion}/${this.configuration.phoneNumberId}/messages`;
  }
  async sendText(i: OutboundRequest) { return this.prepareSend(i, 'TEXT'); }
  async sendTemplate(i: OutboundRequest) { return this.prepareSend(i, 'TEMPLATE'); }
  private async prepareSend(i: OutboundRequest, type: 'TEXT' | 'TEMPLATE'): Promise<SendResult> {
    const mode: ExecutionMode = this.configuration.mode === 'MOCK' ? 'SIMULATION' : this.configuration.mode === 'LIVE' ? 'LIVE' : 'STAGING';
    if (this.configuration.mode === 'DISABLED') return { mode, outcome: 'DISABLED', reason: 'PROVIDER_DISABLED' };
    try { type === 'TEXT' ? this.serializeText(i) : this.serializeTemplate(i); }
    catch { return { mode, outcome: 'BLOCKED', reason: 'POLICY_OR_PAYLOAD_INVALID' }; }
    if (this.configuration.mode === 'MOCK') return { mode: 'SIMULATION', outcome: 'MOCK', reason: 'SIMULATED_NO_TRANSPORT' };
    let secret: string | undefined;
    try { secret = this.configuration.credentialRef ? await this.#secrets.resolve(i.tenantId, this.configuration.credentialRef) : undefined; }
    catch { return { mode, outcome: 'BLOCKED', reason: 'CREDENTIAL_UNAVAILABLE' }; }
    if (!secret?.trim()) return { mode, outcome: 'BLOCKED', reason: 'MISSING_CREDENTIAL' };
    // Deliberately no transport binding in this preparation. No flag bypasses the first-send gate.
    return { mode, outcome: 'BLOCKED', reason: 'GATE_OUTBOUND_CANARY_REQUIRED' };
  }
  async verifyWebhook(raw: Uint8Array, signature: string | undefined, tenantId: string): Promise<boolean> {
    if (this.configuration.mode === 'DISABLED' || tenantId !== this.configuration.tenantId || raw.length > 1048576 || !/^sha256=[a-fA-F0-9]{64}$/.test(signature ?? '')) return false;
    try {
      const secret = this.configuration.appSecretRef ? await this.#secrets.resolve(tenantId, this.configuration.appSecretRef) : undefined;
      if (!secret) return false;
      const expected = createHmac('sha256', secret).update(raw).digest();
      return timingSafeEqual(expected, Buffer.from(signature!.slice(7), 'hex'));
    } catch { return false; }
  }
  async verifyChallenge(fields: Record<string, string>, tenantId: string): Promise<string | undefined> {
    if (this.configuration.mode === 'DISABLED' || tenantId !== this.configuration.tenantId || fields['hub.mode'] !== 'subscribe' || !/^\d{1,256}$/.test(fields['hub.challenge'] ?? '') || !fields['hub.verify_token'] || fields['hub.verify_token'].length > 4096) return undefined;
    try {
      const secret = this.configuration.verifyTokenRef ? await this.#secrets.resolve(tenantId, this.configuration.verifyTokenRef) : undefined;
      if (!secret) return undefined;
      const a = createHmac('sha256', secret).update(fields['hub.verify_token']).digest(); const b = createHmac('sha256', secret).update(secret).digest();
      return timingSafeEqual(a, b) ? fields['hub.challenge'] : undefined;
    } catch { return undefined; }
  }
  parseWebhook(raw: Uint8Array, tenantId: string, mode: ExecutionMode): readonly NormalizedProviderEvent[] {
    const expectedMode = this.configuration.mode === 'MOCK' ? 'SIMULATION' : this.configuration.mode;
    if (this.configuration.mode === 'DISABLED' || mode !== expectedMode || tenantId !== this.configuration.tenantId || raw.length > 1048576) throw new Error('WEBHOOK_CONTEXT_MISMATCH');
    const envelope = record(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)));
    if (envelope.object !== 'whatsapp_business_account') throw new Error('INVALID_WEBHOOK');
    const events: NormalizedProviderEvent[] = [];
    for (const entry of array(envelope.entry)) {
      const e = record(entry); if (e.id !== this.configuration.wabaId) throw new Error('WEBHOOK_ACCOUNT_MISMATCH');
      for (const change of array(e.changes)) {
        const c = record(change), v = record(c.value);
        if (c.field !== 'messages' || v.messaging_product !== 'whatsapp' || record(v.metadata).phone_number_id !== this.configuration.phoneNumberId) throw new Error('WEBHOOK_ACCOUNT_MISMATCH');
        for (const kind of ['messages', 'statuses'] as const) {
          if (v[kind] === undefined) continue;
          for (const item of array(v[kind])) {
            const m = record(item), id = string(m.id), rawTime = string(m.timestamp);
            if (!/^\d+$/.test(rawTime) || !Number.isSafeInteger(Number(rawTime))) throw new Error('INVALID_WEBHOOK');
            const occurredAt = new Date(Number(rawTime) * 1000).toISOString();
            const base = { tenantId, accountId: this.configuration.wabaId, provider: this.provider, channel: 'WHATSAPP' as const, mode, messageId: id, occurredAt };
            if (kind === 'messages') {
              if (m.type !== 'text' || !/^[1-9]\d{7,14}$/.test(string(m.from))) throw new Error('UNSUPPORTED_INBOUND');
              const text = string(record(m.text).body); if (text.length > 4096) throw new Error('INVALID_WEBHOOK');
              events.push({ ...base, eventId: `${id}:inbound`, kind: 'INBOUND', address: `+${m.from}`, text });
            } else {
              const status = normalizeMetaStatus(m.status);
              events.push({ ...base, eventId: `${id}:${status}:${rawTime}`, kind: 'STATUS', status });
            }
            if (events.length > 1000) throw new Error('WEBHOOK_BATCH_TOO_LARGE');
          }
        }
      }
    }
    if (!events.length) throw new Error('UNSUPPORTED_WEBHOOK'); return events;
  }
}
