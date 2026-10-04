import React, { useState } from 'react';
import { reviewSyntheticOrder, MemoryOrderWritePort, decideNota, changePayment } from '../src/application/orderOperations';
import type { ReviewedOrder, PaymentMethod } from '../src/application/orderOperations';
import { closeByMethod, renderPrintSnapshot } from '../src/application/operationsFinance';

export function demoReview(method: PaymentMethod = 'PIX') {
  return reviewSyntheticOrder({ tenantId: 'demo-ops', contact: { id: 'demo-ana', tenantId: 'demo-ops' }, conversation: { id: 'demo-conversation-ana', tenantId: 'demo-ops', contactId: 'demo-ana', channel: 'WHATSAPP' }, id: 'demo-contextual-order', items: [{ id: 'demo-prato', name: 'Prato Demo', unitCents: 2000, quantity: 2 }], method, fulfillment: 'PICKUP', at: new Date('2026-10-03T12:00:00Z') });
}
export function OrderOperationsDemo() {
  const [port] = useState(() => new MemoryOrderWritePort());
  const [reviewed, setReviewed] = useState<ReviewedOrder | undefined>();
  const [revision, setRevision] = useState(0);
  const [feedback, setFeedback] = useState('Nenhum pedido confirmado. Dados somente em memória.');
  const [print, setPrint] = useState('');
  const [counted, setCounted] = useState({ DINHEIRO: '', PIX: '', DEBITO: '', CREDITO: '', NOTA: '' });
  const [closing, setClosing] = useState('');
  const confirm = () => {
    if (!reviewed) return;
    try {
      const result = port.confirm({ key: `demo-confirm-${revision}`, expectedRevision: revision, reviewed });
      setRevision(result.revision); setReviewed(undefined); setPrint('');
      setFeedback(`Pedido Demo confirmado apenas na simulação · revisão ${result.revision}. Nenhuma venda ou mensagem real.`);
    } catch { setFeedback('Revise a aprovação de NOTA ou troque a forma de pagamento.'); }
  };
  return <section className="panel"><h2>OPS-01 · Novo Pedido contextual</h2><span className="badge">OFFLINE IMPLEMENTADO / SIMULAÇÃO</span><p>Ana Exemplo → Conversation WhatsApp → Order canônico. Caixa/KDS/Delivery reais ainda não integrados.</p><span className="badge">ORDER-02 · STAGING PERSISTENCE TESTED</span><p>Persistência e rollback de fixtures comprovados no staging. Este preview continua somente em memória, sem conexão com esse backend.</p>
    <button onClick={() => { setReviewed(demoReview()); setPrint(''); }}>+ Novo Pedido Demo</button>
    {reviewed && <div className="draft"><h3>Revisão do Pedido Demo</h3><p>Cliente pré-preenchido: Ana Exemplo · 2 × Prato Demo · R$ 40,00</p>
      <label>Modalidade <select value={reviewed.fulfillment} onChange={e => setReviewed({ ...reviewed, fulfillment: e.target.value as ReviewedOrder['fulfillment'] })}><option value="PICKUP">Retirada</option><option value="DELIVERY">Delivery Demo</option><option value="TABLE">Mesa Demo</option></select></label>
      <label>Pagamento <select value={reviewed.method} onChange={e => setReviewed(changePayment(reviewed, e.target.value as PaymentMethod))}><option value="PIX">PIX</option><option value="DINHEIRO">Dinheiro</option><option value="DEBITO">Cartão Débito</option><option value="CREDITO">Cartão Crédito</option><option value="NOTA">NOTA</option></select></label>
      {reviewed.method === 'NOTA' && <p>NOTA — {reviewed.nota === 'AWAITING_APPROVAL' ? 'aguardando aprovação' : reviewed.nota === 'ACCEPTED' ? 'aceita na simulação' : 'recusada: troque o pagamento'}</p>}
      {reviewed.nota === 'AWAITING_APPROVAL' && <div className="actions"><button onClick={() => setReviewed(decideNota(reviewed, 'ACCEPTED'))}>ACEITAR NOTA Demo</button><button onClick={() => setReviewed(decideNota(reviewed, 'REFUSED'))}>RECUSAR NOTA Demo</button></div>}
      <div className="actions"><button onClick={confirm} disabled={reviewed.nota === 'AWAITING_APPROVAL' || reviewed.nota === 'REFUSED'}>Confirmar somente Demo</button><button onClick={() => { setReviewed(undefined); setPrint(''); setFeedback('Revisão cancelada; nenhuma confirmação realizada.'); }}>Cancelar revisão</button>
      <button onClick={() => setPrint(renderPrintSnapshot({ version: 1, mode: 'SIMULATION', kind: 'PEDIDO', reference: reviewed.order.id, lines: ['Ana Exemplo', 'Rascunho: 2 × Prato Demo', 'R$ 40,00', 'Sem valor fiscal'] }))}>Prévia de impressão centralizada</button></div></div>}
    <p role="status">{feedback}</p>{print && <div className="demo-ticket" aria-label="Impressão Demo sem valor fiscal" dangerouslySetInnerHTML={{ __html: print }}/ >}
    <h3>Fechamento por método · cenário financeiro independente</h3><p>Fixture: venda NOTA R$ 40,00, sem recebimento; dinheiro em gaveta R$ 0,00. Informe cada método manualmente para comparar.</p>
    {Object.keys(counted).map(method => <label key={method}>{method} em centavos <input aria-label={`Informado ${method}`} type="number" min="0" step="1" value={counted[method as PaymentMethod]} onChange={e => setCounted({ ...counted, [method]: e.target.value })}/></label>)}
    <button onClick={() => {
      if (Object.values(counted).some(v => !/^\d+$/.test(v))) { setClosing('Informe os cinco métodos em centavos inteiros.'); return; }
      const informed = Object.fromEntries(Object.entries(counted).map(([k, v]) => [k, Number(v)])) as Record<PaymentMethod, number>;
      try { const result = closeByMethod([{ id: 'demo-sale', orderId: 'demo-nota', kind: 'SALE', method: 'NOTA', amountCents: 4000 }], informed); setClosing(result.rows.map(row => `${row.method}: esperado ${row.expectedCents}; informado ${row.informedCents}; diferença ${row.differenceCents}`).join(' | ')); }
      catch { setClosing('Valores inválidos: use centavos inteiros dentro do limite seguro.'); }
    }}>Comparar fechamento Demo</button><p role="status">{closing}</p>
    <p className="warning">NOTA conta como venda, não como dinheiro recebido. Quitação futura não cria segunda venda. Cadastros reais e crédito do cliente continuam pendentes.</p>
  </section>;
}
