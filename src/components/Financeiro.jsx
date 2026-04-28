import React, { useState, useMemo, useEffect } from 'react';
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
    id: 'minima',
    label: '🛡️ Venda Mínima',
    sublabel: 'Alvo = Break-even (Sobrevivência)',
    multiplier: null,
    pctLabel: 'Margem Zero',
    activeGradient: 'from-orange-600 to-orange-700',
    activeBorder: 'border-orange-500',
    activeText: 'text-white',
    inactiveText: 'text-orange-700',
    inactiveBg: 'bg-orange-50 border-orange-200',
    indicatorColor: 'bg-orange-500',
  },
  {
    id: 'crescimento',
    label: '🚀 Meta Saudável',
    sublabel: 'Crescimento de +15% sob a Base',
    multiplier: 1.15,
    pctLabel: '+15%',
    activeGradient: 'from-blue-600 to-indigo-700',
    activeBorder: 'border-blue-500',
    activeText: 'text-white',
    inactiveText: 'text-blue-700',
    inactiveBg: 'bg-blue-50 border-blue-200',
    indicatorColor: 'bg-blue-500',
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

// ── Motor Tributário ─ Simples Nacional Anexo I (Comércio) ─────────────────
function getPrev12Months(month, year) {
  const periods = [];
  let d = new Date(year, month - 1, 1);
  for (let i = 0; i < 12; i++) {
    d.setMonth(d.getMonth() - 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return periods;
}

const SIMPLES_FAIXAS = [
  { limite: 180000,   nominal: 0.040, deducao: 0,       label: '1ª',  range: 'até R$ 180k'   },
  { limite: 360000,   nominal: 0.073, deducao: 5940,    label: '2ª',  range: 'R$ 180k–360k'  },
  { limite: 720000,   nominal: 0.095, deducao: 13860,   label: '3ª',  range: 'R$ 360k–720k'  },
  { limite: 1800000,  nominal: 0.107, deducao: 22500,   label: '4ª',  range: 'R$ 720k–1,8M'  },
  { limite: 3600000,  nominal: 0.143, deducao: 87300,   label: '5ª',  range: 'R$ 1,8M–3,6M'  },
  { limite: 4800000,  nominal: 0.190, deducao: 378000,  label: '6ª',  range: 'R$ 3,6M–4,8M'  },
];

function calcSimplesNacional(rbt12) {
  if (rbt12 <= 0) return { aliquotaEfetiva: 0.04, faixa: SIMPLES_FAIXAS[0], rbt12: 0 };
  const faixa = SIMPLES_FAIXAS.find(f => rbt12 <= f.limite) || SIMPLES_FAIXAS[5];
  const aliquotaEfetiva = ((rbt12 * faixa.nominal) - faixa.deducao) / rbt12;
  return { aliquotaEfetiva, faixa, rbt12 };
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
  // Histórico de vendas — necessário para o Motor RBT12
  salesHistory = [],
  // Saved DRE overrides (kept for read-only display)
  dreValues = {},
  updateDreKey,
  deleteDreKey,
}) {
  // ── Local predictive scenario (independent of saved dreValues) ──
  const [predictiveScenario, setPredictiveScenario] = useState('custom');
  const [sliderMultiplier, setSliderMultiplier] = useState(1.0);

  const activeScenarioCfg = PREDICTIVE_SCENARIOS.find(s => s.id === predictiveScenario) || { 
    id: 'custom', 
    label: '🕹️ Cenário Dinâmico (Arraste)', 
    multiplier: sliderMultiplier 
  };

  // ── Compute base financials (DEVE vir ANTES do useEffect que depende de finData) ──
  const finData = useMemo(
    () => getFinancialData(selectedStore, selectedMonth, selectedYear),
    [selectedStore, selectedMonth, selectedYear]
  );

  const goalsData = useMemo(
    () => getGoalsData(selectedStore, selectedMonth),
    [selectedStore, selectedMonth]
  );

  // ── Simulador Universal de DRE (Local State) ─────────────────────────
  const [varInputs, setVarInputs] = useState(null);
  const [fixInputs, setFixInputs] = useState(null);

  // Sincroniza os inputs sempre que a loja/período mudar (finData já declarado acima)
  // A alíquota de imposto é substituída pelo valor dinâmico do Motor RBT12
  useEffect(() => {
    if (finData?.config) {
      const periods = getPrev12Months(selectedMonth, selectedYear);
      const rbt12 = salesHistory
        .filter(h => String(h.storeCode) === String(selectedStore) && periods.includes(h.period))
        .reduce((acc, h) => acc + (h.totalSales || 0), 0);
      const { aliquotaEfetiva } = calcSimplesNacional(rbt12);
      const aliqPct = parseFloat((aliquotaEfetiva * 100).toFixed(2));
      setVarInputs({
        ...finData.config.variableCosts,
        imposto: aliqPct,   // substitui o valor estático do STORE_CONFIGS pela alíquota efetiva
      });
      setFixInputs({ ...finData.config.fixedCosts });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore, selectedMonth, selectedYear, finData, salesHistory]);

  const handleVarChange = (key, val) => {
      setVarInputs(prev => ({ ...prev, [key]: val === '' ? 0 : Number(val) }));
  };
  
  const handleFixChange = (key, val) => {
      setFixInputs(prev => ({ ...prev, [key]: val === '' ? 0 : Number(val) }));
  };

  const rawRevenue = useMemo(() => {
    const history = getHistoricalDataForStorePeriod(selectedStore, selectedMonth, selectedYear);
    return history.reduce((acc, r) => acc + (r.totalSales || 0), 0);
  }, [selectedStore, selectedMonth, selectedYear]);

  // ── Motor RBT12: recalcula ao trocar de loja, mês ou ano ─────────────────
  const simplesResult = useMemo(() => {
    const periods = getPrev12Months(selectedMonth, selectedYear);
    const rbt12 = salesHistory
      .filter(h => String(h.storeCode) === String(selectedStore) && periods.includes(h.period))
      .reduce((acc, h) => acc + (h.totalSales || 0), 0);
    return calcSimplesNacional(rbt12);
  }, [salesHistory, selectedStore, selectedMonth, selectedYear]);

  // ── DRE for each scenario ────────────────────────────────────
  const dres = useMemo(() => {
    if (!finData?.config || !varInputs || !fixInputs) return null;

    const res = PREDICTIVE_SCENARIOS.reduce((acc, sc) => {
      let simulatedRevenue = rawRevenue * (sc.multiplier || 1.0);
      if (sc.id === 'minima') {
        simulatedRevenue = finData.breakEven; // breakEven is based on original finData, but this represents target
      } else if (sc.id === 'crescimento') {
        simulatedRevenue = finData.breakEven * 1.15;
      }

      acc[sc.id] = computeDRE(
        simulatedRevenue,
        1.0, 
        varInputs,
        fixInputs,
      );

      if (sc.id === 'minima') {
        acc[sc.id].resultado = 0;
        acc[sc.id].margemResultado = 0;
      }
      
      return acc;
    }, {});
    
    res['custom'] = computeDRE(
      rawRevenue * sliderMultiplier,
      1.0, 
      varInputs,
      fixInputs
    );
    
    return res;
  }, [rawRevenue, finData, varInputs, fixInputs, sliderMultiplier]);

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
                <option key={i} value={2021 + i} className="text-gray-900">{2021 + i}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Predictive Scenario Selector (Slider Interativo) ──────────────────── */}

      <div className={`bg-white rounded-2xl border-2 shadow-sm p-6 flex flex-col gap-4 relative overflow-hidden group transition-colors ${active.resultado < 0 ? 'border-red-100/60 shadow-red-500/5' : 'border-indigo-100/60 shadow-indigo-500/5'}`}>
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <TrendingUp className="w-32 h-32" />
        </div>
        <div className="flex items-center justify-between z-10">
          <div>
            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">🕹️ Simulador Dinâmico</h3>
            <p className="text-xs text-gray-500">Arraste para prever Lucro/Prejuízo instantaneamente com base na receita</p>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-[11px] font-black tracking-widest uppercase transition-colors ${active.resultado < 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
              Margem: {(active?.margemResultado || 0).toFixed(2)}%
          </div>
        </div>
        
        <div className="z-10 mt-2 bg-gray-50/70 p-5 rounded-xl border border-gray-100">
          <div className="flex justify-between items-end mb-6">
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                   Receita Simulada 
                   <span className={`px-1.5 py-0.5 rounded text-[9px] ${sliderMultiplier === 1 ? 'bg-blue-100 text-blue-700 shadow-sm' : 'bg-indigo-100 text-indigo-700 shadow-sm'}`}>
                      {sliderMultiplier.toFixed(2)}x
                   </span>
                </div>
                <div className={`text-4xl font-black font-mono tracking-tighter ${active.resultado < 0 ? 'text-red-500' : 'text-emerald-500'} transition-colors`}>
                    {formatCurrency(active.receitaBruta)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Impacto no Caixa</div>
                <div className={`text-2xl font-black font-mono tracking-tighter ${active.resultado < 0 ? 'text-red-500' : 'text-emerald-500'} transition-colors`}>
                    {active.resultado > 0 ? '+' : ''}{formatCurrency(active.resultado)}
                </div>
              </div>
          </div>
          <input 
            type="range" 
            min="0" 
            max="3" 
            step="0.05"
            value={sliderMultiplier}
            onChange={(e) => {
                setSliderMultiplier(Number(e.target.value));
                if(predictiveScenario !== 'custom') setPredictiveScenario('custom');
            }}
            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 outline-none hover:h-4 transition-all"
          />
          <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-bold text-gray-400 mt-4 px-1">
              <span>0x (Zero)</span>
              <button 
                  onClick={() => { 
                      const idealMult = rawRevenue > 0 ? (finData.breakEven / rawRevenue) : 1; 
                      setSliderMultiplier(idealMult); 
                      setPredictiveScenario('custom'); 
                  }}
                  className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:text-indigo-600 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                  🎯 Empate: {formatCurrency(finData.breakEven)}
              </button>
              <span>3x (Recorde)</span>
          </div>
        </div>
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
              <span className="font-bold">{(active?.margemResultado || 0).toFixed(2)}%</span>
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
                Base real: {formatCurrency(rawRevenue)} {activeScenarioCfg.multiplier ? `× ${activeScenarioCfg.multiplier.toFixed(2)}` : '→ Meta de Ponto de Equilíbrio'}
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
                     value={varInputs.imposto}
                     onChange={(e) => handleVarChange('imposto', e.target.value)}
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
                     value={varInputs.taxaCartao}
                     onChange={(e) => handleVarChange('taxaCartao', e.target.value)}
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
                <div className="text-xs opacity-75">Margem: {(active?.margemLiquida || 0).toFixed(2)}%</div>
              </div>
              <input 
                type="text" 
                readOnly 
                disabled 
                value={formatCurrency(active.receitaLiquida)} 
                className="font-black text-2xl font-mono bg-cyan-700/50 text-white border border-dashed border-cyan-400 rounded-lg px-4 py-1.5 cursor-not-allowed select-none text-right outline-none min-w-[180px]" 
              />
            </div>
          </div>

          {/* CMV */}
          <div className="ml-4 bg-red-50 border-l-4 border-red-400 rounded-r-xl p-4 space-y-2">
            <div className="text-xs font-bold text-red-700 uppercase tracking-widest mb-2">
              (−) Custos Variáveis (CMV + Logística)
            </div>
            <MetricRow
               label={
                 <div className="flex items-center gap-2">
                   <span>CMV</span>
                   <input
                     type="number"
                     step="0.01"
                     className="w-16 p-1 text-sm border border-red-300 rounded text-right text-red-900 focus:ring-2 focus:ring-red-400 focus:outline-none"
                     value={varInputs.cmv}
                     onChange={(e) => handleVarChange('cmv', e.target.value)}
                   />
                   <span className="text-red-700 font-bold">%</span>
                 </div>
               }
               value={active.cmv}
            />
            <MetricRow
               label={
                 <div className="flex items-center gap-2">
                   <span>Embalagens</span>
                   <input
                     type="number"
                     step="0.01"
                     className="w-16 p-1 text-sm border border-red-300 rounded text-right text-red-900 focus:ring-2 focus:ring-red-400 focus:outline-none"
                     value={varInputs.embalagem}
                     onChange={(e) => handleVarChange('embalagem', e.target.value)}
                   />
                   <span className="text-red-700 font-bold">%</span>
                 </div>
               }
               value={active.embalagens}
            />
            <MetricRow
               label={
                 <div className="flex items-center gap-2">
                   <span>Obsolescência</span>
                   <input
                     type="number"
                     step="0.01"
                     className="w-16 p-1 text-sm border border-red-300 rounded text-right text-red-900 focus:ring-2 focus:ring-red-400 focus:outline-none"
                     value={varInputs.obsoleto}
                     onChange={(e) => handleVarChange('obsoleto', e.target.value)}
                   />
                   <span className="text-red-700 font-bold">%</span>
                 </div>
               }
               value={active.obsolescencia}
            />
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
                <div className="text-xs opacity-75">Margem: {(active?.percMC || 0).toFixed(2)}%</div>
              </div>
              <input 
                type="text" 
                readOnly 
                disabled 
                value={formatCurrency(active.margemContrib)} 
                className="font-black text-2xl font-mono bg-emerald-700/50 text-white border border-dashed border-emerald-400 rounded-lg px-4 py-1.5 cursor-not-allowed select-none text-right outline-none min-w-[180px]" 
              />
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
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mb-3">
              {[
                ['Aluguel', 'aluguel'],
                ['Pró-labore', 'proLabore'],
                ['Salários + Enc.', 'colaboradoras'],
                ['Água', 'agua'],
                ['Luz', 'luz'],
                ['Internet', 'internet'],
                ['Software', 'software'],
                ['Contabilidade', 'contabilidade'],
                ['Administração', 'adm'],
                ['Alimentação', 'alimentacao'],
                ['Transporte', 'transporte'],
              ].map(([label, key]) => (
                <div key={label} className="bg-white/60 rounded-lg p-2 border border-purple-100 flex flex-col gap-1.5 focus-within:ring-1 focus-within:ring-purple-300 transition-shadow">
                  <div className="text-[10px] text-purple-600 font-bold uppercase truncate px-1">{label}</div>
                  <div className="flex items-center gap-1 bg-white border border-purple-200 rounded px-1.5 py-1">
                      <span className="text-xs text-purple-400 font-bold">R$</span>
                      <input
                         type="number"
                         step="10.00"
                         className="w-full text-sm font-bold text-purple-900 focus:outline-none bg-transparent"
                         value={fixInputs[key] === 0 ? '' : fixInputs[key]}
                         placeholder="0.00"
                         onChange={(e) => handleFixChange(key, e.target.value)}
                       />
                  </div>
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
                  Margem: {(active?.margemResultado || 0).toFixed(2)}% · Cenário {activeScenarioCfg.label}
                </div>
              </div>
              <input 
                type="text" 
                readOnly 
                disabled 
                value={formatCurrency(Math.abs(active.resultado))} 
                className={`font-black text-4xl font-mono ${resultPos ? 'bg-emerald-800/40 border-emerald-400' : 'bg-red-900/40 border-red-400'} text-white border border-dashed rounded-lg px-5 py-2 cursor-not-allowed select-none text-right outline-none min-w-[200px]`}
              />
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
                    ${sc.id === 'base' ? 'text-emerald-700' : sc.id === 'crescimento' ? 'text-blue-700' : 'text-orange-700'}`}>
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
                        ${isNeg ? 'text-red-600' : sc.id === 'base' ? 'text-emerald-700' : sc.id === 'crescimento' ? 'text-blue-700' : 'text-orange-700'}`}>
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
