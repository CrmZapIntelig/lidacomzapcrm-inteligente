/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GitMerge, Check, ToggleLeft, ToggleRight, Sparkles, AlertCircle, Info } from 'lucide-react';
import { AutomationRule } from '../types';

interface AutomationsViewProps {
  rules: AutomationRule[];
  onToggleRule: (ruleId: string) => void;
}

export default function AutomationsView({ rules, onToggleRule }: AutomationsViewProps) {
  return (
    <div className="space-y-6 font-sans p-1 pb-12">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Automações Comerciais SE/ENTÃO</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gerencie gatilhos em tempo real para sincronizar movimentações do WhatsApp diretamente com as colunas do CRM.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Rule toggles list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Gatilhos de Movimentação Automatizada</h3>
            
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {rules.map((rule) => (
                <div key={rule.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{rule.title}</span>
                      {rule.active ? (
                        <span className="text-[8px] font-mono bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold tracking-wider uppercase px-2 py-0.5 rounded-full">
                          ATIVO
                        </span>
                      ) : (
                        <span className="text-[8px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold tracking-wider uppercase px-2 py-0.5 rounded-full">
                          DESATIVADO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{rule.description}</p>
                    
                    <div className="flex items-center gap-3 font-mono text-[10px] text-indigo-505 text-indigo-500 font-semibold">
                      <span className="bg-slate-50 dark:bg-slate-850 px-2 py-0.5 rounded-md border dark:border-slate-750">Trigger: {rule.triggerEvent}</span>
                      <span>➜</span>
                      <span className="bg-slate-50 dark:bg-slate-850 px-2 py-0.5 rounded-md border dark:border-slate-750">Mover para: {rule.actionStage}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleRule(rule.id)}
                    className="p-1 rounded-xl text-slate-600 focus:outline-none shrink-0"
                  >
                    {rule.active ? (
                      <ToggleRight className="w-11 h-11 text-emerald-505 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-11 h-11 text-slate-350" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Visual Flowchart / Diagram of pipeline logic */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 shadow-xs">
            <div>
              <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Mapa de Fluxo Lógico</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Diagrama simplificado da automação proativa.</p>
            </div>

            <div className="space-y-4 relative pl-4 border-l border-emerald-500/30">
              
              <div className="space-y-0.5 relative">
                <div className="absolute -left-[21px] top-1.5 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center font-bold text-white text-[8px]">
                  1
                </div>
                <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200 leading-none">WhatsApp Outbound</h4>
                <p className="text-[11px] text-slate-500">Ao carregar novo contato e disparar mensagens, funil registra <span className="font-semibold text-emerald-500 font-mono">Lead</span>.</p>
              </div>

              <div className="space-y-0.5 relative">
                <div className="absolute -left-[21px] top-1.5 w-3 h-3 bg-indigo-500 rounded-full flex items-center justify-center font-bold text-white text-[8px]">
                  2
                </div>
                <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200 leading-none">Interação de Entrada</h4>
                <p className="text-[11px] text-slate-500">Ao receber resposta do lead, gatilho transfere para <span className="font-semibold text-indigo-500 font-mono">Em Atendimento</span>.</p>
              </div>

              <div className="space-y-0.5 relative">
                <div className="absolute -left-[21px] top-1.5 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center font-bold text-white text-[8px]">
                  3
                </div>
                <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200 leading-none">Conversão Financeira</h4>
                <p className="text-[11px] text-slate-500">Emissão de faturas no chat atualiza o funil para <span className="font-semibold text-amber-500 font-mono">Pedido Gerado</span>.</p>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/20 rounded-xl border border-indigo-200/50 dark:border-indigo-900/40 text-xs text-indigo-700 dark:text-indigo-400 flex items-start gap-2">
              <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-indigo-500" />
              <p className="leading-relaxed">Como as regras funcionam em tempo real, as mudanças acontecem de forma fluida no Kanban sem necessidade de intervenção humana.</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
