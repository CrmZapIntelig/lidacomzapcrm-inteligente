/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Check, RefreshCw, Sliders } from 'lucide-react';
import { AppSettings } from '../types';

interface ConfiguracoesViewProps {
  settings: AppSettings;
  onUpdateSettings: (s: Partial<AppSettings>) => void;
  onResetDatabase: () => void;
}

const parseList = (value: string) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const listToText = (items?: string[]) => (items || []).join('\n');

export default function ConfiguracoesView({
  settings,
  onUpdateSettings,
  onResetDatabase,
}: ConfiguracoesViewProps) {
  const [restaurant, setRestaurant] = useState(settings.restaurant);
  const [operation, setOperation] = useState(settings.operation);
  const [delivery, setDelivery] = useState(settings.delivery);
  const [cashier, setCashier] = useState(settings.cashier);
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp);
  const [dispatcher, setDispatcher] = useState(settings.dispatcher);
  const [ui, setUi] = useState(settings.ui);

  const [allowedNeighborhoodsText, setAllowedNeighborhoodsText] = useState(
    listToText(settings.delivery.allowedNeighborhoods)
  );
  const [acceptedPaymentMethodsText, setAcceptedPaymentMethodsText] = useState(
    listToText(settings.cashier.acceptedPaymentMethods)
  );
  const [quickTemplatesText, setQuickTemplatesText] = useState(
    listToText(settings.whatsapp.quickTemplates)
  );

  const handleSaveConfigsSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nextDelivery = {
      ...delivery,
      allowedNeighborhoods: parseList(allowedNeighborhoodsText),
    };
    const nextCashier = {
      ...cashier,
      acceptedPaymentMethods: parseList(acceptedPaymentMethodsText),
    };
    const nextWhatsapp = {
      ...whatsapp,
      quickTemplates: parseList(quickTemplatesText),
    };

    onUpdateSettings({
      restaurant,
      operation,
      delivery: nextDelivery,
      cashier: nextCashier,
      whatsapp: nextWhatsapp,
      dispatcher,
      ui,
      dailyLimit: dispatcher.dailyLimit,
      intervalMin: dispatcher.intervalMin,
      intervalMax: dispatcher.intervalMax,
      autoPause: dispatcher.autoPause,
      autoPauseAfter: dispatcher.autoPauseAfter,
      waSessionStatus: nextWhatsapp.sessionStatus,
      operatorRole: ui.operatorRole,
      operatorName: ui.operatorName,
      theme: ui.theme,
    });
    alert('Configurações salvas e aplicadas em tempo real na operação!');
  };

  const handleFactoryResetWithAlert = () => {
    if (confirm('Aviso Crítico: deseja redefinir os dados locais para o padrão inicial? Suas modificações de chat serão limpas.')) {
      onResetDatabase();
      alert('Banco de dados local redefinido com sucesso!');
    }
  };

  const inputClass = 'w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-705 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 font-mono focus:outline-none';
  const labelClass = 'block text-slate-450 font-bold mb-1.5 uppercase text-[9px]';
  const cardClass = 'bg-white dark:bg-slate-900 border border-slate-205 border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4';

  return (
    <div className="space-y-6 font-sans p-1 pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Painel de Configuração Operacional</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gerencie os dados centrais do Restaurante Prato Mineiro, operação, delivery, caixa, WhatsApp, disparador e interface.
        </p>
      </div>

      <form onSubmit={handleSaveConfigsSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
        <div className="lg:col-span-2 space-y-6">
          <section className={cardClass}>
            <h3 className="text-sm font-bold text-slate-955 dark:text-white flex items-center gap-1.5">
              <Sliders className="w-4.5 h-4.5 text-emerald-500" />
              <span>Restaurante</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nome do Restaurante</label>
                <input className={inputClass} value={restaurant.name} onChange={(e) => setRestaurant({ ...restaurant, name: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Nome da Marca</label>
                <input className={inputClass} value={restaurant.brandName} onChange={(e) => setRestaurant({ ...restaurant, brandName: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Sistema</label>
                <input className={inputClass} value={restaurant.systemName} onChange={(e) => setRestaurant({ ...restaurant, systemName: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Razão Social</label>
                <input className={inputClass} value={restaurant.legalName} onChange={(e) => setRestaurant({ ...restaurant, legalName: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>CNPJ</label>
                <input className={inputClass} value={restaurant.cnpj} onChange={(e) => setRestaurant({ ...restaurant, cnpj: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Telefone</label>
                <input className={inputClass} value={restaurant.phone} onChange={(e) => setRestaurant({ ...restaurant, phone: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>WhatsApp</label>
                <input className={inputClass} value={restaurant.whatsapp} onChange={(e) => setRestaurant({ ...restaurant, whatsapp: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>E-mail</label>
                <input className={inputClass} value={restaurant.email} onChange={(e) => setRestaurant({ ...restaurant, email: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Rua</label>
                <input className={inputClass} value={restaurant.address.street} onChange={(e) => setRestaurant({ ...restaurant, address: { ...restaurant.address, street: e.target.value } })} />
              </div>
              <div>
                <label className={labelClass}>Número</label>
                <input className={inputClass} value={restaurant.address.number} onChange={(e) => setRestaurant({ ...restaurant, address: { ...restaurant.address, number: e.target.value } })} />
              </div>
              <div>
                <label className={labelClass}>Bairro</label>
                <input className={inputClass} value={restaurant.address.neighborhood} onChange={(e) => setRestaurant({ ...restaurant, address: { ...restaurant.address, neighborhood: e.target.value } })} />
              </div>
              <div>
                <label className={labelClass}>Cidade</label>
                <input className={inputClass} value={restaurant.address.city} onChange={(e) => setRestaurant({ ...restaurant, address: { ...restaurant.address, city: e.target.value } })} />
              </div>
              <div>
                <label className={labelClass}>Estado</label>
                <input className={inputClass} value={restaurant.address.state} onChange={(e) => setRestaurant({ ...restaurant, address: { ...restaurant.address, state: e.target.value } })} />
              </div>
              <div>
                <label className={labelClass}>CEP</label>
                <input className={inputClass} value={restaurant.address.zipCode} onChange={(e) => setRestaurant({ ...restaurant, address: { ...restaurant.address, zipCode: e.target.value } })} />
              </div>
              <div>
                <label className={labelClass}>Instagram</label>
                <input className={inputClass} value={restaurant.social.instagram} onChange={(e) => setRestaurant({ ...restaurant, social: { ...restaurant.social, instagram: e.target.value } })} />
              </div>
              <div>
                <label className={labelClass}>Website</label>
                <input className={inputClass} value={restaurant.social.website} onChange={(e) => setRestaurant({ ...restaurant, social: { ...restaurant.social, website: e.target.value } })} />
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <h3 className="text-sm font-bold text-slate-955 dark:text-white">Operação</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Restaurante Aberto</label>
                <select className={inputClass} value={operation.isOpen ? 'sim' : 'nao'} onChange={(e) => setOperation({ ...operation, isOpen: e.target.value === 'sim' })}>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Timezone</label>
                <input className={inputClass} value={operation.timezone} onChange={(e) => setOperation({ ...operation, timezone: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Tempo Médio de Produção (min)</label>
                <input type="number" className={inputClass} value={operation.averagePreparationMinutes} onChange={(e) => setOperation({ ...operation, averagePreparationMinutes: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelClass}>Aceitar Pedidos Públicos</label>
                <select className={inputClass} value={operation.acceptPublicOrders ? 'sim' : 'nao'} onChange={(e) => setOperation({ ...operation, acceptPublicOrders: e.target.value === 'sim' })}>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Aceitar Pedidos de Mesa</label>
                <select className={inputClass} value={operation.acceptTableOrders ? 'sim' : 'nao'} onChange={(e) => setOperation({ ...operation, acceptTableOrders: e.target.value === 'sim' })}>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <h3 className="text-sm font-bold text-slate-955 dark:text-white">Delivery</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Taxa Padrão</label>
                <input type="number" step="0.01" className={inputClass} value={delivery.defaultFee} onChange={(e) => setDelivery({ ...delivery, defaultFee: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelClass}>Frete Grátis Acima de</label>
                <input type="number" step="0.01" className={inputClass} value={delivery.freeDeliveryAbove ?? ''} onChange={(e) => setDelivery({ ...delivery, freeDeliveryAbove: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelClass}>ETA Padrão (min)</label>
                <input type="number" className={inputClass} value={delivery.defaultEtaMinutes} onChange={(e) => setDelivery({ ...delivery, defaultEtaMinutes: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelClass}>Alerta de Atraso (min)</label>
                <input type="number" className={inputClass} value={delivery.maxDelayAlertMinutes} onChange={(e) => setDelivery({ ...delivery, maxDelayAlertMinutes: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelClass}>Raio Máximo (km)</label>
                <input type="number" step="0.1" className={inputClass} value={delivery.maxRadiusKm ?? ''} onChange={(e) => setDelivery({ ...delivery, maxRadiusKm: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelClass}>Bairros Atendidos (um por linha)</label>
                <textarea className={inputClass} rows={4} value={allowedNeighborhoodsText} onChange={(e) => setAllowedNeighborhoodsText(e.target.value)} />
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <h3 className="text-sm font-bold text-slate-955 dark:text-white">Caixa</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Saldo Inicial Sugerido</label>
                <input type="number" step="0.01" className={inputClass} value={cashier.suggestedInitialBalance} onChange={(e) => setCashier({ ...cashier, suggestedInitialBalance: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelClass}>Pagamento Padrão</label>
                <input className={inputClass} value={cashier.defaultPaymentMethod} onChange={(e) => setCashier({ ...cashier, defaultPaymentMethod: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Fechamento Diário Obrigatório</label>
                <select className={inputClass} value={cashier.requireDailyClosing ? 'sim' : 'nao'} onChange={(e) => setCashier({ ...cashier, requireDailyClosing: e.target.value === 'sim' })}>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Tolerância de Diferença</label>
                <input type="number" step="0.01" className={inputClass} value={cashier.differenceTolerance} onChange={(e) => setCashier({ ...cashier, differenceTolerance: Number(e.target.value) })} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Métodos Aceitos (um por linha)</label>
                <textarea className={inputClass} rows={3} value={acceptedPaymentMethodsText} onChange={(e) => setAcceptedPaymentMethodsText(e.target.value)} />
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className={cardClass}>
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">WhatsApp</h3>
            <div className="space-y-3.5">
              <div className="p-3 bg-emerald-500/10 border border-emerald-355 border-emerald-500/30 rounded-xl flex items-center justify-between">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Status Celular:</span>
                <span className="font-mono font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[9px]">{whatsapp.sessionStatus === 'connected' ? 'CONECTADO' : whatsapp.sessionStatus === 'connecting' ? 'CONECTANDO' : 'DESCONECTADO'}</span>
              </div>
              <div>
                <label className={labelClass}>Status da Conexão</label>
                <select className={inputClass} value={whatsapp.sessionStatus} onChange={(e) => setWhatsapp({ ...whatsapp, sessionStatus: e.target.value as AppSettings['waSessionStatus'] })}>
                  <option value="connected">Conectado</option>
                  <option value="disconnected">Desconectado</option>
                  <option value="connecting">Tentando Reestabelecer Sinal</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Templates Rápidos</label>
                <textarea className={inputClass} rows={4} value={quickTemplatesText} onChange={(e) => setQuickTemplatesText(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Pedido Gerado</label>
                <textarea className={inputClass} rows={2} value={whatsapp.statusMessages.orderCreated} onChange={(e) => setWhatsapp({ ...whatsapp, statusMessages: { ...whatsapp.statusMessages, orderCreated: e.target.value } })} />
              </div>
              <div>
                <label className={labelClass}>Produção</label>
                <textarea className={inputClass} rows={2} value={whatsapp.statusMessages.production} onChange={(e) => setWhatsapp({ ...whatsapp, statusMessages: { ...whatsapp.statusMessages, production: e.target.value } })} />
              </div>
              <div>
                <label className={labelClass}>Pronto</label>
                <textarea className={inputClass} rows={2} value={whatsapp.statusMessages.ready} onChange={(e) => setWhatsapp({ ...whatsapp, statusMessages: { ...whatsapp.statusMessages, ready: e.target.value } })} />
              </div>
              <div>
                <label className={labelClass}>Saiu para Entrega</label>
                <textarea className={inputClass} rows={2} value={whatsapp.statusMessages.outForDelivery} onChange={(e) => setWhatsapp({ ...whatsapp, statusMessages: { ...whatsapp.statusMessages, outForDelivery: e.target.value } })} />
              </div>
              <div>
                <label className={labelClass}>Fechado</label>
                <textarea className={inputClass} rows={2} value={whatsapp.statusMessages.closed} onChange={(e) => setWhatsapp({ ...whatsapp, statusMessages: { ...whatsapp.statusMessages, closed: e.target.value } })} />
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Disparador</h3>
            <div className="space-y-3.5">
              <div>
                <label className={labelClass}>Limite Diário</label>
                <input type="number" className={inputClass} value={dispatcher.dailyLimit} onChange={(e) => setDispatcher({ ...dispatcher, dailyLimit: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelClass}>Intervalo Mínimo (s)</label>
                <input type="number" className={inputClass} value={dispatcher.intervalMin} onChange={(e) => setDispatcher({ ...dispatcher, intervalMin: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelClass}>Intervalo Máximo (s)</label>
                <input type="number" className={inputClass} value={dispatcher.intervalMax} onChange={(e) => setDispatcher({ ...dispatcher, intervalMax: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelClass}>Pausa Automática</label>
                <select className={inputClass} value={dispatcher.autoPause ? 'sim' : 'nao'} onChange={(e) => setDispatcher({ ...dispatcher, autoPause: e.target.value === 'sim' })}>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Pausar Após</label>
                <input type="number" className={inputClass} value={dispatcher.autoPauseAfter} onChange={(e) => setDispatcher({ ...dispatcher, autoPauseAfter: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelClass}>Canal Padrão</label>
                <select className={inputClass} value={dispatcher.defaultChannel} onChange={(e) => setDispatcher({ ...dispatcher, defaultChannel: e.target.value as AppSettings['dispatcher']['defaultChannel'] })}>
                  <option value="todos">Todos</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="rcs">RCS</option>
                </select>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <label className="flex items-center gap-2 text-slate-500 font-bold"><input type="checkbox" checked={dispatcher.excludeGroups} onChange={(e) => setDispatcher({ ...dispatcher, excludeGroups: e.target.checked })} /> Excluir grupos</label>
                <label className="flex items-center gap-2 text-slate-500 font-bold"><input type="checkbox" checked={dispatcher.excludeBlocked} onChange={(e) => setDispatcher({ ...dispatcher, excludeBlocked: e.target.checked })} /> Excluir bloqueados</label>
                <label className="flex items-center gap-2 text-slate-500 font-bold"><input type="checkbox" checked={dispatcher.excludeAlreadySent} onChange={(e) => setDispatcher({ ...dispatcher, excludeAlreadySent: e.target.checked })} /> Excluir já enviados</label>
              </div>
              <div>
                <label className={labelClass}>Mensagem Padrão</label>
                <textarea className={inputClass} rows={4} value={dispatcher.defaultMessage} onChange={(e) => setDispatcher({ ...dispatcher, defaultMessage: e.target.value })} />
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Interface</h3>
            <div className="space-y-3.5">
              <div>
                <label className={labelClass}>Tema</label>
                <select className={inputClass} value={ui.theme} onChange={(e) => setUi({ ...ui, theme: e.target.value as AppSettings['theme'] })}>
                  <option value="dark">Escuro</option>
                  <option value="light">Claro</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Operador Padrão</label>
                <input className={inputClass} value={ui.operatorName} onChange={(e) => setUi({ ...ui, operatorName: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Perfil</label>
                <select className={inputClass} value={ui.operatorRole} onChange={(e) => setUi({ ...ui, operatorRole: e.target.value as AppSettings['operatorRole'] })}>
                  <option value="Admin">Admin</option>
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase text-rose-500">Área Perigosa</h3>
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500">
                Se os dados locais estiverem cheios ou você quiser reiniciar a operação, clique no controle abaixo para restaurar os valores iniciais.
              </p>
              <button
                type="button"
                onClick={handleFactoryResetWithAlert}
                className="w-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 border border-rose-200 dark:border-rose-900 font-bold py-2 px-3 rounded-xl transition inline-flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-reverse" />
                <span>REDEFINIR DADOS LOCAIS</span>
              </button>
            </div>
          </section>

          <button
            type="submit"
            className="w-full bg-emerald-505 bg-emerald-505 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-emerald-505/10 transition flex items-center justify-center gap-1.5 font-bold"
          >
            <Check className="w-4.5 h-4.5" />
            <span>Salvar Configurações</span>
          </button>
        </div>
      </form>
    </div>
  );
}
