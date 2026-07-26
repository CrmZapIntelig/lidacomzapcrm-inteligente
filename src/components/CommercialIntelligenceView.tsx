/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
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
  CampaignResult,
  CampaignSchedule,
  CampaignTemplate,
  CommercialSegment,
  CustomerCommercialClassification,
  CustomerCommercialProfile,
} from '../types';
import { CommercialRulesConfig } from '../utils/commercialSegmentation';

type TabId = 'dashboard' | 'smartCustomers' | 'segments' | 'campaigns' | 'templates' | 'schedules' | 'results' | 'settings';
type ModalId = 'segment' | 'template' | 'campaign' | 'schedule' | null;

interface CommercialIntelligenceViewProps {
  commercialSegments: CommercialSegment[];
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

  const executedCampaigns = campaignResults.length;
  const reachedCustomers = campaignResults.reduce((sum, result) => sum + result.reachedCustomers, 0);
  const conversions = campaignResults.reduce((sum, result) => sum + result.conversions, 0);
  const revenue = campaignResults.reduce((sum, result) => sum + result.revenue, 0);

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
          columns={['Nome', 'Descrição', 'Status', 'Ações']}
          emptyText="Nenhuma segmentação cadastrada."
        >
          {commercialSegments.map((segment) => (
            <tr key={segment.id}>
              <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{segment.name}</td>
              <td className="py-3.5 px-4 text-slate-600 dark:text-slate-350">{segment.description}</td>
              <td className="py-3.5 px-4"><StatusBadge active={segment.active} /></td>
              <td className="py-3.5 px-4"><DeleteButton onClick={() => onDeleteSegment(segment.id)} /></td>
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
              <td className="py-3.5 px-4">{findName(commercialSegments, campaign.segmentId)}</td>
              <td className="py-3.5 px-4">{findName(campaignTemplates, campaign.templateId)}</td>
              <td className="py-3.5 px-4"><CampaignStatusBadge status={campaign.status} /></td>
              <td className="py-3.5 px-4"><DeleteButton onClick={() => onDeleteCampaign(campaign.id)} /></td>
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
          segments={commercialSegments}
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

function CampaignModal({
  segments,
  templates,
  onClose,
  onSave,
}: {
  segments: CommercialSegment[];
  templates: CampaignTemplate[];
  onClose: () => void;
  onSave: (campaign: Campaign) => void;
}) {
  const [name, setName] = useState('');
  const [segmentId, setSegmentId] = useState(segments[0]?.id || '');
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
        <SelectInput label="Segmentação" value={segmentId} onChange={setSegmentId} options={segments.map((item) => ({ value: item.id, label: item.name }))} />
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

function BaseModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
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
