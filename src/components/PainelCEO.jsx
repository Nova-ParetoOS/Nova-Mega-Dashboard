import React from 'react';
import {
  DollarSign,
  Target,
  AlertTriangle,
  Users,
  TrendingUp,
  CheckCircle,
  Activity,
  Zap
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────
const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const getMonthName = (m) =>
  ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][m - 1] || '';

// ─── CSS-only Animation Styles (injected once) ──────────────
const STYLES = `
@keyframes ceo-slide-up {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
@keyframes ceo-bar-fill {
  from { width: 0; }
}
@keyframes ceo-pulse-ring {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
.ceo-card {
  animation: ceo-slide-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.ceo-card:hover {
  transform: translateY(-4px) scale(1.015);
  box-shadow: 0 20px 40px -12px rgba(0,0,0,0.15);
}
.ceo-card:nth-child(1) { animation-delay: 0.05s; }
.ceo-card:nth-child(2) { animation-delay: 0.15s; }
.ceo-card:nth-child(3) { animation-delay: 0.25s; }
.ceo-card:nth-child(4) { animation-delay: 0.35s; }
.ceo-bar  { animation: ceo-bar-fill 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.4s both; }
.ceo-ping { animation: ceo-pulse-ring 1.2s ease-in-out infinite; }
`;

function InjectStyles() {
  return <style>{STYLES}</style>;
}

// ─── KPI Card ────────────────────────────────────────────────
function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentClass,
  iconBgClass,
  badge,
  progress,
  progressColor,
  progressLabel,
  alert,
  delay,
}) {
  return (
    <div
      className={[
        'ceo-card relative rounded-2xl p-5 flex flex-col gap-3 overflow-hidden',
        'bg-white border shadow-sm',
        alert ? 'border-red-300 ring-2 ring-red-200' : 'border-gray-100',
      ].join(' ')}
    >
      {/* Gradient blob */}
      <div
        className={`absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 bg-gradient-to-br ${accentClass}`}
        aria-hidden="true"
      />

      {/* Alert pulse indicator */}
      {alert && (
        <span className="absolute top-3 right-3 flex h-3 w-3">
          <span className="ceo-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-2 relative z-10">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-tight">
          {title}
        </span>
        <div className={`p-2 rounded-xl shrink-0 ${iconBgClass}`}>
          <Icon className="w-4 h-4" strokeWidth={2.2} />
        </div>
      </div>

      {/* Main value */}
      <div className="relative z-10">
        <div className="text-2xl font-black text-gray-900 leading-tight tracking-tight">
          {value}
        </div>
        {badge && <div className="mt-1">{badge}</div>}
      </div>

      {/* Progress bar */}
      {progress !== undefined && (
        <div className="relative z-10">
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className={`ceo-bar h-2 rounded-full ${progressColor || 'bg-indigo-500'}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className={`text-[11px] font-bold mt-1.5 ${progress >= 100 ? 'text-emerald-600' : 'text-gray-400'}`}>
            {progressLabel || (progress >= 100 ? '✓ Meta batida!' : `${progress.toFixed(1)}% da meta`)}
          </div>
        </div>
      )}

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-gray-400 font-medium leading-snug relative z-10 mt-auto">
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function PainelCEO({
  realTotalSales = 0,
  metaOuro = 0,
  auditGaps = 0,
  crmLeadsCount = 0,
  selectedStoreName = 'Global',
  selectedMonth,
  selectedYear,
}) {
  const now = new Date();
  const month = selectedMonth || now.getMonth() + 1;
  const year = selectedYear || now.getFullYear();

  const metaProgress = metaOuro > 0 ? (realTotalSales / metaOuro) * 100 : 0;
  const temFuros = auditGaps > 0;

  return (
    <div className="space-y-5 mb-8">
      <InjectStyles />

      {/* ── Hero Header ──────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-gray-950 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-2xl overflow-hidden border border-indigo-900/40 shadow-2xl">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-indigo-600/20 rounded-full blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl" aria-hidden="true" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
                <Activity className="w-5 h-5 text-indigo-300" strokeWidth={2} />
              </div>
              <span className="text-xs font-bold text-indigo-300/80 uppercase tracking-widest">Painel do CEO</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Visão Centralizada
            </h2>
            <p className="text-indigo-200/60 text-sm mt-1 font-medium">
              KPIs críticos · vendas, estoque e CRM em uma tela
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/20 rounded-xl text-white text-xs font-bold">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              {selectedStoreName}
            </span>
            <span className="text-xs text-indigo-300/60 font-medium">
              {getMonthName(month)} / {year}
            </span>
          </div>
        </div>
      </div>

      {/* ── 4 KPI Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Card 1 — Faturamento Total */}
        <KpiCard
          title="Faturamento Total"
          value={formatCurrency(realTotalSales)}
          subtitle={`Vendas realizadas · ${getMonthName(month)} ${year}`}
          icon={DollarSign}
          accentClass="from-emerald-400 to-teal-500"
          iconBgClass="bg-emerald-100 text-emerald-600"
          badge={
            realTotalSales > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3" />
                Atualizado
              </span>
            ) : null
          }
        />

        {/* Card 2 — Meta do Período */}
        <KpiCard
          title="Meta do Período"
          value={metaProgress >= 100 ? '✓ Batida!' : `${metaProgress.toFixed(1)}%`}
          subtitle={`Meta Ouro: ${formatCurrency(metaOuro)}`}
          icon={metaProgress >= 100 ? CheckCircle : Target}
          accentClass="from-indigo-500 to-violet-600"
          iconBgClass={metaProgress >= 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}
          progress={metaProgress}
          progressColor={
            metaProgress >= 100
              ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
              : metaProgress >= 70
              ? 'bg-gradient-to-r from-indigo-400 to-purple-500'
              : 'bg-gradient-to-r from-orange-400 to-amber-500'
          }
        />

        {/* Card 3 — Furos de Estoque */}
        <KpiCard
          title="Furos de Estoque"
          value={auditGaps === 0 ? 'Tudo OK' : `${auditGaps} furo${auditGaps !== 1 ? 's' : ''}`}
          subtitle={temFuros ? 'Divergências entre ERP e contagem física' : 'Estoque sem divergências detectadas'}
          icon={AlertTriangle}
          accentClass={temFuros ? 'from-red-500 to-rose-600' : 'from-gray-400 to-slate-500'}
          iconBgClass={temFuros ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}
          alert={temFuros}
          badge={
            temFuros ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                ⚠ Requer atenção
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                ✓ Auditoria limpa
              </span>
            )
          }
        />

        {/* Card 4 — Leads no CRM */}
        <KpiCard
          title="Leads no CRM"
          value={crmLeadsCount.toString()}
          subtitle="Máquina de vendas ativa"
          icon={Users}
          accentClass="from-violet-500 to-purple-600"
          iconBgClass="bg-violet-100 text-violet-600"
          badge={
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
              {crmLeadsCount > 0
                ? `${crmLeadsCount} lead${crmLeadsCount !== 1 ? 's' : ''} ativo${crmLeadsCount !== 1 ? 's' : ''}`
                : 'Sem leads registrados'}
            </span>
          }
        />
      </div>
    </div>
  );
}
