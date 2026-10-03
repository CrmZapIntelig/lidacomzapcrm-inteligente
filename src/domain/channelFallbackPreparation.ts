export interface ChannelReadiness { available: 'KNOWN_AVAILABLE' | 'KNOWN_UNAVAILABLE' | 'UNKNOWN'; eligible: boolean; policyAllowed: boolean }
/** One channel before a send intent. An accepted/uncertain attempt forbids cross-channel fallback. */
export function prepareChannelFallback(i: { strategy: 'RCS_FIRST_WITH_WHATSAPP_FALLBACK' | 'WHATSAPP_FIRST_WITH_RCS_FALLBACK' | 'BOTH'; bothExplicit: boolean; whatsapp: ChannelReadiness; rcs: ChannelReadiness; previousOutcome: 'NONE' | 'FINAL_REJECTED_BEFORE_ACCEPTANCE' | 'ACCEPTED' | 'UNCERTAIN'; previousChannel?: 'WHATSAPP' | 'RCS' }) {
  const blocked = (reason: string) => ({ channel: null, canSend: false as const, reason });
  if (!['NONE', 'FINAL_REJECTED_BEFORE_ACCEPTANCE'].includes(i.previousOutcome)) return blocked('NO_FALLBACK_AFTER_ACCEPTANCE_OR_UNCERTAIN');
  if (i.previousOutcome === 'FINAL_REJECTED_BEFORE_ACCEPTANCE' && !['WHATSAPP', 'RCS'].includes(i.previousChannel ?? '')) return blocked('PREVIOUS_CHANNEL_REQUIRED');
  if (i.strategy === 'BOTH' && !i.bothExplicit) return blocked('BOTH_REQUIRES_EXPLICIT_CONFIGURATION');
  if (!['RCS_FIRST_WITH_WHATSAPP_FALLBACK', 'WHATSAPP_FIRST_WITH_RCS_FALLBACK', 'BOTH'].includes(i.strategy)) return blocked('UNKNOWN_STRATEGY');
  const order: ('WHATSAPP' | 'RCS')[] = i.strategy === 'RCS_FIRST_WITH_WHATSAPP_FALLBACK' ? ['RCS', 'WHATSAPP'] : ['WHATSAPP', 'RCS'];
  for (const channel of order) {
    if (i.previousOutcome === 'FINAL_REJECTED_BEFORE_ACCEPTANCE' && channel === i.previousChannel) continue;
    const r = channel === 'WHATSAPP' ? i.whatsapp : i.rcs;
    if (r.available === 'KNOWN_AVAILABLE' && r.eligible === true && r.policyAllowed === true) return { channel, canSend: false as const, reason: 'ONE_CHANNEL_PREPARATION_ONLY' };
  }
  return blocked('NO_VERIFIED_ELIGIBLE_CHANNEL');
}
