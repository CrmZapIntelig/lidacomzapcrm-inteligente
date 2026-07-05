import React, { useState } from 'react';
import { DollarSign, ArrowUpCircle, ArrowDownCircle, Printer, Download, Clock } from 'lucide-react';
import { CaixaSession, CaixaTransaction, User } from '../types';

interface CaixaViewProps {
  activeSession?: CaixaSession | null;
  lastClosedSession?: CaixaSession | null;
  currentUser?: User | null;
  onOpenCashier?: (initialBalance: number) => void | Promise<void>;
  onRegisterTransaction?: (
    type: CaixaTransaction['type'],
    value: number,
    description: string
  ) => void | Promise<void>;
  onCloseCashier?: (closingData: {
    dinheiro: number;
    cartao: number;
    pix: number;
    notaFiado: number;
    notes: string;
  }) => void | Promise<void>;
}

export default function CaixaView({
  activeSession,
  lastClosedSession,
  currentUser,
  onOpenCashier,
  onRegisterTransaction,
  onCloseCashier,
}: CaixaViewProps = {}) {
  const [localSession, setLocalSession] = useState<CaixaSession | null>(null);
  const [initialValue, setInitialValue] = useState('100.00');
  const [operationType, setOperationType] = useState<'entrada' | 'saida' | 'sangria'>('entrada');
  const [opValue, setOpValue] = useState('');
  const [opDesc, setOpDesc] = useState('');
  const [closingDinheiro, setClosingDinheiro] = useState('');
  const [closingCartao, setClosingCartao] = useState('');
  const [closingPix, setClosingPix] = useState('');
  const [closingNotaFiado, setClosingNotaFiado] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const session = activeSession ?? localSession;
  const closedSession = session?.status === 'fechado' ? session : lastClosedSession;

  const parseOptionalCurrency = (value: string) => {
    const parsed = parseFloat(value.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  };

  const isSameOperationalDate = (dateValue: string, comparisonDate = new Date()) => {
    const date = new Date(dateValue);
    return (
      date.getFullYear() === comparisonDate.getFullYear() &&
      date.getMonth() === comparisonDate.getMonth() &&
      date.getDate() === comparisonDate.getDate()
    );
  };

  const formatCurrency = (value?: number) => `R$ ${(value || 0).toFixed(2)}`;
  const formatDateTime = (value?: string) =>
    value ? new Date(value).toLocaleString('pt-BR') : '-';
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  const isLateOpenSession =
    session?.status === 'aberto' ? !isSameOperationalDate(session.openedAt) : false;

  const handlePrintClosingSummary = (closedCaixaSession?: CaixaSession | null) => {
    if (!closedCaixaSession) return;

    const breakdown = closedCaixaSession.closingBreakdown || {
      dinheiro: 0,
      cartao: 0,
      pix: 0,
      notaFiado: 0,
    };

    const printWindow = window.open('', '_blank', 'width=720,height=840');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Fechamento de Caixa</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
            h1 { font-size: 20px; margin: 0 0 4px; }
            h2 { font-size: 14px; margin: 0 0 20px; color: #475569; }
            .row { display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding: 8px 0; font-size: 13px; }
            .label { font-weight: 700; color: #475569; }
            .notes { margin-top: 16px; font-size: 13px; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>Restaurante Prato Mineiro</h1>
          <h2>Resumo do Fechamento de Caixa</h2>
          <div class="row"><span class="label">Data abertura</span><span>${formatDateTime(closedCaixaSession.openedAt)}</span></div>
          <div class="row"><span class="label">Data fechamento</span><span>${formatDateTime(closedCaixaSession.closedAt)}</span></div>
          <div class="row"><span class="label">Saldo inicial</span><span>${formatCurrency(closedCaixaSession.initialBalance)}</span></div>
          <div class="row"><span class="label">Saldo esperado</span><span>${formatCurrency(closedCaixaSession.expectedBalance ?? closedCaixaSession.currentBalance)}</span></div>
          <div class="row"><span class="label">Dinheiro</span><span>${formatCurrency(breakdown.dinheiro)}</span></div>
          <div class="row"><span class="label">Cart&atilde;o</span><span>${formatCurrency(breakdown.cartao)}</span></div>
          <div class="row"><span class="label">Pix</span><span>${formatCurrency(breakdown.pix)}</span></div>
          <div class="row"><span class="label">Nota/Fiado</span><span>${formatCurrency(breakdown.notaFiado)}</span></div>
          <div class="row"><span class="label">Valor contado</span><span>${formatCurrency(closedCaixaSession.countedBalance)}</span></div>
          <div class="row"><span class="label">Diferen&ccedil;a</span><span>${formatCurrency(closedCaixaSession.difference)}</span></div>
          <div class="notes"><strong>Observa&ccedil;&otilde;es:</strong><br />${escapeHtml(closedCaixaSession.closingNotes || '')}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };
  
  const handleOpenCashier = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(initialValue.replace(',', '.'));
    if (onOpenCashier) {
      onOpenCashier(val);
      return;
    }

    const now = new Date().toISOString();
    setLocalSession({
      id: `caixa_${Date.now()}`,
      operatorId: currentUser?.id || 'usr_prato_mineiro',
      operatorName: currentUser?.name || 'Administrador (Prato Mineiro)',
      openedAt: now,
      initialBalance: val,
      currentBalance: val,
      status: 'aberto',
      transactions: [],
      createdAt: now,
      updatedAt: now,
    });
  };

  const handleTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    
    const val = parseFloat(opValue.replace(',', '.'));
    if (isNaN(val)) return;

    const newTx: CaixaTransaction = {
      id: `tx_${Date.now()}`,
      sessionId: session.id,
      type: operationType,
      value: val,
      description: opDesc,
      method: 'Dinheiro',
      timestamp: new Date().toISOString(),
      operatorId: currentUser?.id || session.operatorId,
      operatorName: currentUser?.name || session.operatorName,
    };

    if (onRegisterTransaction) {
      onRegisterTransaction(operationType, val, opDesc);
      setOpValue('');
      setOpDesc('');
      return;
    }

    let newBalance = session.currentBalance;
    if (operationType === 'entrada') newBalance += val;
    else newBalance -= val; // saida or sangria

    setLocalSession({
      ...session,
      currentBalance: newBalance,
      transactions: [newTx, ...session.transactions],
      updatedAt: new Date().toISOString(),
    });

    setOpValue('');
    setOpDesc('');
  };

  const handleCloseCashier = () => {
    if (!session) return;
    const closingData = {
      dinheiro: parseOptionalCurrency(closingDinheiro),
      cartao: parseOptionalCurrency(closingCartao),
      pix: parseOptionalCurrency(closingPix),
      notaFiado: parseOptionalCurrency(closingNotaFiado),
      notes: closingNotes.trim(),
    };

    if (onCloseCashier) {
      onCloseCashier(closingData);
      return;
    }

    const countedBalance =
      closingData.dinheiro + closingData.cartao + closingData.pix + closingData.notaFiado;
    const now = new Date().toISOString();
    const closedAsLate = !isSameOperationalDate(session.openedAt);

    setLocalSession({
      ...session,
      status: 'fechado',
      closedAt: now,
      closingBreakdown: {
        dinheiro: closingData.dinheiro,
        cartao: closingData.cartao,
        pix: closingData.pix,
        notaFiado: closingData.notaFiado,
      },
      closingNotes: closingData.notes,
      expectedBalance: session.currentBalance,
      countedBalance,
      difference: countedBalance - session.currentBalance,
      closedAsLate,
      originalOpenedAt: session.openedAt,
      closedOperationalDate: now,
      closingReason: closedAsLate ? 'fechamento_atrasado' : 'fechamento_normal',
      updatedAt: now,
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-500" />
            Caixa Operacional
          </h3>
          <p className="text-sm text-slate-500">Gestão de abertura, fechamento e lançamentos no pdv.</p>
        </div>
      </div>

      {!session || session.status === 'fechado' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 max-w-sm mx-auto text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Caixa Fechado</h4>
          <p className="text-sm text-slate-500 mb-6">Inicie uma nova sessão para realizar vendas e movimentações.</p>
          
          <form onSubmit={handleOpenCashier} className="text-left space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Fundo de Troco (R$)</label>
              <input
                type="text"
                required
                value={initialValue}
                onChange={(e) => setInitialValue(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 rounded-xl p-3 outline-none text-slate-800 dark:text-white font-mono"
              />
            </div>
            <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition">
              Abrir Caixa
            </button>
          </form>
          
          {closedSession && (
             <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-left">
                <p className="text-xs text-slate-500 font-bold mb-2">Ultimo Fechamento: {new Date(closedSession.closedAt!).toLocaleTimeString()}</p>
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                   <span className="text-xs font-bold text-slate-500">Saldo Final</span>
                   <span className="font-mono font-bold text-slate-700 dark:text-slate-300">R$ {closedSession.currentBalance.toFixed(2)}</span>
                </div>
                <button onClick={() => handlePrintClosingSummary(closedSession)} className="w-full mt-2 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 p-2 rounded-lg">
                  <Printer className="w-3 h-3" /> Imprimir Fechamento
                </button>
             </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {isLateOpenSession && (
            <div className="lg:col-span-12 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300 rounded-xl p-4 text-sm font-bold">
              Existe um caixa aberto de data anterior. Feche ou regularize esta sessão antes de abrir o caixa de hoje.
            </div>
          )}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Action Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider block mb-1">Saldo Atual</span>
                <span className="text-2xl font-black font-mono">R$ {session.currentBalance.toFixed(2)}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-400">Total Entradas</span>
                <span className="text-lg font-bold font-mono text-emerald-600">R$ {(session.transactions.filter(t => t.type === 'entrada' || t.type === 'venda').reduce((s,t) => s+t.value,0)).toFixed(2)}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-400">Sangrias / Saídas</span>
                <span className="text-lg font-bold font-mono text-red-600">R$ {(session.transactions.filter(t => t.type !== 'entrada' && t.type !== 'venda').reduce((s,t) => s+t.value,0)).toFixed(2)}</span>
              </div>
            </div>

            {/* Transactions List */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex-1 max-h-[60vh] flex flex-col">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-bold text-sm">Movimentações da Sessão</div>
              <div className="p-4 overflow-y-auto w-full flex-1 space-y-3">
                {session.transactions.length === 0 && (
                   <p className="text-center text-slate-400 text-sm py-8 font-mono">Nenhuma movimentação lançada.</p>
                )}
                {session.transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      {tx.type === 'entrada' || tx.type === 'venda' ? (
                        <ArrowUpCircle className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <ArrowDownCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{tx.description || 'Venda Gerada'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{new Date(tx.timestamp).toLocaleTimeString()} - {tx.method}</p>
                      </div>
                    </div>
                    <span className={`font-mono font-bold text-sm ${tx.type === 'entrada' || tx.type === 'venda' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {tx.type === 'entrada' || tx.type === 'venda' ? '+' : '-'} R$ {tx.value.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* New Transaction Form & Actions */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
               <h4 className="font-bold text-sm mb-4">Lançamento Avulso</h4>
               <form onSubmit={handleTransaction} className="space-y-4">
                 <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input type="radio" checked={operationType === 'entrada'} onChange={() => setOperationType('entrada')} className="text-emerald-500" /> Entrada
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input type="radio" checked={operationType === 'saida'} onChange={() => setOperationType('saida')} className="text-red-500" /> Saída (Despesa)
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input type="radio" checked={operationType === 'sangria'} onChange={() => setOperationType('sangria')} className="text-amber-500" /> Sangria (Retirada)
                    </label>
                 </div>
                 
                 <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Valor</label>
                    <input type="text" required value={opValue} onChange={e => setOpValue(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 border p-2 rounded-lg text-sm font-mono outline-none dark:bg-slate-800" />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Descrição</label>
                    <input type="text" required value={opDesc} onChange={e => setOpDesc(e.target.value)} placeholder="Ex: Pagamento Fornecedor" className="w-full bg-slate-50 border p-2 rounded-lg text-sm outline-none dark:bg-slate-800" />
                 </div>
                 <button className="w-full bg-slate-900 dark:bg-emerald-600 text-white font-bold py-2.5 rounded-lg text-xs hover:bg-slate-800">
                    Registrar Movimentação
                 </button>
               </form>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-sm">
               <div className="flex items-center justify-between mb-2">
                 <span className="text-slate-500 text-xs">Aberto às:</span>
                 <span className="font-mono font-bold">{new Date(session.openedAt).toLocaleTimeString()}</span>
               </div>
               <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                 <span className="text-slate-500 text-xs">Operador:</span>
                 <span className="font-medium text-xs truncate max-w-[150px]">{session.operatorName}</span>
               </div>

               <div className="space-y-3 mb-4">
                 <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className="text-xs font-bold text-slate-400 block mb-1">Dinheiro</label>
                     <input type="text" value={closingDinheiro} onChange={e => setClosingDinheiro(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 border p-2 rounded-lg text-sm font-mono outline-none dark:bg-slate-800" />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-slate-400 block mb-1">Cartão</label>
                     <input type="text" value={closingCartao} onChange={e => setClosingCartao(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 border p-2 rounded-lg text-sm font-mono outline-none dark:bg-slate-800" />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-slate-400 block mb-1">Pix</label>
                     <input type="text" value={closingPix} onChange={e => setClosingPix(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 border p-2 rounded-lg text-sm font-mono outline-none dark:bg-slate-800" />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-slate-400 block mb-1">Nota / Fiado</label>
                     <input type="text" value={closingNotaFiado} onChange={e => setClosingNotaFiado(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 border p-2 rounded-lg text-sm font-mono outline-none dark:bg-slate-800" />
                   </div>
                 </div>
                 <div>
                   <label className="text-xs font-bold text-slate-400 block mb-1">Observações do fechamento</label>
                   <textarea value={closingNotes} onChange={e => setClosingNotes(e.target.value)} rows={3} placeholder="Opcional" className="w-full bg-slate-50 border p-2 rounded-lg text-sm outline-none dark:bg-slate-800 resize-none" />
                 </div>
               </div>
               
               <button onClick={handleCloseCashier} className="w-full bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-900/50 font-bold py-3 rounded-xl text-xs hover:bg-red-100 transition">
                  Encerrar Sessão do Caixa
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
