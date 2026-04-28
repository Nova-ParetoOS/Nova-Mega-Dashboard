import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import MarketingAnalytics from './MarketingAnalytics';
import { BorderBeam } from './ui/border-beam';
import {
  Area, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ComposedChart, BarChart,
} from 'recharts';
import {
  DollarSign, Activity, Target, Users, Instagram, Facebook,
  ShoppingBag, BarChart2, TrendingUp, TrendingDown, Eye, Megaphone,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtN = (v) => new Intl.NumberFormat('pt-BR').format(v || 0);

const YEAR_COLORS = {
  '2021': '#e2e8f0',
  '2022': '#cbd5e1',
  '2023': '#94a3b8',
  '2024': '#f59e0b',
  '2025': '#10b981',
  '2026': '#c084fc',
};
const YEARS_ASC = ['2021','2022','2023','2024','2025','2026'];

// Retorna { targetMonth (0-11), targetYear } para um filtro
function getFilterTarget(filter) {
  const today = new Date();
  if (filter === '30') return { month: today.getMonth(), year: today.getFullYear() };
  if (filter === 'last_month') {
    const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return { month: d.getMonth(), year: d.getFullYear() };
  }
  return null; // não é modo YoY
}

// applyTimeFilter — usado para cards e marketing
function applyTimeFilter(itemDateStr, filter) {
  if (!itemDateStr) return false;
  const itemDate = new Date(itemDateStr + 'T00:00:00');
  const today = new Date();
  const diffMonths =
    (today.getFullYear() - itemDate.getFullYear()) * 12 +
    (today.getMonth() - itemDate.getMonth());

  if (filter === '30') return diffMonths === 0;
  if (filter === '90') return diffMonths >= 0 && diffMonths <= 2;
  if (filter === 'last_month') return diffMonths === 1;
  if (filter === '365') return itemDate.getFullYear() === today.getFullYear();
  if (filter === 'multi_year') return true;
  return false;
}

// ────────────────────────────────────────────────────────────
// UI Components
// ────────────────────────────────────────────────────────────
function KpiCard({ title, value, subtitle, icon: Icon, accentClass, iconBgClass, isVip, badge }) {
  return (
    <div className={`relative rounded-2xl p-5 flex flex-col gap-3 overflow-hidden bg-white shadow-sm border ${isVip ? 'border-indigo-200 shadow-md' : 'border-gray-100'} transition-all hover:-translate-y-1 hover:shadow-lg`}>
      {isVip && <BorderBeam size={250} duration={12} delay={9} borderWidth={2} colorFrom="#818cf8" colorTo="#c084fc" />}
      <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 bg-gradient-to-br ${accentClass}`} />
      <div className="flex items-start justify-between gap-2 relative z-10">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-tight">{title}</span>
        <div className={`p-2 rounded-xl shrink-0 ${iconBgClass}`}>
          <Icon className="w-4 h-4" strokeWidth={2.2} />
        </div>
      </div>
      <div className="relative z-10 flex items-end gap-2">
        <div className={`font-black text-gray-900 leading-tight tracking-tight ${isVip ? 'text-3xl' : 'text-2xl'}`}>{value}</div>
        {badge}
      </div>
      {subtitle && <p className="text-xs text-gray-400 font-medium leading-snug relative z-10 mt-auto">{subtitle}</p>}
    </div>
  );
}

function MiniCard({ title, value, icon: Icon, iconBgClass }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">{title}</p>
        <p className="text-lg font-black text-gray-800 mt-0.5">{value}</p>
      </div>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconBgClass}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
  );
}

// Card de impressão + alcance (novos cards omnichannel)
function ImpressionCard({ title, impressoes, alcance, color }) {
  return (
    <div className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</span>
      </div>
      <div className="text-2xl font-black text-gray-900">{fmtN(impressoes)}</div>
      <div className="text-xs text-gray-400 font-medium mt-1">Alcance: <span className="font-bold text-gray-600">{fmtN(alcance)}</span></div>
    </div>
  );
}

function GrowthBadge({ diff }) {
  if (diff === 0) return null;
  const pos = diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${pos ? 'text-green-500' : 'text-red-500'}`}>
      {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {pos ? '+' : ''}{fmtN(diff)}
    </span>
  );
}

// Seletor de período para gráficos — sem multi_year no omni
function ChartPeriodSelect({ value, onChange, includeMultiYear = true }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="appearance-none bg-slate-100 hover:bg-slate-200 border-none rounded-xl text-slate-700 text-xs font-bold px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer outline-none transition-colors"
    >
      {includeMultiYear && <option value="multi_year">Multi-Ano</option>}
      <option value="365">Ano Atual</option>
      <option value="90">3 Meses</option>
      <option value="30">Mês Atual ↔ YoY</option>
      <option value="last_month">Mês Passado ↔ YoY</option>
    </select>
  );
}

// Tooltip customizado
function CustomTooltip({ active, payload, label, isYoY }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '10px 16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)' }}>
      <p style={{ fontWeight: 700, fontSize: 11, color: '#64748b', marginBottom: 6 }}>
        {isYoY ? `Ano: ${label}` : `Vendas em: ${label}`}
      </p>
      {[...payload].reverse().map(entry => (
        <div key={entry.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: entry.color }}>{entry.dataKey}</span>
          <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'monospace', color: '#1e293b' }}>{fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────
export default function PainelCEO() {
  const [localStore,        setLocalStore]        = useState('8');
  const [timeFilter,        setTimeFilter]        = useState('30');
  const [performancePeriod, setPerformancePeriod] = useState('multi_year');
  const [chartType,         setChartType]         = useState('line');
  const [omniPeriod,        setOmniPeriod]        = useState('30');

  const [marketingData, setMarketingData] = useState([]);
  const [salesData,     setSalesData]     = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const [mkt, sales] = await Promise.all([
          supabase.from('marketing_performance').select('*'),
          supabase.from('sales_performance').select('*')
            .gte('period_start', '2021-01-01')
            .order('period_start', { ascending: false })
            .limit(10000),
        ]);
        if (mkt.error) throw mkt.error;
        if (sales.error) throw sales.error;
        if (isMounted) {
          setMarketingData((mkt.data || []).sort((a,b) => new Date(a.data_coleta) - new Date(b.data_coleta)));
          setSalesData(sales.data || []);
        }
      } catch (err) {
        console.error('CEO fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // ── Helpers ────────────────────────────────────────────────
  const isGlobal = localStore === 'Todas' || localStore === 'all' || !localStore;
  const storeMatches = (sid, store) => isGlobal || parseInt(String(sid), 10) === parseInt(String(store).replace(/\D/g, ''), 10);

  // ── Cards: filtro global (loja + período) ─────────────────
  const periodSalesData = salesData.filter(item =>
    storeMatches(item.store_id, localStore) && applyTimeFilter(item.period_start, timeFilter)
  );

  // ── Marketing: filtro pelo omniPeriod (sem loja) ──────────
  const periodMarketingData = marketingData.filter(item =>
    applyTimeFilter(item.data_coleta, omniPeriod)
  );

  // ── GRÁFICO YoY / Multi-Ano ───────────────────────────────
  //
  // Modo YoY  (filter = '30' | 'last_month'):
  //   eixo X = Ano (2023, 2024, 2025, 2026)
  //   1 barra por ano, mesmo mês
  //
  // Modo normal (multi_year | 365 | 90):
  //   eixo X = Mês abrev.
  //   1 série por ano
  //
  const isYoYMode = performancePeriod === '30' || performancePeriod === 'last_month';

  const buildSalesChartData = () => {
    const storeData = salesData.filter(item => storeMatches(item.store_id, localStore));

    if (isYoYMode) {
      // YoY: agrupa pelo mesmo mês de cada ano
      const target = getFilterTarget(performancePeriod);
      if (!target) return [];

      const byYear = {};
      storeData.forEach(item => {
        if (!item.period_start) return;
        const d = new Date(item.period_start + 'T00:00:00');
        if (d.getMonth() !== target.month) return; // só o mês alvo
        const y = String(d.getFullYear());
        byYear[y] = (byYear[y] || 0) + Number(item.total_sales || 0);
      });

      const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      const monthName = MONTH_NAMES[target.month];

      // Retorna array com uma entrada por ano (eixo X = ano, valor = faturamento)
      return YEARS_ASC.filter(y => byYear[y] !== undefined).map(y => ({
        label: y,
        mês: monthName,
        faturamento: byYear[y],
      }));
    }

    // Modo multi-mês: eixo X = mês abrev, multi-linha por ano
    const monthsOrder = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const monthly = {};
    monthsOrder.forEach(m => monthly[m] = { label: m.charAt(0).toUpperCase() + m.slice(1) });

    storeData.forEach(item => {
      if (!item.period_start) return;
      if (!applyTimeFilter(item.period_start, performancePeriod)) return;
      const d = new Date(item.period_start + 'T00:00:00');
      const y = String(d.getFullYear());
      const mk = monthsOrder[d.getMonth()];
      if (monthly[mk]) {
        if (!monthly[mk][y]) monthly[mk][y] = 0;
        monthly[mk][y] += Number(item.total_sales || 0);
      }
    });

    return Object.values(monthly);
  };

  const salesChartData = buildSalesChartData();
  const availableYears = isYoYMode
    ? [] // não precisamos de linhas — usamos uma barra única "faturamento"
    : YEARS_ASC.filter(y => salesChartData.some(row => row[y] != null && row[y] > 0));

  // ── MATEMÁTICA DOS CARDS ──────────────────────────────────
  const totalFaturamento  = periodSalesData.reduce((a, c) => a + (Number(c.total_sales) || 0), 0);
  const sumAtendimentos   = periodSalesData.reduce((a, c) => a + (Number(c.sales_count)  || 0), 0) || 1;
  const sumPecas          = periodSalesData.reduce((a, c) => a + (Number(c.items_count)  || 0), 0);
  const ticketMedio       = totalFaturamento / sumAtendimentos;
  const pa                = sumPecas / sumAtendimentos;
  // Preço Médio CORRETO: Faturamento ÷ Itens Vendidos
  const precoMedioPeca    = totalFaturamento / (sumPecas || 1);

  // ── MARKETING OMNICHANNEL — agregações ────────────────────
  const sortedMkt = [...periodMarketingData];
  const t0 = sortedMkt[0]                      || null;
  const t1 = sortedMkt[sortedMkt.length - 1]   || null;

  // Seguidores: 1º e último do período
  const segInstaInicio = Number(t0?.seguidores_instagram || 0);
  const segInstaFim    = Number(t1?.seguidores_instagram || 0);
  const segFaceFim     = Number(t1?.seguidores_facebook  || 0);
  const followerGrowthInsta = segInstaFim - segInstaInicio;
  const totalSeguidores     = segInstaFim + segFaceFim;

  // Impressões e alcances (soma do período)
  const impressoesIG      = periodMarketingData.reduce((a,c) => a + (Number(c.impressoes_instagram) || 0), 0);
  const alcanceIG         = periodMarketingData.reduce((a,c) => a + (Number(c.alcance_instagram)    || 0), 0);
  const impressoesStories = periodMarketingData.reduce((a,c) => a + (Number(c.impressoes_stories)   || 0), 0);
  const alcanceStories    = periodMarketingData.reduce((a,c) => a + (Number(c.alcance_stories)      || 0), 0);
  const impressoesFB      = periodMarketingData.reduce((a,c) => a + (Number(c.impressoes_facebook)  || 0), 0);
  const alcanceFB         = periodMarketingData.reduce((a,c) => a + (Number(c.alcance_facebook)     || 0), 0);
  const impressoesAds     = periodMarketingData.reduce((a,c) => a + (Number(c.impressoes_anuncios)  || 0), 0);
  const alcanceAds        = periodMarketingData.reduce((a,c) => a + (Number(c.alcance_anuncios)     || 0), 0);
  const totalAds          = periodMarketingData.reduce((a,c) => a + (Number(c.investimento_total)   || 0), 0);

  const getPeriodLabel = () => {
    if (timeFilter === '30')         return 'Mês Atual';
    if (timeFilter === '90')         return 'Últimos 3 Meses';
    if (timeFilter === 'last_month') return 'Mês Passado';
    if (timeFilter === '365')        return 'Ano Atual';
    return '';
  };

  const getPerformanceSubtitle = () => {
    if (isYoYMode) {
      const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      const t = getFilterTarget(performancePeriod);
      return `Comparativo YoY — ${MONTH_NAMES[t?.month ?? 0]}`;
    }
    if (performancePeriod === 'multi_year') return 'Comparativo Multi-Ano';
    if (performancePeriod === '365')        return 'Ano Atual';
    if (performancePeriod === '90')         return 'Últimos 3 Meses';
    return '';
  };

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className="space-y-6 mb-8 w-full max-w-7xl mx-auto">

      {/* Hero Header */}
      <div className="relative bg-gradient-to-br from-gray-950 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-2xl overflow-hidden border border-indigo-900/40 shadow-2xl">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
                <Activity className="w-5 h-5 text-indigo-300" strokeWidth={2} />
              </div>
              <span className="text-xs font-bold text-indigo-300/80 uppercase tracking-widest">Painel Executivo</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Visão Consolidada</h2>
            <p className="text-indigo-200/60 text-sm mt-1 font-medium">Controle de ROI, Faturamento e Marketing</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <select value={localStore} onChange={e => setLocalStore(e.target.value)}
              className="w-full sm:w-auto appearance-none bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 rounded-xl text-white text-xs font-bold px-6 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer text-center outline-none transition-colors">
              <option value="Todas" className="text-gray-900">Todas as Lojas</option>
              <option value="3"  className="text-gray-900">Loja 03</option>
              <option value="4"  className="text-gray-900">Loja 04</option>
              <option value="7"  className="text-gray-900">Loja 07</option>
              <option value="8"  className="text-gray-900">Loja 08</option>
              <option value="10" className="text-gray-900">Loja 10</option>
            </select>

            <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)}
              className="w-full sm:w-auto appearance-none bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 rounded-xl text-emerald-100 text-xs font-bold px-6 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer text-center outline-none transition-colors">
              <option value="30"         className="text-gray-900">⏳ Mês Atual</option>
              <option value="last_month" className="text-gray-900">⏳ Mês Passado</option>
              <option value="90"         className="text-gray-900">⏳ Últimos 3 Meses</option>
              <option value="365"        className="text-gray-900">⏳ Ano Atual</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="w-full h-40 flex flex-col items-center justify-center space-y-3 text-indigo-400/50">
          <Activity className="w-8 h-8 animate-spin" />
          <p className="font-bold text-sm tracking-widest uppercase">Analisando histórico e tráfego orgânico...</p>
        </div>
      ) : (
        <>
          {/* ── LINHA 1: KPI Cards Principais ─────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Faturamento" value={fmt(totalFaturamento)} subtitle={getPeriodLabel()}
              icon={DollarSign} accentClass="from-emerald-400 to-teal-500" iconBgClass="bg-emerald-100 text-emerald-600" isVip />
            <KpiCard title="Investimento (Ads)" value={fmt(totalAds)} subtitle="Omnichannel"
              icon={Target} accentClass="from-pink-400 to-rose-500" iconBgClass="bg-pink-100 text-pink-600" />
            <KpiCard title="Ticket Médio" value={fmt(ticketMedio)} subtitle="Por atendimento"
              icon={DollarSign} accentClass="from-amber-400 to-orange-500" iconBgClass="bg-amber-100 text-amber-600" />
            <KpiCard title="PA" value={pa.toFixed(2)} subtitle="Peças por Atendimento"
              icon={Target} accentClass="from-blue-400 to-indigo-500" iconBgClass="bg-blue-100 text-blue-600" />
          </div>

          {/* ── LINHA 1.5: Mini Cards ─────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MiniCard title="Itens Vendidos"       value={fmtN(sumPecas)}         icon={ShoppingBag} iconBgClass="bg-teal-50 text-teal-600" />
            <MiniCard title="Total de Atendimentos" value={fmtN(sumAtendimentos)} icon={BarChart2}   iconBgClass="bg-indigo-50 text-indigo-600" />
            {/* Preço Médio CORRETO: faturamento / itens */}
            <MiniCard title="Preço Médio (Peça)"   value={fmt(precoMedioPeca)}    icon={DollarSign}  iconBgClass="bg-amber-50 text-amber-600" />
          </div>

          {/* ── LINHA 2: GRÁFICO PERFORMANCE ─────────────── */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-50">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-800">Performance de Vendas</h2>
                <p className="text-xs text-slate-400 font-medium">{getPerformanceSubtitle()}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setChartType('line')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartType === 'line' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Linhas</button>
                  <button onClick={() => setChartType('bar')}  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartType === 'bar'  ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Barras</button>
                </div>
                <ChartPeriodSelect value={performancePeriod} onChange={setPerformancePeriod} includeMultiYear={true} />
              </div>
            </div>

            <div style={{ width: '100%', height: 400 }}>
              {salesChartData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">Sem histórico no período selecionado.</div>
              ) : isYoYMode ? (
                /* Modo YoY: eixo X = Ano, 1 barra por ano */
                <ResponsiveContainer width="100%" height="100%" minHeight={400} aspect={2.5}>
                  <BarChart data={salesChartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 700 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} width={55} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div style={{ background: '#fff', borderRadius: 12, padding: '10px 16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)' }}>
                            <p style={{ fontWeight: 700, fontSize: 11, color: '#64748b', marginBottom: 4 }}>Ano {label}</p>
                            <p style={{ fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: '#1e293b' }}>{fmt(payload[0]?.value)}</p>
                          </div>
                        );
                      }}
                      cursor={{ fill: '#f1f5f9' }}
                    />
                    <Bar dataKey="faturamento" radius={[6, 6, 0, 0]} isAnimationActive={false}
                      fill="#10b981"
                      label={{ position: 'top', formatter: v => `R$${(v/1000).toFixed(0)}k`, fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                    >
                      {salesChartData.map(entry => (
                        <rect key={entry.label} fill={YEAR_COLORS[entry.label] || '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                /* Modo multi-mês: eixo X = mês, multi-série por ano */
                <ResponsiveContainer width="100%" height="100%" minHeight={400} aspect={2.5}>
                  {chartType === 'line' ? (
                    <ComposedChart data={salesChartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorVigente" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#c084fc" stopOpacity={0.5}/>
                          <stop offset="95%" stopColor="#c084fc" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={15} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} width={55} />
                      <Tooltip content={<CustomTooltip isYoY={false} />} />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      {availableYears.filter(y => !['2026'].includes(y)).map(y => (
                        <Line key={y} type="monotone" dataKey={y} stroke={YEAR_COLORS[y]} strokeWidth={y === '2025' ? 3 : 2}
                          dot={y === '2025' ? { r: 4, fill: YEAR_COLORS[y] } : false}
                          strokeDasharray={['2021','2022','2023'].includes(y) ? '5 5' : undefined}
                          isAnimationActive={false} />
                      ))}
                      {availableYears.includes('2026') && (
                        <Area type="monotone" dataKey="2026" stroke="#c084fc" fill="url(#colorVigente)"
                          strokeWidth={3} dot={{ r: 4, fill: '#c084fc' }} activeDot={{ r: 6 }} isAnimationActive={false} />
                      )}
                    </ComposedChart>
                  ) : (
                    <BarChart data={salesChartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={15} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} width={55} />
                      <Tooltip content={<CustomTooltip isYoY={false} />} cursor={{ fill: '#f1f5f9' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      {availableYears.map(y => (
                        <Bar key={y} dataKey={y} fill={YEAR_COLORS[y]} radius={[4,4,0,0]} isAnimationActive={false} />
                      ))}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── LINHA 3: NOVOS CARDS DE MARKETING ─────────── */}
          <div className="space-y-4">
            {/* Cabeçalho + seletor omni */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-800">Marketing Omnichannel</h2>
                <p className="text-xs text-slate-400 font-medium">Impressões, Alcance e Seguidores</p>
              </div>
              {/* Seletor sem "multi_year" */}
              <ChartPeriodSelect value={omniPeriod} onChange={setOmniPeriod} includeMultiYear={false} />
            </div>

            {/* 4 Cards de Impressões */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <ImpressionCard title="Instagram" impressoes={impressoesIG} alcance={alcanceIG} color="bg-pink-500" />
              <ImpressionCard title="Stories"   impressoes={impressoesStories} alcance={alcanceStories} color="bg-purple-500" />
              <ImpressionCard title="Facebook"  impressoes={impressoesFB} alcance={alcanceFB} color="bg-blue-500" />
              <ImpressionCard title="Anúncios"  impressoes={impressoesAds} alcance={alcanceAds} color="bg-amber-500" />
            </div>

            {/* 3 Cards Resumo: IG followers + badge, FB followers, Investimento */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard
                title="Seguidores Instagram"
                value={fmtN(segInstaFim)}
                subtitle="Último registro do período"
                icon={Instagram}
                accentClass="from-pink-400 to-rose-500"
                iconBgClass="bg-pink-100 text-pink-600"
                badge={<GrowthBadge diff={followerGrowthInsta} />}
              />
              <KpiCard
                title="Seguidores Facebook"
                value={fmtN(segFaceFim)}
                subtitle="Último registro do período"
                icon={Users}
                accentClass="from-blue-400 to-indigo-500"
                iconBgClass="bg-blue-100 text-blue-600"
              />
              <KpiCard
                title="Investimento Total (Ads)"
                value={fmt(totalAds)}
                subtitle="Soma do período selecionado"
                icon={TrendingUp}
                accentClass="from-amber-400 to-orange-500"
                iconBgClass="bg-amber-100 text-amber-600"
              />
            </div>

            {/* Gráfico Omnichannel detalhado */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <MarketingAnalytics
                periodMarketingData={periodMarketingData}
                timeRange={omniPeriod}
                followerGrowth={followerGrowthInsta}
                t1={t1}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
