import React, { useEffect, useState } from 'react';
import OrdersView from '../src/components/OrdersView';
import type { TestOrderSession } from '../src/application/testOrderSession';

export function PrivateOrdersApp({ session }: { session: TestOrderSession }) {
  const [state, setState] = useState(session.snapshot);
  useEffect(() => {
    const unsubscribe = session.subscribe(() => setState(session.snapshot)); void session.start();
    return () => { unsubscribe(); void session.dispose(); };
  }, [session]);
  return <main className="mx-auto max-w-7xl p-4 sm:p-8">
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
      <div><p className="font-bold text-emerald-700">LidacomZapCRM</p><h1 className="text-2xl font-bold text-slate-950">Acesso aos pedidos</h1><p className="text-sm text-slate-600">Ambiente privado de testes</p></div>
      {state.canSignOut && <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold" onClick={() => void session.signOut()}>Sair da conta</button>}
    </header>
    <p role="status" aria-live="polite" className="mb-5 text-slate-700">{state.message}</p>
    {state.canSignIn && <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold">Entre para continuar</h2><p className="mb-5 text-sm text-slate-600">Use a conta autorizada para acompanhar os pedidos de teste.</p>
      <button className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white" onClick={() => void session.signIn()}>Entrar com Google</button>
    </section>}
    {state.phase === 'ready' && state.client && <div key={state.client.contextKey}><OrdersView orders={[]} testClient={state.client} /></div>}
  </main>;
}
