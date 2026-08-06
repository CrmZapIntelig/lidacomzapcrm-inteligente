/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarClock,
  FileText,
  LineChart,
  Megaphone,
  Plus,
  Settings,
  Target,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import {
  Campaign,
  CampaignAudiencePreview,
  CampaignExecutionItemStatus,
  CampaignExecutionPreview,
  CampaignExecutionSession,
  CampaignExecutionStatus,
  Client,
  AppSettings,
  CampaignContactEligibilitySummary,
  CampaignContactEligibilityStatus,
  CampaignResult,
  CampaignDispatchDraft,
  CampaignSchedule,
  CampaignTemplate,
  CommercialAudienceOption,
  CommercialSegment,
  CustomerCommercialClassification,
  CustomerCommercialProfile,
  WhatsAppRecipientReadinessStatus,
  WhatsAppCampaignReadiness,
} from '../types';
import { createCampaignDispatchDraft, getCampaignDispatchDraftWarnings } from '../utils/campaignDispatchContract';
import { prepareCampaignExecutionPreview } from '../utils/campaignPreparation';
import { buildCampaignContactEligibilitySummary } from '../utils/contactEligibility';
import { buildWhatsAppCampaignReadiness } from '../utils/whatsappReadiness';
import {
  cancelExecutionSession,
  createCampaignExecutionSession,
  getCampaignExecutionProgress,
  isCampaignExecutionRunnable,
  pauseExecutionSession,
  processNextExecutionItem,
  resumeExecutionSession,
  startExecutionSession,
} from '../utils/campaignExecution';
import { CommercialRulesConfig, resolveCampaignAudiencePreview } from '../utils/commercialSegmentation';

type TabId = 'dashboard' | 'smartCustomers' | 'segments' | 'campaigns' | 'templates' | 'schedules' | 'results' | 'settings';
type ModalId = 'segment' | 'template' | 'campaign' | 'schedule' | null;

const CAMPAIGN_SIMULATION_INTERVAL_MS = 500;

interface CommercialIntelligenceViewProps {
  commercialSegments: CommercialSegment[];
  availableAudienceOptions: CommercialAudienceOption[];
  clients: Client[];
  settings: AppSettings;
  campaignTemplates: CampaignTemplate[];
  campaigns: Campaign[];
  campaignSchedules: CampaignSchedule[];
  campaignResults: CampaignResult[];
  customerCommercialProfiles: CustomerCommercialProfile[];
  rules: CommercialRulesConfig;
  onSaveRules: (rules: CommercialRulesConfig) => void;
  onSaveSegment: (segment: CommercialSegment) => void;
  onDeleteSegment: (segmentId: string) => void;
  onSaveTemplate: (template: CampaignTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onSaveCampaign: (campaign: Campaign) => void;
  onDeleteCampaign: (campaignId: string) => void;
  onSaveSchedule: (schedule: CampaignSchedule) => void;
  onDeleteSchedule: (scheduleId: string) => void;
}

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'smartCustomers', label: 'Clientes Inteligentes', icon: Users },
  { id: 'segments', label: 'Segmentações', icon: Target },
  { id: 'campaigns', label: 'Campanhas', icon: Megaphone },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'schedules', label: 'Agendamentos', icon: CalendarClock },
  { id: 'results', label: 'Resultados', icon: TrendingUp },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

export default function CommercialIntelligenceView({
  commercialSegments,
  availableAudienceOptions,
  clients,
  settings,
  campaignTemplates,
  campaigns,
  campaignSchedules,
  campaignResults,
  customerCommercialProfiles,
  rules,
  onSaveRules,
  onSaveSegment,
  onDeleteSegment,
  onSaveTemplate,
  onDeleteTemplate,
  onSaveCampaign,
  onDeleteCampaign,
  onSaveSchedule,
  onDeleteSchedule,
}: CommercialIntelligenceViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [activeModal, setActiveModal] = useState<ModalId>(null);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [isPreviewRefreshing, setIsPreviewRefreshing] = useState(false);
  const [previewUpdated, setPreviewUpdated] = useState(false);
  const [preparationCampaign, setPreparationCampaign] = useState<Campaign | null>(null);
  const [preparationRefreshKey, setPreparationRefreshKey] = useState(0);
  const [isPreparationRefreshing, setIsPreparationRefreshing] = useState(false);
  const [preparationUpdated, setPreparationUpdated] = useState(false);
  const [executionSession, setExecutionSession] = useState<CampaignExecutionSession | null>(null);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);

  const executedCampaigns = campaignResults.length;
  const reachedCustomers = campaignResults.reduce((sum, result) => sum + result.reachedCustomers, 0);
  const conversions = campaignResults.reduce((sum, result) => sum + result.conversions, 0);
  const revenue = campaignResults.reduce((sum, result) => sum + result.revenue, 0);
  const preview = useMemo(
    () => previewCampaign
      ? resolveCampaignAudiencePreview(previewCampaign, availableAudienceOptions, customerCommercialProfiles, clients)
      : null,
    [previewCampaign, availableAudienceOptions, customerCommercialProfiles, clients, previewRefreshKey]
  );
  const preparation = useMemo(
    () => preparationCampaign
      ? prepareCampaignExecutionPreview(
        preparationCampaign,
        campaignTemplates,
        availableAudienceOptions,
        customerCommercialProfiles,
        clients,
        settings
      )
      : null,
    [preparationCampaign, campaignTemplates, availableAudienceOptions, customerCommercialProfiles, clients, settings, preparationRefreshKey]
  );

  const whatsappReadiness = useMemo(
    () => preparation ? buildWhatsAppCampaignReadiness(preparation.preparedMessages, clients, undefined, true) : null,
    [preparation, clients]
  );
  const contactEligibility = useMemo(
    () => preparation ? buildCampaignContactEligibilitySummary(preparation.preparedMessages, clients, preparation.generatedAt) : null,
    [preparation, clients]
  );
  const handleOpenPreview = (campaign: Campaign) => {
    setPreviewUpdated(false);
    setPreviewCampaign(campaign);
  };
  const handleOpenPreparation = (campaign: Campaign) => {
    setPreparationUpdated(false);
    setPreparationCampaign(campaign);
  };
  const handleRefreshPreview = () => {
    setPreviewUpdated(false);
    setIsPreviewRefreshing(true);
    setPreviewRefreshKey((current) => current + 1);
    window.setTimeout(() => {
      setIsPreviewRefreshing(false);
      setPreviewUpdated(true);
    }, 200);
  };
  const handleClosePreview = () => {
    setPreviewCampaign(null);
    setPreviewUpdated(false);
    setIsPreviewRefreshing(false);
  };
  const handleRefreshPreparation = () => {
    setPreparationUpdated(false);
    setIsPreparationRefreshing(true);
    setPreparationRefreshKey((current) => current + 1);
    window.setTimeout(() => {
      setIsPreparationRefreshing(false);
      setPreparationUpdated(true);
    }, 200);
  };
  const handleClosePreparation = () => {
    setPreparationCampaign(null);
    setPreparationUpdated(false);
    setIsPreparationRefreshing(false);
  };
  const handleExecuteSimulation = (executionPreview: CampaignExecutionPreview) => {
    if (!isCampaignExecutionRunnable(executionPreview)) return;

    const createdAt = new Date().toISOString();
    const sessionId = `campaign-simulation:${executionPreview.campaign.id}:${Date.now()}`;
    const session = createCampaignExecutionSession(executionPreview, sessionId, createdAt);

    setExecutionSession(session);
    handleClosePreparation();
    setIsExecutionModalOpen(true);
  };
  const handleStartExecution = () => {
    const startedAt = new Date().toISOString();
    setExecutionSession((current) => current ? startExecutionSession(current, startedAt) : current);
  };
  const handlePauseExecution = () => {
    const pausedAt = new Date().toISOString();
    setExecutionSession((current) => current ? pauseExecutionSession(current, pausedAt) : current);
  };
  const handleResumeExecution = () => {
    setExecutionSession((current) => current ? resumeExecutionSession(current) : current);
  };
  const handleCancelExecution = () => {
    const cancelledAt = new Date().toISOString();
    setExecutionSession((current) => current ? cancelExecutionSession(current, cancelledAt) : current);
  };
  const handleCloseExecution = () => {
    if (executionSession?.status === 'running' || executionSession?.status === 'paused') return;

    setIsExecutionModalOpen(false);
    setExecutionSession(null);
  };

  useEffect(() => {
    if (!isExecutionModalOpen || executionSession?.status !== 'running') return;

    const timeoutId = window.setTimeout(() => {
      const processedAt = new Date().toISOString();
      setExecutionSession((current) => {
        if (!current || current.status !== 'running') return current;
        return processNextExecutionItem(current, processedAt);
      });
    }, CAMPAIGN_SIMULATION_INTERVAL_MS);

    return () => window.clearTimeout(timeoutId);
  }, [executionSession, isExecutionModalOpen]);

  // Dispatch contract draft state and memoized draft
  const [isDispatchContractModalOpen, setIsDispatchContractModalOpen] = useState(false);
  const dispatchDraft = useMemo(() => {
    if (!preparation || !whatsappReadiness || !contactEligibility) return null;
    if (!preparation.campaign) return null;
    const draftId = `draft:${preparation.campaign.id}:${preparation.generatedAt}`;
    const createdAt = preparation.generatedAt;
    return createCampaignDispatchDraft(preparation.campaign, preparation, whatsappReadiness, contactEligibility, draftId, createdAt);
  }, [preparation, whatsappReadiness, contactEligibility]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <LineChart className="w-6 h-6 text-cyan-500" />
            Inteligência Comercial
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Estrutura base para segmentações, campanhas, templates, agendamentos e resultados comerciais.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-max min-w-full sm:min-w-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <DashboardTab
          segmentsCount={commercialSegments.length}
          campaignsCount={campaigns.length}
          templatesCount={campaignTemplates.length}
          schedulesCount={campaignSchedules.length}
          resultsCount={campaignResults.length}
          profiles={customerCommercialProfiles}
        />
      )}

      {activeTab === 'smartCustomers' && (
        <SmartCustomersTab profiles={customerCommercialProfiles} />
      )}

      {activeTab === 'segments' && (
        <TableSection
          title="Segmentações"
          actionLabel="Nova Segmentação"
          onAction={() => setActiveModal('segment')}
          columns={['Nome', 'Descrição', 'Origem', 'Clientes', 'Status', 'Ações']}
          emptyText="Nenhuma segmentação cadastrada."
        >
          {availableAudienceOptions.map((audience) => (
            <tr key={audience.id}>
              <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{audience.name}</td>
              <td className="py-3.5 px-4 text-slate-600 dark:text-slate-350">{audience.description}</td>
              <td className="py-3.5 px-4"><AudienceSourceBadge source={audience.source} /></td>
              <td className="py-3.5 px-4 font-mono">{audience.customerCount}</td>
              <td className="py-3.5 px-4"><StatusBadge active={audience.active} /></td>
              <td className="py-3.5 px-4">
                {audience.source === 'manual' ? (
                  <DeleteButton onClick={() => onDeleteSegment(audience.id)} />
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </td>
            </tr>
          ))}
        </TableSection>
      )}

      {activeTab === 'campaigns' && (
        <TableSection
          title="Campanhas"
          actionLabel="Nova Campanha"
          onAction={() => setActiveModal('campaign')}
          columns={['Nome', 'Segmentação', 'Template', 'Status', 'Ações']}
          emptyText="Nenhuma campanha cadastrada."
        >
          {campaigns.map((campaign) => (
            <tr key={campaign.id}>
              <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{campaign.name}</td>
              <td className="py-3.5 px-4">{findName(availableAudienceOptions, campaign.segmentId)}</td>
              <td className="py-3.5 px-4">{findName(campaignTemplates, campaign.templateId)}</td>
              <td className="py-3.5 px-4"><CampaignStatusBadge status={campaign.status} /></td>
              <td className="py-3.5 px-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenPreview(campaign)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-300 dark:hover:bg-cyan-950/50 transition-colors"
                  >
                    Ver Público
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenPreparation(campaign)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50 transition-colors"
                  >
                    Preparar
                  </button>
                  <DeleteButton onClick={() => onDeleteCampaign(campaign.id)} />
                </div>
              </td>
            </tr>
          ))}
        </TableSection>
      )}

      {activeTab === 'templates' && (
        <TableSection
          title="Templates"
          actionLabel="Novo Template"
          onAction={() => setActiveModal('template')}
          columns={['Nome', 'Categoria', 'Mensagem', 'Ações']}
          emptyText="Nenhum template cadastrado."
        >
          {campaignTemplates.map((template) => (
            <tr key={template.id}>
              <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{template.name}</td>
              <td className="py-3.5 px-4">{template.category}</td>
              <td className="py-3.5 px-4 max-w-[360px] truncate">{template.message}</td>
              <td className="py-3.5 px-4"><DeleteButton onClick={() => onDeleteTemplate(template.id)} /></td>
            </tr>
          ))}
        </TableSection>
      )}

      {activeTab === 'schedules' && (
        <TableSection
          title="Agendamentos"
          actionLabel="Novo Agendamento"
          onAction={() => setActiveModal('schedule')}
          columns={['Campanha', 'Data', 'Hora', 'Status', 'Ações']}
          emptyText="Nenhum agendamento cadastrado."
        >
          {campaignSchedules.map((schedule) => (
            <tr key={schedule.id}>
              <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{findName(campaigns, schedule.campaignId)}</td>
              <td className="py-3.5 px-4 font-mono">{schedule.date}</td>
              <td className="py-3.5 px-4 font-mono">{schedule.time}</td>
              <td className="py-3.5 px-4"><CampaignStatusBadge status={schedule.status} /></td>
              <td className="py-3.5 px-4"><DeleteButton onClick={() => onDeleteSchedule(schedule.id)} /></td>
            </tr>
          ))}
        </TableSection>
      )}

      {activeTab === 'results' && (
        <ResultsTab
          executedCampaigns={executedCampaigns}
          reachedCustomers={reachedCustomers}
          conversions={conversions}
          revenue={revenue}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsTab rules={rules} onSaveRules={onSaveRules} />
      )}

      {activeModal === 'segment' && (
        <SegmentModal onClose={() => setActiveModal(null)} onSave={onSaveSegment} />
      )}
      {activeModal === 'template' && (
        <TemplateModal onClose={() => setActiveModal(null)} onSave={onSaveTemplate} />
      )}
      {activeModal === 'campaign' && (
        <CampaignModal
          audiences={availableAudienceOptions}
          templates={campaignTemplates}
          onClose={() => setActiveModal(null)}
          onSave={onSaveCampaign}
        />
      )}
      {activeModal === 'schedule' && (
        <ScheduleModal
          campaigns={campaigns}
          onClose={() => setActiveModal(null)}
          onSave={onSaveSchedule}
        />
      )}
      {previewCampaign && preview && (
        <CampaignAudiencePreviewModal
          campaign={previewCampaign}
          preview={preview}
          isRefreshing={isPreviewRefreshing}
          updated={previewUpdated}
          onRefresh={handleRefreshPreview}
          onClose={handleClosePreview}
        />
      )}
      {preparationCampaign && preparation && whatsappReadiness && contactEligibility && (
        <CampaignPreparationModal
          preparation={preparation}
          whatsappReadiness={whatsappReadiness}
          contactEligibility={contactEligibility}
          isRefreshing={isPreparationRefreshing}
          updated={preparationUpdated}
          canReviewDispatchContract={Boolean(dispatchDraft)}
          onReviewDispatchContract={() => {
            if (!dispatchDraft) return;
            setIsDispatchContractModalOpen(true);
          }}
          onRefresh={handleRefreshPreparation}
          onExecuteSimulation={handleExecuteSimulation}
          onClose={handleClosePreparation}
        />
      )}
      {isDispatchContractModalOpen && dispatchDraft && (
        <CampaignDispatchContractModal draft={dispatchDraft} onClose={() => setIsDispatchContractModalOpen(false)} />
      )}
      {isExecutionModalOpen && executionSession && (
        <CampaignExecutionSimulationModal
          session={executionSession}
          onStart={handleStartExecution}
          onPause={handlePauseExecution}
          onResume={handleResumeExecution}
          onCancel={handleCancelExecution}
          onClose={handleCloseExecution}
        />
      )}
    </div>
  );
}

function DashboardTab({
  segmentsCount,
  campaignsCount,
  templatesCount,
  schedulesCount,
  resultsCount,
  profiles,
}: {
  segmentsCount: number;
  campaignsCount: number;
  templatesCount: number;
  schedulesCount: number;
  resultsCount: number;
  profiles: CustomerCommercialProfile[];
}) {
  const cards = [
    { label: 'Segmentações', value: segmentsCount, icon: Target, color: 'text-cyan-500' },
    { label: 'Campanhas', value: campaignsCount, icon: Megaphone, color: 'text-indigo-500' },
    { label: 'Templates', value: templatesCount, icon: FileText, color: 'text-emerald-500' },
    { label: 'Agendamentos', value: schedulesCount, icon: CalendarClock, color: 'text-amber-500' },
    { label: 'Resultados', value: resultsCount, icon: TrendingUp, color: 'text-rose-500' },
  ];
  const classificationCards = [
    { label: 'VIP', value: countClassification(profiles, 'VIP'), icon: TrendingUp, color: 'text-amber-500' },
    { label: 'Recorrentes', value: countClassification(profiles, 'RECORRENTE'), icon: Users, color: 'text-emerald-500' },
    { label: 'Em risco', value: countClassification(profiles, 'EM RISCO'), icon: Target, color: 'text-orange-500' },
    { label: 'Inativos', value: countClassification(profiles, 'INATIVO'), icon: CalendarClock, color: 'text-slate-500' },
    { label: 'Perdidos', value: countClassification(profiles, 'PERDIDO'), icon: X, color: 'text-rose-500' },
    { label: 'Total Classificados', value: profiles.length, icon: BarChart3, color: 'text-cyan-500' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {cards.map((card) => (
          <MetricCard key={card.label} label={card.label} value={card.value.toString()} icon={card.icon} color={card.color} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
        {classificationCards.map((card) => (
          <MetricCard key={card.label} label={card.label} value={card.value.toString()} icon={card.icon} color={card.color} />
        ))}
      </div>
    </div>
  );
}

function SmartCustomersTab({ profiles }: { profiles: CustomerCommercialProfile[] }) {
  return (
    <TableSection
      title="Clientes Inteligentes"
      actionLabel=""
      onAction={() => undefined}
      columns={['Cliente', 'Score', 'Classificação', 'Pedidos', 'Total Gasto', 'Ticket Médio', 'Última Compra', 'Dias sem Comprar', 'Segmentos']}
      emptyText="Nenhum cliente classificado."
      hideAction
    >
      {profiles.map((profile) => (
        <tr key={profile.customerId}>
          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{profile.customerName}</td>
          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">{profile.score}</td>
          <td className="py-3.5 px-4"><ClassificationBadge classification={profile.classification} /></td>
          <td className="py-3.5 px-4 font-mono">{profile.totalOrders}</td>
          <td className="py-3.5 px-4 font-mono font-bold text-emerald-500">{formatCurrency(profile.totalSpent)}</td>
          <td className="py-3.5 px-4 font-mono">{formatCurrency(profile.averageTicket)}</td>
          <td className="py-3.5 px-4 font-mono">{formatDate(profile.lastPurchase)}</td>
          <td className="py-3.5 px-4 font-mono">{profile.daysWithoutPurchase ?? '-'}</td>
          <td className="py-3.5 px-4">
            <div className="flex flex-wrap gap-1.5 min-w-[220px]">
              {profile.segments.length ? profile.segments.map((segment) => (
                <span key={segment} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300">
                  {segment}
                </span>
              )) : (
                <span className="text-slate-400">-</span>
              )}
            </div>
          </td>
        </tr>
      ))}
    </TableSection>
  );
}

function ResultsTab({
  executedCampaigns,
  reachedCustomers,
  conversions,
  revenue,
}: {
  executedCampaigns: number;
  reachedCustomers: number;
  conversions: number;
  revenue: number;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <MetricCard label="Campanhas Executadas" value={executedCampaigns.toString()} icon={Megaphone} color="text-indigo-500" />
      <MetricCard label="Clientes Alcançados" value={reachedCustomers.toString()} icon={Users} color="text-cyan-500" />
      <MetricCard label="Conversões" value={conversions.toString()} icon={Target} color="text-emerald-500" />
      <MetricCard label="Receita" value={revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={TrendingUp} color="text-amber-500" />
    </div>
  );
}

function SettingsTab({
  rules,
  onSaveRules,
}: {
  rules: CommercialRulesConfig;
  onSaveRules: (rules: CommercialRulesConfig) => void;
}) {
  const [daysRisk, setDaysRisk] = useState(String(rules.daysRisk));
  const [daysInactive, setDaysInactive] = useState(String(rules.daysInactive));
  const [vipMinSpent, setVipMinSpent] = useState(String(rules.vipMinSpent));
  const [vipMinOrders, setVipMinOrders] = useState(String(rules.vipMinOrders));

  useEffect(() => {
    setDaysRisk(String(rules.daysRisk));
    setDaysInactive(String(rules.daysInactive));
    setVipMinSpent(String(rules.vipMinSpent));
    setVipMinOrders(String(rules.vipMinOrders));
  }, [rules]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRules({
      daysRisk: Number(daysRisk),
      daysInactive: Number(daysInactive),
      vipMinSpent: Number(vipMinSpent),
      vipMinOrders: Number(vipMinOrders),
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs animate-in fade-in duration-200">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Regras do Motor de Segmentação</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Ajuste os parâmetros automáticos que classificam a base de clientes do Prato Mineiro.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/20 space-y-4">
            <h4 className="text-xs font-bold text-cyan-500 uppercase tracking-wider flex items-center gap-2">
              <CalendarClock className="w-4 h-4" /> Ciclo de Vida do Cliente
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-slate-400 font-medium mb-1 text-[10px] uppercase">Dias para &quot;Em Risco&quot;</span>
                <input
                  type="number"
                  value={daysRisk}
                  onChange={(e) => setDaysRisk(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="block text-slate-400 font-medium mb-1 text-[10px] uppercase">Dias para &quot;Inativo&quot;</span>
                <input
                  type="number"
                  value={daysInactive}
                  onChange={(e) => setDaysInactive(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </label>
            </div>
          </div>

          <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/20 space-y-4">
            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
              <Target className="w-4 h-4" /> Critérios para Status VIP
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-slate-400 font-medium mb-1 text-[10px] uppercase">Faturamento Mínimo (R$)</span>
                <input
                  type="number"
                  value={vipMinSpent}
                  onChange={(e) => setVipMinSpent(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="block text-slate-400 font-medium mb-1 text-[10px] uppercase">Mínimo de Pedidos</span>
                <input
                  type="number"
                  value={vipMinOrders}
                  onChange={(e) => setVipMinOrders(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl transition text-xs font-bold shadow-xs"
          >
            Salvar Configurações do Motor
          </button>
        </div>
      </form>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</p>
          <p className="text-2xl font-mono font-bold text-slate-950 dark:text-white mt-2">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  );
}

function TableSection({
  title,
  actionLabel,
  onAction,
  columns,
  emptyText,
  children,
  hideAction = false,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
  columns: string[];
  emptyText: string;
  children: React.ReactNode;
  hideAction?: boolean;
}) {
  const hasRows = React.Children.count(children) > 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
        {!hideAction && (
          <button
            onClick={onAction}
            className="bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {actionLabel}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-mono text-slate-400 tracking-wider">
              {columns.map((column) => (
                <th key={column} className="py-3 px-4">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {hasRows ? children : (
              <tr>
                <td colSpan={columns.length} className="py-10 px-4 text-center text-slate-400">{emptyText}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SegmentModal({ onClose, onSave }: { onClose: () => void; onSave: (segment: CommercialSegment) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const now = new Date().toISOString();
    onSave({ id: `seg_${Date.now()}`, name, description, active, createdAt: now, updatedAt: now });
    onClose();
  };

  return (
    <BaseModal title="Nova Segmentação" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <TextInput label="Nome" value={name} onChange={setName} required />
        <TextArea label="Descrição" value={description} onChange={setDescription} required rows={3} />
        <CheckboxInput label="Ativa" checked={active} onChange={setActive} />
        <ModalActions onClose={onClose} />
      </form>
    </BaseModal>
  );
}

function TemplateModal({ onClose, onSave }: { onClose: () => void; onSave: (template: CampaignTemplate) => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const now = new Date().toISOString();
    onSave({ id: `tpl_${Date.now()}`, name, category, message, active: true, createdAt: now, updatedAt: now });
    onClose();
  };

  return (
    <BaseModal title="Novo Template" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <TextInput label="Nome" value={name} onChange={setName} required />
        <TextInput label="Categoria" value={category} onChange={setCategory} required />
        <TextArea label="Mensagem" value={message} onChange={setMessage} required rows={5} />
        <ModalActions onClose={onClose} />
      </form>
    </BaseModal>
  );
}

function CampaignAudiencePreviewModal({
  campaign,
  preview,
  isRefreshing,
  updated,
  onRefresh,
  onClose,
}: {
  campaign: Campaign;
  preview: CampaignAudiencePreview;
  isRefreshing: boolean;
  updated: boolean;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const hasCustomers = preview.status === 'ready' && preview.customers.length > 0;

  return (
    <BaseModal title="Prévia do Público" onClose={onClose} size="wide">
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <PreviewInfo label="Campanha" value={campaign.name} />
          <PreviewInfo label="Público" value={preview.audience?.name || '-'} />
          <div>
            <span className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">Origem</span>
            {preview.audience ? <AudienceSourceBadge source={preview.audience.source} /> : <span className="text-slate-400">-</span>}
          </div>
          <PreviewInfo label="Clientes" value={preview.customerCount.toString()} />
          <PreviewInfo label="Consulta" value={formatDateTime(preview.generatedAt)} />
        </div>

        <div className="rounded-xl border border-cyan-100 dark:border-cyan-900/50 bg-cyan-50/60 dark:bg-cyan-950/20 px-3 py-2 text-cyan-800 dark:text-cyan-200">
          Público dinâmico, calculado no momento da consulta.
        </div>

        {preview.status !== 'ready' && (
          <p className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 text-slate-600 dark:text-slate-300">
            {preview.message}
          </p>
        )}

        {preview.status === 'ready' && !hasCustomers && (
          <p className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 text-slate-600 dark:text-slate-300">
            Nenhum cliente pertence a este público no momento.
          </p>
        )}

        {hasCustomers && (
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                  {['Cliente', 'Telefone', 'Classificação', 'Score', 'Última Compra', 'Dias sem Comprar', 'Total Gasto', 'Ticket Médio', 'Segmentos'].map((column) => (
                    <th key={column} className="py-3 px-4 whitespace-nowrap">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {preview.customers.map((customer) => (
                  <tr key={customer.customerId}>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">{customer.name}</td>
                    <td className="py-3.5 px-4 font-mono whitespace-nowrap">{customer.phone || '-'}</td>
                    <td className="py-3.5 px-4"><ClassificationBadge classification={customer.classification} /></td>
                    <td className="py-3.5 px-4 font-mono font-bold">{customer.score}</td>
                    <td className="py-3.5 px-4 font-mono whitespace-nowrap">{customer.lastPurchase ? formatDate(customer.lastPurchase) : 'Nunca'}</td>
                    <td className="py-3.5 px-4 font-mono">{customer.daysWithoutPurchase ?? '-'}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-500 whitespace-nowrap">{formatCurrency(customer.totalSpent)}</td>
                    <td className="py-3.5 px-4 font-mono whitespace-nowrap">{formatCurrency(customer.averageTicket)}</td>
                    <td className="py-3.5 px-4 min-w-[220px]">
                      <div className="flex flex-wrap gap-1.5">
                        {customer.segments.length ? customer.segments.map((segment) => (
                          <span key={segment} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300">
                            {segment}
                          </span>
                        )) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 pt-2">
          {updated && (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              Prévia atualizada
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="bg-cyan-50 text-cyan-700 hover:bg-cyan-100 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-cyan-950/30 dark:text-cyan-300 dark:hover:bg-cyan-950/50 px-4 py-2 rounded-xl text-xs font-bold"
          >
            {isRefreshing ? 'Atualizando...' : 'Atualizar Prévia'}
          </button>
          <button type="button" onClick={onClose} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold">
            Fechar
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

function CampaignPreparationModal({
  preparation,
  whatsappReadiness,
  contactEligibility,
  isRefreshing,
  updated,
  canReviewDispatchContract,
  onReviewDispatchContract,
  onRefresh,
  onExecuteSimulation,
  onClose,
}: {
  preparation: CampaignExecutionPreview;
  whatsappReadiness: WhatsAppCampaignReadiness;
  contactEligibility: CampaignContactEligibilitySummary;
  isRefreshing: boolean;
  updated: boolean;
  canReviewDispatchContract: boolean;
  onReviewDispatchContract: () => void;
  onRefresh: () => void;
  onExecuteSimulation: (preparation: CampaignExecutionPreview) => void;
  onClose: () => void;
}) {
  const canShowMessages = preparation.status === 'ready' || preparation.status === 'ready-with-snapshot';
  const canExecuteSimulation = isCampaignExecutionRunnable(preparation) && !isRefreshing;
  const eligibilityByCustomerId = useMemo(
    () => new Map(contactEligibility.recipients.map((item) => [item.customerId, item])),
    [contactEligibility]
  );

  return (
    <BaseModal title="Preparação da Campanha" onClose={onClose} size="wide">
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <PreviewInfo label="Campanha" value={preparation.campaign.name} />
          <PreviewInfo label="Público" value={preparation.audience?.name || '-'} />
          <div>
            <span className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">Origem</span>
            {preparation.audience ? <AudienceSourceBadge source={preparation.audience.source} /> : <span className="text-slate-400">-</span>}
          </div>
          <PreviewInfo label="Template" value={preparation.template?.name || '-'} />
          <PreviewInfo label="Fonte do Conteúdo" value={preparation.usedSnapshot ? 'Snapshot da campanha' : 'Template ativo'} />
          <PreviewInfo label="Preparação" value={formatDateTime(preparation.generatedAt)} />
          <PreviewInfo label="Destinatários" value={preparation.totalRecipients.toString()} />
          <PreviewInfo label="Válidas" value={preparation.validMessagesCount.toString()} />
          <PreviewInfo label="Inválidas" value={preparation.invalidMessagesCount.toString()} />
        </div>

        <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2 text-emerald-800 dark:text-emerald-200">
          Esta é apenas uma preparação. Nenhuma mensagem foi enviada ou salva.
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">Prontidão para integração WhatsApp</span>
              <span className="block text-slate-900 dark:text-slate-100 font-bold">Não pronta para envio real</span>
            </div>
            <span className="inline-flex rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 px-3 py-1 text-[10px] font-bold uppercase">
              Não pronta para envio real
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-3">
              <div className="font-bold text-slate-900 dark:text-slate-100">Backend seguro</div>
              <div>Não disponível</div>
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-3">
              <div className="font-bold text-slate-900 dark:text-slate-100">Provedor WhatsApp</div>
              <div>Não configurado</div>
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-3">
              <div className="font-bold text-slate-900 dark:text-slate-100">Preferências de contato</div>
              <div>Modelo disponível</div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-100 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-amber-800 dark:text-amber-200 text-sm">
            Esta análise verifica apenas telefone e conteúdo. Ela não autoriza contato e não realiza envio.
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-4 space-y-3">
            <div>
              <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">Elegibilidade para campanha de marketing</span>
              <span className="block text-slate-900 dark:text-slate-100 font-bold">Classificação interna</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-2 text-xs">
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3">
                <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Total avaliados</div>
                <div className="mt-1 text-slate-600 dark:text-slate-300 font-bold">{contactEligibility.totalRecipients}</div>
              </div>
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3">
                <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Elegíveis</div>
                <div className="mt-1 text-slate-600 dark:text-slate-300 font-bold">{contactEligibility.eligibleRecipients}</div>
              </div>
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3">
                <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Sem informação</div>
                <div className="mt-1 text-slate-600 dark:text-slate-300 font-bold">{contactEligibility.unknownRecipients}</div>
              </div>
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3">
                <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Marketing não permitido</div>
                <div className="mt-1 text-slate-600 dark:text-slate-300 font-bold">{contactEligibility.deniedRecipients}</div>
              </div>
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3">
                <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Marketing revogado</div>
                <div className="mt-1 text-slate-600 dark:text-slate-300 font-bold">{contactEligibility.revokedRecipients}</div>
              </div>
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3">
                <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Bloqueados</div>
                <div className="mt-1 text-slate-600 dark:text-slate-300 font-bold">{contactEligibility.blockedRecipients}</div>
              </div>
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3">
                <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Grupos</div>
                <div className="mt-1 text-slate-600 dark:text-slate-300 font-bold">{contactEligibility.groupRecipients}</div>
              </div>
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3">
                <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Canal não preferido</div>
                <div className="mt-1 text-slate-600 dark:text-slate-300 font-bold">{contactEligibility.channelNotPreferredRecipients}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3">
              <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Total analisado</div>
              <div className="mt-1 text-slate-600 dark:text-slate-300 font-bold">{Object.values(whatsappReadiness.counts).reduce((s, v) => s + v, 0)}</div>
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3">
              <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Telefone e conteúdo aptos</div>
              <div className="mt-1 text-slate-600 dark:text-slate-300 font-bold">{whatsappReadiness.counts['phone-ready']}</div>
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3">
              <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Telefone ausente</div>
              <div className="mt-1 text-slate-600 dark:text-slate-300 font-bold">{whatsappReadiness.counts['missing-phone']}</div>
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3">
              <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Telefone inválido</div>
              <div className="mt-1 text-slate-600 dark:text-slate-300 font-bold">{whatsappReadiness.counts['invalid-phone']}</div>
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3">
              <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Contatos bloqueados</div>
              <div className="mt-1 text-slate-600 dark:text-slate-300 font-bold">{whatsappReadiness.counts['blocked-contact']}</div>
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3">
              <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Grupos</div>
              <div className="mt-1 text-slate-600 dark:text-slate-300 font-bold">{whatsappReadiness.counts['group-contact']}</div>
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3">
              <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Mensagens preparadas inválidas</div>
              <div className="mt-1 text-slate-600 dark:text-slate-300 font-bold">{whatsappReadiness.counts['invalid-prepared-message']}</div>
            </div>
          </div>
        </div>

        {preparation.status === 'ready-with-snapshot' && (
          <div className="rounded-xl border border-amber-100 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-amber-800 dark:text-amber-200">
            Conteúdo carregado do snapshot textual da campanha.
          </div>
        )}

        {preparation.unresolvedVariables.length > 0 && (
          <div className="rounded-xl border border-rose-100 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 px-3 py-2 text-rose-800 dark:text-rose-200">
            Variáveis ausentes: {preparation.unresolvedVariables.join(', ')}
          </div>
        )}

        {!canShowMessages && (
          <p className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 text-slate-600 dark:text-slate-300">
            {preparation.message}
          </p>
        )}

        {canShowMessages && (
          <div className="max-h-[55vh] overflow-auto border border-slate-100 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                  {['Cliente', 'Telefone', 'Telefone Normalizado', 'Prontidão', 'Elegibilidade', 'Conteúdo', 'Variáveis Ausentes'].map((column) => (
                    <th key={column} className="py-3 px-4 whitespace-nowrap">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {preparation.preparedMessages.map((message) => {
                  const recipientReadiness = whatsappReadiness.items.find((item) => item.customerId === message.customerId);
                  const eligibility = eligibilityByCustomerId.get(message.customerId);

                  return (
                    <tr key={message.customerId}>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">{message.customerName}</td>
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">{message.phone || '-'}</td>
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">{recipientReadiness?.normalizedPhone || '-'}</td>
                      <td className="py-3.5 px-4"><WhatsAppReadinessBadge status={recipientReadiness?.readiness || 'missing-phone'} /></td>
                      <td className="py-3.5 px-4"><ContactEligibilityBadge status={eligibility?.status || 'unknown'} reason={eligibility?.reason} /></td>
                      <td className="py-3.5 px-4 min-w-[360px] text-slate-600 dark:text-slate-300">{message.content}</td>
                      <td className="py-3.5 px-4 min-w-[180px] text-slate-500 dark:text-slate-400">
                        {message.unresolvedVariables.length ? message.unresolvedVariables.join(', ') : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 pt-2">
          {updated && (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              Preparação atualizada
            </span>
          )}
          <button
            type="button"
            onClick={() => onExecuteSimulation(preparation)}
            disabled={!canExecuteSimulation}
            title={canExecuteSimulation ? 'Criar execução simulada em memória' : 'A simulação exige ao menos uma mensagem válida'}
            className="bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-xl text-xs font-bold transition-colors"
          >
            Executar Simulação
          </button>
          <button
            type="button"
            onClick={onReviewDispatchContract}
            disabled={!canReviewDispatchContract}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold"
          >
            Revisar contrato de lote
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50 px-4 py-2 rounded-xl text-xs font-bold"
          >
            {isRefreshing ? 'Atualizando...' : 'Atualizar Preparação'}
          </button>
          <button type="button" onClick={onClose} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold">
            Fechar
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

function CampaignExecutionSimulationModal({
  session,
  onStart,
  onPause,
  onResume,
  onCancel,
  onClose,
}: {
  session: CampaignExecutionSession;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onClose: () => void;
}) {
  const progress = getCampaignExecutionProgress(session);
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  const roundedProgress = Math.round(normalizedProgress);
  const closeDisabled = session.status === 'running' || session.status === 'paused';
  const canCancel = session.status === 'ready' || session.status === 'running' || session.status === 'paused';

  return (
    <BaseModal
      title="Execução Simulada da Campanha"
      onClose={onClose}
      size="wide"
      closeDisabled={closeDisabled}
    >
      <div className="max-h-[82vh] overflow-y-auto pr-1 space-y-4 text-xs">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 font-bold text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200">
            Execução simulada em memória.
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-bold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            Nenhuma mensagem será enviada.
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
          Esta sessão existe apenas nesta tela e será apagada ao recarregar a página.
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PreviewInfo label="Campanha" value={session.campaignName} />
          <div>
            <span className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">Status da sessão</span>
            <CampaignExecutionStatusBadge status={session.status} />
          </div>
          <PreviewInfo label="Criada em" value={formatDateTime(session.createdAt)} />
          <PreviewInfo label="Iniciada em" value={session.startedAt ? formatDateTime(session.startedAt) : '-'} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <ExecutionMetric label="Total" value={session.totalItems} />
          <ExecutionMetric label="Válidas" value={session.validItems} />
          <ExecutionMetric label="Inválidas" value={session.invalidItems} />
          <ExecutionMetric label="Processadas" value={session.processedItems} />
          <ExecutionMetric label="Sucessos simulados" value={session.successItems} />
          <ExecutionMetric label="Ignoradas" value={session.skippedItems} />
          <ExecutionMetric label="Progresso" value={`${roundedProgress}%`} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between font-bold text-slate-600 dark:text-slate-300">
            <span>Progresso da simulação</span>
            <span>{roundedProgress}%</span>
          </div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            role="progressbar"
            aria-label="Progresso da execução simulada"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={roundedProgress}
          >
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${normalizedProgress}%` }}
            />
          </div>
        </div>

        <div className="max-h-[42vh] overflow-auto rounded-xl border border-slate-100 dark:border-slate-800">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/50">
                {['Cliente', 'Telefone', 'Status', 'Conteúdo', 'Erro/Variáveis'].map((column) => (
                  <th key={column} className="whitespace-nowrap px-4 py-3">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {session.items.map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap px-4 py-3.5 font-bold text-slate-900 dark:text-white">{item.customerName}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono">{item.phone || '-'}</td>
                  <td className="px-4 py-3.5"><CampaignExecutionItemStatusBadge status={item.status} /></td>
                  <td className="min-w-[360px] px-4 py-3.5 text-slate-600 dark:text-slate-300">{item.content || '-'}</td>
                  <td className="min-w-[220px] px-4 py-3.5 text-slate-500 dark:text-slate-400">
                    <div>{item.error || '-'}</div>
                    {item.unresolvedVariables.length > 0 && (
                      <div className="mt-1">Variáveis: {item.unresolvedVariables.join(', ')}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {closeDisabled && (
          <p className="text-right text-[10px] font-bold text-amber-700 dark:text-amber-300">
            Continue ou cancele a simulação antes de fechar.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1 font-bold">
          {session.status === 'ready' && (
            <button type="button" onClick={onStart} className="rounded-xl bg-indigo-500 px-5 py-2 text-white hover:bg-indigo-600">
              Iniciar
            </button>
          )}
          {session.status === 'running' && (
            <button type="button" onClick={onPause} className="rounded-xl bg-amber-500 px-5 py-2 text-white hover:bg-amber-600">
              Pausar
            </button>
          )}
          {session.status === 'paused' && (
            <button type="button" onClick={onResume} className="rounded-xl bg-indigo-500 px-5 py-2 text-white hover:bg-indigo-600">
              Continuar
            </button>
          )}
          {canCancel && (
            <button type="button" onClick={onCancel} className="rounded-xl bg-rose-50 px-4 py-2 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50">
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            className="rounded-xl bg-slate-100 px-4 py-2 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

function CampaignModal({
  audiences,
  templates,
  onClose,
  onSave,
}: {
  audiences: CommercialAudienceOption[];
  templates: CampaignTemplate[];
  onClose: () => void;
  onSave: (campaign: Campaign) => void;
}) {
  const [name, setName] = useState('');
  const [segmentId, setSegmentId] = useState(audiences[0]?.id || '');
  const [templateId, setTemplateId] = useState(templates[0]?.id || '');
  const [status, setStatus] = useState<Campaign['status']>('rascunho');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const template = templates.find((item) => item.id === templateId);
    const now = new Date().toISOString();
    onSave({
      id: `camp_${Date.now()}`,
      name,
      messageTemplate: template?.message || '',
      sentCount: 0,
      responseCount: 0,
      status,
      createdAt: now,
      updatedAt: now,
      segmentId,
      templateId,
    });
    onClose();
  };

  return (
    <BaseModal title="Nova Campanha" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <TextInput label="Nome" value={name} onChange={setName} required />
        <SelectInput label="Segmentação/Público" value={segmentId} onChange={setSegmentId} options={audiences.map((item) => ({ value: item.id, label: `${item.name} — ${item.customerCount} clientes` }))} />
        <SelectInput label="Template" value={templateId} onChange={setTemplateId} options={templates.map((item) => ({ value: item.id, label: item.name }))} />
        <SelectInput
          label="Status"
          value={status}
          onChange={(value) => setStatus(value as Campaign['status'])}
          options={[
            { value: 'rascunho', label: 'Rascunho' },
            { value: 'ativo', label: 'Ativo' },
            { value: 'pausado', label: 'Pausado' },
            { value: 'concluido', label: 'Concluído' },
          ]}
        />
        <ModalActions onClose={onClose} />
      </form>
    </BaseModal>
  );
}

function ScheduleModal({
  campaigns,
  onClose,
  onSave,
}: {
  campaigns: Campaign[];
  onClose: () => void;
  onSave: (schedule: CampaignSchedule) => void;
}) {
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id || '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const now = new Date().toISOString();
    onSave({ id: `sch_${Date.now()}`, campaignId, date, time, status: 'agendado', createdAt: now, updatedAt: now });
    onClose();
  };

  return (
    <BaseModal title="Novo Agendamento" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <SelectInput label="Campanha" value={campaignId} onChange={setCampaignId} options={campaigns.map((item) => ({ value: item.id, label: item.name }))} />
        <TextInput label="Data" type="date" value={date} onChange={setDate} required />
        <TextInput label="Hora" type="time" value={time} onChange={setTime} required />
        <ModalActions onClose={onClose} />
      </form>
    </BaseModal>
  );
}

function BaseModal({
  title,
  onClose,
  children,
  size = 'default',
  closeDisabled = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'default' | 'wide';
  closeDisabled?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full p-6 relative shadow-2xl ${size === 'wide' ? 'max-w-5xl' : 'max-w-md'}`}>
        <button
          type="button"
          onClick={onClose}
          disabled={closeDisabled}
          aria-label="Fechar modal"
          title={closeDisabled ? 'Conclua ou cancele a simulação antes de fechar' : 'Fechar'}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="font-bold text-slate-950 dark:text-white text-sm pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, rows, required = false }: { label: string; value: string; onChange: (value: string) => void; rows: number; required?: boolean }) {
  return (
    <label className="block">
      <span className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">{label}</span>
      <textarea
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
      />
    </label>
  );
}

function SelectInput({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block">
      <span className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
      >
        <option value="">Selecionar</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function CheckboxInput({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="rounded border-slate-300 text-emerald-500" />
      {label}
    </label>
  );
}

function ModalActions({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex justify-end gap-2 text-xs font-bold pt-2">
      <button type="button" onClick={onClose} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2 rounded-xl">
        Voltar
      </button>
      <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl transition font-bold">
        Salvar
      </button>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
      {active ? 'ATIVA' : 'INATIVA'}
    </span>
  );
}

function PreviewInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">{label}</span>
      <span className="block font-bold text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  );
}

function AudienceSourceBadge({ source }: { source: CommercialAudienceOption['source'] }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${source === 'automatic' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
      {source === 'automatic' ? 'Automático' : 'Manual'}
    </span>
  );
}

function MessageValidityBadge({ valid }: { valid: boolean }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${valid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}`}>
      {valid ? 'Válida' : 'Inválida'}
    </span>
  );
}

function ContactEligibilityBadge({ status, reason }: { status: CampaignContactEligibilityStatus; reason?: string }) {
  const config = {
    eligible: { label: 'Elegível', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
    unknown: { label: 'Sem informação', classes: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    blocked: { label: 'Bloqueado', classes: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
    'marketing-denied': { label: 'Marketing não permitido', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
    'marketing-revoked': { label: 'Marketing revogado', classes: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' },
    'group-contact': { label: 'Grupo', classes: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' },
    'channel-not-preferred': { label: 'Canal não preferido', classes: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300' },
  }[status] || { label: 'Sem informação', classes: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };

  return (
    <span
      title={reason}
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${config.classes}`}
    >
      {config.label}
    </span>
  );
}

function CampaignDispatchContractModal({ draft, onClose }: { draft: CampaignDispatchDraft; onClose: () => void }) {
  const warnings = useMemo(() => getCampaignDispatchDraftWarnings(draft), [draft]);

  const statusLabels: Record<string, string> = {
    'candidate': 'Candidato ao backend',
    'blocked-technical': 'Bloqueado tecnicamente',
    'blocked-eligibility': 'Bloqueado por elegibilidade',
    'blocked-content': 'Conteúdo bloqueado',
    'duplicate-recipient': 'Telefone duplicado no lote',
  };

  const reasonLabels: Record<string, string> = {
    'technical-readiness-missing': 'Prontidão técnica não encontrada',
    'phone-not-ready': 'Telefone ou mensagem tecnicamente inapta',
    'contact-eligibility-missing': 'Elegibilidade não encontrada',
    'contact-not-eligible': 'Contato não elegível para marketing',
    'empty-content': 'Conteúdo vazio',
    'duplicate-normalized-phone': 'Telefone normalizado duplicado',
  };

  return (
    <BaseModal title="Contrato de Lote — Rascunho Local" onClose={onClose} size="wide">
      <div className="space-y-4 text-xs">
        <div className="rounded-xl border border-rose-100 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 px-3 py-2 text-rose-800 dark:text-rose-200">
          <div className="font-bold">Avisos</div>
          <ul className="list-disc pl-5 mt-2">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div>
            <div className="font-bold">Campanha</div>
            <div className="mt-1 font-semibold">{draft.campaignName}</div>
          </div>
          <div>
            <div className="font-bold">Status</div>
            <div className="mt-1">Rascunho não enfileirado</div>
          </div>
          <div>
            <div className="font-bold">Criado em</div>
            <div className="mt-1 font-mono">{draft.createdAt}</div>
          </div>
          <div>
            <div className="font-bold">Batch Fingerprint</div>
            <div className="mt-1 font-mono break-words">{draft.batchFingerprint}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
          <div><div className="font-bold">Total</div><div className="mt-1 font-mono">{draft.totalItems}</div></div>
          <div><div className="font-bold">Candidatos</div><div className="mt-1 font-mono">{draft.candidateItems}</div></div>
          <div><div className="font-bold">Bloqueados</div><div className="mt-1 font-mono">{draft.blockedItems}</div></div>
          <div><div className="font-bold">Bloqueados tecnicamente</div><div className="mt-1 font-mono">{draft.technicalBlockedItems}</div></div>
          <div><div className="font-bold">Bloqueados por elegibilidade</div><div className="mt-1 font-mono">{draft.eligibilityBlockedItems}</div></div>
          <div><div className="font-bold">Conteúdo bloqueado</div><div className="mt-1 font-mono">{draft.contentBlockedItems}</div></div>
        </div>

        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-3">
          <div className="font-bold text-[12px]">Infraestrutura</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mt-2">
            <div><div className="font-semibold">Backend seguro</div><div>Não disponível</div></div>
            <div><div className="font-semibold">Provedor WhatsApp</div><div>Não configurado</div></div>
            <div><div className="font-semibold">Fila persistida</div><div>Não</div></div>
            <div><div className="font-semibold">Idempotência autoritativa</div><div>Não</div></div>
          </div>
        </div>

        <div className="max-h-[50vh] overflow-auto border border-slate-100 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                {['Cliente', 'Telefone original', 'Telefone normalizado', 'Prontidão técnica', 'Elegibilidade', 'Status do contrato', 'Motivos', 'Fingerprint'].map((col) => (
                  <th key={col} className="py-3 px-4">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {draft.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">{item.customerName || '-'}</td>
                  <td className="py-3.5 px-4 font-mono whitespace-nowrap">{item.rawPhone || '-'}</td>
                  <td className="py-3.5 px-4 font-mono whitespace-nowrap">{item.normalizedPhone || '-'}</td>
                  <td className="py-3.5 px-4">{item.technicalStatus ? <WhatsAppReadinessBadge status={item.technicalStatus as WhatsAppRecipientReadinessStatus} /> : 'Não encontrada'}</td>
                  <td className="py-3.5 px-4">{item.eligibilityStatus ? <ContactEligibilityBadge status={item.eligibilityStatus as CampaignContactEligibilityStatus} /> : 'Não encontrada'}</td>
                  <td className="py-3.5 px-4">{statusLabels[item.status] || item.status}</td>
                  <td className="py-3.5 px-4">{(item.blockReasons && item.blockReasons.length) ? item.blockReasons.map((r) => reasonLabels[r] || r).join(', ') : '-'}</td>
                  <td className="py-3.5 px-4 font-mono text-[11px] break-words">{item.deduplicationFingerprint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold">Fechar</button>
        </div>
      </div>
    </BaseModal>
  );
}

function WhatsAppReadinessBadge({ status }: { status: WhatsAppRecipientReadinessStatus }) {
  const labels: Record<WhatsAppRecipientReadinessStatus, string> = {
    'phone-ready': 'Telefone apto',
    'missing-phone': 'Telefone ausente',
    'invalid-phone': 'Telefone inválido',
    'blocked-contact': 'Contato bloqueado',
    'group-contact': 'Grupo',
    'invalid-prepared-message': 'Mensagem inválida',
  };

  const colors: Record<WhatsAppRecipientReadinessStatus, string> = {
    'phone-ready': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    'missing-phone': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    'invalid-phone': 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    'blocked-contact': 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    'group-contact': 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    'invalid-prepared-message': 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  };

  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

function formatWhatsAppStatusLabel(status: WhatsAppRecipientReadinessStatus) {
  const labels: Record<WhatsAppRecipientReadinessStatus, string> = {
    'phone-ready': 'Telefone apto',
    'missing-phone': 'Telefone ausente',
    'invalid-phone': 'Telefone inválido',
    'blocked-contact': 'Contato bloqueado',
    'group-contact': 'Grupo',
    'invalid-prepared-message': 'Mensagem inválida',
  };

  return labels[status];
}

function ExecutionMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
      <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="mt-1 block text-sm font-bold text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

function CampaignExecutionStatusBadge({ status }: { status: CampaignExecutionStatus }) {
  const labels: Record<CampaignExecutionStatus, string> = {
    ready: 'Pronta',
    running: 'Simulação em andamento',
    paused: 'Simulação pausada',
    completed: 'Concluída',
    cancelled: 'Cancelada',
  };
  const colors: Record<CampaignExecutionStatus, string> = {
    ready: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
    running: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    paused: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

function CampaignExecutionItemStatusBadge({ status }: { status: CampaignExecutionItemStatus }) {
  const labels: Record<CampaignExecutionItemStatus, string> = {
    pending: 'Aguardando simulação',
    processing: 'Processando simulação',
    'simulated-success': 'Sucesso simulado',
    invalid: 'Inválida',
    skipped: 'Ignorada por cancelamento',
  };
  const colors: Record<CampaignExecutionItemStatus, string> = {
    pending: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    processing: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    'simulated-success': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    invalid: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    skipped: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  };

  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 uppercase">
      {status}
    </span>
  );
}

function ClassificationBadge({ classification }: { classification: CustomerCommercialClassification }) {
  const colorMap: Record<CustomerCommercialClassification, string> = {
    VIP: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    RECORRENTE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    ATIVO: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
    NOVO: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    'EM RISCO': 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
    INATIVO: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    PERDIDO: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  };

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colorMap[classification]}`}>
      {classification}
    </span>
  );
}

function countClassification(
  profiles: CustomerCommercialProfile[],
  classification: CustomerCommercialClassification
) {
  return profiles.filter((profile) => profile.classification === classification).length;
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour12: false })}.${String(date.getMilliseconds()).padStart(3, '0')}`;
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors" aria-label="Excluir">
      <Trash2 className="w-4 h-4" />
    </button>
  );
}

function findName(items: { id: string; name: string }[], id?: string) {
  return items.find((item) => item.id === id)?.name || '-';
}
