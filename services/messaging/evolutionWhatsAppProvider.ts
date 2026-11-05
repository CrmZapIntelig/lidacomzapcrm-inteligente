import type { ExecutionMode } from '../../src/domain/messagingPolicy';
import type { SendResult } from '../../src/application/messagingReadiness';

export interface EvolutionConfiguration {
  tenantId: string;
  instanceName: string;
  mode?: 'DISABLED' | 'MOCK' | 'STAGING' | 'LIVE';
}
export interface EvolutionTextDraftInput {
  tenantId: string; contactId: string; recipient: string; text: string;
  mode: ExecutionMode; blocked: boolean; optedOut: boolean;
  consent: 'ALLOWED' | 'DENIED' | 'UNKNOWN';
}
/** Local text adapter for the Evolution v2 DTO. No credentials, transport or webhook authentication.
 * MOCK does not establish session availability or provider permission to send.
 */
export class EvolutionWhatsAppProvider {
  readonly provider = 'WHATSAPP_EVOLUTION_OPTIONAL' as const;
  readonly configuration: Readonly<EvolutionConfiguration>;
  constructor(configuration: EvolutionConfiguration) {
    if (typeof window !== 'undefined') throw new Error('SERVER_ONLY_PROVIDER');
    if (!configuration.tenantId?.trim() || !/^[A-Za-z0-9_-]{1,128}$/.test(configuration.instanceName) ||
      !['DISABLED', 'MOCK', 'STAGING', 'LIVE'].includes(configuration.mode ?? 'DISABLED')) throw new Error('INVALID_EVOLUTION_CONFIGURATION');
    this.configuration = Object.freeze({ ...configuration, mode: configuration.mode ?? 'DISABLED' });
  }
  prepareText(i: EvolutionTextDraftInput) {
    if (this.configuration.mode !== 'MOCK' || i.mode !== 'SIMULATION') throw new Error('EVOLUTION_DRAFT_SIMULATION_ONLY');
    if (i.tenantId !== this.configuration.tenantId || !i.contactId?.trim() || !/^\+[1-9]\d{7,14}$/.test(i.recipient)) throw new Error('EVOLUTION_CONTEXT_MISMATCH');
    if (i.blocked !== false || i.optedOut !== false || i.consent !== 'ALLOWED') throw new Error('RECIPIENT_NOT_ALLOWED');
    // Conservative product text limit, not an assertion about Evolution server limits.
    if (typeof i.text !== 'string' || !i.text.trim() || i.text.length > 4096) throw new Error('INVALID_TEXT');
    return { tenantId: i.tenantId, contactId: i.contactId, provider: this.provider, channel: 'WHATSAPP' as const,
      instanceName: this.configuration.instanceName, mode: 'SIMULATION' as const, state: 'DRAFT' as const,
      canSend: false as const, payload: { number: i.recipient.slice(1), text: i.text, linkPreview: false } };
  }
  async sendText(i: EvolutionTextDraftInput): Promise<SendResult> {
    const mode = this.configuration.mode === 'MOCK' ? 'SIMULATION' : this.configuration.mode === 'LIVE' ? 'LIVE' : 'STAGING';
    if (this.configuration.mode === 'DISABLED') return { mode, outcome: 'DISABLED', reason: 'PROVIDER_DISABLED' };
    if (this.configuration.mode !== 'MOCK') return { mode, outcome: 'BLOCKED', reason: 'GATE_EVOLUTION_INSTANCE_AND_CANARY_REQUIRED' };
    try { this.prepareText(i); return { mode, outcome: 'MOCK', reason: 'SIMULATED_NO_TRANSPORT' }; }
    catch { return { mode, outcome: 'BLOCKED', reason: 'POLICY_OR_PAYLOAD_INVALID' }; }
  }
}
