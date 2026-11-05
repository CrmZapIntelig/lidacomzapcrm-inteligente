import React, { useState } from 'react';
import { messageChannelOptions } from '../src/domain/messageChannelCatalog';
import type { MessageWorkflow } from '../src/domain/messageChannelCatalog';
import type { ChannelProvider } from '../src/domain/omnichannel';
import { preparePilotBatch } from '../src/application/pilotPreparation';
import { createContactChannelIdentity, createProviderCapabilities } from '../src/domain/offlinePrimitives';

export function prepareChannelDemo(provider: ChannelProvider) {
  const at = new Date('2026-10-09T12:00:00Z'), tenantId = 'demo-offline', contactId = 'demo-channel-contact';
  const channel = provider === 'RCS_GOOGLE' ? 'RCS' as const : 'WHATSAPP' as const, phone = '+12025550100';
  return preparePilotBatch({ selectedProvider: provider, selectedIds: [contactId], requestedCount: 1,
    commercialRemaining: 1, providerRemaining: 1, riskLimit: 1, operatorStarted: true,
    policy: { tenantId, minimumIntervalMs: 0, evaluatedAt: at },
    evidence: [{ tenantId, contactId, phone, blocked: false, optedOut: false, group: false, consent: 'ALLOWED',
      preferredChannel: 'ANY', alreadyPrepared: false, templateApprovedForOffline: true,
      identity: createContactChannelIdentity({ id: 'demo-channel-identity', tenantId, contactId, channel, provider,
        address: phone, availability: 'KNOWN_AVAILABLE', eligibility: 'ELIGIBLE', createdAt: at, updatedAt: at }),
      capability: createProviderCapabilities({ channel, provider, capabilities: ['TEXT'], source: 'MANUAL', observedAt: at }) }] });
}
const names: Record<MessageWorkflow, string> = { SERVICE: 'Atendimento', ACTIVE_SALES: 'Venda Ativa', MARKETING: 'Marketing', CAMPAIGN: 'Campanhas', AUTOMATION: 'Automações' };
export function MessageChannelsDemo({ workflow }: { workflow: MessageWorkflow }) {
  const options = messageChannelOptions(workflow);
  const [selected, setSelected] = useState<ChannelProvider>('WHATSAPP_META_OFFICIAL');
  const [prepared, setPrepared] = useState(false);
  const option = options.find(o => o.provider === selected)!;
  return <section className="panel channel-demo" aria-label={`Canais de ${names[workflow]}`}>
    <div className="section-heading"><div><span className="eyebrow">{names[workflow]}</span><h2>Por onde você quer conversar?</h2></div><span className="badge">PRÉVIA · SEM ENVIO</span></div>
    <p>As mesmas opções em atendimento, Venda Ativa, marketing, campanhas e automações.</p>
    <div className="channel-options" role="group" aria-label="Escolha do canal">
      {options.map(o => <button key={o.id} aria-pressed={selected === o.provider} onClick={() => { setSelected(o.provider!); setPrepared(false); }}>
        <strong>{o.label}</strong><small>{o.id === 'meta' ? 'Recepção de teste em validação' : o.id === 'evolution' ? 'Instância ainda não contratada' : 'Agente ainda não contratado'}</small>
      </button>)}
      <button disabled><strong>Novas conexões</strong><small>Disponíveis após integração</small></button>
    </div>
    <div className="channel-sample"><div><span className="badge">{option.label}</span><h3>Ana Exemplo</h3><p>Olá, Ana! Conheça nosso cardápio do dia. Será um prazer atender você.</p><small>Mensagem ilustrativa · nenhum cliente real</small></div>
      <div><h3>Uma escolha, um destinatário</h3><p>Disponibilidade, consentimento e regras do serviço serão conferidos antes de qualquer envio real. Selecionar uma opção nesta prévia não conecta a conta.</p><button className="primary" onClick={() => setPrepared(prepareChannelDemo(selected).preparedContactIds.length === 1)}>Simular preparação neste canal</button><p role="status">{prepared ? `Preparação simulada em ${option.label}. Nenhuma mensagem foi enviada.` : 'Escolha um canal para experimentar.'}</p></div>
    </div>
  </section>;
}
