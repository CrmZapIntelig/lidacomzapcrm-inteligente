/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sliders, Check, ShieldAlert, KeyRound, HelpCircle, HardDriveDownload, Sparkles, RefreshCw } from 'lucide-react';
import { AppSettings } from '../types';

interface ConfiguracoesViewProps {
  settings: AppSettings;
  onUpdateSettings: (s: Partial<AppSettings>) => void;
  onResetDatabase: () => void;
}

export default function ConfiguracoesView({
  settings,
  onUpdateSettings,
  onResetDatabase,
}: ConfiguracoesViewProps) {
  // Local bindings for configuration fields
  const [dailyLimit, setDailyLimit] = useState(settings.dailyLimit);
  const [intervalMin, setIntervalMin] = useState(settings.intervalMin);
  const [intervalMax, setIntervalMax] = useState(settings.intervalMax);
  const [autoPause, setAutoPause] = useState(settings.autoPause);
  const [autoPauseAfter, setAutoPauseAfter] = useState(settings.autoPauseAfter);

  const [sessionStatus, setSessionStatus] = useState<AppSettings['waSessionStatus']>(settings.waSessionStatus);

  const handleSaveConfigsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      dailyLimit,
      intervalMin,
      intervalMax,
      autoPause,
      autoPauseAfter,
      waSessionStatus: sessionStatus,
    });
    alert('Configurações salvas e aplicadas em tempo real na operação!');
  };

  const handleFactoryResetWithAlert = () => {
    if (confirm('Aviso Crítico: deseja redefinir os dados locais para o padrão inicial? Suas modificações de chat serão limpas.')) {
      onResetDatabase();
      alert('Banco de dados local redefinido com sucesso!');
    }
  };

  return (
    <div className="space-y-6 font-sans p-1 pb-12">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Painel de Configuração Operacional</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gerencie sincronização operacional, sessão do WhatsApp e limites de proteção de envio.
        </p>
      </div>

      <form onSubmit={handleSaveConfigsSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
        
        {/* Anti-Ban & Dispatcher settings columns */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-955 dark:text-white flex items-center gap-1.5">
              <Sliders className="w-4.5 h-4.5 text-emerald-500" />
              <span>Proteção Anti-Ban & Transmissões</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-450 font-bold mb-1.5 uppercase text-[9px]">Capacidade Limite Diária de Disparos</label>
                <input
                  type="number"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-705 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-450 font-bold mb-1.5 uppercase text-[9px]">Pausa Inteligente Automática</label>
                <div className="flex items-center gap-2">
                  <select
                    value={autoPause ? 'sim' : 'nao'}
                    onChange={(e) => setAutoPause(e.target.value === 'sim')}
                    className="bg-slate-50 dark:bg-slate-850 p-2.5 border border-slate-200 dark:border-slate-705 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="sim">Sim, pausar envios</option>
                    <option value="nao">Não, envio contínuo</option>
                  </select>
                  {autoPause && (
                    <input
                      type="number"
                      value={autoPauseAfter}
                      onChange={(e) => setAutoPauseAfter(Number(e.target.value))}
                      className="w-20 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-705 p-2.5 rounded-xl text-xs font-mono text-center focus:outline-none"
                    />
                  )}
                  <span className="text-[10px] text-slate-400 font-mono">ciclos</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-500">Intervalo Mínimo Seguro:</span>
                  <span className="font-bold text-emerald-500">{intervalMin} s</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="15"
                  value={intervalMin}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setIntervalMin(val);
                    if (val > intervalMax) setIntervalMax(val);
                  }}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-500">Intervalo Máximo Seguro:</span>
                  <span className="font-bold text-emerald-500">{intervalMax} s</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="35"
                  value={intervalMax}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setIntervalMax(val);
                    if (val < intervalMin) setIntervalMin(val);
                  }}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Side Column: Devices Session, clearing cached values, triggers */}
        <div className="space-y-6">
          {/* Device Active Session config */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Sessão WhatsApp</h3>
            
            <div className="space-y-3.5">
              <div className="p-3 bg-emerald-500/10 border border-emerald-355 border-emerald-500/30 rounded-xl flex items-center justify-between">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Status Celular:</span>
                <span className="font-mono font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[9px]">CONECTADO</span>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">Status da Conexão</label>
                <select
                  value={sessionStatus}
                  onChange={(e) => setSessionStatus(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                >
                  <option value="connected">Conectado</option>
                  <option value="disconnected">Desconectado</option>
                  <option value="connecting">Tentando Reestabelecer Sinal</option>
                </select>
              </div>
            </div>
          </div>

          {/* Hard Factory Resets cache */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
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
          </div>

          {/* Final apply submission buttons */}
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
