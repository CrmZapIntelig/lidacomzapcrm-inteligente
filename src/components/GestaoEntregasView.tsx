import React, { useState } from 'react';
import EntregasView from './EntregasView';
import EntregadoresView from './EntregadoresView';
import RotasView from './RotasView';
import RastreamentoView from './RastreamentoView';
import { Truck, Map, MapPin, ListOrdered } from 'lucide-react';

type DeliveryManagementTab =
  | 'entregas'
  | 'entregadores'
  | 'rotas'
  | 'rastreamento';

export default function GestaoEntregasView(props: any) {
  const [activeTab, setActiveTab] =
    useState<DeliveryManagementTab>('entregas');

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 rounded-b-2xl px-6 py-2 pb-0">
        <div className="flex items-center space-x-6 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('entregas')}
            className={`pb-3 border-b-2 font-bold text-sm tracking-wide transition-all uppercase flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'entregas'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            Painel de Despachos
          </button>

          <button
            onClick={() => setActiveTab('entregadores')}
            className={`pb-3 border-b-2 font-bold text-sm tracking-wide transition-all uppercase flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'entregadores'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Truck className="w-4 h-4" />
            Entregadores
          </button>

          <button
            onClick={() => setActiveTab('rotas')}
            className={`pb-3 border-b-2 font-bold text-sm tracking-wide transition-all uppercase flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'rotas'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Rotas
          </button>

          <button
            onClick={() => setActiveTab('rastreamento')}
            className={`pb-3 border-b-2 font-bold text-sm tracking-wide transition-all uppercase flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'rastreamento'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Map className="w-4 h-4" />
            Rastreamento
          </button>
        </div>
      </div>

      <div className="flex-1 w-full relative">
        {activeTab === 'entregas' && (
          <EntregasView
            deliveryOrders={props.deliveryOrders}
            setDeliveryOrders={props.setDeliveryOrders}
          />
        )}

        {activeTab === 'entregadores' && (
          <EntregadoresView
            couriers={props.couriers}
            setCouriers={props.setCouriers}
            reviews={props.reviews}
            setReviews={props.setReviews}
            deliveryOrders={props.deliveryOrders}
          />
        )}

        {activeTab === 'rotas' && (
          <RotasView
            couriers={props.couriers}
            setCouriers={props.setCouriers}
            routes={props.routes}
            setRoutes={props.setRoutes}
            deliveryOrders={props.deliveryOrders}
            setDeliveryOrders={props.setDeliveryOrders}
            messages={props.messages}
            setMessages={props.setMessages}
          />
        )}

        {activeTab === 'rastreamento' && (
          <RastreamentoView
            deliveryOrders={props.deliveryOrders}
            setDeliveryOrders={props.setDeliveryOrders}
            routes={props.routes}
            setRoutes={props.setRoutes}
            couriers={props.couriers}
            setCouriers={props.setCouriers}
            messages={props.messages}
          />
        )}
      </div>
    </div>
  );
}