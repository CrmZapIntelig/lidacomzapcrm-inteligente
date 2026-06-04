/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  MoreHorizontal,
  Plus,
  ShoppingBag,
  ArrowRightLeft,
  DollarSign,
  ChevronRight,
  TrendingDown,
  User2,
  Trash2,
  MessageCircle,
} from 'lucide-react';
import { Client, FunnelStage } from '../types';
import { FUNNEL_STAGES } from '../utils/mockData';

interface CrmKanbanViewProps {
  clients: Client[];
  onUpdateClient: (updated: Client) => void;
  onAddHistoryEvent: (clientId: string, type: string, title: string, description: string) => void;
  onChangeTab: (tab: string) => void;
  onSelectClientInChat: (client: Client) => void;
}

export default function CrmKanbanView({
  clients,
  onUpdateClient,
  onAddHistoryEvent,
  onChangeTab,
  onSelectClientInChat,
}: CrmKanbanViewProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Dynamic calculations per stage
  const getStageTotalAndCount = (stageId: FunnelStage) => {
    const stageClients = clients.filter((c) => c.stage === stageId);
    const count = stageClients.length;
    // We can assume each pipeline stage has an estimated deal value. 
    // If client bought before, let's use that, or a realistic default parameter like R$ 150 for leads
    const estimatedValue = stageClients.reduce((acc, c) => {
      const base = c.totalBought > 0 ? c.totalBought : (stageId === 'Pago' || stageId === 'Pedido gerado' ? 350 : 155);
      return acc + base;
    }, 0);
    return { count, estimatedValue };
  };

  // HTML5 Drag Event Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setActiveDragId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow drop trigger
  };

  const handleDrop = (e: React.DragEvent, targetStage: FunnelStage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const client = clients.find((c) => c.id === id);
    if (client && client.stage !== targetStage) {
      const oldStage = client.stage;
      const updated = { ...client, stage: targetStage };
      onUpdateClient(updated);
      onAddHistoryEvent(client.id, 'stage_change', 'Funil Kanban (Arrastado)', `Movimentado de "${oldStage}" para "${targetStage}" via Kanban.`);
    }
    setActiveDragId(null);
  };

  const handleManualMove = (client: Client, targetStage: FunnelStage) => {
    const oldStage = client.stage;
    const updated = { ...client, stage: targetStage };
    onUpdateClient(updated);
    onAddHistoryEvent(client.id, 'stage_change', 'Funil Kanban', `Etapa redefinida de "${oldStage}" para "${targetStage}".`);
  };

  return (
    <div className="space-y-6 font-sans p-1 pb-12">
      {/* Kanban Dashboard stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Pipeline de Vendas (CRM)</h2>
          <p className="text-sm text-slate-505 dark:text-slate-400">
            Arraste e solte os cards entre as colunas para atualizar as etapas da automação de vendas.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <span className="text-xs font-mono font-bold text-slate-650 dark:text-slate-350 px-2.5">
            Valor Estimado de Pipeline: <span className="text-emerald-505 font-bold text-emerald-500">R$ 14.850,00</span>
          </span>
        </div>
      </div>

      {/* Kanban Columns Horizontal Container */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin select-none h-[640px] items-stretch min-w-full">
        {FUNNEL_STAGES.map((stage) => {
          const { count, estimatedValue } = getStageTotalAndCount(stage.id);
          const stageClients = clients.filter((c) => c.stage === stage.id);

          return (
            <div
              key={stage.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`w-72 shrink-0 rounded-2xl flex flex-col h-full bg-slate-50/70 border transition-all ${
                stage.bgColor
              } ${stage.borderColor} ${activeDragId ? 'border-dashed' : ''}`}
            >
              {/* Header column */}
              <div className="p-3.5 border-b border-slate-205 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full bg-current ${stage.color}`} />
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">{stage.label}</span>
                  <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-mono">{count}</span>
                </div>
                <span className="text-[10px] font-bold font-mono text-slate-500 tracking-tight">R$ {estimatedValue.toFixed(0)}</span>
              </div>

              {/* Cards row viewport */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 scrollbar-thin">
                {stageClients.length === 0 ? (
                  <div className="h-28 rounded-xl border border-dotted border-slate-200 dark:border-slate-750 flex flex-col items-center justify-center p-4">
                    <p className="text-[10px] text-slate-400 font-medium italic text-center">Nenhum lead nesta etapa</p>
                  </div>
                ) : (
                  stageClients.map((client) => (
                    <div
                      key={client.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, client.id)}
                      className={`p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing transition duration-150 ${
                        activeDragId === client.id ? 'opacity-40 scale-95 border-emerald-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full ${client.avatarColor || 'bg-slate-300'} text-white flex items-center justify-center font-bold text-xs`}>
                            {client.name.substring(0, 2)}
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[130px]">{client.name}</h4>
                        </div>
                        
                        {/* Go directly to chat button */}
                        <button
                          onClick={() => {
                            onSelectClientInChat(client);
                            onChangeTab('whatsapp');
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-slate-800 transition"
                          title="Abrir no Módulo Chat"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Phone format info */}
                      <p className="text-[10px] font-mono text-slate-400 mt-1.5 leading-none">{client.phone}</p>

                      {/* Display small tags */}
                      {client.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {client.tags.slice(0, 2).map((tg) => (
                            <span key={tg} className="text-[9px] font-mono font-medium bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.2 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                              {tg}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Value and stage quick mover picker dropdown */}
                      <div className="mt-3.5 pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between text-[10px]">
                        <span className="font-mono font-bold text-slate-500">
                          {client.totalBought > 0 ? `Comprado: R$ ${client.totalBought.toFixed(0)}` : 'Estimado: R$ 150'}
                        </span>

                        <div className="relative">
                          <select
                            value={client.stage}
                            onChange={(e) => handleManualMove(client, e.target.value as FunnelStage)}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-md font-sans text-[9px] text-slate-600 dark:text-slate-300 py-0.5 px-1 cursor-pointer hover:border-emerald-500 focus:outline-none"
                          >
                            {FUNNEL_STAGES.map((stg) => (
                              <option key={stg.id} value={stg.id}>
                                Mover para: {stg.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
