import { cents, paymentMethods } from './orderOperations';
import type { PaymentMethod } from './orderOperations';

export interface FinanceFact {
  id: string; orderId: string; kind: 'SALE' | 'CREDIT_RECEIPT'; method: PaymentMethod; amountCents: number;
}
/** Pure snapshot accounting; NOTA sale and its future receipt are different facts. */
export function summarizeFinance(facts: readonly FinanceFact[], openingCashCents = 0) {
  const ids = new Map<string, FinanceFact>();
  const sales = new Map<string, FinanceFact>();
  const expected: Record<PaymentMethod, number> = { DINHEIRO: cents(openingCashCents), PIX: 0, DEBITO: 0, CREDITO: 0, NOTA: 0 };
  for (const fact of facts) {
    if (!fact.id.trim() || !fact.orderId.trim() || !['SALE', 'CREDIT_RECEIPT'].includes(fact.kind) || !paymentMethods.includes(fact.method)) throw new Error('INVALID_FINANCE_FACT');
    cents(fact.amountCents);
    const previous = ids.get(fact.id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(fact)) throw new Error('FACT_ID_CONFLICT');
    ids.set(fact.id, fact);
  }
  for (const fact of ids.values()) if (fact.kind === 'SALE') {
    if (sales.has(fact.orderId)) throw new Error('DUPLICATE_SALE');
    sales.set(fact.orderId, fact);
    expected[fact.method] = cents(expected[fact.method] + fact.amountCents);
  }
  const paidCredit = new Map<string, number>();
  for (const fact of ids.values()) if (fact.kind === 'CREDIT_RECEIPT') {
    const sale = sales.get(fact.orderId);
    if (!sale || sale.method !== 'NOTA' || fact.method === 'NOTA') throw new Error('CREDIT_RECEIPT_REQUIRES_NOTA_SALE');
    const paid = cents((paidCredit.get(fact.orderId) ?? 0) + fact.amountCents);
    if (paid > sale.amountCents) throw new Error('CREDIT_OVERPAYMENT');
    paidCredit.set(fact.orderId, paid);
    expected[fact.method] = cents(expected[fact.method] + fact.amountCents);
    expected.NOTA -= fact.amountCents;
  }
  return {
    totalSalesCents: cents([...sales.values()].reduce((sum, f) => sum + f.amountCents, 0)),
    drawerCents: expected.DINHEIRO, openCreditCents: expected.NOTA, expected,
  };
}

export function closeByMethod(facts: readonly FinanceFact[], informed: Record<PaymentMethod, number>, openingCashCents = 0) {
  const summary = summarizeFinance(facts, openingCashCents);
  const rows = paymentMethods.map(method => ({ method, expectedCents: summary.expected[method], informedCents: cents(informed[method]), differenceCents: informed[method] - summary.expected[method] }));
  return { ...summary, rows };
}

export type PrintKind = 'PEDIDO' | 'COMANDA' | 'COZINHA' | 'RECIBO' | 'ABERTURA_CAIXA' | 'FECHAMENTO_CAIXA' | 'MESA';
export interface PrintSnapshot { version: 1; mode: 'SIMULATION'; kind: PrintKind; reference: string; lines: readonly string[] }
/** One renderer, no printer driver, browser call, payment mutation or remote operation. */
export function renderPrintSnapshot(snapshot: PrintSnapshot): string {
  if (snapshot.version !== 1 || snapshot.mode !== 'SIMULATION' || !['PEDIDO', 'COMANDA', 'COZINHA', 'RECIBO', 'ABERTURA_CAIXA', 'FECHAMENTO_CAIXA', 'MESA'].includes(snapshot.kind)) throw new Error('UNSUPPORTED_PRINT_SNAPSHOT');
  const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>${escape(snapshot.kind)}</title><body><h1>${escape(snapshot.kind)} · DEMO</h1><p>SIMULAÇÃO — sem valor fiscal</p><p>${escape(snapshot.reference)}</p>${snapshot.lines.map(line => `<p>${escape(line)}</p>`).join('')}</body></html>`;
}
