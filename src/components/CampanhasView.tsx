/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Megaphone, PlusCircle, CheckCircle, BarChart, Send, X, AlertCircle } from 'lucide-react';
import { Campaign } from '../types';

interface CampanhasViewProps {
  campaigns: Campaign[];
  onAddCampaign: (campaign: Campaign) => void;
}

export default function CampanhasView({ campaigns, onAddCampaign }: CampanhasViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'rcs' | 'ambos'>('ambos');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !messageTemplate.trim()) return;

    const newCampaign: Campaign = {
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: name.trim(),
      messageTemplate: messageTemplate.trim(),
      sentCount: 0,
      responseCount: 0,
      status: 'rascunho',
      createdAt: new Date().toISOString(),
      channel: channel
    };

    onAddCampaign(newCampaign);
    setName('');
    setMessageTemplate('');
    setChannel('ambos');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6 font-sans p-1 pb-12">
      
      {/* View Header with Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Campanhas de Marketing</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Dispare informativos direcionados, ofertas relâmpago de inverno e mensagens de fidelização integrados ao WhatsApp.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="bg-emerald-550 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-555/10 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nova Campanha</span>
        </button>
      </div>

      {/* Main campaigns display layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((camp) => {
          const conversionStr = camp.sentCount > 0 
            ? ((camp.responseCount / camp.sentCount) * 100).toFixed(1) + '%' 
            : '0.0%';

          return (
            <div 
              key={camp.id} 
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              {/* Campaign status indicator */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    {camp.channel === 'rcs' ? (
                      <span className="text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 rounded-full uppercase tracking-wider">Google RCS</span>
                    ) : camp.channel === 'ambos' ? (
                      <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 rounded-full uppercase tracking-wider">Omnichannel</span>
                    ) : (
                      <span className="text-[9px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 rounded-full uppercase tracking-wider">WhatsApp</span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-955 dark:text-white">{camp.name}</h3>
                  <span className="text-[10px] font-mono text-slate-402 text-slate-400">Criado em {new Date(camp.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>

                {camp.status === 'concluido' ? (
                  <span className="text-[9px] font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    CONCLUÍDO
                  </span>
                ) : camp.status === 'ativo' ? (
                  <span className="text-[9px] font-bold font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 animate-pulse">
                    ATIVO
                  </span>
                ) : (
                  <span className="text-[9px] font-bold font-mono text-slate-600 dark:text-slate-405 bg-slate-50 dark:bg-slate-805 px-2.5 py-1 rounded-full border border-slate-200/50">
                    RASCUNHO
                  </span>
                )}
              </div>

              {/* Message content block */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-750 rounded-xl p-3">
                <p className="text-xs text-slate-650 dark:text-slate-350 italic line-clamp-3">"{camp.messageTemplate}"</p>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-50 dark:border-slate-800 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-450 text-slate-400 uppercase tracking-tight font-sans block">Disparados</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{camp.sentCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-450 text-slate-400 uppercase tracking-tight font-sans block">Retorno</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{camp.responseCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-450 text-slate-450 text-slate-400 uppercase tracking-tight font-sans block">Conversão</span>
                  <span className="font-mono font-bold text-emerald-50s text-emerald-500">{conversionStr}</span>
                </div>
              </div>

              {camp.status === 'rascunho' && (
                <div className="pt-2">
                  <span className="text-[11px] text-slate-450 text-amber-500 italic block flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Pronto para disparo em massa.
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL WINDOW: CREATING NEW CAMPAIGN SCHEMAS */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-in zoom-in-95 duration-120">
            <button
              onClick={() => setShowAddForm(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 pb-3 border-b border-light-150 mb-4">
              <Megaphone className="w-5.5 h-5.5 text-emerald-505 text-emerald-500" />
              <h3 className="font-bold text-slate-950 dark:text-white text-sm">Criar Modelo de Campanha</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px] uppercase">Identificação da Campanha</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-705 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                  placeholder="Ex: Campanha Dia das Mães 🌹, Catálogo de Calçados 👠"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">Canal de Disparo</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as 'whatsapp' | 'rcs' | 'ambos')}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-705 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                >
                  <option value="ambos">Ambos (Omnichannel)</option>
                  <option value="whatsapp">Apenas WhatsApp</option>
                  <option value="rcs">Apenas Google Messages (RCS)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px] uppercase">Roteiro da Mensagem do Disparo</label>
                <textarea
                  required
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  rows={5}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-705 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                  placeholder="Olá {cliente}, espero que esteja bem! Desejamos te enviar as melhores ofertas..."
                />
                <span className="text-[10px] text-slate-401 text-slate-400 italic block mt-1">Use a tag {'{cliente}'} para o sistema mesclar o nome do lead antes de salvar.</span>
              </div>

              <div className="flex justify-end gap-2 text-xs font-bold pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-slate-105 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 px-4 py-2 rounded-xl"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-505 bg-emerald-505 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl transition font-bold"
                >
                  Criar Modelo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
