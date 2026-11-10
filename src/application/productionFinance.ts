import {cents,type PaymentMethod} from './orderOperations';
export interface CashSession { id:string;status:'OPEN'|'CLOSED';openedAt:string;closedAt?:string;openingCents:number;expected:Record<string,number>;countedCents?:number;differenceCents?:number;operator:string;lastLedgerId?:string }
export function cashMovement(session:CashSession,method:PaymentMethod,amount:number,kind:'RECEIVE'|'REFUND'):CashSession {
 if(session.status!=='OPEN')throw Error('Abra o caixa antes de registrar recebimentos ou estornos.');
 if(!['DINHEIRO','PIX','DEBITO','CREDITO'].includes(method)||cents(amount)<=0)throw Error('Movimento de caixa inválido.');
 const value=(session.expected[method]??0)+(kind==='REFUND'?-amount:amount);
 if(!Number.isSafeInteger(value))throw Error('Limite financeiro excedido.');
 return {...session,expected:{...session.expected,[method]:value}};
}
export function finishCash(session:CashSession,countedCents:number,at:string):CashSession {
 cents(countedCents);if(!Number.isFinite(Date.parse(at)))throw Error('Data inválida.');
 if(session.status==='CLOSED'){if(session.countedCents===countedCents)return session;throw Error('Caixa já fechado.');}
 return {...session,status:'CLOSED',closedAt:at,countedCents,differenceCents:countedCents-session.openingCents-(session.expected.DINHEIRO??0)};
}
