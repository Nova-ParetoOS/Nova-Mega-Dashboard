import React, { useMemo } from 'react';
import { PieChart, Printer, DollarSign, Calculator, Calculator as CalculatorIcon, ArrowRight, Save, BarChart3, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency, getMonthName } from '../utils/formatters';

export function Financeiro({
  dreScenario,
  setDreScenario,
  selectedStore,
  setSelectedStore,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  STORE_CONFIGS,
  setPrintMode,
  getFinancialData,
  dreValues,
  updateDreKey,
  getGoalsData,
  getHistoricalDataForStorePeriod
}) {
  if (!STORE_CONFIGS) return <div className="p-8 text-gray-400 text-center animate-pulse">Carregando Módulo (Configs)...</div>;
  const finData = getFinancialData(selectedStore, selectedMonth, selectedYear);
  if (!finData || !finData.config) return <div className="p-8 text-gray-400 text-center animate-pulse">Carregando DRE...</div>;
  const goalsData = getGoalsData(selectedStore, selectedMonth);
  const currentData = getHistoricalDataForStorePeriod(selectedStore, selectedMonth, selectedYear);
  const totalSalesMonth = currentData.reduce((acc, curr) => acc + curr.totalSales, 0);

  const dreKeyBase = `${selectedStore}-${selectedMonth}-${selectedYear}-base`;
  const dreKey = `${selectedStore}-${selectedMonth}-${selectedYear}-${dreScenario}`;
  const savedDreBase = dreValues[dreKeyBase] || {};
  const savedDre = dreValues[dreKey] || {};

  const resolveField = (field, configDefault) => {
    if (dreScenario === 'base') return savedDre[field] ?? configDefault;
    return savedDre[field] ?? savedDreBase[field] ?? configDefault;
  };


  const updateDreValue = (field, value) => {
    updateDreKey(dreKey, field, value);
  };


  const receitaBrutaBase = totalSalesMonth;
  // Para cenários otimista/pessimista: se não há valor salvo, herda base (ou 0 explícito se base também for 0)
  const receitaBrutaEdit = dreScenario !== 'base'
    ? (savedDre.receitaBruta !== undefined ? savedDre.receitaBruta
      : savedDreBase.receitaBruta !== undefined ? savedDreBase.receitaBruta
        : receitaBrutaBase)
    : receitaBrutaBase;
  const receitaBruta = dreScenario === 'base' ? receitaBrutaBase : receitaBrutaEdit;

  const percCMV = resolveField('percCMV', finData.config.variableCosts.cmv);
  const percImpostos = resolveField('percImpostos', finData.config.variableCosts.imposto);
  const percTaxasCartao = resolveField('percTaxasCartao', finData.config.variableCosts.taxaCartao);
  const percEmbalagens = resolveField('percEmbalagens', finData.config.variableCosts.embalagem);
  const percObsolescencia = resolveField('percObsolescencia', finData.config.variableCosts.obsoleto);
  const impostos = receitaBruta * (percImpostos / 100);
  const taxasCartao = receitaBruta * (percTaxasCartao / 100);
  const deducoesReceita = impostos + taxasCartao;
  const receitaLiquida = receitaBruta - deducoesReceita;
  const margemLiquida = receitaBruta > 0 ? (receitaLiquida / receitaBruta) * 100 : 0;

  const cmv = receitaBruta * (percCMV / 100);
  const embalagens = receitaBruta * (percEmbalagens / 100);
  const obsolescencia = receitaBruta * (percObsolescencia / 100);
  const totalCMV = cmv + embalagens + obsolescencia;
  
  const margemContribuicao = receitaLiquida - totalCMV;
  const percMargemContribuicao = receitaBruta > 0 ? (margemContribuicao / receitaBruta) * 100 : 0;

  const aluguel = resolveField('aluguel', finData.config.fixedCosts.aluguel);
  const proLabore = resolveField('proLabore', finData.config.fixedCosts.proLabore);
  const agua = resolveField('agua', finData.config.fixedCosts.agua);
  const luz = resolveField('luz', finData.config.fixedCosts.luz);
  const internet = resolveField('internet', finData.config.fixedCosts.internet);
  const software = resolveField('software', finData.config.fixedCosts.software);
  const contabilidade = resolveField('contabilidade', finData.config.fixedCosts.contabilidade);
  const salarios = resolveField('salarios', finData.config.fixedCosts.colaboradoras);
  const administracao = resolveField('administracao', finData.config.fixedCosts.adm);
  const alimentacao = resolveField('alimentacao', finData.config.fixedCosts.alimentacao);
  const transporte = resolveField('transporte', finData.config.fixedCosts.transporte);
  const totalDespesasFixas = aluguel + proLabore + agua + luz + internet + software + contabilidade + salarios + administracao + alimentacao + transporte;
  const resultadoOperacional = margemContribuicao - totalDespesasFixas;
  const margemOperacional = receitaBruta > 0 ? (resultadoOperacional / receitaBruta) * 100 : 0;
  const breakEvenDiff = receitaBruta - finData.breakEven;
  const breakEvenPercent = finData.breakEven > 0 ? (breakEvenDiff / finData.breakEven) * 100 : 0;
  const metaLojaDiff = receitaBruta - goalsData.metaConservadora;
  const metaLojaPercent = goalsData.metaConservadora > 0 ? (metaLojaDiff / goalsData.metaConservadora) * 100 : 0;

  const computeScenario = (sc) => {
    try {
      const keyB = `${selectedStore}-${selectedMonth}-${selectedYear}-base`;
      const keyS = `${selectedStore}-${selectedMonth}-${selectedYear}-${sc}`;
      const base = dreValues[keyB] || {};
      const sv = dreValues[keyS] || {};
      const res = (field, def) => {
        const v = sc === 'base' ? sv[field] : (sv[field] !== undefined ? sv[field] : base[field]);
        return (v !== undefined && v !== null) ? v : (def || 0);
      };
      const rb = sc === 'base' ? totalSalesMonth : (sv.receitaBruta !== undefined ? sv.receitaBruta : (base.receitaBruta !== undefined ? base.receitaBruta : totalSalesMonth));
      const ded = rb * ((res('percImpostos', finData.config.variableCosts.imposto || 8) + res('percTaxasCartao', finData.config.variableCosts.taxaCartao || 2)) / 100);
      const rl = rb - ded;
      
      const cmvP = res('percCMV', finData.config.variableCosts.cmv || 50);
      const embalagensObsoP = res('percEmbalagens', finData.config.variableCosts.embalagem || 0.7) + res('percObsolescencia', finData.config.variableCosts.obsoleto || 5);
      const totalCustoProd = rb * ((cmvP + embalagensObsoP) / 100);
      
      const mc = rl - totalCustoProd;
      const df = res('aluguel', finData.config.fixedCosts.aluguel || 0) + res('proLabore', finData.config.fixedCosts.proLabore || 0) + res('agua', finData.config.fixedCosts.agua || 0) + res('luz', finData.config.fixedCosts.luz || 0) + res('internet', finData.config.fixedCosts.internet || 0) + res('software', finData.config.fixedCosts.software || 0) + res('contabilidade', finData.config.fixedCosts.contabilidade || 0) + res('salarios', finData.config.fixedCosts.colaboradoras || 0) + res('administracao', finData.config.fixedCosts.adm || 0) + res('alimentacao', finData.config.fixedCosts.alimentacao || 0) + res('transporte', finData.config.fixedCosts.transporte || 0);
      const ro = mc - df;
      return { rb, rl, mc, df, ro, mg: rb > 0 ? (ro / rb) * 100 : 0 };
    } catch (e) {
      return { rb: 0, lb: 0, rl: 0, df: 0, ro: 0, mg: 0 };
    }
  };
  const sc = { base: computeScenario('base'), otimista: computeScenario('otimista'), pessimista: computeScenario('pessimista') };

  const SCENARIOS = [
    { id: 'base', label: '📊 Base', activeClass: 'bg-emerald-600 text-white border-emerald-600', hoverClass: 'hover:border-emerald-300 hover:bg-emerald-50', description: 'Valores reais da loja' },
    { id: 'otimista', label: '🚀 Otimista', activeClass: 'bg-blue-600 text-white border-blue-600', hoverClass: 'hover:border-blue-300 hover:bg-blue-50', description: 'Herda base, ajuste positivo' },
    { id: 'pessimista', label: '⚠️ Pessimista', activeClass: 'bg-orange-500 text-white border-orange-500', hoverClass: 'hover:border-orange-300 hover:bg-orange-50', description: 'Herda base, ajuste conservador' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-white to-emerald-50/30 p-6 rounded-2xl border border-emerald-100 shadow-lg no-print">
        <h2 className="text-2xl font-bold text-emerald-800 flex items-center gap-2 mb-4"><PieChart className="w-6 h-6" /> DRE - Demonstração do Resultado do Exercício</h2>
        <div className="flex flex-wrap gap-3 mb-5">
          <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)} className="border border-emerald-200 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none">{Object.entries(STORE_CONFIGS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select>
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="border border-emerald-200 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none">{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>)}</select>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="border border-emerald-200 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none">{Array.from({ length: 5 }, (_, i) => <option key={i} value={2023 + i}>{2023 + i}</option>)}</select>
        </div>
        <div className="flex flex-wrap gap-3">
          {SCENARIOS.map(({ id, label, activeClass, hoverClass, description }) => (
            <button key={id} onClick={() => setDreScenario(id)}
              className={`flex flex-col items-start px-4 py-3 rounded-xl border-2 text-left transition-all text-sm font-medium shadow-sm ${dreScenario === id
                ? `${activeClass} shadow-md scale-[1.03]`
                : `bg-white text-gray-700 border-gray-200 ${hoverClass}`
                }`}>
              <span className="font-bold">{label}</span>
              <span className={`text-xs mt-0.5 ${dreScenario === id ? 'opacity-80' : 'text-gray-400'}`}>{description}</span>
            </button>
          ))}
          {dreScenario !== 'base' && (
            <button onClick={() => { if (window.confirm('Limpar alterações deste cenário?')) deleteDreKey(dreKey); }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-all self-center">
              <X className="w-4 h-4" /> Resetar cenário
            </button>
          )}
        </div>
      </div>

      {dreScenario !== 'base' && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-bold text-blue-900">Receita Bruta — Simulação</div>
              <div className="text-xs text-blue-600 mt-1">Cenário base: {formatCurrency(receitaBrutaBase)} (vendas reais)</div>
            </div>
            <div className="flex items-center gap-3">
              <input type="number" step="100" value={receitaBrutaEdit}
                onChange={e => updateDreValue('receitaBruta', e.target.value)}
                className="w-36 border-2 border-blue-300 rounded-xl px-3 py-2 text-right font-mono font-bold text-blue-900 focus:ring-2 focus:ring-blue-400 focus:outline-none text-lg" />
              <span className="text-blue-600 text-sm font-medium">
                {receitaBrutaEdit !== receitaBrutaBase
                  ? `${receitaBrutaEdit > receitaBrutaBase ? '+' : ''}${(((receitaBrutaEdit - receitaBrutaBase) / receitaBrutaBase) * 100).toFixed(1)}% vs base`
                  : 'Igual ao base'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded-2xl text-white shadow-xl ${resultadoOperacional >= 0 ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700' : 'bg-gradient-to-br from-red-500 via-red-600 to-red-800'}`}>
          <h3 className="text-sm opacity-90 font-medium">Resultado Operacional</h3>
          <div className="text-4xl font-bold mt-1">{formatCurrency(resultadoOperacional)}</div>
          <div className="mt-4 pt-4 border-t border-white/30">
            <div className="flex justify-between text-sm"><span className="opacity-90">Margem:</span><span className="font-bold">{margemOperacional.toFixed(2)}%</span></div>
            <div className="flex justify-between text-xs mt-1 opacity-75"><span>Receita Bruta:</span><span>{formatCurrency(receitaBruta)}</span></div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-2xl shadow-xl">
          <h3 className="text-sm opacity-90 font-medium">Break Even</h3>
          <div className="text-3xl font-bold mt-1">{formatCurrency(finData.breakEven)}</div>
          <div className="mt-4 pt-4 border-t border-white/30 text-xs">
            <div className="flex justify-between"><span>Resultado vs BE:</span><span className="font-bold">{breakEvenDiff >= 0 ? '+' : ''}{formatCurrency(breakEvenDiff)}</span></div>
            <div className="flex justify-between mt-1 opacity-75"><span>Variação:</span><span>{breakEvenPercent.toFixed(1)}%</span></div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-purple-700 text-white p-6 rounded-2xl shadow-xl">
          <h3 className="text-sm opacity-90 font-medium">🥇 Meta Ouro (Loja)</h3>
          <div className="text-3xl font-bold mt-1">{formatCurrency(goalsData.metaConservadora)}</div>
          <div className="mt-4 pt-4 border-t border-white/30 text-xs">
            <div className="flex justify-between"><span>Resultado vs Meta:</span><span className="font-bold">{metaLojaDiff >= 0 ? '+' : ''}{formatCurrency(metaLojaDiff)}</span></div>
            <div className="flex justify-between mt-1 opacity-75"><span>Variação:</span><span>{metaLojaPercent.toFixed(1)}%</span></div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-lg">
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5 rounded-xl shadow-md">
            <div className="flex justify-between items-center"><span className="font-bold text-lg">1. Receita Bruta de Vendas</span><span className="font-bold text-3xl">{formatCurrency(receitaBruta)}</span></div>
            {dreScenario === 'base' && <div className="text-xs opacity-75 mt-1">Fonte: vendas reais do período importadas</div>}
          </div>
          <div className="ml-6 space-y-3">
            <div className="font-bold text-gray-700 text-sm uppercase tracking-wide">(-) Impostos e Deduções Diretas:</div>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Impostos', 'percImpostos', impostos, finData.config.variableCosts.imposto],
                ['Taxas Cartão', 'percTaxasCartao', taxasCartao, finData.config.variableCosts.taxaCartao],
              ].map(([label, field, val, defaultVal]) => (
                <div key={field} className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <div className="flex justify-between items-center mb-2"><span className="text-sm font-semibold text-orange-900">{label}</span><span className="font-bold text-orange-900">{formatCurrency(val)}</span></div>
                  <div className="flex items-center gap-2 text-xs">
                    <input type="number" step="0.01" value={resolveField(field, defaultVal)} onChange={e => updateDreValue(field, e.target.value)} className="w-16 border border-orange-300 rounded px-2 py-1 text-center font-mono focus:ring-2 focus:ring-orange-400" />
                    <span className="text-orange-700">%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-100 rounded-lg border border-orange-300"><span className="font-bold text-orange-900">Total Deduções</span><span className="font-bold text-xl text-orange-900">{formatCurrency(deducoesReceita)}</span></div>
          </div>
          <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white p-5 rounded-xl shadow-md">
            <div className="flex justify-between items-center"><div><div className="font-bold text-lg">2. Receita Líquida</div><div className="text-sm opacity-90">= Receita Bruta − Impostos · Margem: {margemLiquida.toFixed(2)}%</div></div><span className="font-bold text-3xl">{formatCurrency(receitaLiquida)}</span></div>
          </div>
          <div className="ml-6 bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
            <div className="flex justify-between items-center mb-2"><span className="font-bold text-red-900 uppercase">(-) Custos Variáveis (CMV & Logística)</span></div>
            <div className="flex justify-between items-center mb-2 mt-4"><span className="font-semibold text-red-800">Custo da Mercadoria Vendida (CMV)</span><span className="font-bold text-xl text-red-800">{formatCurrency(cmv)}</span></div>
            <div className="flex items-center gap-2 text-sm"><span className="text-red-700">Percentual:</span><input type="number" step="0.01" value={percCMV} onChange={e => updateDreValue('percCMV', e.target.value)} className="w-20 border border-red-300 rounded px-2 py-1 text-center font-mono focus:ring-2 focus:ring-red-400" /><span className="text-red-700">%</span></div>
            
            <div className="mt-4 pt-3 border-t border-red-200 grid grid-cols-2 gap-4">
              {[
                ['Embalagens', 'percEmbalagens', embalagens, finData.config.variableCosts.embalagem],
                ['Obsolescência', 'percObsolescencia', obsolescencia, finData.config.variableCosts.obsoleto],
              ].map(([label, field, val, defaultVal]) => (
                <div key={field} className="bg-red-100/50 p-2 rounded-lg border border-red-200">
                  <div className="flex justify-between items-center mb-1"><span className="text-xs font-semibold text-red-900">{label}</span><span className="font-bold text-sm text-red-900">{formatCurrency(val)}</span></div>
                  <div className="flex items-center gap-2 text-xs">
                    <input type="number" step="0.01" value={resolveField(field, defaultVal)} onChange={e => updateDreValue(field, e.target.value)} className="w-14 border border-red-300 rounded px-1.5 py-0.5 text-center font-mono focus:ring-2 focus:ring-red-400" />
                    <span className="text-red-700">%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-red-200"><span className="font-bold text-red-900 text-sm">Total Custos Variáveis</span><span className="font-bold text-lg text-red-900">{formatCurrency(totalCMV)}</span></div>
          </div>
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-5 rounded-xl shadow-md">
            <div className="flex justify-between items-center"><div><div className="font-bold text-lg">3. Margem de Contribuição</div><div className="text-sm opacity-90">= Rec. Líquida − Variáveis · Margem: {percMargemContribuicao.toFixed(2)}%</div></div><span className="font-bold text-3xl">{formatCurrency(margemContribuicao)}</span></div>
          </div>
          <div className="ml-6 space-y-3">
            <div className="font-bold text-gray-700 text-sm uppercase tracking-wide">(-) Despesas Operacionais Fixas:</div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                ['Aluguel', 'aluguel', aluguel, finData.config.fixedCosts.aluguel],
                ['Pró-labore', 'proLabore', proLabore, finData.config.fixedCosts.proLabore],
                ['Salários + Encargos', 'salarios', salarios, finData.config.fixedCosts.colaboradoras],
                ['Água', 'agua', agua, finData.config.fixedCosts.agua],
                ['Luz', 'luz', luz, finData.config.fixedCosts.luz],
                ['Internet', 'internet', internet, finData.config.fixedCosts.internet],
                ['Software', 'software', software, finData.config.fixedCosts.software],
                ['Contabilidade', 'contabilidade', contabilidade, finData.config.fixedCosts.contabilidade],
                ['Administração', 'administracao', administracao, finData.config.fixedCosts.adm],
                ['Alimentação', 'alimentacao', alimentacao, finData.config.fixedCosts.alimentacao],
                ['Transporte', 'transporte', transporte, finData.config.fixedCosts.transporte],
              ].map(([label, field, val, defaultVal]) => (
                <div key={field} className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <div className="text-xs text-purple-700 mb-1">{label}</div>
                  <input type="number" step="0.01" value={resolveField(field, defaultVal)} onChange={e => updateDreValue(field, e.target.value)} className="w-full border border-purple-300 rounded px-2 py-1.5 font-mono font-bold text-purple-900 focus:ring-2 focus:ring-purple-400" />
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center p-4 bg-purple-100 rounded-lg border border-purple-300"><span className="font-bold text-purple-900">Total Despesas Fixas</span><span className="font-bold text-2xl text-purple-900">{formatCurrency(totalDespesasFixas)}</span></div>
          </div>
          <div className={`p-6 rounded-xl shadow-xl border-4 ${resultadoOperacional >= 0 ? 'bg-gradient-to-r from-emerald-600 to-green-700 border-emerald-400' : 'bg-gradient-to-r from-red-600 to-red-800 border-red-400'} text-white`}>
            <div className="flex justify-between items-center">
              <div><div className="text-xl font-bold mb-1">4. {resultadoOperacional >= 0 ? 'LUCRO' : 'PREJUÍZO'} LÍQUIDO</div><div className="text-sm opacity-90">= Margem de Contribuição − Fixo · Margem: {margemOperacional.toFixed(2)}%</div></div>
              <span className="font-bold text-5xl">{formatCurrency(Math.abs(resultadoOperacional))}</span>
            </div>
          </div>
          <div className="mt-6 p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-blue-200">
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-600" /> Indicadores de Performance</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[['Margem Bruta (Líquida)', margemLiquida, 'teal'], ['Margem Contribuição', percMargemContribuicao, 'emerald'], ['Lucro Líquido', margemOperacional, resultadoOperacional >= 0 ? 'green' : 'red'], ['CMV / Receita', percCMV, 'red'], ['Custos Fixos / Receita', receitaBruta > 0 ? (totalDespesasFixas / receitaBruta * 100) : 0, 'purple']].map(([label, val, color]) => (
                <div key={label} className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="text-xs text-gray-600 mb-1">{label}</div>
                  <div className={`text-2xl font-bold text-${color}-700`}>{parseFloat(val).toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
        <h3 className="font-bold text-gray-800 text-lg mb-5 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-emerald-600" /> Comparativo de Cenários</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 pr-4 text-gray-600 font-semibold">Indicador</th>
                <th className="text-right py-3 px-4 text-emerald-700 font-bold">📊 Base</th>
                <th className="text-right py-3 px-4 text-blue-700 font-bold">🚀 Otimista</th>
                <th className="text-right py-3 px-4 text-orange-700 font-bold">⚠️ Pessimista</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ['Receita Bruta', s => s.rb, 'currency'],
                ['Receita Líquida', s => s.rl, 'currency'],
                ['Margem Contrib.', s => s.mc, 'currency'],
                ['Despesas Fixas', s => s.df, 'currency'],
                ['Lucro Líquido', s => s.ro, 'currency'],
                ['Margem Lucro', s => s.mg, 'percent'],
              ].map(([label, fn, fmt]) => {
                const vals = { base: fn(sc.base), otimista: fn(sc.otimista), pessimista: fn(sc.pessimista) };
                return (
                  <tr key={label} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4 text-gray-700 font-medium">{label}</td>
                    {['base', 'otimista', 'pessimista'].map(sid => {
                      const v = vals[sid];
                      const isActive = sid === dreScenario;
                      const isNeg = v < 0;
                      return (
                        <td key={sid} className={`text-right py-3 px-4 font-mono font-bold rounded transition-all ${isActive ? 'bg-emerald-50' : ''
                          } ${isNeg ? 'text-red-600' : sid === 'otimista' ? 'text-blue-700' : sid === 'pessimista' ? 'text-orange-700' : 'text-emerald-700'}`}>
                          {fmt === 'currency' ? formatCurrency(v) : `${v.toFixed(1)}%`}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}