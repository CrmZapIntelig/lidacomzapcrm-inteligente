import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getConversationDraft, cancelActiveSalesEntry } from '../src/application/activeSalesOffline';
import type { DispatchChannelStrategy } from '../src/application/activeSalesOffline';
import { evaluateDispatchEligibility, budgetDay } from '../src/domain/dispatchPrerequisites';
import { scenarioContacts, scenarioEvidence, startSession, prepareSession, nextDay, appendSyntheticContact } from './scenario';
import type { VisualSession } from './scenario';
import './style.css';

const strategies: { value: DispatchChannelStrategy; label: string }[] = [
  { value: 'RCS_FIRST_WITH_WHATSAPP_FALLBACK', label: 'RCS primeiro, WhatsApp como alternativa' },
  { value: 'WHATSAPP_FIRST_WITH_RCS_FALLBACK', label: 'WhatsApp primeiro, RCS como alternativa' },
  { value: 'WHATSAPP', label: 'Somente WhatsApp' }, { value: 'GOOGLE_RCS', label: 'Somente Google RCS' },
  { value: 'BOTH', label: 'Avaliar ambos e escolher um canal' },
];
const contacts = scenarioContacts();
const channelName = (channel: string) => channel === 'RCS' ? 'Google RCS' : 'WhatsApp';
function OfflinePreview() {
  const [tab, setTab] = useState('venda');
  const [selected, setSelected] = useState(contacts.slice(0, 6).map(c => c.id));
  const [limit, setLimit] = useState('2');
  const [strategy, setStrategy] = useState<DispatchChannelStrategy>('RCS_FIRST_WITH_WHATSAPP_FALLBACK');
  const [template, setTemplate] = useState('Olá {{nome}}! Este é um rascunho de demonstração da Venda Ativa.');
  const [session, setSession] = useState<VisualSession>();
  const [error, setError] = useState('');
  const [opened, setOpened] = useState<string>();
  const act = (operation: () => void) => { try { operation(); setError(''); } catch { setError('Confira o público, o limite diário e o texto. A configuração deve ser válida.'); } };
  const name = (id: string) => contacts.find(c => c.id === id)?.name ?? 'Contato sintético';
  const day = session ? budgetDay(new Date(session.at), session.sales.timeZone) : '2026-09-30';
  const used = session?.sales.budgets.find(b => b.day === day)?.entryKeys.length ?? 0;
  const draft = session && opened ? getConversationDraft(session.sales, opened) : undefined;
  const eligibility = (id: string) => {
    const index = contacts.findIndex(c => c.id === id);
    if (index === 2) return 'Bloqueado'; if (index === 3) return 'Opt-out'; if (index === 4) return 'Telefone inválido';
    const evidence = scenarioEvidence().filter(e => e.contactId === id);
    const available = evidence.some(e => evaluateDispatchEligibility(e, { tenantId: 'demo-offline', evaluatedAt: new Date(session?.at ?? '2026-09-30T12:00:00Z'), minimumIntervalMs: 86400000 }).eligibleForPreparation);
    return available ? 'Apto para preparar' : 'Não avaliado';
  };
  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">L</span><div>LidacomZapCRM<small>Inteligente</small></div></div>
      <div className="workspace-label">DEMONSTRAÇÃO LOCAL</div>
      <nav aria-label="Módulos da demonstração">
        <button className={tab === 'marketing' ? 'active' : ''} onClick={() => setTab('marketing')}>◎ Marketing</button>
        <button className={tab === 'venda' ? 'active' : ''} onClick={() => setTab('venda')}>↗ Disparador Inteligente</button>
        <button className={tab === 'timeline' ? 'active' : ''} onClick={() => setTab('timeline')}>◷ Timeline e funil</button>
      </nav><p className="sidebar-note">Dados sintéticos.<br />Sem conexão operacional.</p>
    </aside>
    <main><div className="safety-banner"><strong>SIMULAÇÃO OFFLINE</strong><span>Nenhuma mensagem enviada. Dados mantidos apenas nesta sessão.</span><span className="pill">Envio bloqueado</span></div>
      <header><div><div className="eyebrow">LIDACOMZAPCRM INTELIGENTE</div><h1>{tab === 'marketing' ? 'Marketing' : tab === 'timeline' ? 'Timeline e funil' : 'Venda Ativa'}</h1><p>{tab === 'marketing' ? 'Escolha quem participa e por quê. Dispatch define como preparar.' : tab === 'timeline' ? 'Acompanhe os rascunhos de demonstração sem registrar envios.' : 'Prepare público, fila e conversas com controle diário.'}</p></div><button className="secondary" onClick={() => { setSession(undefined); setOpened(undefined); setError(''); }}>Reiniciar demonstração</button></header>
      <div className="stats"><section><small>Público preparado</small><strong>{session?.sales.audience.contactIds.length ?? 0}</strong></section><section><small>Rascunhos ativos</small><strong>{session?.sales.queue.entries.filter(e => e.status === 'DRAFT_PREPARED').length ?? 0}</strong></section><section><small>Orçamento do dia</small><strong>{used} <span>/ {session?.sales.campaign.dailyLimit ?? limit}</span></strong></section><section><small>Mensagens enviadas</small><strong>0</strong><small>Envio indisponível</small></section></div>
      {error && <p role="alert" className="error">{error}</p>}
      {session && <p role="status" className="feedback">{session.feedback}</p>}
      {tab !== 'timeline' && <div className="columns"><section className="card"><h2>Marketing · Público</h2><p>Retorno de clientes — exemplo</p><p className="muted">Por quê: seleção manual de exemplos para conhecer o fluxo. Pertencer ao público não autoriza envio.</p>
        <div className="contact-list">{contacts.slice(0, 6).map(c => <label key={c.id}><input type="checkbox" disabled={!!session} checked={selected.includes(c.id)} onChange={e => setSelected(e.target.checked ? [...selected, c.id] : selected.filter(id => id !== c.id))} /><span>{c.name}<small>{eligibility(c.id)}{c.id === 'demo-contact-1' ? ' · RCS desconhecido (fixture)' : ''}</small></span></label>)}</div>
        {session && <p className="muted">Público consolidado. Para mudar a seleção, reinicie a demonstração.</p>}
      </section><section className="card"><h2>Dispatch · Preparação</h2><label className="field">Limite comercial diário<input aria-label="Limite comercial diário" type="number" min="1" max="1000" value={limit} disabled={!!session} onChange={e => setLimit(e.target.value)} /></label><p className="muted">Limite de preparo de rascunhos; não é uma quota oficial dos canais.</p>
        <label className="field">Estratégia de canal<select value={strategy} disabled={!!session} onChange={e => setStrategy(e.target.value as DispatchChannelStrategy)}>{strategies.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
        <label className="field">Mensagem personalizada<textarea rows={3} value={template} disabled={!!session} onChange={e => setTemplate(e.target.value)} /></label><p className="muted">Use {'{{nome}}'} para personalizar. Capacidades são fixtures explícitas, sem verificação real.</p>
        <button className="primary" disabled={!!session || selected.length === 0} onClick={() => act(() => setSession(startSession(selected, Number(limit), strategy, template)))}>Preparar público para Dispatch</button>
      </section></div>}
      {tab === 'venda' && <section className="card queue-card"><div className="section-header"><div><h2>Fila de Venda Ativa</h2><p className="muted">Dia simulado: {day} · America/Sao_Paulo · janela não avaliada</p></div><div className="actions"><button className="primary" disabled={!session} onClick={() => act(() => { if (session) setSession(prepareSession(session)); })}>Preparar rascunhos</button><button className="secondary" disabled={!session} onClick={() => { if (session) setSession(nextDay(session)); }}>Avançar um dia</button><button className="secondary" disabled={!session} onClick={() => act(() => { if (session) setSession(appendSyntheticContact(session)); })}>Adicionar contato sintético</button></div></div>
        {!session ? <div className="empty">Prepare o público para criar a fila. Nenhum contato é carregado do CRM operacional.</div> : <div className="table-scroll"><table><thead><tr><th>Posição</th><th>Contato</th><th>Elegibilidade</th><th>Canal do draft</th><th>Estado</th><th>Ações</th></tr></thead><tbody>{session.sales.queue.entries.map(e => { const d = session.sales.drafts.find(item => item.queueEntryId === e.id); return <tr key={e.id}><td>{e.position}</td><td>{name(e.contactId)}</td><td>{eligibility(e.contactId)}</td><td>{d ? channelName(d.channel) : 'Não escolhido'}</td><td><span className="pill">{e.status === 'DRAFT_PREPARED' ? 'Rascunho preparado' : e.status === 'SKIPPED' ? 'Cancelado' : 'Na fila'}</span></td><td><div className="actions">{d && e.status === 'DRAFT_PREPARED' && <button className="link" onClick={() => setOpened(d.id)}>Abrir conversa de exemplo</button>}{['QUEUED', 'DRAFT_PREPARED'].includes(e.status) && <button className="link danger" onClick={() => act(() => setSession({ ...session, sales: cancelActiveSalesEntry(session.sales, e.id), feedback: 'Entrada cancelada. O orçamento consumido é preservado.' }))}>Cancelar</button>}</div></td></tr>; })}</tbody></table></div>}
      </section>}
      {tab === 'timeline' && <div className="columns"><section className="card"><h2>Timeline · Simulação</h2>{!session?.events.timeline.length ? <p className="empty">Ainda não há eventos. Prepare rascunhos na Venda Ativa.</p> : session.events.timeline.map(e => <article className="timeline-item" key={e.id}><strong>{name(e.contactId)}</strong><p>{e.title}</p><small>{e.description}</small></article>)}</section><section className="card"><h2>Oportunidades · Rascunho</h2><p className="muted">Draft não vira Lead. Não há pedidos, conversões ou faturamento simulados.</p>{session?.events.opportunities.map(o => <article className="timeline-item" key={o.id}><strong>{name(o.contactId)}</strong><span className="pill">RASCUNHO · SIMULAÇÃO</span></article>)}</section></div>}
      <footer>Ambiente local isolado · Google RCS e WhatsApp apenas em exemplos · sem backend e sem envio</footer>
    </main>
    {draft && <div className="modal-backdrop"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="draft-title"><div className="section-header"><h2 id="draft-title">Conversa de exemplo</h2><button className="secondary" onClick={() => setOpened(undefined)}>Fechar</button></div><p>{name(draft.contactId)} · {channelName(draft.channel)}</p><div className="draft-text">{draft.content}</div><p className="muted">Rascunho preparado. Não enviado. Janela não avaliada.</p><button className="primary" disabled>Envio indisponível na simulação</button></section></div>}
  </div>;
}
createRoot(document.getElementById('root')!).render(<OfflinePreview />);
