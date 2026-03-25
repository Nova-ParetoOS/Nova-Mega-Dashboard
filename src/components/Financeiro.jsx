import React, { useState, useMemo } from 'react';
import { formatCurrency, getMonthName } from '../utils/formatters';
import {
  PieChart, BarChart3, X, TrendingUp, TrendingDown,
  AlertTriangle, DollarSign, Activity, Gauge
} from 'lucide-react';

// ── CSS Animations (injected once) ──────────────────────────
const STYLES = `
@keyframes fin-slide-in {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fin-bar {
  from { width: 0; }
}
.fin-card    { animation: fin-slide-in 0.4s cubic-bezier(0.22,1,0.36,1) both; }
.fin-bar     { animation: fin-bar 0.9s cubic-bezier(0.4,0,0.2,1) 0.3s both; }
.fin-card:nth-child(1) { animation-delay: 0.04s; }
.fin-card:nth-child(2) { animation-delay: 0.10s; }
.fin-card:nth-child(3) { animation-delay: 0.16s; }
.fin-scenario-active   { transition: all 0.2s ease; }
`;

// ── Scenario Config ──────────────────────────────────────────
const PREDICTIVE_SCENARIOS = [
  {
    id: 'base',
    label: '📊 Base',
    sublabel: 'Receita real do período',
    multiplier: 1.00,
    pctLabel: '1×  (0%)',
    activeGradient: 'from-emerald-600 to-emerald-700',
    activeBorder: 'border-emerald-500',
    activeText: 'text-white',
    inactiveText: 'text-emerald-700',
    inactiveBg: 'bg-emerald-50 border-emerald-200',
    indicatorColor: 'bg-emerald-500',
  },
  {
    id: 'otimista',
    label: '🚀 Otimista',
    sublabel: 'Simulando +10% de receita',
    multiplier: 1.10,
    pctLabel: '+10%',
    activeGradient: 'from-blue-600 to-indigo-700',
    activeBorder: 'border-blue-500',
    activeText: 'text-white',
    inactiveText: 'text-blue-700',
    inactiveBg: 'bg-blue-50 border-blue-200',
    indicatorColor: 'bg-blue-500',
  },
  {
    id: 'pessimista',
    label: '⚠️ Pessimista',
    sublabel: 'Simulando −20% de receita',
    multiplier: 0.80,
    pctLabel: '−20%',
    activeGradient: 'from-orange-600 to-orange-700',
    activeBorder: 'border-orange-500',
    activeText: 'text-white',
    inactiveText: 'text-orange-700',
    inactiveBg: 'bg-orange-50 border-orange-200',
    indicatorColor: 'bg-orange-500',
  },
];

// ── DRE Computation ──────────────────────────────────────────
function computeDRE(rawRevenue, multiplier, variableCosts, fixedCosts) {
  const receitaBruta = rawRevenue * multiplier;
  const impostos      = receitaBruta * (variableCosts.imposto    / 100);
  const taxasCartao   = receitaBruta * (variableCosts.taxaCartao / 100);
  const deducoes      = impostos + taxasCartao;
  const receitaLiquida = receitaBruta - deducoes;
  const margemLiquida  = receitaBruta > 0 ? (receitaLiquida / receitaBruta) * 100 : 0;

  const cmv             = receitaBruta * (variableCosts.cmv        / 100);
  const embalagens      = receitaBruta * (variableCosts.embalagem  / 100);
  const obsolescencia   = receitaBruta * (variableCosts.obsoleto   / 100);
  const totalVariavel   = cmv + embalagens + obsolescencia;
  const margemContrib   = receitaLiquida - totalVariavel;
  const percMC          = receitaBruta > 0 ? (margemContrib / receitaBruta) * 100 : 0;

  // Custos fixos são IMUTÁVEIS nos 3 cenários
  const totalFixo       = Object.values(fixedCosts).reduce((a, b) => a + b, 0);
  const resultado       = margemContrib - totalFixo;
  const margemResultado = receitaBruta > 0 ? (resultado / receitaBruta) * 100 : 0;

  return {
    receitaBruta, impostos, taxasCartao, deducoes, receitaLiquida, margemLiquida,
    cmv, embalagens, obsolescencia, totalVariavel,
    margemContrib, percMC,
    totalFixo, resultado, margemResultado,
  };
}

// ── Small helpers ────────────────────────────────────────────
function DeltaBadge({ value }) {
  if (value === 0) return <span className="text-gray-400 text-xs font-bold">—</span>;
  const pos = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full
      ${pos ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
      {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {pos ? '+' : ''}{formatCurrency(value)}
    </span>
  );
}

function MetricRow({ label, value, highlight, children }) {
  return (
    <div className={`flex items-center justify-between py-2.5 px-3 rounded-xl
      ${highlight ? 'bg-gray-50 border border-gray-100' : ''}`}>
      <span className="text-sm text-gray-600 font-medium">{label}</span>
      <div className="flex items-center gap-2">
        {children}
        <span className={`font-bold font-mono text-sm ${highlight ? 'text-gray-900' : 'text-gray-700'}`}>
          {formatCurrency(value)}
        </span>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────
export default function Financeiro({
  // Store/Period selection
  selectedStore,
  setSelectedStore,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  STORE_CONFIGS,
  // Financial data (computed by App.jsx)
  getFinancialData,
  getGoalsData,
  getHistoricalDataForStorePeriod,
  // Saved DRE overrides (kept for read-only display)
  dreValues = {},
  updateDreKey,
  deleteDreKey,
}) {
  // ── Local predictive scenario (independent of saved dreValues) ──
  const [predictiveScenario, setPredictiveScenario] = useState('base');

  const activeScenarioCfg = PREDICTIVE_SCENARIOS.find(s => s.id === predictiveScenario);

  // ── Simulador de Imposto (Local State) ─────────────────────────
  const [impostoInput, setImpostoInput] = useState('');
  const [taxaCartaoInput, setTaxaCartaoInput] = useState('');

  // Sincroniza os inputs sempre que a loja/período mudar (se finData.config estiver lá)
  useEffect(() => {
    if (finData?.config) {
      setImpostoInput(String(finData.config.variableCosts.imposto));
      setTaxaCartaoInput(String(finData.config.variableCosts.taxaCartao));
    }
  }, [selectedStore, selectedMonth, selectedYear, finData]);

  // ── Compute base financials ──────────────────────────────────
  const finData = useMemo(
    () => getFinancialData(selectedStore, selectedMonth, selectedYear),
    [selectedStore, selectedMonth, selectedYear]
  );

  const goalsData = useMemo(
    () => getGoalsData(selectedStore, selectedMonth),
    [selectedStore, selectedMonth]
  );

  const rawRevenue = useMemo(() => {
    const history = getHistoricalDataForStorePeriod(selectedStore, selectedMonth, selectedYear);
    return history.reduce((acc, r) => acc + (r.totalSales || 0), 0);
  }, [selectedStore, selectedMonth, selectedYear]);

  // ── DRE for each scenario ────────────────────────────────────
  const dres = useMemo(() => {
    if (!finData?.config) return null;

    // Use input values Se validos, otherwise fallback to 0 to prevent NaN
    const valImposto = impostoInput === '' ? 0 : parseFloat(impostoInput);
    const activeImposto = isNaN(valImposto) ? 0 : valImposto;
    
    const valTaxaCartao = taxaCartaoInput === '' ? 0 : parseFloat(taxaCartaoInput);
    const activeTaxaCartao = isNaN(valTaxaCartao) ? 0 : valTaxaCartao;

    const customVariableCosts = {
      ...finData.config.variableCosts,
      imposto: activeImposto,
      taxaCartao: activeTaxaCartao,
    };

    return PREDICTIVE_SCENARIOS.reduce((acc, sc) => {
      acc[sc.id] = computeDRE(
        rawRevenue,
        sc.multiplier,
        customVariableCosts,
        finData.config.fixedCosts,
      );
      return acc;
    }, {});
  }, [rawRevenue, finData, impostoInput, taxaCartaoInput]);

  if (!finData?.config || !dres) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <PieChart className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Carregando DRE…</p>
          <p className="text-xs mt-1">Aguardando dados financeiros</p>
        </div>
      </div>
    );
  }

  const active = dres[predictiveScenario];
  const base   = dres['base'];

  const resultPos = active.resultado >= 0;
  const breakEvenDiff = active.receitaBruta - finData.breakEven;

  return (
    <div className="space-y-6">
      <style>{STYLES}</style>

      {/* ── Hero Header ───────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 p-6 md:p-8 rounded-2xl border border-emerald-800/40 shadow-2xl overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl" aria-hidden />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-500/15 rounded-full blur-3xl" aria-hidden />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
                <PieChart className="w-5 h-5 text-emerald-300" strokeWidth={2} />
              </div>
              <span className="text-xs font-bold text-emerald-300/80 uppercase tracking-widest">DRE · Resultado do Exercício</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Viabilidade Financeira
            </h2>
            <p className="text-emerald-200/60 text-sm mt-1 font-medium">
              Cenário preditivo · custos fixos imutáveis · receita projetada
            </p>
          </div>

          {/* Period selectors */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <select
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
              className="bg-white/10 border border-white/20 text-white text-sm font-bold px-3 py-2 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:outline-none backdrop-blur"
            >
              {Object.entries(STORE_CONFIGS).map(([k, v]) => (
                <option key={k} value={k} className="text-gray-900">{v.name}</option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value))}
              className="bg-white/10 border border-white/20 text-white text-sm font-bold px-3 py-2 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:outline-none backdrop-blur"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1} className="text-gray-900">{getMonthName(i + 1)}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="bg-white/10 border border-white/20 text-white text-sm font-bold px-3 py-2 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:outline-none backdrop-blur"
            >
              {Array.from({ length: 5 }, (_, i) => (
                <option key={i} value={2023 + i} className="text-gray-900">{2023 + i}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Predictive Scenario Selector ──────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Gauge className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Cenário Preditivo</span>
          <span className="ml-2 text-xs text-gray-400 font-medium">— Custos fixos imutáveis · apenas receita é simulada</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PREDICTIVE_SCENARIOS.map(sc => {
            const scDre = dres[sc.id];
            const isActive = predictiveScenario === sc.id;
            const diffVsBase = scDre.resultado - base.resultado;
            return (
              <button
                key={sc.id}
                onClick={() => setPredictiveScenario(sc.id)}
                className={`fin-scenario-active text-left p-4 rounded-2xl border-2 flex flex-col gap-2 relative overflow-hidden
                  ${isActive
                    ? `bg-gradient-to-br ${sc.activeGradient} ${sc.activeBorder} shadow-lg scale-[1.015]`
                    : `${sc.inactiveBg} hover:scale-[1.005]`
                  }`}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-white/60" />
                )}
                <div className="flex items-center justify-between">
                  <span className={`font-black text-sm ${isActive ? 'text-white' : sc.inactiveText}`}>
                    {sc.label}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                    ${isActive ? 'bg-white/20 text-white' : 'bg-white/80 text-gray-600'}`}>
                    {sc.pctLabel}
                  </span>
                </div>
                <span className={`text-xs font-medium ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                  {sc.sublabel}
                </span>
                <div className={`text-lg font-black font-mono ${isActive ? 'text-white' : sc.inactiveText}`}>
                  {formatCurrency(scDre.resultado)}
                </div>
                {sc.id !== 'base' && (
                  <span className={`text-xs font-bold ${isActive ? 'text-white/80' : ''}`}>
                    {diffVsBase >= 0 ? '+' : ''}{formatCurrency(diffVsBase)} vs base
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Revenue simulation callout */}
        {predictiveScenario !== 'base' && (
          <div className={`mt-4 p-4 rounded-xl border flex items-center justify-between flex-wrap gap-3
            ${predictiveScenario === 'otimista' ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
            <div>
              <div className={`font-bold text-sm ${predictiveScenario === 'otimista' ? 'text-blue-900' : 'text-orange-900'}`}>
                Receita Base Real: {formatCurrency(rawRevenue)}
              </div>
              <div className={`text-xs mt-0.5 ${predictiveScenario === 'otimista' ? 'text-blue-600' : 'text-orange-600'}`}>
                Receita Simulada ({activeScenarioCfg.pctLabel}): {formatCurrency(active.receitaBruta)}
              </div>
            </div>
            <div className={`text-2xl font-black font-mono ${predictiveScenario === 'otimista' ? 'text-blue-700' : 'text-orange-700'}`}>
              {formatCurrency(active.receitaBruta - rawRevenue > 0 ? active.receitaBruta - rawRevenue : rawRevenue - active.receitaBruta)}
              <span className="text-sm ml-1">{active.receitaBruta >= rawRevenue ? 'a mais' : 'a menos'}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 3 KPI Hero Cards ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Resultado Operacional */}
        <div className={`fin-card rounded-2xl p-6 text-white shadow-xl
          ${resultPos
            ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700'
            : 'bg-gradient-to-br from-red-500 via-red-600 to-red-800'}`}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm opacity-90 font-medium">
              {resultPos ? '✅ Lucro Líquido' : '❌ Prejuízo Líquido'}
            </h3>
            <Activity className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-4xl font-black mt-1 tracking-tight">
            {formatCurrency(Math.abs(active.resultado))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/30 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="opacity-90">Margem:</span>
              <span className="font-bold">{active.margemResultado.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-xs opacity-75">
              <span>Receita Simulada:</span>
              <span className="font-mono">{formatCurrency(active.receitaBruta)}</span>
            </div>
          </div>
        </div>

        {/* Break Even */}
        <div className="fin-card bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm opacity-90 font-medium">Ponto de Equilíbrio</h3>
            <Gauge className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-3xl font-black mt-1">{formatCurrency(finData.breakEven)}</div>
          <div className="mt-4 pt-4 border-t border-white/30 text-xs space-y-1">
            <div className="flex justify-between">
              <span>Resultado vs BE:</span>
              <span className={`font-bold ${breakEvenDiff >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {breakEvenDiff >= 0 ? '+' : ''}{formatCurrency(breakEvenDiff)}
              </span>
            </div>
            <div className="flex justify-between opacity-75">
              <span>Variação:</span>
              <span>{finData.breakEven > 0 ? ((breakEvenDiff / finData.breakEven) * 100).toFixed(1) : '—'}%</span>
            </div>
          </div>
        </div>

        {/* Meta Ouro */}
        <div className="fin-card bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm opacity-90 font-medium">🥇 Meta Ouro (Loja)</h3>
            <DollarSign className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-3xl font-black mt-1">{formatCurrency(goalsData.metaConservadora)}</div>
          <div className="mt-4 pt-4 border-t border-white/30 text-xs space-y-1">
            <div className="flex justify-between">
              <span>Resultado vs Meta:</span>
              <span className={`font-bold ${active.receitaBruta - goalsData.metaConservadora >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {active.receitaBruta - goalsData.metaConservadora >= 0 ? '+' : ''}
                {formatCurrency(active.receitaBruta - goalsData.metaConservadora)}
              </span>
            </div>
            <div className="flex justify-between opacity-75">
              <span>Variação:</span>
              <span>
                {goalsData.metaConservadora > 0
                  ? (((active.receitaBruta - goalsData.metaConservadora) / goalsData.metaConservadora) * 100).toFixed(1)
                  : '—'}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── DRE Waterfall ─────────────────────────────────── */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-800 text-lg mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-600" />
          Demonstração do Resultado — {activeScenarioCfg.label}
        </h3>

        <div className="space-y-3">
          {/* 1. Receita Bruta */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-xl shadow-sm">
            <div className="flex justify-between items-center">
              <span className="font-bold text-base">1. Receita Bruta de Vendas</span>
              <span className="font-black text-2xl font-mono">{formatCurrency(active.receitaBruta)}</span>
            </div>
            {predictiveScenario !== 'base' && (
              <div className="text-xs opacity-75 mt-1">
                Base real: {formatCurrency(rawRevenue)} × {activeScenarioCfg.multiplier.toFixed(2)}
              </div>
            )}
          </div>

          {/* Deductions */}
          <div className="ml-4 bg-orange-50 border-l-4 border-orange-400 rounded-r-xl p-4 space-y-2">
            <div className="text-xs font-bold text-orange-700 uppercase tracking-widest mb-2">
              (−) Impostos e Taxas de Cartão
            </div>
            <MetricRow
               label={
                 <div className="flex items-center gap-2">
                   <span>Impostos</span>
                   <input
                     type="number"
                     step="0.01"
                     className="w-16 p-1 text-sm border border-orange-300 rounded text-right text-orange-900 focus:ring-2 focus:ring-orange-400 focus:outline-none"
                     value={impostoInput}
                     onChange={(e) => setImpostoInput(e.target.value)}
                   />
                   <span className="text-orange-700 font-bold">%</span>
                 </div>
               }
               value={active.impostos}
            />
            <MetricRow
               label={
                 <div className="flex items-center gap-2">
                   <span>Taxa Cartão</span>
                   <input
                     type="number"
                     step="0.01"
                     className="w-16 p-1 text-sm border border-orange-300 rounded text-right text-orange-900 focus:ring-2 focus:ring-orange-400 focus:outline-none"
                     value={taxaCartaoInput}
                     onChange={(e) => setTaxaCartaoInput(e.target.value)}
                   />
                   <span className="text-orange-700 font-bold">%</span>
                 </div>
               }
               value={active.taxasCartao}
            />
            <div className="flex justify-between pt-2 border-t border-orange-200">
              <span className="font-bold text-orange-900 text-sm">Total Deduções</span>
              <span className="font-black font-mono text-orange-900">{formatCurrency(active.deducoes)}</span>
            </div>
          </div>

          {/* 2. Receita Líquida */}
          <div className="bg-gradient-to-r from-cyan-500 to-teal-600 text-white p-4 rounded-xl shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-base">2. Receita Líquida</div>
                <div className="text-xs opacity-75">Margem: {active.margemLiquida.toFixed(2)}%</div>
              </div>
              <span className="font-black text-2xl font-mono">{formatCurrency(active.receitaLiquida)}</span>
            </div>
          </div>

          {/* CMV */}
          <div className="ml-4 bg-red-50 border-l-4 border-red-400 rounded-r-xl p-4 space-y-2">
            <div className="text-xs font-bold text-red-700 uppercase tracking-widest mb-2">
              (−) Custos Variáveis (CMV + Logística)
            </div>
            {[
              [`CMV (${finData.config.variableCosts.cmv}%)`, active.cmv],
              [`Embalagens (${finData.config.variableCosts.embalagem}%)`, active.embalagens],
              [`Obsolescência (${finData.config.variableCosts.obsoleto}%)`, active.obsolescencia],
            ].map(([label, val]) => (
              <MetricRow key={label} label={label} value={val} />
            ))}
            <div className="flex justify-between pt-2 border-t border-red-200">
              <span className="font-bold text-red-900 text-sm">Total Custos Variáveis</span>
              <span className="font-black font-mono text-red-900">{formatCurrency(active.totalVariavel)}</span>
            </div>
          </div>

          {/* 3. Margem de Contribuição */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-4 rounded-xl shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-base">3. Margem de Contribuição</div>
                <div className="text-xs opacity-75">Margem: {active.percMC.toFixed(2)}%</div>
              </div>
              <span className="font-black text-2xl font-mono">{formatCurrency(active.margemContrib)}</span>
            </div>
          </div>

          {/* Fixed Costs */}
          <div className="ml-4 bg-purple-50 border-l-4 border-purple-400 rounded-r-xl p-4">
            <div className="text-xs font-bold text-purple-700 uppercase tracking-widest mb-3">
              (−) Despesas Fixas
              <span className="ml-2 bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                Imutáveis nos 3 cenários
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
              {[
                ['Aluguel', finData.config.fixedCosts.aluguel],
                ['Pró-labore', finData.config.fixedCosts.proLabore],
                ['Salários + Encargos', finData.config.fixedCosts.colaboradoras],
                ['Água', finData.config.fixedCosts.agua],
                ['Luz', finData.config.fixedCosts.luz],
                ['Internet', finData.config.fixedCosts.internet],
                ['Software', finData.config.fixedCosts.software],
                ['Contabilidade', finData.config.fixedCosts.contabilidade],
                ['Administração', finData.config.fixedCosts.adm],
                ['Alimentação', finData.config.fixedCosts.alimentacao],
                ['Transporte', finData.config.fixedCosts.transporte],
              ].filter(([, v]) => v > 0).map(([label, val]) => (
                <div key={label} className="bg-white/60 rounded-lg p-2 border border-purple-100">
                  <div className="text-[10px] text-purple-600 font-bold uppercase truncate">{label}</div>
                  <div className="font-bold text-purple-900 text-sm font-mono">{formatCurrency(val)}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-purple-200">
              <span className="font-bold text-purple-900">Total Despesas Fixas</span>
              <span className="font-black text-xl font-mono text-purple-900">{formatCurrency(active.totalFixo)}</span>
            </div>
          </div>

          {/* 4. Resultado Final */}
          <div className={`rounded-2xl p-6 border-4 shadow-xl text-white
            ${resultPos
              ? 'bg-gradient-to-r from-emerald-600 to-green-700 border-emerald-400'
              : 'bg-gradient-to-r from-red-600 to-red-800 border-red-400'}`}>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-lg font-black">4. {resultPos ? 'LUCRO' : 'PREJUÍZO'} LÍQUIDO</div>
                <div className="text-sm opacity-80 mt-0.5">
                  Margem: {active.margemResultado.toFixed(2)}% · Cenário {activeScenarioCfg.label}
                </div>
              </div>
              <span className="font-black text-4xl font-mono">
                {formatCurrency(Math.abs(active.resultado))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPIs Row ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h4 className="font-bold text-gray-700 text-sm mb-4 flex items-center gap-2 uppercase tracking-wide">
          <BarChart3 className="w-4 h-4 text-blue-500" /> Indicadores de Performance
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            ['Margem Bruta', active.margemLiquida, 'teal'],
            ['Mg. Contribuição', active.percMC, 'emerald'],
            ['Lucro Líquido', active.margemResultado, active.margemResultado >= 0 ? 'green' : 'red'],
            ['CMV / Receita', finData.config.variableCosts.cmv, 'red'],
            ['Fixo / Receita', active.receitaBruta > 0 ? (active.totalFixo / active.receitaBruta * 100) : 0, 'purple'],
          ].map(([label, val, color]) => (
            <div key={label} className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-xl font-black text-${color}-600`}>{parseFloat(val).toFixed(1)}%</div>

              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`fin-bar h-full rounded-full bg-${color}-500`}
                  style={{ width: `${Math.min(Math.abs(val), 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scenario Comparison Table ─────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h4 className="font-bold text-gray-700 text-sm mb-5 flex items-center gap-2 uppercase tracking-wide">
          <BarChart3 className="w-4 h-4 text-indigo-500" /> Comparativo de Cenários
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="text-left py-3 pr-4 text-gray-500 font-bold text-xs uppercase tracking-wide">Indicador</th>
                {PREDICTIVE_SCENARIOS.map(sc => (
                  <th key={sc.id} className={`text-right py-3 px-4 text-xs font-black uppercase tracking-wide
                    ${sc.id === 'base' ? 'text-emerald-700' : sc.id === 'otimista' ? 'text-blue-700' : 'text-orange-700'}`}>
                    {sc.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                ['Receita Bruta', d => d.receitaBruta],
                ['Receita Líquida', d => d.receitaLiquida],
                ['Margem Contribuição', d => d.margemContrib],
                ['Despesas Fixas', d => d.totalFixo],
                ['Lucro / Prejuízo', d => d.resultado],
                ['Margem (%)', d => d.margemResultado, '%'],
              ].map(([label, fn, fmt]) => (
                <tr key={label} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 pr-4 text-gray-600 font-medium text-xs">{label}</td>
                  {PREDICTIVE_SCENARIOS.map(sc => {
                    const v = fn(dres[sc.id]);
                    const isActive = sc.id === predictiveScenario;
                    const isNeg = v < 0;
                    return (
                      <td key={sc.id} className={`text-right py-3 px-4 font-mono font-bold text-xs rounded transition-colors
                        ${isActive ? 'bg-emerald-50' : ''}
                        ${isNeg ? 'text-red-600' : sc.id === 'base' ? 'text-emerald-700' : sc.id === 'otimista' ? 'text-blue-700' : 'text-orange-700'}`}>
                        {fmt === '%' ? `${v.toFixed(1)}%` : formatCurrency(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
