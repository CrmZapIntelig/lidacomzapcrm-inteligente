import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bot,
  CalendarClock,
  ChevronRight,
  Settings2,
  Sparkles,
  Users,
  Wand2,
} from 'lucide-react';
import {
  AutomationRule,
  Campaign,
  CampaignResult,
  CampaignSchedule,
  CampaignTemplate,
  CommercialSegment,
  CustomerCommercialProfile,
} from '../types';

interface CommercialIntelligenceViewProps {
  commercialSegments: CommercialSegment[];
  campaignTemplates: CampaignTemplate[];
  campaigns: Campaign[];
  campaignSchedules: CampaignSchedule[];
  campaignResults: CampaignResult[];
  customerCommercialProfiles: CustomerCommercialProfile[];
  rules?: AutomationRule[];
  onSaveRules?: React.Dispatch<React.SetStateAction<AutomationRule[]>>;
  onSaveSegment?: (segment: CommercialSegment) => void | Promise<void>;
  onDeleteSegment?: (segmentId: string) => void | Promise<void>;
  onSaveTemplate?: (template: CampaignTemplate) => void | Promise<void>;
  onDeleteTemplate?: (templateId: string) => void | Promise<void>;
  onSaveCampaign?: (campaign: Campaign) => void | Promise<void>;
  onDeleteCampaign?: (campaignId: string) => void | Promise<void>;
  onSaveSchedule?: (schedule: CampaignSchedule) => void | Promise<void>;
  onDeleteSchedule?: (scheduleId: string) => void | Promise<void>;
}

type CommercialTab =
  | 'segmentos'
  | 'templates'
  | 'campanhas'
  | 'agendamentos'
  | 'resultados'
  | 'configuracoes';

export default function CommercialIntelligenceView({
  commercialSegments,
  campaignTemplates,
  campaigns,
  campaignSchedules,
  campaignResults,
  customerCommercialProfiles,
  rules,
  onSaveRules,
}: CommercialIntelligenceViewProps) {
  const [activeTab, setActiveTab] = useState<CommercialTab>('segmentos');

  const tabs = useMemo(
    () => [
      { id: 'segmentos' as const, label: 'Segmentos' },
      { id: 'templates' as const, label: 'Templates' },
      { id: 'campanhas' as const, label: 'Campanhas' },
      { id: 'agendamentos' as const, label: 'Agendamentos' },
      { id: 'resultados' as const, label: 'Resultados' },
      { id: 'configuracoes' as const, label: 'Configurações' },
    ],
    []
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-amber-500" />
          Inteligência Comercial
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Segmentação, campanhas e configurações de automação do canal comercial.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        {activeTab === 'segmentos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Segmentos comerciais</h3>
                <p className="text-sm text-slate-500">Perfis e grupos de clientes mapeados para campanhas.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {commercialSegments.length > 0 ? (
                commercialSegments.map((segment) => (
                  <div key={segment.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">{segment.name}</h4>
                        <p className="text-sm text-slate-500">{segment.description}</p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {segment.active ? 'Ativo' : 'Pausado'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  Nenhum segmento cadastrado ainda.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Templates de campanha</h3>
                <p className="text-sm text-slate-500">Modelos usados para comunicação automática.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {campaignTemplates.length > 0 ? (
                campaignTemplates.map((template) => (
                  <div key={template.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">{template.name}</h4>
                        <p className="text-sm text-slate-500">{template.category}</p>
                      </div>
                      <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-bold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                        {template.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{template.message}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  Nenhum template disponível.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'campanhas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Campanhas</h3>
                <p className="text-sm text-slate-500">Fluxo e status das campanhas comerciais.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {campaigns.length > 0 ? (
                campaigns.map((campaign) => (
                  <div key={campaign.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">{campaign.name}</h4>
                        <p className="text-sm text-slate-500">{campaign.status}</p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        {campaign.sentCount} enviados
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  Nenhuma campanha cadastrada.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'agendamentos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Agendamentos</h3>
                <p className="text-sm text-slate-500">Programação de envio e execução.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {campaignSchedules.length > 0 ? (
                campaignSchedules.map((schedule) => (
                  <div key={schedule.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">{schedule.campaignId}</h4>
                        <p className="text-sm text-slate-500">{schedule.date} • {schedule.time}</p>
                      </div>
                      <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                        {schedule.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  Nenhum agendamento registrado.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'resultados' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Resultados</h3>
                <p className="text-sm text-slate-500">Indicadores de alcance e conversão.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {campaignResults.length > 0 ? (
                campaignResults.map((result) => (
                  <div key={result.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">{result.campaignId}</h4>
                        <p className="text-sm text-slate-500">{result.executedAt}</p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        R$ {result.revenue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  Nenhum resultado capturado.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'configuracoes' && (
          <SettingsTab rules={rules} onSaveRules={onSaveRules} />
        )}
      </div>
    </div>
  );
}

function SettingsTab({
  rules,
  onSaveRules,
}: {
  rules?: AutomationRule[];
  onSaveRules?: React.Dispatch<React.SetStateAction<AutomationRule[]>>;
}) {
  if (!rules) return <div className="p-6 text-center text-slate-500">Carregando configurações...</div>;

  const [localRules, setLocalRules] = useState<AutomationRule[]>(rules);

  useEffect(() => {
    setLocalRules(rules);
  }, [rules]);

  const saveRules = () => {
    onSaveRules?.(localRules);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Configurações</h3>
          <p className="text-sm text-slate-500">Regras de automação e comportamento de mensageria comercial.</p>
        </div>
      </div>

      <div className="grid gap-3">
        {localRules.map((rule) => (
          <div key={rule.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">{rule.title}</h4>
                <p className="text-sm text-slate-500">{rule.description}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setLocalRules((current) =>
                    current.map((currentRule) =>
                      currentRule.id === rule.id
                        ? { ...currentRule, active: !currentRule.active }
                        : currentRule
                    )
                  )
                }
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {rule.active ? 'Ativa' : 'Inativa'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={saveRules}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-emerald-600"
      >
        <Settings2 className="w-4 h-4" />
        Salvar regras
      </button>
    </div>
  );
}
