import type { ContactChannelIdentity, RoutingMode, RoutingDecision, CommunicationChannel } from './omnichannel';
import { required, timestamp, isChannelProviderCompatible } from './offlinePrimitives';

// Gestão src/domain/routing.ts, 0b13ef1. Tenant and ambiguous-address guards added.
export interface RoutingRequest {
  tenantId: string;
  contactId: string;
  requestedMode: RoutingMode;
  identities: readonly ContactChannelIdentity[];
  evaluatedAt: Date;
}
export function decideRouting(request: RoutingRequest): RoutingDecision {
  required(request.tenantId); required(request.contactId); timestamp(request.evaluatedAt);
  if (!['WHATSAPP', 'RCS', 'BOTH_SMART'].includes(request.requestedMode)) throw new Error('INVALID_ROUTING_MODE');
  const candidates = (channel: CommunicationChannel) => request.identities.filter(i => i.tenantId === request.tenantId && i.contactId === request.contactId && i.channel === channel);
  const choose = (channel: CommunicationChannel) => {
    const valid = candidates(channel).filter(i => i.availability === 'KNOWN_AVAILABLE' && i.eligibility === 'ELIGIBLE' && i.provider && isChannelProviderCompatible(channel, i.provider));
    return valid.length === 1 ? valid[0] : undefined;
  };
  const wa = choose('WHATSAPP'), rcs = choose('RCS');
  const single = request.requestedMode === 'WHATSAPP' ? wa : rcs;
  const selected = request.requestedMode === 'BOTH_SMART' ? wa ?? rcs : single;
  const reason: RoutingDecision['reason'] = request.requestedMode === 'BOTH_SMART'
    ? wa ? 'WHATSAPP_SELECTED' : rcs ? candidates('WHATSAPP').some(i => i.availability === 'KNOWN_AVAILABLE') ? 'WHATSAPP_INELIGIBLE_FALLBACK_RCS' : 'WHATSAPP_UNAVAILABLE_FALLBACK_RCS' : 'NO_ELIGIBLE_CHANNEL'
    : selected ? selected.channel === 'WHATSAPP' ? 'WHATSAPP_SELECTED' : 'RCS_SELECTED' : candidates(request.requestedMode).some(i => i.availability === 'KNOWN_AVAILABLE') ? 'REQUESTED_CHANNEL_INELIGIBLE' : 'REQUESTED_CHANNEL_UNAVAILABLE';
  return { contactId: request.contactId, requestedMode: request.requestedMode, selectedChannel: selected?.channel ?? null, selectedProvider: selected?.provider, reason, evaluatedAt: new Date(request.evaluatedAt) };
}
