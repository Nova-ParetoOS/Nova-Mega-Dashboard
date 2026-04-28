import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Target, Printer, Upload, BarChart3, TrendingUp, Sparkles, AlertOctagon, Users, TrendingDown, Award, AlertTriangle, Search, ChevronRight, Calculator, Calendar, ChevronLeft, DollarSign, CheckCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency, getMonthName, parseCurrency } from '../utils/formatters';
import * as XLSX from 'xlsx';

export function Metas({
  goalsSellerOverride,
  getFinancialData,
  selectedStore,
  selectedMonth,
  selectedYear,
  STORE_CONFIGS,
  getGoalsData,
  getHistoricalDataForStorePeriod,
  setPrintMode,
  // setShowImportModal removido — modal de histórico agora é local neste componente
  setSelectedStore,
  setSelectedMonth,
  setSelectedYear,
  showGlobalRanking,
  setShowGlobalRanking,
  hasAllYearsData,
  calculateTrend,
  hasHistoricalData,
  setGoalsSellerOverride,
  getSellerStatus,
  toggleSellerStatus,
  upsertSalesHistory,
  dashboardStats,
  projectionSellers,
  setProjectionSellers,
  selectedSellerNames: _legacySelectedSellerNames,
  setSelectedSellerNames: _legacySetSelectedSellerNames,
  // these are passed by App.jsx but not used directly — kept for forward-compat
  activeTab,
  salesHistory,
  getMonthName: _getMonthName,
  formatCurrency: _formatCurrency,
  calculateTrend: _calculateTrend2,
}) {
  const [selectedSellerNames, setSelectedSellerNames] = useState(new Set());
  const [expandedMonthRow, setExpandedMonthRow] = useState(null);

  // ── Helper Matemático de Predição (Pacing Rate) ────────────────────────
  const extrapolateSales = (totalAccumulated, targetMonth, targetYear) => {
    const today = new Date();
    // Se for o passado histórico, extrapolação é inútil - retorna valor nominal
    if (today.getMonth() + 1 !== targetMonth || today.getFullYear() !== targetYear) {
        return totalAccumulated;
    }
    
    // Predição matemática Regra de 3 (Dias corridos vs Dias totais do mês)
    const currentDay = today.getDate() || 1;
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    
    return (totalAccumulated / currentDay) * daysInMonth;
  };

  // ── Modal de Importação de Histórico de Vendas (local) ──────────────────
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [histImportStore, setHistImportStore] = useState(selectedStore || '');
  const [histImportMonth, setHistImportMonth] = useState(selectedMonth || new Date().getMonth() + 1);
  const [histImportYear, setHistImportYear] = useState(selectedYear || new Date().getFullYear());
  const [histImportText, setHistImportText] = useState('');
  const [clearBeforeImport, setClearBeforeImport] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ── Estados para Upload de Planilha (XLSX/CSV) ─────────────────────────
  const [importTab, setImportTab] = useState('text'); // 'text' ou 'file'
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleDrag = function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };
  
  const handleDrop = function(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setFileName(file.name);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Converte o array da planilha para o texto compatível com o parser existente (para não quebrar a Fonte da Verdade)
      const mappedText = rows.map(r => r.join('\t')).join('\n');
      setHistImportText(mappedText);
      toast.success('Planilha carregada. Clique em Salvar para processar!');
    } catch (e) {
      toast.error('Erro ao processar planilha: ' + e.message);
    }
  };


  if (!STORE_CONFIGS) return <div className="p-8 text-gray-400 text-center animate-pulse">Carregando Módulo (Metas)...</div>;

  const effectiveSellers = goalsSellerOverride != null ? goalsSellerOverride : (getFinancialData?.(selectedStore, selectedMonth, selectedYear)?.activeSellers || STORE_CONFIGS[selectedStore]?.collaborators || 3);
  const goalsData = getGoalsData(selectedStore, selectedMonth, goalsSellerOverride);
  const currentSales = getHistoricalDataForStorePeriod(selectedStore, selectedMonth, selectedYear).reduce((acc, r) => acc + r.totalSales, 0);

  // ── HOTFIX: openImportModal estava referenciada no JSX mas não declarada ──
  const openImportModal = () => {
    setHistImportStore(selectedStore || '');
    setHistImportMonth(selectedMonth || new Date().getMonth() + 1);
    setHistImportYear(selectedYear || new Date().getFullYear());
    setHistImportText('');
    setClearBeforeImport(false);
    setImportTab('text');
    setFileName('');
    setShowHistoryModal(true);
  };

  const processHistoryImport = async () => {
    if (!histImportText.trim()) return;
    setIsSubmitting(true);

    try {
      // ── Mapeamento ESTRITO de loja ───────────────────────────────────────
      const STORE_CODE_MAP = {
        'Loja 03': '3', 'Loja 3': '3', '3': '3',
        'Loja 04': '4', 'Loja 4': '4', '4': '4',
        'Loja 07': '7', 'Loja 7': '7', '7': '7',
        'Loja 08': '8', 'Loja 8': '8', '8': '8',
        'Loja 10': '10', '10': '10',
      };
      const storeLabel = STORE_CONFIGS[histImportStore]?.name || histImportStore;
      const lojaTraduzida = STORE_CODE_MAP[storeLabel] ?? STORE_CODE_MAP[histImportStore] ?? String(histImportStore);

      // Helper pt-BR
      const parseCurrency = (str) => {
        if (typeof str === 'number') return str;
        if (!str) return 0;
        return parseFloat(String(str).replace(/\./g, '').replace(',', '.')) || 0;
      };

      // Período
      const mes = String(histImportMonth).padStart(2, '0');
      const periodYYYYMM = `${histImportYear}-${mes}`;
      const periodFormatado = `${histImportYear}-${mes}-01`;
      const allRows = histImportText.trim().split('\n');

      // 🔥 SMART PARSER 2.0 (Focado no Dropdown e Código da Vendedora) 🔥
      const entries = allRows.map(row => {
        // Prioriza TAB, depois tenta espaços múltiplos
        let cols = row.includes('\t') ? row.split('\t') : row.trim().split(/\s{2,}/);
        cols = cols.map(c => c.trim());

        // Baixamos a exigência para 11 colunas (garante que lê até o Total Vendas e Ticket)
        if (cols.length < 11) return null;

        const lojaStr = (cols[0] || '').toUpperCase().trim();
        // Ignora cabeçalhos ou linhas de TOTAL
        if (!lojaStr || lojaStr === 'TOTAL' || lojaStr === 'LOJA' || isNaN(parseInt(lojaStr))) return null;

        const sellerCode = cols[1] || ''; // Captura o Código da Vendedora (Coluna 2)
        const sellerName = (cols[2] || '').trim();

        if (!sellerName || sellerName.toUpperCase() === 'TOTAL') return null;

        return {
          storeCode: lojaTraduzida, // 🔥 FIM DO AUTO-ROUTING: Manda pra loja selecionada no Modal!
          sellerCode: sellerCode,    // Salva o código da vendedora
          sellerName: sellerName,
          daysWorked: parseInt(cols[3]) || 0,
          salesCount: parseInt(cols[4]) || 0,
          itemsCount: parseInt(cols[6]) || 0,
          pa: parseCurrency(cols[8]),
          totalSales: parseCurrency(cols[10]),
          ticketAvg: parseCurrency(cols[12]),
          priceAvg: cols[13] ? parseCurrency(cols[13]) : 0,
          period: periodFormatado,
        };
      }).filter(Boolean);

      console.log('[Metas Import] Linhas cruas:', allRows.length);
      console.log('[Metas Import] Válidas:', entries.length);

      if (entries.length === 0) {
        toast.error('Nenhuma linha válida encontrada.\nVerifique se copiou a tabela corretamente.');
        return;
      }

      if (typeof upsertSalesHistory !== 'function') {
        toast.error('Erro interno: função de importação não disponível no componente.');
        return;
      }

      await upsertSalesHistory(
        entries,
        clearBeforeImport ? lojaTraduzida : null,
        clearBeforeImport ? periodYYYYMM : null
      );

      // Sincroniza seletores da tela principal
      if (typeof setSelectedStore === 'function') setSelectedStore(histImportStore);
      if (typeof setSelectedMonth === 'function') setSelectedMonth(histImportMonth);
      if (typeof setSelectedYear === 'function') setSelectedYear(histImportYear);

      toast.success(`${entries.length} vendedora(s) importadas com sucesso!`);
      setShowHistoryModal(false);
      setHistImportText('');
      setClearBeforeImport(false);

    } catch (e) {
      console.error('[Metas Import] ERRO NO UPSERT:', e);
      toast.error('Erro no banco: ' + (e.message || JSON.stringify(e)));
    } finally {
      setIsSubmitting(false); // Libera o botão
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-white to-indigo-50/30 p-6 rounded-2xl border border-indigo-100 shadow-lg no-print">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-indigo-800 flex items-center gap-2"><Target className="w-6 h-6" /> Metas</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => { setPrintMode(true); setTimeout(() => { window.print(); setPrintMode(false); }, 300); }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600 transition-all no-print">
                <Printer className="w-4 h-4" /> Imprimir
              </button>
              <button onClick={openImportModal} className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-md hover:shadow-lg transition-all"><Upload className="w-4 h-4" /> Importar Histórico</button>
            </div>
          </div>
          <div className="flex gap-4 mb-6">
            <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)} className="border border-indigo-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none">{Object.entries(STORE_CONFIGS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select>
            <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="border border-indigo-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none">{Array.from({ length: 12 }, (_, i) => { const isFuture = selectedYear === new Date().getFullYear() && i + 1 > new Date().getMonth() + 1; return <option key={i + 1} value={i + 1} disabled={isFuture} className={isFuture ? 'text-gray-300' : 'text-gray-900'}>{getMonthName(i + 1)}</option>; })}</select>
            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="border border-indigo-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none">{Array.from({ length: new Date().getFullYear() - 2021 + 1 }, (_, i) => <option key={i} value={2021 + i}>{2021 + i}</option>)}</select>
          </div>
          {/* SELLER COUNT QUICK PICKER */}
          {(() => {
            // Active sellers for selected store+month across recent years, deduplicated
            const activeNamesSet = new Set();
            [selectedYear, selectedYear - 1].forEach(yr => {
              getHistoricalDataForStorePeriod(selectedStore, selectedMonth, yr)
                .filter(r => getSellerStatus(selectedStore, selectedMonth, yr, r.sellerName, r.daysWorked) === 'active')
                .forEach(r => activeNamesSet.add(r.sellerName));
            });
            const activeNames = [...activeNamesSet];
            const PICKER_COLORS = ['#f59e0b', '#10b981', '#e11d48', '#3b82f6', '#a855f7'];

            // Derived: how many are selected via chips (0 = none clicked yet)
            const chipCount = selectedSellerNames.size;
            // The count shown on number buttons: chip-driven if chips used, else goalsSellerOverride
            const activeCount = chipCount > 0 ? chipCount : goalsSellerOverride;

            const toggleChip = (name) => {
              setSelectedSellerNames(prev => {
                const next = new Set(prev);
                if (next.has(name)) { next.delete(name); } else { next.add(name); }
                // Sync number override to chip count
                const newCount = next.size;
                setGoalsSellerOverride(newCount > 0 ? newCount : null);
                return next;
              });
            };

            const handleCountBtn = (n) => {
              setGoalsSellerOverride(n);
              // Clear chip selection so chips reflect the manual number
              setSelectedSellerNames(new Set());
            };

            return (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-bold text-indigo-800">Vendedoras ativas — cenário de metas:</span>
                  </div>
                  {(goalsSellerOverride !== null || selectedSellerNames.size > 0) && (
                    <button onClick={() => { setGoalsSellerOverride(null); setSelectedSellerNames(new Set()); }}
                      className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                      <X className="w-3 h-3" /> Limpar
                    </button>
                  )}
                </div>

                {/* Seller name chips — clickable */}
                {activeNames.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-indigo-100">
                    {activeNames.map((name, i) => {
                      const isSelected = selectedSellerNames.has(name);
                      const isHighlighted = chipCount === 0
                        ? (goalsSellerOverride === null || i < (goalsSellerOverride ?? activeNames.length))
                        : isSelected;
                      const color = PICKER_COLORS[i % PICKER_COLORS.length];
                      return (
                        <button
                          key={name}
                          onClick={() => toggleChip(name)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${isHighlighted
                            ? 'bg-white text-gray-900 shadow-md scale-105'
                            : 'bg-gray-50 border-gray-100 text-gray-400 opacity-50 hover:opacity-80'
                            }`}
                          style={isHighlighted ? { borderColor: color, boxShadow: `0 0 0 1.5px ${color}55` } : {}}
                        >
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: isHighlighted ? color : '#d1d5db' }} />
                          {name}
                          {isSelected && <span className="ml-0.5 text-xs" style={{ color }}>✓</span>}
                        </button>
                      );
                    })}
                    {chipCount > 0 && (
                      <div className="flex items-center px-2 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold">
                        {chipCount} selecionada{chipCount !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic mb-3 pb-3 border-b border-indigo-100">
                    Sem vendedoras com histórico importado para {getMonthName(selectedMonth)}/{selectedYear}
                  </p>
                )}

                {/* Count buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-indigo-600 font-medium mr-1">Dividir meta entre:</span>
                  {[null, 1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => handleCountBtn(n)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${activeCount === n
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                        : 'bg-white text-indigo-700 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50'
                        }`}
                    >
                      {n === null ? `Auto (${effectiveSellers})` : `${n}`}
                    </button>
                  ))}
                  {activeCount !== null && (
                    <span className="text-xs text-indigo-400 italic ml-1">
                      → metas para <span className="font-bold text-indigo-600">{activeCount} vendedora{activeCount !== 1 ? 's' : ''}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
        {/* ═══ COMPACT KPI ROW — 4 cards, no wrap ═══ */}
        {(() => {
          const prata = goalsData.metaPrataLoja || 0;
          const ouro = goalsData.metaOuroLoja || 0;
          const be = goalsData.breakEven || 0;
          const pctP = prata > 0 ? Math.min(100, (currentSales / prata) * 100) : 0;
          const pctO = ouro > 0 ? Math.min(100, (currentSales / ouro) * 100) : 0;
          const pctBE = be > 0 ? Math.min(100, (currentSales / be) * 100) : 0;
          const hitP = currentSales >= prata && prata > 0;
          const hitO = currentSales >= ouro && ouro > 0;
          const hitBE = currentSales >= be && be > 0;

          // SVG ring helper
          const Ring = ({ pct, color, size = 44 }) => {
            const r = 16, circ = 2 * Math.PI * r;
            const offset = circ - (pct / 100) * circ;
            return (
              <svg width={size} height={size} viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r={r} fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
                <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3.5"
                  strokeDasharray={circ} strokeDashoffset={offset}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
              </svg>
            );
          };

          const TooltipIcon = ({ tip }) => (
            <span
              title={tip}
              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[9px] font-black cursor-help select-none hover:bg-indigo-100 hover:text-indigo-600 transition-colors shrink-0"
            >?</span>
          );

          return (
            <div className="flex gap-3 overflow-x-auto pb-1 no-print" style={{ scrollbarWidth: 'none' }}>

              {/* Card 1 — Vendas Realizadas */}
              <div className="flex-1 min-w-[160px] bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-2xl p-4 shadow-lg flex flex-col gap-1 relative">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide opacity-90">
                  <span>💰</span> Vendas Realizadas
                  <TooltipIcon tip={`${getMonthName(selectedMonth)}/${selectedYear} · Soma de todas as vendas da loja no período`} />
                </div>
                <div className="text-2xl font-black leading-tight">{formatCurrency(currentSales)}</div>
                <div className="text-xs opacity-75 mt-auto">{getMonthName(selectedMonth)}/{selectedYear}</div>
              </div>

              {/* Card 2 — Meta Prata + ring */}
              <div className={`flex-1 min-w-[160px] rounded-2xl p-4 shadow-lg flex flex-col gap-1 border-2 ${hitP ? 'bg-slate-700 text-white border-slate-500' : 'bg-slate-50 text-slate-800 border-slate-200'}`}>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide opacity-90">
                  <span>🥈</span> Meta Prata
                  <TooltipIcon tip={`Fórmula Prata Loja = P_ind × Vendedoras | P_ind = Max(Média×1,10 ; Teto Recorde) | Trava mínima: Bronze Loja`} />
                </div>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <div className="text-2xl font-black leading-tight">{formatCurrency(prata)}</div>
                    <div className={`text-xs mt-1 font-semibold ${hitP ? 'text-green-300' : 'text-slate-500'}`}>
                      {hitP ? '✔ Batida!' : `faltam ${formatCurrency(Math.max(0, prata - currentSales))}`}
                    </div>
                  </div>
                  <div className="relative shrink-0">
                    <Ring pct={pctP} color={hitP ? '#86efac' : '#94a3b8'} />
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black"
                      style={{ transform: 'rotate(0deg)' }}>{pctP.toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* Card 3 — Meta Ouro + ring */}
              <div className={`flex-1 min-w-[160px] rounded-2xl p-4 shadow-lg flex flex-col gap-1 border-2 ${hitO ? 'bg-amber-500 text-white border-amber-400' : 'bg-amber-50 text-amber-900 border-amber-200'}`}>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide opacity-90">
                  <span>🥇</span> Meta Ouro
                  <TooltipIcon tip={`Fórmula Ouro Loja = MAX(Break-Even ; Média×1,15×1,02) | Trava mínima: Prata Loja`} />
                </div>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <div className="text-2xl font-black leading-tight">{formatCurrency(ouro)}</div>
                    <div className={`text-xs mt-1 font-semibold ${hitO ? 'text-yellow-100' : 'text-amber-600'}`}>
                      {hitO ? '✔ Atingida!' : `faltam ${formatCurrency(Math.max(0, ouro - currentSales))}`}
                    </div>
                  </div>
                  <div className="relative shrink-0">
                    <Ring pct={pctO} color={hitO ? '#fde68a' : '#f59e0b'} />
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black">{pctO.toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* Card 4 — Break-Even */}
              <div className={`flex-1 min-w-[160px] rounded-2xl p-4 shadow-lg flex flex-col gap-1 border-2 ${hitBE ? 'bg-gray-700 text-white border-gray-500' : 'bg-gray-50 text-gray-800 border-gray-200'}`}>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide opacity-90">
                  <span>⚖️</span> Break-Even
                  <TooltipIcon tip={`Custos Fixos + Custos Variáveis da loja. Ponto onde a loja cobre seus custos sem lucro nem prejuízo.`} />
                </div>
                <div className="text-2xl font-black leading-tight">{formatCurrency(be)}</div>
                <div className={`text-xs mt-1 font-semibold ${hitBE ? 'text-green-300' : 'text-gray-500'}`}>
                  {hitBE
                    ? '✔ Contas pagas'
                    : be > 0
                      ? `faltam ${formatCurrency(Math.max(0, be - currentSales))}`
                      : 'Não configurado'}
                </div>
              </div>

            </div>
          );
        })()}




        {/* === RESUMO DE ATINGIMENTO — standalone card === */}
        {
          (() => {
            const currentYear = new Date().getFullYear();
            // Get current month's sellers for selected store
            const curRecords = getHistoricalDataForStorePeriod(selectedStore, selectedMonth, currentYear);
            const curActive = curRecords.filter(r => getSellerStatus(selectedStore, selectedMonth, currentYear, r.sellerName, r.daysWorked) === 'active');
            const curSellers = [...curActive].sort((a, b) => b.totalSales - a.totalSales);
            if (curSellers.length === 0) return (
              <div className="bg-white rounded-2xl border border-indigo-100 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-gray-500 to-gray-700 text-white px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    <span className="font-bold text-sm">Resumo de Atingimento — {getMonthName(selectedMonth)}/{currentYear}</span>
                  </div>
                  <div className="text-sm font-bold opacity-90">Loja: Sem Dados</div>
                </div>
                <div className="p-8 text-center text-gray-500 font-medium">Nenhuma vendedora ativa encontrada com vendas neste período.</div>
              </div>
            );
            
            const totalVendasRaw = curSellers.reduce((acc, s) => acc + s.totalSales, 0);
            const totalVendas = extrapolateSales(totalVendasRaw, selectedMonth, currentYear);
            const n = goalsSellerOverride != null ? goalsSellerOverride : (curSellers.length || 1);
            const yg = getGoalsData(selectedStore, selectedMonth, n);
            const bInd = yg.metaBronzeInd, pInd = yg.metaPrataInd, oInd = yg.metaOuroInd;
            const bLoja = yg.metaBronzeLoja, pLoja = yg.metaPrataLoja, oLoja = yg.metaOuroLoja;
            const lojaOuro = totalVendas >= oLoja;
            const lojaPrata = totalVendas >= pLoja;
            const lojaBronze = totalVendas >= bLoja;
            const lojaMedal = lojaOuro ? '🥇 OURO' : lojaPrata ? '🥈 PRATA' : lojaBronze ? '🥉 BRONZE' : null;
            const lojaNext = lojaOuro ? null : lojaPrata ? { label: 'Ouro', val: oLoja } : lojaBronze ? { label: 'Prata', val: pLoja } : { label: 'Bronze', val: bLoja };
            const lojaBg = lojaOuro ? 'from-yellow-600 to-amber-700' : lojaPrata ? 'from-slate-500 to-slate-700' : lojaBronze ? 'from-amber-700 to-amber-900' : 'from-red-700 to-red-900';
            return (
              <div className="bg-white rounded-2xl border border-indigo-100 shadow-lg overflow-hidden">
                 <div className={`bg-gradient-to-r ${lojaBg} text-white px-5 py-3 flex items-center justify-between`}>
                   <div className="flex items-center gap-2">
                     <Award className="w-5 h-5" />
                     <span className="font-bold text-sm">Resumo de Atingimento — {getMonthName(selectedMonth)}/{currentYear}</span>
                   </div>
                   <div className="text-sm font-bold opacity-90">{lojaMedal ? `Loja: ${lojaMedal}` : 'Loja: Abaixo do Bronze'}</div>
                 </div>
                 <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">🏆 Rastreamento Individual</div>
                    <div className="space-y-4">
                      {curSellers.map((seller, idx) => {
                        const vRaw = seller.totalSales;
                        const v = extrapolateSales(vRaw, selectedMonth, currentYear);
                        const hitO = v >= oInd, hitP = v >= pInd, hitB = v >= bInd;
                        const isTop = idx === 0; // já ordenado por totalSales desc
                        const medal = hitO ? '🥇' : hitP ? '🥈' : hitB ? '🥉' : null;
                        const SELLER_COLORS = ['#f59e0b', '#10b981', '#e11d48', '#3b82f6', '#a855f7'];
                        const sellerColor = SELLER_COLORS[idx % SELLER_COLORS.length];

                        // ── Cálculo de progresso segmentado ─────────────────
                        const bronzePct  = oInd > 0 ? Math.min(100, (Math.min(v, bInd) / oInd) * 100) : 0;
                        const prataPct   = oInd > 0 ? Math.max(0, (Math.min(v, pInd) / oInd * 100) - bronzePct) : 0;
                        const ouroPct    = oInd > 0 ? Math.max(0, (Math.min(v, oInd) / oInd * 100) - bronzePct - prataPct) : 0;

                        // ── Neon glow do tier ativo ─────────────────────────
                        const glowColor = hitO
                          ? 'rgba(217,119,6,0.75)'
                          : hitP ? 'rgba(100,116,139,0.65)'
                          : hitB ? 'rgba(146,64,14,0.65)'
                          : 'rgba(220,38,38,0.4)';

                        // ── Badge motivacional ──────────────────────────────
                        const badgeContent = hitO
                          ? { text: `🔥 OURO ATINGIDO! +${formatCurrency(v - oInd)} acima da meta`, pulse: true,  bg: 'bg-amber-50', border: 'border-amber-300', color: 'text-amber-700' }
                          : hitP
                          ? { text: `⚡ Faltam ${formatCurrency(oInd - v)} para 🥇 Ouro`,             pulse: false, bg: 'bg-slate-50',  border: 'border-slate-200', color: 'text-slate-600' }
                          : hitB
                          ? { text: `⚡ Faltam ${formatCurrency(pInd - v)} para 🥈 Prata`,            pulse: false, bg: 'bg-orange-50', border: 'border-orange-200', color: 'text-orange-700' }
                          : { text: `⚡ Faltam ${formatCurrency(bInd - v)} para 🥉 Bronze`,           pulse: false, bg: 'bg-red-50',    border: 'border-red-200',   color: 'text-red-600' };

                        return (
                          <div key={seller.sellerName}
                            className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm"
                            style={{ boxShadow: hitO ? `0 0 18px ${glowColor}` : hitP ? `0 0 10px ${glowColor}` : hitB ? `0 0 8px ${glowColor}` : undefined }}
                          >
                            {/* Header: ranking + nome + valor */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {isTop
                                  ? <span className="text-lg leading-none" title="Top Vendedora">👑</span>
                                  : <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
                                      style={{ background: sellerColor }}>#{idx + 1}</div>
                                }
                                <span className="font-bold text-sm text-gray-900 leading-tight">{seller.sellerName}</span>
                                {medal && <span className="text-base leading-none">{medal}</span>}
                              </div>
                              <span className="font-black text-gray-900 tabular-nums">{formatCurrency(v)}</span>
                            </div>

                            {/* Barra de progresso segmentada animada */}
                            <div className="relative mb-2">
                              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex" style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
                                {/* Segmento Bronze */}
                                <div className="h-full rounded-l-full transition-all duration-1000 ease-out" style={{
                                  width: `${bronzePct}%`,
                                  background: v >= bInd ? 'linear-gradient(90deg,#92400e,#b45309)' : 'linear-gradient(90deg,#fde68a,#f59e0b)',
                                  boxShadow: v >= bInd && !hitP ? `0 0 10px rgba(180,83,9,0.7)` : undefined,
                                }} />
                                {/* Segmento Prata */}
                                <div className="h-full transition-all duration-1000 ease-out" style={{
                                  width: `${prataPct}%`,
                                  background: v >= pInd ? 'linear-gradient(90deg,#475569,#64748b)' : 'linear-gradient(90deg,#cbd5e1,#94a3b8)',
                                  boxShadow: v >= pInd && !hitO ? `0 0 10px rgba(100,116,139,0.7)` : undefined,
                                }} />
                                {/* Segmento Ouro */}
                                <div className="h-full rounded-r-full transition-all duration-1000 ease-out" style={{
                                  width: `${ouroPct}%`,
                                  background: v >= oInd ? 'linear-gradient(90deg,#d97706,#f59e0b)' : 'linear-gradient(90deg,#fde68a,#eab308)',
                                  boxShadow: hitO ? `0 0 14px rgba(217,119,6,0.85)` : undefined,
                                }} />
                              </div>
                              {/* Marcadores de divisão */}
                              {[{ val: bInd, color: '#b45309' }, { val: pInd, color: '#64748b' }].map(({ val, color }) => (
                                val > 0 && oInd > 0
                                  ? <div key={val} className="absolute top-0 h-4 w-0.5 opacity-40 rounded-full"
                                      style={{ left: `${Math.min(99, (val / oInd) * 100)}%`, background: color }} />
                                  : null
                              ))}
                            </div>

                            {/* Badge motivacional */}
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold mb-3 ${badgeContent.bg} ${badgeContent.border} ${badgeContent.color} ${badgeContent.pulse ? 'animate-pulse' : ''}`}>
                              {badgeContent.text}
                            </div>

                            {/* Bonificação + Mini metas */}
                            <div className="flex items-center justify-between px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-100 mb-2">
                              <span className="text-xs text-emerald-700 font-bold">Bonificação (1%)</span>
                              <span className="text-sm font-black text-emerald-800">{formatCurrency((Number(v) || 0) * 0.01)}</span>
                            </div>
                            <div className="flex gap-2">
                              {[{ label: '🥉', val: bInd, hit: hitB }, { label: '🥈', val: pInd, hit: hitP }, { label: '🥇', val: oInd, hit: hitO }].map(t => (
                                <div key={t.label} className={`flex-1 text-center py-1 rounded-lg text-xs font-bold border transition-all ${t.hit ? 'bg-green-50 border-green-300 text-green-700 shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                                  {t.label} {formatCurrency(t.val)}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Store collective */}
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Resultado Coletivo (Loja)</div>
                    <div className={`p-4 rounded-xl bg-gradient-to-br ${lojaBg} text-white mb-3 shadow-md`}>
                      <div className="text-xs opacity-75 mb-0.5">Venda Total</div>
                      <div className="text-3xl font-bold">{formatCurrency(totalVendas)}</div>
                      <div className="text-sm mt-2 font-bold">{lojaMedal ? `✅ ${lojaMedal}` : '❌ Abaixo do Bronze'}</div>
                      {lojaNext && (
                        <div className="text-xs mt-1 opacity-80">Próximo alvo: +{formatCurrency(lojaNext.val - totalVendas)} para {lojaNext.label}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: 'Bronze Loja', val: bLoja, hit: lojaBronze, color: '#b45309' },
                        { label: 'Prata Loja', val: pLoja, hit: lojaPrata, color: '#64748b' },
                        { label: 'Ouro Loja', val: oLoja, hit: lojaOuro, color: '#d97706' },
                      ].map(g => {
                        const pct = Math.min(100, (totalVendas / g.val) * 100);
                        return (
                          <div key={g.label}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="font-semibold" style={{ color: g.color }}>{g.hit ? '✅' : '◻'} {g.label}</span>
                              <span className="font-mono text-gray-600">{formatCurrency(g.val)}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: g.hit ? g.color : `${g.color}66` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {(() => {
                      const sellersAboveBronze = curSellers.filter(s => s.totalSales >= bInd).length;
                      const disparity = curSellers.length > 1 ? curSellers[0].totalSales / (curSellers[curSellers.length - 1].totalSales || 1) : 1;
                      let msg = '';
                      if (lojaMedal && disparity > 3) msg = 'Alta disparidade entre veteranas e novatas.';
                      else if (lojaMedal) msg = 'Time coeso, resultado satisfatório.';
                      else if (sellersAboveBronze > 0) msg = `${sellersAboveBronze} vendedora${sellersAboveBronze > 1 ? 's' : ''} bateu${sellersAboveBronze > 1 ? 'ram' : ''} Bronze individualmente.`;
                      else msg = 'Nenhuma vendedora atingiu Bronze. Requer atenção.';
                      return msg ? <div className="mt-2 text-xs text-gray-500 italic px-1">{msg}</div> : null;
                    })()}
                  </div>
                </div>
              </div>
            );
          })()
        }

        <div className="bg-gradient-to-br from-white to-indigo-50/30 p-6 rounded-2xl border border-indigo-100 shadow-xl">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-600" /> Comparativo Histórico ({selectedMonth}/{selectedYear})</h3>
          <div className="relative bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 overflow-hidden" style={{ height: '360px' }}>
            {/* Background grid */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
                  <stop offset="40%" stopColor="#a78bfa" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="chartLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="50%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
                <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {/* Horizontal grid lines */}
              {[0, 20, 40, 60, 80].map(pct => (
                <line key={pct} x1="8%" y1={`${10 + pct * 0.8}%`} x2="96%" y2={`${10 + pct * 0.8}%`} stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.08" />
              ))}
            </svg>

            {(() => {
              const currentYearSales = getHistoricalDataForStorePeriod(selectedStore, selectedMonth, selectedYear).reduce((acc, r) => acc + r.totalSales, 0);
              const data = [
                ...goalsData.historicalData
                  .filter(d => d.year !== selectedYear) // evita duplicar se o ano atual já está no banco
                  .map(d => ({ ...d, isHistorical: true })),
                { year: selectedYear, total: currentYearSales, isCurrent: true }
              ];
              const nonZero = data.filter(d => d.total > 0);
              const maxVal = nonZero.length > 0 ? Math.max(...data.map(d => d.total)) * 1.2 : 100000;
              const PAD_L = 9, PAD_R = 5, PAD_T = 10, PAD_B = 14;
              const W = 100 - PAD_L - PAD_R, H = 100 - PAD_T - PAD_B;
              const toX = (i) => PAD_L + (i / (data.length - 1)) * W;
              const toY = (v) => PAD_T + H - (maxVal > 0 ? (v / maxVal) * H : 0);
              const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.total), ...d }));

              // Build smooth cubic bezier path
              const buildPath = (points) => {
                if (points.length < 2) return '';
                let d = `M ${points[0].x} ${points[0].y}`;
                for (let i = 1; i < points.length; i++) {
                  const prev = points[i - 1], curr = points[i];
                  const cpX = (prev.x + curr.x) / 2;
                  d += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
                }
                return d;
              };

              const linePath = buildPath(pts);
              const areaPath = linePath + ` L ${pts[pts.length - 1].x} ${PAD_T + H} L ${pts[0].x} ${PAD_T + H} Z`;

              const breakEvenY = maxVal > 0 ? toY(goalsData.breakEven) : null;

              return (
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Area fill */}
                  <path d={areaPath} fill="url(#chartAreaGrad)" opacity="1" />
                  {/* Line with glow */}
                  <path d={linePath} fill="none" stroke="url(#chartLineGrad)" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" filter="url(#lineGlow)" opacity="1" />
                  {/* Second pass: crisp line on top */}
                  <path d={linePath} fill="none" stroke="url(#chartLineGrad)" strokeWidth="0.35" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                  {/* Break-Even reference line */}
                  {breakEvenY !== null && goalsData.breakEven > 0 && (
                    <>
                      <line
                        x1={`${PAD_L}%`} y1={`${breakEvenY}%`}
                        x2={`${100 - PAD_R}%`} y2={`${breakEvenY}%`}
                        stroke="#f87171" strokeWidth="0.5" strokeDasharray="3,2" opacity="0.8"
                      />
                    </>
                  )}
                </svg>
              );
            })()}

            {/* Dots and labels rendered in HTML on top of SVG */}
            {(() => {
              const currentYearSales = getHistoricalDataForStorePeriod(selectedStore, selectedMonth, selectedYear).reduce((acc, r) => acc + r.totalSales, 0);
              const data = [
                ...goalsData.historicalData
                  .filter(d => d.year !== selectedYear) // evita duplicar se o ano atual já está no banco
                  .map(d => ({ ...d, isHistorical: true })),
                { year: selectedYear, total: currentYearSales, isCurrent: true }
              ];
              const maxVal = data.filter(d => d.total > 0).length > 0 ? Math.max(...data.map(d => d.total)) * 1.2 : 100000;
              const PAD_L = 9, PAD_R = 5, PAD_T = 10, PAD_B = 14;
              const W = 100 - PAD_L - PAD_R, H = 100 - PAD_T - PAD_B;
              return data.map((d, i) => {
                const xPct = PAD_L + (i / (data.length - 1)) * W;
                const yPct = PAD_T + H - (maxVal > 0 ? (d.total / maxVal) * H : 0);
                const isLast = d.isCurrent;
                const color = isLast ? '#34d399' : '#818cf8';
                const hasSales = d.total > 0;
                return (
                  <div key={i} className="absolute" style={{ left: `${xPct}%`, top: `${yPct}%`, transform: 'translate(-50%, -50%)' }}>
                    {/* Outer glow ring */}
                    <div className="absolute rounded-full" style={{ width: 24, height: 24, background: color, opacity: 0.15, top: -8, left: -8 }} />
                    {/* Dot */}
                    <div className="rounded-full border-2 border-white shadow-lg" style={{ width: 10, height: 10, background: hasSales ? color : '#4b5563', boxShadow: hasSales ? `0 0 10px ${color}88` : 'none' }} />
                    {/* Value label */}
                    {hasSales && (
                      <div className="absolute whitespace-nowrap text-center" style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8 }}>
                        <span className="text-white font-bold px-2 py-0.5 rounded-lg text-xs" style={{ background: 'rgba(30,27,75,0.85)', fontSize: '0.65rem', color: isLast ? '#34d399' : '#c7d2fe', border: `1px solid ${color}44` }}>
                          {formatCurrency(d.total)}
                        </span>
                      </div>
                    )}
                    {/* Year label below */}
                    <div className="absolute whitespace-nowrap text-center" style={{ top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8 }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: isLast ? '#34d399' : '#94a3b8' }}>{d.year}</span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
        {/* === GRÁFICO DE BARRAS: TOP 5 VENDEDORAS POR ANO === */}
        {
          (() => {
            const historyYears = [2021, 2022, 2023, 2024, 2025, 2026];
            const currentYear = new Date().getFullYear();
            let CHART_YEARS = [...new Set([...historyYears, currentYear])].sort();
            // Retroactive clipping: Stop chart at selected_year if it's defined
            if (selectedYear) {
              CHART_YEARS = CHART_YEARS.filter(yr => yr <= Number(selectedYear));
            }

            // 5 high-contrast, visually distinct colors
            const SELLER_COLORS = ['#f59e0b', '#10b981', '#e11d48', '#3b82f6', '#a855f7'];

            const yearData = CHART_YEARS.map(yr => {
              const records = getHistoricalDataForStorePeriod(selectedStore, selectedMonth, yr);
              const active = records.filter(r => getSellerStatus(selectedStore, selectedMonth, yr, r.sellerName, r.daysWorked) === 'active');
              const sorted = [...active].sort((a, b) => b.totalSales - a.totalSales).slice(0, 5);
              return { year: yr, sellers: sorted, hasData: sorted.length > 0 };
            });

            const hasAnyData = yearData.some(y => y.hasData);

            // Active sellers in CURRENT year for legend
            const currentYearActive = (yearData.find(y => y.year === currentYear)?.sellers || []).map(s => s.sellerName);

            // All unique seller names across all years (for color assignment)
            const allSellerNames = [];
            yearData.forEach(y => y.sellers.forEach(s => {
              if (!allSellerNames.includes(s.sellerName)) allSellerNames.push(s.sellerName);
            }));

            // Color map: consistent per name
            const sellerColorMap = {};
            allSellerNames.forEach((name, i) => { sellerColorMap[name] = SELLER_COLORS[i % SELLER_COLORS.length]; });

            const allValues = yearData.flatMap(y => y.sellers.map(s => s.totalSales));
            const maxGoal = Math.max(goalsData.metaOuroInd, goalsData.metaPrataInd, goalsData.metaBronzeInd);
            const rawMax = Math.max(...(allValues.length ? allValues : [0]), maxGoal, 25000);
            const yMax = Math.ceil(rawMax / 5000) * 5000;
            const ySteps = [];
            for (let v = 0; v <= yMax; v += 5000) ySteps.push(v);

            const CHART_H = 370;
            const PAD_LEFT = 72, PAD_RIGHT = 60, PAD_TOP = 24, PAD_BOTTOM = 72;
            const chartInnerH = CHART_H - PAD_TOP - PAD_BOTTOM;
            const toY = (v) => PAD_TOP + chartInnerH * (1 - v / yMax);

            const goalLines = [
              { value: goalsData.metaBronzeInd, label: '🥉 Bronze', color: '#d97706', glow: '#f59e0b' },
              { value: goalsData.metaPrataInd, label: '🥈 Prata', color: '#94a3b8', glow: '#cbd5e1' },
              { value: goalsData.metaOuroInd, label: '🥇 Ouro', color: '#eab308', glow: '#fde047' },
            ];

            // Compute bar positions for hover overlay
            const barPositions = [];
            yearData.forEach((yd, yi) => {
              if (!yd.hasData) return;
              const chartW = 800 - PAD_LEFT - PAD_RIGHT;
              const yearSlotW = chartW / CHART_YEARS.length;
              const yearCenterX = PAD_LEFT + yi * yearSlotW + yearSlotW / 2;
              const barW = Math.min(30, (yearSlotW * 0.65) / 5);
              const barGap = barW * 0.3;
              const totalBarsW = yd.sellers.length * barW + (yd.sellers.length - 1) * barGap;
              const barsStartX = yearCenterX - totalBarsW / 2;
              yd.sellers.forEach((seller, si) => {
                const colorIdx = allSellerNames.indexOf(seller.sellerName) % SELLER_COLORS.length;
                const barX = barsStartX + si * (barW + barGap);
                const barH = Math.max(2, (seller.totalSales / yMax) * chartInnerH);
                const barY = PAD_TOP + chartInnerH - barH;
                barPositions.push({
                  xi: yi, si,
                  xPct: (barX / 800) * 100,
                  yPct: (barY / CHART_H) * 100,
                  wPct: (barW / 800) * 100,
                  hPct: (barH / CHART_H) * 100,
                  color: SELLER_COLORS[colorIdx],
                  name: seller.sellerName,
                  sales: seller.totalSales,
                  year: yd.year,
                  isActive: currentYearActive.includes(seller.sellerName),
                });
              });
            });

            return (
              <div className="bg-gradient-to-br from-white to-indigo-50/30 p-6 rounded-2xl border border-indigo-100 shadow-xl">
                <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" /> Top 5 Vendedoras por Ano — {getMonthName(selectedMonth)}/{currentYear}
                </h3>
                <p className="text-xs text-gray-400 mb-4">Barras = vendas individuais · Linhas pontilhadas = metas individuais · Passe o mouse nas barras para detalhes</p>

                {!hasAnyData ? (
                  <div className="flex items-center justify-center h-48 text-gray-400">
                    <div className="text-center"><Users className="w-10 h-10 mx-auto mb-2 opacity-20" /><p className="text-sm">Sem dados de vendedoras para este mês/loja</p></div>
                  </div>
                ) : (
                  <>
                    {/* LEGEND: only current-year active sellers */}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4">
                      <div className="w-full text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Vendedoras ativas ({currentYear})</div>
                      {currentYearActive.length > 0 ? currentYearActive.map(name => (
                        <div key={name} className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-sm shrink-0 shadow-sm" style={{ background: sellerColorMap[name] }} />
                          <span className="text-xs text-gray-700 font-semibold truncate max-w-[140px]">{name}</span>
                        </div>
                      )) : (
                        <span className="text-xs text-gray-400 italic">Sem vendedoras ativas registradas para {getMonthName(selectedMonth)}/{currentYear}</span>
                      )}
                      <div className="w-full h-px bg-gray-100 my-0.5" />
                      {goalLines.map(g => (
                        <div key={g.label} className="flex items-center gap-1.5">
                          <div className="w-5 border-t-2 border-dashed shrink-0" style={{ borderColor: g.color }} />
                          <span className="text-xs font-semibold" style={{ color: g.color }}>{g.label} {formatCurrency(g.value)}</span>
                        </div>
                      ))}
                    </div>

                    {/* CHART with hover overlay */}
                    <div className="relative bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl overflow-hidden select-none" style={{ height: CHART_H }}>
                      <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 800 ${CHART_H}`} preserveAspectRatio="none">
                        <defs>
                          {SELLER_COLORS.map((c, i) => (
                            <linearGradient key={i} id={`bsg6_${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor={c} stopOpacity="1" />
                              <stop offset="100%" stopColor={c} stopOpacity="0.4" />
                            </linearGradient>
                          ))}
                        </defs>

                        {/* Y grid + labels */}
                        {ySteps.map(v => {
                          const yPx = toY(v);
                          return (
                            <g key={v}>
                              <line x1={PAD_LEFT} y1={yPx} x2={800 - PAD_RIGHT} y2={yPx} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.07" />
                              <text x={PAD_LEFT - 6} y={yPx + 3.5} textAnchor="end" fill="#64748b" fontSize="9.5" fontFamily="monospace">
                                {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                              </text>
                            </g>
                          );
                        })}

                        {/* Goal lines */}
                        {goalLines.map((g, gi) => {
                          if (g.value <= 0 || g.value > yMax * 1.05) return null;
                          const yPx = toY(Math.min(g.value, yMax));
                          return (
                            <g key={gi}>
                              <line x1={PAD_LEFT} y1={yPx} x2={800 - PAD_RIGHT} y2={yPx} stroke={g.glow} strokeWidth="4" strokeOpacity="0.18" />
                              <line x1={PAD_LEFT} y1={yPx} x2={800 - PAD_RIGHT} y2={yPx} stroke={g.color} strokeWidth="1.4" strokeOpacity="0.95" strokeDasharray="7,5" />
                            </g>
                          );
                        })}

                        {/* Bars */}
                        {yearData.map((yd, yi) => {
                          if (!yd.hasData) return null;
                          const chartW = 800 - PAD_LEFT - PAD_RIGHT;
                          const yearSlotW = chartW / CHART_YEARS.length;
                          const yearCenterX = PAD_LEFT + yi * yearSlotW + yearSlotW / 2;
                          const barW = Math.min(30, (yearSlotW * 0.65) / 5);
                          const barGap = barW * 0.3;
                          const totalBarsW = yd.sellers.length * barW + (yd.sellers.length - 1) * barGap;
                          const barsStartX = yearCenterX - totalBarsW / 2;
                          return yd.sellers.map((seller, si) => {
                            const colorIdx = allSellerNames.indexOf(seller.sellerName) % SELLER_COLORS.length;
                            const barX = barsStartX + si * (barW + barGap);
                            const barH = Math.max(2, (seller.totalSales / yMax) * chartInnerH);
                            const barY = PAD_TOP + chartInnerH - barH;
                            return (
                              <g key={`${yi}-${si}`}>
                                <rect x={barX + 1.5} y={barY + 3} width={barW} height={barH} fill={SELLER_COLORS[colorIdx]} fillOpacity="0.12" rx="3" />
                                <rect x={barX} y={barY} width={barW} height={barH} fill={`url(#bsg6_${colorIdx})`} rx="3" />
                                {barH > 22 && (
                                  <text x={barX + barW / 2} y={barY - 5} textAnchor="middle" fill={SELLER_COLORS[colorIdx]} fontSize="7.5" fontWeight="700" fontFamily="monospace">
                                    {seller.totalSales >= 1000 ? `${(seller.totalSales / 1000).toFixed(1)}k` : seller.totalSales}
                                  </text>
                                )}
                              </g>
                            );
                          });
                        })}

                        {/* Year labels */}
                        {yearData.map((yd, yi) => {
                          const chartW = 800 - PAD_LEFT - PAD_RIGHT;
                          const xCenter = PAD_LEFT + yi * (chartW / CHART_YEARS.length) + (chartW / CHART_YEARS.length) / 2;
                          const isCurrent = yd.year === currentYear;
                          return (
                            <text key={yi} x={xCenter} y={CHART_H - 12} textAnchor="middle"
                              fill={isCurrent ? '#34d399' : '#94a3b8'} fontSize="12" fontWeight="700" fontFamily="sans-serif">
                              {yd.year}{!yd.hasData ? ' —' : ''}
                            </text>
                          );
                        })}

                        {/* Separator lines */}
                        {[1, 2, 3].map(i => {
                          const chartW = 800 - PAD_LEFT - PAD_RIGHT;
                          const x = PAD_LEFT + i * (chartW / CHART_YEARS.length);
                          return <line key={i} x1={x} y1={PAD_TOP} x2={x} y2={CHART_H - PAD_BOTTOM} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.06" />;
                        })}
                      </svg>

                      {/* Goal line labels overlay */}
                      {goalLines.map((g, gi) => {
                        if (g.value <= 0 || g.value > yMax * 1.05) return null;
                        const yPx = toY(Math.min(g.value, yMax));
                        return (
                          <div key={gi} className="absolute pointer-events-none" style={{ top: `${(yPx / CHART_H) * 100}%`, right: 4, transform: 'translateY(-50%)' }}>
                            <span className="font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                              style={{ background: 'rgba(15,23,42,0.9)', color: g.color, border: `1px solid ${g.color}55`, fontSize: '0.6rem' }}>
                              {g.label}
                            </span>
                          </div>
                        );
                      })}

                      {/* HOVER AREAS — invisible divs over each bar that show tooltip on hover */}
                      {barPositions.map((bp, idx) => {
                        // Smart tooltip placement: if bar top is in upper 35% of chart → show below bar; else above
                        const showBelow = bp.yPct < 35;
                        return (
                          <div
                            key={idx}
                            className="absolute group cursor-pointer"
                            style={{
                              left: `${bp.xPct}%`,
                              top: `${bp.yPct}%`,
                              width: `${bp.wPct}%`,
                              height: `${bp.hPct}%`,
                              zIndex: 10,
                            }}
                          >
                            {/* Tooltip — above or below depending on bar height */}
                            <div
                              className="absolute left-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 ease-out"
                              style={{
                                ...(showBelow
                                  ? { top: 'calc(100% + 8px)', transform: 'translateX(-50%)' }
                                  : { bottom: 'calc(100% + 8px)', transform: 'translateX(-50%)' }
                                ),
                                zIndex: 50,
                              }}
                            >
                              <div className="rounded-xl px-3 py-2.5 shadow-2xl whitespace-nowrap text-center"
                                style={{
                                  background: 'rgba(10,10,30,0.97)',
                                  border: `2px solid ${bp.color}`,
                                  boxShadow: `0 0 20px ${bp.color}55, 0 4px 20px rgba(0,0,0,0.6)`,
                                  minWidth: 130,
                                }}>
                                <div className="text-xs font-bold mb-1" style={{ color: bp.color }}>
                                  {bp.isActive ? '🟢' : '⚪'} {bp.name}
                                </div>
                                <div className="text-white font-bold text-base">{formatCurrency(bp.sales)}</div>
                                <div className="text-xs mt-1" style={{ color: bp.color, opacity: 0.8 }}>{bp.year}</div>
                                {!bp.isActive && (
                                  <div className="text-xs mt-0.5 text-gray-400 italic">Inativa em {currentYear}</div>
                                )}
                              </div>
                              {/* Arrow pointing toward bar */}
                              {showBelow ? (
                                <div className="mx-auto" style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: `5px solid ${bp.color}`, marginTop: -1 }} />
                              ) : (
                                <div className="mx-auto" style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `5px solid ${bp.color}`, marginTop: 0 }} />
                              )}
                            </div>

                            {/* Hover highlight overlay on bar */}
                            <div className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                              style={{ background: 'rgba(255,255,255,0.15)', boxShadow: `inset 0 0 0 2px ${bp.color}` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })()
        }

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-indigo-600" /> Projeção Anual (Histórico Completo)</h3>
          <p className="text-xs text-gray-400 mb-4 flex items-center gap-1"><ChevronRight className="w-3 h-3" /> Clique em um mês para ver as top vendedoras de cada ano</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gradient-to-r from-gray-50 to-indigo-50 uppercase text-gray-600 border-b-2 border-indigo-200">
                <tr>
                  <th className="p-3 font-bold sticky left-0 bg-gray-50 z-10">Mês</th>
                  <th className="p-3 text-center font-bold">Tendência</th>
                  <th className="p-3 text-center font-bold">Status</th>
                  <th className="p-3 text-right font-bold">2021</th><th className="p-3 text-right font-bold">2022</th><th className="p-3 text-right font-bold">2023</th><th className="p-3 text-right font-bold">2024</th><th className="p-3 text-right font-bold">2025</th>
                  <th className="p-3 text-right font-bold text-green-700">2026</th>
                  <th className="p-3 text-center font-bold">Vendedoras</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 12 }).map((_, i) => {
                  const m = i + 1;
                  const projData = getGoalsData(selectedStore, m);
                  const currentSellers = (projectionSellers || {})[`${selectedStore}-${m}`] || STORE_CONFIGS[selectedStore]?.collaborators || 3;

                  const allYearsComplete = hasAllYearsData(selectedStore, m);
                  const trendData = calculateTrend(selectedStore, m);
                  const sales2021 = getHistoricalDataForStorePeriod(selectedStore, m, 2021).reduce((acc, r) => acc + r.totalSales, 0);
                  const sales2022 = getHistoricalDataForStorePeriod(selectedStore, m, 2022).reduce((acc, r) => acc + r.totalSales, 0);
                  const sales2023 = getHistoricalDataForStorePeriod(selectedStore, m, 2023).reduce((acc, r) => acc + r.totalSales, 0);
                  const sales2024 = getHistoricalDataForStorePeriod(selectedStore, m, 2024).reduce((acc, r) => acc + r.totalSales, 0);
                  const sales2025 = getHistoricalDataForStorePeriod(selectedStore, m, 2025).reduce((acc, r) => acc + r.totalSales, 0);
                  const sales2026Raw = getHistoricalDataForStorePeriod(selectedStore, m, 2026).reduce((acc, r) => acc + r.totalSales, 0);
                  const sales2026 = extrapolateSales(sales2026Raw, m, 2026);
                  let trendColor = 'text-gray-500 bg-gray-100';
                  if (trendData.trend === 'up') trendColor = 'text-green-700 bg-green-100';
                  if (trendData.trend === 'down') trendColor = 'text-red-700 bg-red-100';
                  const isExpanded = expandedMonthRow === m;

                  // Top 5 sellers per year for this month
                  const TOP_YEARS = [2021, 2022, 2023, 2024, 2025, 2026];
                  const topSellersByYear = TOP_YEARS.map(yr => {
                    const records = getHistoricalDataForStorePeriod(selectedStore, m, yr);
                    const active = records.filter(r => getSellerStatus(selectedStore, m, yr, r.sellerName, r.daysWorked) === 'active');
                    const sorted = [...active].sort((a, b) => b.totalSales - a.totalSales).slice(0, 5);
                    return { year: yr, sellers: sorted, total: records.reduce((a, r) => a + r.totalSales, 0) };
                  }).filter(y => y.total > 0);

                  const MEDAL_COLORS = ['#f59e0b', '#94a3b8', '#b45309', '#6366f1', '#10b981'];

                  return (
                    <React.Fragment key={m}>
                      <tr
                        className={`border-b transition-colors cursor-pointer select-none ${isExpanded ? 'bg-indigo-50' : 'hover:bg-indigo-50/30'}`}
                        onClick={() => setExpandedMonthRow(isExpanded ? null : m)}
                      >
                        <td className={`p-3 font-bold sticky left-0 z-10 flex items-center gap-1.5 ${isExpanded ? 'bg-indigo-50 text-indigo-800' : 'bg-white text-gray-800'}`}>
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-indigo-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                          {getMonthName(m)}
                        </td>
                        <td className="p-3 text-center"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${trendColor}`}><span className="text-base">{trendData.arrow}</span>{Math.abs(trendData.percent).toFixed(1)}%</span></td>
                        <td className="p-3 text-center">{allYearsComplete ? <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs font-bold"><CheckCircle className="w-3 h-3" /> Completo</span> : <span className="inline-flex items-center gap-1 text-gray-400 bg-gray-100 px-2 py-1 rounded-full text-xs"><AlertTriangle className="w-3 h-3" /> Pendente</span>}</td>
                        <td className="p-3 text-right text-gray-600 font-mono">{sales2021 > 0 ? formatCurrency(sales2021) : '-'}</td>
                        <td className="p-3 text-right text-gray-600 font-mono">{sales2022 > 0 ? formatCurrency(sales2022) : '-'}</td>
                        <td className="p-3 text-right text-gray-600 font-mono">{sales2023 > 0 ? formatCurrency(sales2023) : '-'}</td>
                        <td className="p-3 text-right text-gray-600 font-mono">{sales2024 > 0 ? formatCurrency(sales2024) : '-'}</td>
                        <td className="p-3 text-right text-gray-600 font-mono">{sales2025 > 0 ? formatCurrency(sales2025) : '-'}</td>
                        <td className="p-3 text-right text-green-700 font-mono font-bold">{sales2026 > 0 ? formatCurrency(sales2026) : '-'}</td>
                        <td className="p-3 text-center"><input type="number" className="w-14 border border-indigo-200 text-center rounded-lg p-1.5 focus:ring-2 focus:ring-indigo-400 focus:outline-none" value={currentSellers} onClick={e => e.stopPropagation()} onChange={(e) => setProjectionSellers(prev => ({ ...prev, [`${selectedStore}-${m}`]: parseInt(e.target.value) || 1 }))} /></td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${m}-detail`}>
                          <td colSpan={10} className="bg-gradient-to-br from-indigo-50 to-purple-50 border-b border-indigo-200 p-0">
                            <div className="p-4 space-y-4">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-indigo-600" />
                                <span className="font-bold text-indigo-800 text-sm">Top Vendedoras — {getMonthName(m)}</span>
                                <span className="text-xs text-gray-400">• Ordenadas por maior venda individual</span>
                              </div>
                              {topSellersByYear.length === 0 ? (
                                <div className="text-center py-6 text-gray-400 text-xs">Sem dados de vendedoras para este mês</div>
                              ) : (
                                <>
                                  {/* Year cards */}
                                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(topSellersByYear.length, 3)}, 1fr)` }}>
                                    {topSellersByYear.map(({ year, sellers }) => {
                                      // Use per-year goals calculated with same numSellers as that year's active count
                                      const yearActiveSellers = sellers.length || 1;
                                      const yearGoals = getGoalsData(selectedStore, m, yearActiveSellers);
                                      const bInd = yearGoals.metaBronzeInd;
                                      const pInd = yearGoals.metaPrataInd;
                                      const oInd = yearGoals.metaOuroInd;
                                      return (
                                        <div key={year} className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
                                          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white px-3 py-2 text-xs font-bold flex justify-between items-center">
                                            <span>{year}</span>
                                            <span className="opacity-80">{sellers.length} vendedora{sellers.length !== 1 ? 's' : ''}</span>
                                          </div>
                                          {/* Goal reference mini-bar */}
                                          <div className="flex text-xs border-b border-gray-50 bg-gray-50">
                                            <div className="flex-1 px-2 py-1 text-center text-amber-700 font-bold">{formatCurrency(bInd)}<div className="text-gray-400 font-normal text-xs">Bronze</div></div>
                                            <div className="flex-1 px-2 py-1 text-center text-slate-500 font-bold border-x border-gray-100">{formatCurrency(pInd)}<div className="text-gray-400 font-normal text-xs">Prata</div></div>
                                            <div className="flex-1 px-2 py-1 text-center text-yellow-600 font-bold">{formatCurrency(oInd)}<div className="text-gray-400 font-normal text-xs">Ouro</div></div>
                                          </div>
                                          <div className="divide-y divide-gray-50">
                                            {Array.from({ length: 5 }).map((_, rank) => {
                                              const seller = sellers[rank];
                                              if (!seller) return (
                                                <div key={rank} className="flex items-center gap-2 px-3 py-2 opacity-20">
                                                  <span className="text-xs w-5 text-center text-gray-400">{rank + 1}º</span>
                                                  <span className="text-xs text-gray-400">—</span>
                                                </div>
                                              );
                                              const v = seller.totalSales;
                                              // Correct medal: highest threshold crossed
                                              const hitOuro = v >= oInd;
                                              const hitPrata = v >= pInd;
                                              const hitBronze = v >= bInd;
                                              const medal = hitOuro ? '🥇' : hitPrata ? '🥈' : hitBronze ? '🥉' : null;
                                              const medalColor = hitOuro ? '#d97706' : hitPrata ? '#94a3b8' : hitBronze ? '#b45309' : '#ef4444';
                                              // Correct % — relative to next unachieved goal, or if ouro hit → % of ouro
                                              let pctLabel, pctColor;
                                              if (hitOuro) {
                                                pctLabel = `🥇 ${((v / oInd) * 100).toFixed(1)}% do Ouro`;
                                                pctColor = '#d97706';
                                              } else if (hitPrata) {
                                                pctLabel = `🥈 ${((v / oInd) * 100).toFixed(1)}% do Ouro`;
                                                pctColor = '#94a3b8';
                                              } else if (hitBronze) {
                                                pctLabel = `🥉 ${((v / pInd) * 100).toFixed(1)}% da Prata`;
                                                pctColor = '#b45309';
                                              } else {
                                                pctLabel = `${((v / bInd) * 100).toFixed(1)}% do Bronze`;
                                                pctColor = '#ef4444';
                                              }
                                              return (
                                                <div key={rank} className="flex items-center gap-2 px-3 py-2">
                                                  <span className="text-sm font-bold w-5 text-center shrink-0" style={{ color: medalColor }}>
                                                    {medal || `${rank + 1}º`}
                                                  </span>
                                                  <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-semibold text-gray-800 truncate">{seller.sellerName}</div>
                                                    <div className="text-xs text-gray-400">{seller.daysWorked}d · {seller.salesCount} vendas</div>
                                                  </div>
                                                  <div className="text-right shrink-0">
                                                    <div className="text-xs font-bold" style={{ color: medalColor }}>{formatCurrency(v)}</div>
                                                    <div className="text-xs font-medium" style={{ color: pctColor }}>{pctLabel}</div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>


                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* === ANNUAL PERFORMANCE TRACKING — 3 CARDS === */}
        {
          (() => {
            const currentYear = new Date().getFullYear();
            const currentActualMonth = new Date().getMonth() + 1; // real current month
            const months = Array.from({ length: 12 }, (_, i) => i + 1);

            // For each month, compute goals and real results
            const monthRows = months.map(m => {
              const n = (projectionSellers || {})[`${selectedStore}-${m}`] || STORE_CONFIGS[selectedStore]?.collaborators || 3;
              const goals = getGoalsData(selectedStore, m, n);
              const records = getHistoricalDataForStorePeriod(selectedStore, m, currentYear);
              const totalSales = records.reduce((acc, r) => acc + r.totalSales, 0);
              const hasData = totalSales > 0;
              const hitOuro = hasData && totalSales >= goals.metaOuroLoja;
              const hitPrata = hasData && totalSales >= goals.metaPrataLoja;
              const hitBronze = hasData && totalSales >= goals.metaBronzeLoja;
              return {
                m, goals, totalSales, hasData,
                hitOuro, hitPrata, hitBronze,
                isPast: m <= currentActualMonth,
              };
            });

            // Summary counts
            const pastMonths = monthRows.filter(r => r.isPast && r.hasData);
            const ouroCount = pastMonths.filter(r => r.hitOuro).length;
            const prataCount = pastMonths.filter(r => r.hitPrata && !r.hitOuro).length;
            const bronzeCount = pastMonths.filter(r => r.hitBronze && !r.hitPrata).length;
            const missCount = pastMonths.filter(r => !r.hitBronze).length;

            const tierCards = [
              {
                tier: 'bronze',
                emoji: '🥉',
                label: 'Bronze Loja',
                subtitle: `Meta mínima — ${currentYear}`,
                bg: 'from-amber-800 via-amber-700 to-yellow-800',
                border: 'border-amber-600',
                accent: '#d97706',
                accentLight: '#fef3c7',
                getMeta: (goals) => goals.metaBronzeInd,
                getLojaThreshold: (goals) => goals.metaBronzeLoja,
                hitFn: (r) => r.hitBronze,
              },
              {
                tier: 'prata',
                emoji: '🥈',
                label: 'Prata Loja',
                subtitle: `Meta histórica +10% — ${currentYear}`,
                bg: 'from-slate-600 via-slate-500 to-gray-600',
                border: 'border-slate-400',
                accent: '#94a3b8',
                accentLight: '#f1f5f9',
                getMeta: (goals) => goals.metaPrataInd,
                getLojaThreshold: (goals) => goals.metaPrataLoja,
                hitFn: (r) => r.hitPrata,
              },
              {
                tier: 'ouro',
                emoji: '🥇',
                label: 'Ouro Loja',
                subtitle: `Teto humano 115% — ${currentYear}`,
                bg: 'from-yellow-600 via-amber-500 to-yellow-700',
                border: 'border-yellow-400',
                accent: '#d97706',
                accentLight: '#fffbeb',
                getMeta: (goals) => goals.metaOuroInd,
                getLojaThreshold: (goals) => goals.metaOuroLoja,
                hitFn: (r) => r.hitOuro,
              },
            ];

            return (
              <div className="space-y-4">
                {/* Section header */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-indigo-200" />
                  <span className="text-xs font-bold uppercase tracking-widest text-indigo-500 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Acompanhamento Anual {currentYear}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-indigo-200" />
                </div>

                {/* Summary pills */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    { label: `🥇 Ouro`, count: ouroCount, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
                    { label: `🥈 Prata`, count: prataCount, color: 'bg-slate-100 text-slate-700 border-slate-300' },
                    { label: `🥉 Bronze`, count: bronzeCount, color: 'bg-amber-100 text-amber-800 border-amber-300' },
                    { label: `❌ Abaixo`, count: missCount, color: 'bg-red-50 text-red-700 border-red-200' },
                  ].map(p => (
                    <div key={p.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${p.color}`}>
                      {p.label}: <span className="text-base font-black">{p.count}</span> {p.count === 1 ? 'mês' : 'meses'}
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold bg-gray-100 text-gray-600 border-gray-200">
                    📅 {pastMonths.length} meses com dados
                  </div>
                </div>

                {/* 3 Tier cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {tierCards.map(card => {
                    const hitMonths = monthRows.filter(r => r.isPast && r.hasData && card.hitFn(r));
                    const hitRate = pastMonths.length > 0 ? (hitMonths.length / pastMonths.length * 100).toFixed(0) : 0;
                    return (
                      <div key={card.tier} className={`bg-gradient-to-br ${card.bg} text-white rounded-2xl shadow-xl border-2 ${card.border} overflow-hidden`}>
                        {/* Card header */}
                        <div className="px-5 py-4 border-b border-white/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{card.emoji}</span>
                              <div>
                                <div className="text-xs font-bold uppercase tracking-wide opacity-90">{card.label}</div>
                                <div className="text-xs opacity-60">{card.subtitle}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-black">{hitRate}%</div>
                              <div className="text-xs opacity-70">atingimento</div>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="flex justify-between text-xs opacity-70 mb-1">
                              <span>{hitMonths.length} de {pastMonths.length} meses batidos</span>
                            </div>
                            <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                              <div className="h-1.5 rounded-full bg-white transition-all" style={{ width: `${hitRate}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* Month-by-month breakdown */}
                        <div className="px-4 py-3 space-y-2 max-h-80 overflow-y-auto">
                          {monthRows.map(row => {
                            const metaInd = card.getMeta(row.goals);
                            const metaLoja = card.getLojaThreshold(row.goals);
                            const hit = row.hasData && card.hitFn(row);
                            const diff = row.totalSales - metaLoja;
                            const rawPct = metaLoja > 0 ? (row.totalSales / metaLoja) * 100 : 0;
                            const pctNum = Math.round(rawPct);
                            const isFuture = !row.isPast;
                            const noData = row.isPast && !row.hasData;

                            const isSurplus = pctNum >= 100;
                            const barColorClass = 'bg-white';

                            return (
                              <div key={row.m}
                                className={`flex flex-col gap-1.5 px-3 py-2 rounded-lg transition-all ${isFuture ? 'opacity-40' :
                                  noData ? 'opacity-50' :
                                    hit ? 'bg-white/10' : 'bg-black/20'
                                  }`}
                              >
                                <div className="flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="w-8 font-bold opacity-90">{getMonthName(row.m).substring(0, 3)}</span>
                                    <span className="text-sm w-4 text-center">{isFuture ? '·' : noData ? '—' : hit ? card.emoji : '✗'}</span>
                                  </div>
                                  <div className="text-right font-mono">
                                    {isFuture ? (
                                      <span className="opacity-50">{formatCurrency(metaLoja)}</span>
                                    ) : noData ? (
                                      <span className="opacity-40">sem dados</span>
                                    ) : (
                                      <span className={hit ? 'font-bold' : 'opacity-75'}>
                                        {diff >= 0 ? <span className="text-emerald-300">+{formatCurrency(diff)}</span> : <span className="text-red-300">{formatCurrency(diff)}</span>}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Progress Bar Container */}
                                <div className="flex items-center gap-2 w-full mt-0.5">
                                  <div className="flex-1 bg-white/10 rounded-full h-4 overflow-hidden relative shadow-inner">
                                    {!isFuture && row.hasData && (
                                      <div className={`h-4 rounded-full transition-all flex items-center justify-end px-2 ${barColorClass}`}
                                        style={{ width: `${Math.min(100, pctNum)}%` }}>
                                        {pctNum >= 25 && (
                                          <span className="text-[10px] font-black text-green-600 drop-shadow-sm whitespace-nowrap">
                                            {pctNum}% {isSurplus && '🔥'}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {!isFuture && row.hasData && pctNum < 25 && (
                                    <span className="text-[10px] font-black text-white opacity-90 shrink-0 w-10 text-right">
                                      {pctNum}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Footer with current month meta */}
                        <div className="px-5 py-3 bg-black/20 border-t border-white/10 text-xs opacity-80">
                          <div className="flex justify-between">
                            <span>Meta Individual ({getMonthName(selectedMonth)})</span>
                            <span className="font-bold font-mono">{formatCurrency(card.getMeta(goalsData))}</span>
                          </div>
                          <div className="flex justify-between mt-0.5">
                            <span>Meta Loja ({getMonthName(selectedMonth)})</span>
                            <span className="font-bold font-mono">{formatCurrency(card.getLojaThreshold(goalsData))}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
      </div>

      {/* ═══════════════════════════════════════════════════════
        MODAL DE IMPORTAÇÃO DE HISTÓRICO DE VENDAS (LOCAL)
    ═══════════════════════════════════════════════════════ */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-indigo-100">

            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 flex items-center justify-between">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <Upload className="w-5 h-5" /> Importar Histórico de Vendas
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Seletores */}
              <div className="grid grid-cols-3 gap-3">
                {/* Loja */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">🏪 Loja</label>
                  <select
                    value={histImportStore}
                    onChange={e => setHistImportStore(e.target.value)}
                    className="w-full border border-indigo-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-800 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  >
                    {Object.entries(STORE_CONFIGS || {}).map(([k, v]) => (
                      <option key={k} value={k}>{v.name}</option>
                    ))}
                  </select>
                </div>
                {/* Mês */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">📅 Mês</label>
                  <select
                    value={histImportMonth}
                    onChange={e => setHistImportMonth(parseInt(e.target.value))}
                    className="w-full border border-indigo-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-800 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  >
                    {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((name, i) => (
                      <option key={i + 1} value={i + 1}>{name}</option>
                    ))}
                  </select>
                </div>
                {/* Ano */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">📆 Ano</label>
                  <select
                    value={histImportYear}
                    onChange={e => setHistImportYear(parseInt(e.target.value))}
                    className="w-full border border-indigo-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-800 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  >
                    {[2021, 2022, 2023, 2024, 2025, 2026, 2027].filter(y => y <= new Date().getFullYear()).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Checkbox: Limpar dados existentes */}
              <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clearBeforeImport}
                    onChange={e => setClearBeforeImport(e.target.checked)}
                    className="w-4 h-4 accent-yellow-600 rounded"
                  />
                  <span className="font-medium text-yellow-800">Limpar dados existentes deste período antes de importar</span>
                </label>
                <p className="text-xs text-yellow-700 mt-1 ml-6">Use esta opção para sobrescrever dados antigos e corrigir erros</p>
              </div>

              {/* TABS DE IMPORTAÇÃO */}
              <div className="flex border-b border-indigo-100">
                <button 
                  onClick={() => setImportTab('text')}
                  className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${importTab === 'text' ? 'text-indigo-700 border-indigo-600' : 'text-gray-500 border-transparent hover:text-indigo-500'}`}
                >
                  📝 Copiar e Colar LibreOffice
                </button>
                <button 
                  onClick={() => setImportTab('file')}
                  className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${importTab === 'file' ? 'text-indigo-700 border-indigo-600' : 'text-gray-500 border-transparent hover:text-indigo-500'}`}
                >
                  📎 Arquivo Excel/CSV
                </button>
              </div>

              {/* CONTEÚDO DA TAB TEXT */}
              <div className={importTab === 'text' ? 'block space-y-3' : 'hidden'}>
                {/* Instruções */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-800">
                  <p className="font-bold mb-1">📋 Como importar: copie a tabela diretamente do ERP (Ctrl+A → Ctrl+C)</p>
                  <p className="text-indigo-700 font-mono text-[10px]">Loja | Código | <strong>Nome</strong> | <strong>Dias</strong> | <strong>Vendas</strong> | % | <strong>Itens</strong> | % | <strong>PA</strong> | Trocas | <strong>Total</strong> | % | <strong>Ticket</strong> | ...</p>
                  <p className="mt-1 text-indigo-600">Formato pt-BR aceito (ex: <code>14.492,05</code>). Linha "TOTAL" é ignorada automaticamente.</p>
                </div>
                {/* Textarea */}
                <textarea
                  className="w-full h-44 border border-gray-300 rounded-xl px-4 py-3 text-xs font-mono focus:ring-2 focus:ring-indigo-400 focus:outline-none resize-none"
                  placeholder="VENDEDOR;DIAS;VENDAS;ITENS;TOTAL;PA;TICKET&#10;MARIA SILVA;22;45;90;18500.00;2.0;411.11&#10;JOANA SOUZA;20;38;72;15200.00;1.9;400.00"
                  value={histImportText}
                  onChange={e => setHistImportText(e.target.value)}
                />
              </div>

              {/* CONTEÚDO DA TAB FILE */}
              <div className={importTab === 'file' ? 'block' : 'hidden'}>
                <div 
                  className={`w-full h-[236px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all bg-gray-50 relative ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300'}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input type="file" accept=".xlsx, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={(e) => { if (e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0]); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <Upload className={`w-12 h-12 mb-3 ${dragActive ? 'text-indigo-500' : 'text-gray-400'}`} />
                  {fileName ? (
                    <div className="text-center">
                      <p className="text-lg font-bold text-indigo-700">{fileName}</p>
                      <p className="text-sm font-bold text-indigo-500 mt-2 bg-indigo-100 px-3 py-1.5 rounded-full inline-block">Planilha pronta para processar!</p>
                      <p className="text-xs text-gray-400 mt-2">Você pode revisar o texto convertido na outra aba se quiser.</p>
                    </div>
                  ) : (
                    <div className="text-center pointer-events-none">
                      <p className="text-sm font-bold text-gray-700">Arraste sua planilha aqui ou clique para buscar</p>
                      <p className="text-xs font-bold text-gray-400 mt-2">Suporta .XLSX e .CSV</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={processHistoryImport}
                disabled={isSubmitting}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2
    ${isSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800'
                  }`}
              >
                {isSubmitting
                  ? <><span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> Salvando...</>
                  : <><CheckCircle className="w-4 h-4" /> Salvar Histórico</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Metas;
