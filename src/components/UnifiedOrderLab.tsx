import { useEffect, useState } from 'react';
import { executeCloneTest, watchCloneTests } from '../lib/cloneUnifiedStore';
import { newCloneTestOrder, TEST_TENANT } from '../application/cloneUnifiedModel';
import type { CloneTestAggregate } from '../application/cloneUnifiedModel';
import type { OperationalCommand, OrderOperation } from '../application/stagingOperationalOrders';
import { operationalOrderPrint, projectTestCash, projectTestConsumers } from '../application/operationalOrderProjections';
import { renderPrintSnapshot } from '../application/operationsFinance';
import type { PaymentMethod } from '../application/orderOperations';

const button='rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-40 hover:bg-emerald-50 dark:hover:bg-slate-800';
const money=(c:number)=>(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const id=()=>`demo-TEST-${crypto.randomUUID()}`;
export default function UnifiedOrderLab(){
 const [items,setItems]=useState<CloneTestAggregate[]>([]),[selected,setSelected]=useState(''),[feedback,setFeedback]=useState('Carregando testes salvos…'),[busy,setBusy]=useState(false),[method,setMethod]=useState<PaymentMethod>('PIX'),[last,setLast]=useState<OperationalCommand>(),[print,setPrint]=useState('');
 useEffect(()=>watchCloneTests(rows=>{setItems(rows);setFeedback('Dados de teste sincronizados com o clone.');},setFeedback),[]);
 const active=items.filter(i=>!i.rolledBack), aggregate=items.find(i=>i.orderId===selected), snapshot=aggregate?.snapshot;
 const cash=projectTestCash(active.flatMap(i=>i.events));
 const projection=snapshot?projectTestConsumers(snapshot):null;
 async function send(command:OperationalCommand){setBusy(true);setLast(command);setPrint('');try{const result=await executeCloneTest(command);setFeedback(result.replay?'Comando já aplicado: repetição sem duplicação.':`Salvo no clone · revisão ${result.revision}.`);}catch(e){setFeedback(e instanceof Error?e.message:'Falha ao salvar; você pode repetir o mesmo comando.');}finally{setBusy(false);}}
 function command(operation:OrderOperation,orderId=selected,revision=aggregate?.revision??0){const key=id();return {commandId:key,idempotencyKey:key,tenantId:TEST_TENANT,orderId,expectedRevision:revision,actor:'demo-TEST-clone-operator',at:new Date().toISOString(),operation} satisfies OperationalCommand;}
 const run=(operation:OrderOperation)=>void send(command(operation));
 return <section className="space-y-5">
  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-950"><h3 className="font-bold">Pedidos, produção, entrega e caixa — teste integrado</h3><p className="text-sm">Gravação real no clone, com pedido fictício de R$ 40,00. Não produzir, cobrar ou entregar. O mesmo pedido alimenta todas as projeções abaixo; os pedidos comerciais copiados permanecem separados.</p></div>
  <div className="flex flex-wrap gap-3 items-center"><label>Pagamento do novo teste <select aria-label="Pagamento do teste" className={button} value={method} onChange={e=>setMethod(e.target.value as PaymentMethod)}>{['PIX','DINHEIRO','DEBITO','CREDITO','NOTA'].map(m=><option key={m}>{m}</option>)}</select></label>
  <button className={button} disabled={busy||active.length>=20} onClick={()=>{const orderId=id();setSelected(orderId);void send(command({kind:'CREATE',snapshot:newCloneTestOrder(orderId,method,new Date())},orderId,0));}}>Criar pedido de teste no clone</button>
  <button className={button} disabled={busy||!last} onClick={()=>last&&void send(last)}>Repetir último comando</button></div>
  <p role="status" className="text-sm text-emerald-700">{feedback}</p>
  <label className="block">Pedido <select aria-label="Pedido de teste" className={button+' w-full'} value={selected} onChange={e=>{setSelected(e.target.value);setPrint('');}}><option value="">Selecione um teste salvo</option>{items.map(i=><option key={i.orderId} value={i.orderId}>{i.orderId} · {i.rolledBack?'revertido':`revisão ${i.revision}`}</option>)}</select></label>
  {snapshot&&<><div className="grid gap-3 sm:grid-cols-4">{[['Pedido',snapshot.orderState],['Pagamento',`${snapshot.paymentState} · ${money(snapshot.receivedCents)}`],['Produção',snapshot.productionState],['Entrega',snapshot.deliveryState]].map(([label,value])=><div key={label} className="p-4 rounded-xl border bg-white dark:bg-slate-900"><span className="text-xs text-slate-500">{label}</span><p className="font-semibold break-words">{value}</p></div>)}</div>
  <p className="text-sm">2 × Prato TEST · Total {money(snapshot.totalCents)} · NOTA: {snapshot.notaState}. Entrega concluída não registra recebimento.</p>
  <div className="flex flex-wrap gap-2">
   <button className={button} disabled={busy||snapshot.notaState!=='REQUESTED'} onClick={()=>run({kind:'NOTA_APPROVE'})}>Aprovar NOTA TEST</button>
   <button className={button} disabled={busy||snapshot.notaState!=='REQUESTED'} onClick={()=>run({kind:'NOTA_REJECT'})}>Recusar NOTA TEST</button>
   <button className={button} disabled={busy||snapshot.orderState!=='DRAFT'||snapshot.method==='NOTA'&&snapshot.notaState!=='APPROVED'} onClick={()=>run({kind:'CONFIRM'})}>Confirmar pedido TEST</button>
   <button className={button} disabled={busy||snapshot.orderState!=='CONFIRMED'||snapshot.productionState!=='WAITING'} onClick={()=>run({kind:'PRODUCTION',state:'PREPARING'})}>Iniciar preparo TEST</button>
   <button className={button} disabled={busy||snapshot.productionState!=='PREPARING'} onClick={()=>run({kind:'PRODUCTION',state:'READY'})}>Marcar pronto TEST</button>
   <button className={button} disabled={busy||!['READY','ASSIGNED','IN_TRANSIT'].includes(snapshot.deliveryState)} onClick={()=>run({kind:'DELIVERY',state:snapshot.deliveryState==='READY'?'ASSIGNED':snapshot.deliveryState==='ASSIGNED'?'IN_TRANSIT':'DELIVERED',courierId:'demo-TEST-courier'})}>{snapshot.deliveryState==='READY'?'Atribuir entregador TEST':snapshot.deliveryState==='ASSIGNED'?'Sair para entrega TEST':'Concluir entrega TEST'}</button>
   <button className={button} disabled={busy||snapshot.orderState!=='CONFIRMED'||snapshot.paymentState!=='PENDING'} onClick={()=>run({kind:'RECEIVE',amountCents:snapshot.totalCents-snapshot.receivedCents,method:snapshot.method==='NOTA'?'PIX':snapshot.method,evidenceId:id()})}>Simular recebimento TEST</button>
   <button className={button} disabled={busy||snapshot.paymentState!=='RECEIVED'||snapshot.method==='NOTA'} onClick={()=>run({kind:'REFUND',amountCents:snapshot.totalCents,method:snapshot.method as Exclude<PaymentMethod,'NOTA'>,evidenceId:id()})}>Simular estorno TEST</button>
   <button className={button} disabled={busy} onClick={()=>run({kind:'ROLLBACK_TEST'})}>Reverter teste e preservar auditoria</button>
  </div>
  <div className="rounded-xl border p-4 text-sm"><h3 className="font-bold">Um pedido entre os módulos</h3><p>Pedido: {projection?.orderId} · revisão {projection?.revision}</p><p>Cozinha: {projection?.kds?.status??'aguardando confirmação'} · Delivery: {projection?.delivery?.status??'aguardando confirmação'}</p><p>Financeiro: {projection?.legacyOrder?.status??'consulte o estado canônico'} · Recebimento: {money(snapshot.receivedCents)}</p></div>
  <div className="flex gap-2 flex-wrap">{(['PEDIDO','COMANDA','COZINHA'] as const).map(kind=><button className={button} key={kind} onClick={()=>setPrint(renderPrintSnapshot(operationalOrderPrint(snapshot,kind)))}>Prévia {kind.toLowerCase()} TEST</button>)}</div>
  {print&&<iframe title="Comprovante TEST sem valor fiscal" sandbox="" srcDoc={print} className="w-full h-96 border rounded-xl bg-white"/>}</>}
  {aggregate?.rolledBack&&<p>Teste revertido. Histórico preservado; não participa dos totais abaixo.</p>}
  <div className="rounded-xl border p-4"><h3 className="font-bold">Caixa e recebimentos dos testes ativos</h3><p>Vendas: {money(cash.totalSalesCents)} · Gaveta: {money(cash.drawerCents)} · NOTA em aberto: {money(cash.openCreditCents)}</p><div className="flex gap-4 flex-wrap text-sm mt-2">{Object.entries(cash.expected).map(([m,value])=><span key={m}>{m}: {money(value)}</span>)}</div></div>
  {aggregate&&<details className="rounded-xl border p-4"><summary>Auditoria do pedido · {aggregate.commands.length} comandos</summary><ul className="text-sm mt-3 space-y-1">{aggregate.events.map(e=><li key={e.id}>Revisão {e.revision} · {e.operation} · {e.fact} · {money(e.amountCents)}</li>)}{aggregate.rolledBack&&<li>Revisão {aggregate.revision} · ROLLBACK_TEST · totais excluídos, histórico preservado</li>}</ul></details>}
 </section>;
}
