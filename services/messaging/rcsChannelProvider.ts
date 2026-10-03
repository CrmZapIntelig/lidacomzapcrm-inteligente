import type { ExecutionMode } from '../../src/domain/messagingPolicy';

export interface RcsAgentConfiguration { tenantId: string; mode?: 'DISABLED' | 'MOCK' | 'STAGING' | 'LIVE'; agentId?: string; credentialRef?: string; region?: string }
export interface RcsCapabilityEvidence { tenantId: string; agentId: string; recipient: string; mode: ExecutionMode; availability: 'KNOWN_AVAILABLE' | 'KNOWN_UNAVAILABLE' | 'UNKNOWN'; features: readonly string[]; source: 'RCS_CAPABILITY_CHECK' | 'FIXTURE' | 'UNKNOWN'; observedAt: string }
export type RcsDraftContent = { kind: 'TEXT'; text: string; suggestedReplies?: readonly { text: string; postbackData: string }[] } | { kind: 'RICH_CARD'; title: string; description: string; suggestedReplies?: readonly { text: string; postbackData: string }[] };

/** RCS for Business preparation. No messages.google.com scraping, SDK, credentials or network. */
export class RcsChannelProvider {
  readonly provider = 'RCS_GOOGLE';
  readonly configuration: Readonly<RcsAgentConfiguration>;
  constructor(configuration: RcsAgentConfiguration) {
    if (typeof window !== 'undefined') throw new Error('SERVER_ONLY_PROVIDER');
    if (!configuration.tenantId?.trim() || !['DISABLED', 'MOCK', 'STAGING', 'LIVE'].includes(configuration.mode ?? 'DISABLED')) throw new Error('INVALID_RCS_CONFIGURATION');
    this.configuration = Object.freeze({ ...configuration, mode: configuration.mode ?? 'DISABLED' });
  }
  checkCapability(recipient: string, at: string, supplied?: RcsCapabilityEvidence) {
    const unknown = { availability: 'UNKNOWN' as const, features: [] as readonly string[], canSend: false as const, reason: 'RCS_DISABLED_OR_UNVERIFIED' };
    const c = this.configuration;
    if (c.mode === 'DISABLED' || !c.agentId || !/^\+[1-9]\d{7,14}$/.test(recipient) || !Number.isFinite(Date.parse(at)) || !supplied || supplied.tenantId !== c.tenantId || supplied.agentId !== c.agentId || supplied.recipient !== recipient || !Number.isFinite(Date.parse(supplied.observedAt)) || Date.parse(supplied.observedAt) > Date.parse(at)) return unknown;
    const mode = c.mode === 'MOCK' ? 'SIMULATION' : c.mode;
    if (supplied.mode !== mode || supplied.source !== (mode === 'SIMULATION' ? 'FIXTURE' : 'RCS_CAPABILITY_CHECK') || !['KNOWN_AVAILABLE', 'KNOWN_UNAVAILABLE', 'UNKNOWN'].includes(supplied.availability)) return unknown;
    // Local freshness policy (5 minutes), not a Google reachability/TTL guarantee.
    if (Date.parse(at) - Date.parse(supplied.observedAt) > 300000) return unknown;
    return { availability: supplied.availability, features: [...supplied.features], canSend: false as const, reason: 'SUPPLIED_CAPABILITY_EVIDENCE_ONLY' };
  }
  prepareDraft(input: { recipient: string; at: string; capability?: RcsCapabilityEvidence; content: RcsDraftContent }) {
    const capability = this.checkCapability(input.recipient, input.at, input.capability);
    if (capability.availability !== 'KNOWN_AVAILABLE' || this.configuration.mode !== 'MOCK') throw new Error('RCS_DRAFT_NOT_AVAILABLE');
    const content = input.content;
    if (!['TEXT', 'RICH_CARD'].includes(content.kind)) throw new Error('INVALID_RCS_CONTENT');
    if (content.kind === 'TEXT' && (!content.text.trim() || content.text.length > 2000)) throw new Error('INVALID_RCS_CONTENT');
    if (content.kind === 'RICH_CARD' && (!capability.features.includes('RICHCARD_STANDALONE') || !content.title.trim() || content.title.length > 200 || !content.description.trim() || content.description.length > 1000)) throw new Error('RICH_CARD_NOT_AVAILABLE');
    const replies = content.suggestedReplies ?? [];
    if (replies.length > 5 || replies.some(r => !r.text.trim() || r.text.length > 100 || !r.postbackData.trim() || r.postbackData.length > 200) || new Set(replies.map(r => r.postbackData)).size !== replies.length) throw new Error('INVALID_SUGGESTED_REPLY');
    return { tenantId: this.configuration.tenantId, agentId: this.configuration.agentId!, recipient: input.recipient, mode: 'SIMULATION' as const, state: 'DRAFT' as const, canSend: false as const, content: structuredClone(content), capability };
  }
  async sendText() { return { canSend: false as const, reason: this.configuration.mode === 'DISABLED' ? 'PROVIDER_DISABLED' : 'GATE_RCS_AGENT_AND_CANARY_REQUIRED' }; }
  async sendRichCard() { return this.sendText(); }
}
