import {useEffect,useRef,useState} from 'react';
import {auth,cloneOperatorUid,isCloneEnvironment} from '../lib/firebase';
import {fetchEvolutionDiagnostics,type EvolutionStatus} from '../application/providerDiagnosticsClient';
const labels:Record<EvolutionStatus,string>={DISABLED:'Consulta desativada',NOT_CONFIGURED:'Instância ainda não configurada no servidor',CONNECTED:'Conexão confirmada pelo provedor',CONNECTING:'Provedor está conectando',DISCONNECTED:'Instância desconectada',UNAUTHORIZED:'Credencial recusada pelo provedor',NOT_FOUND:'Instância não encontrada',UNAVAILABLE:'Provedor indisponível nesta consulta',INVALID_RESPONSE:'Resposta do provedor não reconhecida'};
export default function EvolutionConnectionStatus(){
 const [message,setMessage]=useState('Conexão ainda não consultada.'),[busy,setBusy]=useState(false);
 const active=useRef<AbortController|null>(null);
 useEffect(()=>()=>{active.current?.abort();active.current=null;},[]);
 async function check(){
  if(active.current)return;
  const controller=new AbortController();active.current=controller;setBusy(true);setMessage('Consultando o servidor…');
  const timer=setTimeout(()=>controller.abort(),20000);
  try{
   const user=auth.currentUser;
   if(!isCloneEnvironment||user?.uid!==cloneOperatorUid||!user.emailVerified)throw Error('Entre com a conta autorizada para consultar.');
   const token=await user.getIdToken();
   if(controller.signal.aborted||auth.currentUser?.uid!==user.uid)throw Error('Sessão alterada. Consulte novamente.');
   const status=await fetchEvolutionDiagnostics(token,controller.signal);
   if(!controller.signal.aborted&&auth.currentUser?.uid===user.uid)setMessage(labels[status]);
  }catch(error){if(active.current===controller)setMessage(controller.signal.aborted?'Consulta interrompida. Tente novamente.':error instanceof Error?error.message:'Falha na consulta.');}
  finally{clearTimeout(timer);if(active.current===controller){active.current=null;setBusy(false);}}
 }
 return <section className="mt-4 border-t pt-4"><button type="button" disabled={busy} onClick={()=>void check()} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">{busy?'Consultando…':'Verificar conexão Evolution'}</button><p role="status" aria-live="polite" className="text-sm mt-2">{message}</p><p className="text-xs text-slate-500 mt-2">Esta consulta não envia mensagens. A autorização de envio continua pendente.</p></section>;
}
