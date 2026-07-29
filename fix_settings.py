from pathlib import Path
p = Path(r'c:\Users\dfant\LidacomZapCRM\src\components\CommercialIntelligenceView.tsx')
text = p.read_text(encoding='utf-8')
start = text.index('function SettingsTab(')
end = text.index('function MetricCard(')
replacement = '''function SettingsTab({ rules, onSaveRules }: { rules: CommercialRulesConfig; onSaveRules: (r: CommercialRulesConfig) => void }) {
  const [localRules, setLocalRules] = useState(rules);

  useEffect(() => {
    if (rules) {
      setLocalRules(rules);
    }
  }, [rules]);

  const handleSave = () => {
    const normalizedRules: CommercialRulesConfig = {
      daysRisk: Number(localRules.daysRisk) || 0,
      daysInactive: Number(localRules.daysInactive) || 0,
      vipMinSpent: Number(localRules.vipMinSpent) || 0,
      vipMinOrders: Number(localRules.vipMinOrders) || 0,
    };

    onSaveRules(normalizedRules);
    alert('Configurações enviadas com sucesso! Verifique o Dashboard.');
  };

  if (!rules) return <div className="p-8 text-center text-slate-500">Carregando configurações...</div>;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-lg font-bold">Regras do Motor de Segmentação</h3>
        <button
          type="button"
          onClick={handleSave}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg"
        >
          Salvar configurações do motor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-cyan-600 uppercase flex items-center gap-2">
            <CalendarClock className="w-4 h-4" /> CICLO DE VIDA DO CLIENTE
          </h4>
          <TextInput
            label="Dias para 'Em Risco'"
            value={String(localRules.daysRisk)}
            onChange={(value) => setLocalRules({ ...localRules, daysRisk: Number(value) || 0 })}
          />
          <TextInput
            label="Dias para 'Inativo'"
            value={String(localRules.daysInactive)}
            onChange={(value) => setLocalRules({ ...localRules, daysInactive: Number(value) || 0 })}
          />
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-bold text-amber-500 uppercase flex items-center gap-2">
            <Target className="w-4 h-4" /> CRITÉRIOS PARA STATUS VIP
          </h4>
          <TextInput
            label="Faturamento Mínimo (R$)"
            value={String(localRules.vipMinSpent)}
            onChange={(value) => setLocalRules({ ...localRules, vipMinSpent: Number(value) || 0 })}
          />
          <TextInput
            label="Mínimo de Pedidos"
            value={String(localRules.vipMinOrders)}
            onChange={(value) => setLocalRules({ ...localRules, vipMinOrders: Number(value) || 0 })}
          />
        </div>
      </div>
    </div>
  );
}

'''
p.write_text(text[:start] + replacement + text[end:], encoding='utf-8')
print('updated')
