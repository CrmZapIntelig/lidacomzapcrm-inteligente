import type { ChannelProvider } from '../../src/domain/omnichannel';
import type { EligibilityEvidence, EligibilityPolicy } from '../../src/domain/dispatchPrerequisites';
import { evaluateDispatchEligibility } from '../../src/domain/dispatchPrerequisites';
import type { OutboundRequest } from '../../src/application/messagingReadiness';
import type { EvolutionWhatsAppProvider } from './evolutionWhatsAppProvider';
import type { MetaWhatsAppCloudProvider } from './metaWhatsAppCloudProvider';
import type { RcsChannelProvider, RcsCapabilityEvidence } from './rcsChannelProvider';

export interface UnifiedMessagePreparationInput {
  provider: ChannelProvider;
  request: OutboundRequest;
  eligibility: EligibilityEvidence;
  eligibilityPolicy: EligibilityPolicy;
  previousOutcome: 'NONE' | 'ACCEPTED' | 'UNCERTAIN' | 'FINAL_FAILURE';
  rcsCapability?: RcsCapabilityEvidence;
}
export interface PreparationProviders {
  meta?: MetaWhatsAppCloudProvider;
  evolution?: EvolutionWhatsAppProvider;
  rcs?: RcsChannelProvider;
}
/** One explicit provider, one local draft. No automatic fallback, queue or transport.
 * The Meta policy is applied only to Meta. RCS/Evolution remain simulation preparations.
 */
export function prepareUnifiedMessage(i: UnifiedMessagePreparationInput, providers: PreparationProviders) {
  const channel = i.provider === 'RCS_GOOGLE' ? 'RCS' as const : 'WHATSAPP' as const;
  const base = { provider: i.provider, channel, mode: 'SIMULATION' as const, canSend: false as const };
  const blocked = (reason: string) => ({ ...base, state: 'BLOCKED' as const, reason });
  if (!['WHATSAPP_META_OFFICIAL', 'WHATSAPP_EVOLUTION_OPTIONAL', 'RCS_GOOGLE'].includes(i.provider)) return blocked('INVALID_PROVIDER');
  // A retry/fallback requires a separate reviewed operation, including definitive failures.
  if (i.previousOutcome !== 'NONE') return blocked('PREVIOUS_ATTEMPT_REQUIRES_REVIEW');
  const r = i.request, e = i.eligibility, p = r.policy;
  if (p.mode !== 'SIMULATION') return blocked('SIMULATION_ONLY');
  if (!['SERVICE_REPLY', 'BUSINESS_INITIATED'].includes(p.purpose)) return blocked('INVALID_PURPOSE');
  if (r.tenantId !== p.tenantId || r.contactId !== p.contactId || r.tenantId !== e.tenantId || r.contactId !== e.contactId ||
    r.recipient !== e.phone || e.identity.provider !== i.provider || e.identity.channel !== channel ||
    p.provider !== i.provider || p.channel !== channel || r.tenantId !== i.eligibilityPolicy.tenantId ||
    Date.parse(p.now) !== i.eligibilityPolicy.evaluatedAt.getTime() || !r.entryId?.trim() || !r.idempotencyKey?.trim()) return blocked('PREPARATION_CONTEXT_MISMATCH');
  if (p.blocked !== false || p.optedOut !== false || p.consent !== 'ALLOWED') return blocked('RECIPIENT_NOT_ALLOWED');
  try {
    if (!evaluateDispatchEligibility(e, i.eligibilityPolicy).eligibleForPreparation) return blocked('RECIPIENT_NOT_ELIGIBLE');
    let payload: unknown;
    switch (i.provider) {
      case 'WHATSAPP_META_OFFICIAL': {
        const provider = providers.meta;
        if (!provider || provider.configuration.mode !== 'MOCK') return blocked('PROVIDER_NOT_IN_MOCK_MODE');
        if (!['TEXT', 'TEMPLATE'].includes(p.messageType)) return blocked('UNSUPPORTED_CONTENT');
        payload = p.messageType === 'TEXT' ? provider.serializeText(r) : provider.serializeTemplate(r);
        break;
      }
      case 'WHATSAPP_EVOLUTION_OPTIONAL': {
        if (!providers.evolution) return blocked('PROVIDER_NOT_CONFIGURED');
        if (p.messageType !== 'TEXT') return blocked('UNSUPPORTED_CONTENT');
        payload = providers.evolution.prepareText({ tenantId: r.tenantId, contactId: r.contactId, recipient: r.recipient,
          text: r.text ?? '', mode: p.mode, blocked: p.blocked, optedOut: p.optedOut, consent: p.consent }).payload;
        break;
      }
      case 'RCS_GOOGLE': {
        const provider = providers.rcs;
        if (!provider || provider.configuration.tenantId !== r.tenantId) return blocked('PROVIDER_NOT_CONFIGURED');
        if (p.messageType !== 'TEXT') return blocked('UNSUPPORTED_CONTENT');
        payload = provider.prepareDraft({ recipient: r.recipient, at: p.now, capability: i.rcsCapability, content: { kind: 'TEXT', text: r.text ?? '' } }).content;
        break;
      }
    }
    return { ...base, state: 'DRAFT' as const, reason: 'LOCAL_PREPARATION_ONLY', payload };
  } catch { return blocked('POLICY_OR_PAYLOAD_INVALID'); }
}
