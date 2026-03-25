import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import { useSupabaseData } from './useSupabase';
import { KanbanBoard } from './KanbanBoard';
import CRM from './components/CRM';
import { BottomNav } from './components/BottomNav';
import Painel from './components/Painel';
import PainelCEO from './components/PainelCEO';
import Financeiro from './components/Financeiro';
import Estoque from './components/Estoque';
import { Metas } from './components/Metas';
import Divulgacao from './components/Divulgacao';
import { Package, AlertTriangle, Save, RefreshCw, CheckCircle, Search, ArrowRight, Download, Upload, X, Copy, Trash2, CheckSquare, List, ArrowDownCircle, ArrowUpCircle, BarChart3, TrendingUp, Sparkles, AlertOctagon, FileJson, Printer, ChevronLeft, ChevronDown, ChevronUp, Share2, Camera, Smartphone, Instagram, Calendar, ArrowDownUp, EyeOff, CameraOff, PlusCircle, Send, Archive, Calculator, Target, DollarSign, PieChart, Users, TrendingDown, Award, UserCheck, UserMinus, Filter, ChevronRight, SlidersHorizontal, LogOut } from 'lucide-react';
// ==========================================
// 1. CONFIGURAÇÕES FINANCEIRA DAS LOJAS
// ==========================================
const STORE_CONFIGS = {
  '3': {
    name: 'Loja 03',
    collaborators: 3,
    fixedCosts: { aluguel: 0.00, proLabore: 5300.00, agua: 140.00, luz: 300.00, internet: 200.00, software: 900.00, contabilidade: 850.00, colaboradoras: 8480.96, adm: 840.00, alimentacao: 460.00, transporte: 400.74 },
    variableCosts: { cmv: 50.00, imposto: 8.19, taxaCartao: 2.00, embalagem: 0.70, obsoleto: 5.00 }
  },
  '4': {
    name: 'Loja 04',
    collaborators: 4,
    fixedCosts: { aluguel: 0.00, proLabore: 0.00, agua: 140.00, luz: 300.00, internet: 200.00, software: 900.00, contabilidade: 850.00, colaboradoras: 11307.95, adm: 840.00, alimentacao: 460.00, transporte: 400.74 },
    variableCosts: { cmv: 50.00, imposto: 7.95, taxaCartao: 2.00, embalagem: 0.70, obsoleto: 5.00 }
  },
  '7': {
    name: 'Loja 07',
    collaborators: 5,
    fixedCosts: { aluguel: 6000.00, proLabore: 5300.00, agua: 140.00, luz: 300.00, internet: 200.00, software: 900.00, contabilidade: 850.00, colaboradoras: 14134.94, adm: 840.00, alimentacao: 460.00, transporte: 400.74 },
    variableCosts: { cmv: 50.00, imposto: 9.36, taxaCartao: 2.00, embalagem: 0.70, obsoleto: 5.00 }
  },
  '8': {
    name: 'Loja 08',
    collaborators: 3,
    fixedCosts: { aluguel: 0.00, proLabore: 0.00, agua: 140.00, luz: 300.00, internet: 200.00, software: 900.00, contabilidade: 850.00, colaboradoras: 8480.96, adm: 840.00, alimentacao: 460.00, transporte: 400.74 },
    variableCosts: { cmv: 50.00, imposto: 7.21, taxaCartao: 2.00, embalagem: 0.70, obsoleto: 5.00 }
  },
  '10': {
    name: 'Loja 10',
    collaborators: 3,
    fixedCosts: { aluguel: 8500.00, proLabore: 5000.00, agua: 140.00, luz: 300.00, internet: 200.00, software: 650.00, contabilidade: 850.00, colaboradoras: 8480.96, adm: 840.00, alimentacao: 460.00, transporte: 400.74 },
    variableCosts: { cmv: 50.00, imposto: 8.64, taxaCartao: 2.00, embalagem: 0.70, obsoleto: 5.00 }
  }
};

const initialMockData = [
  { id: 1, MARCA: "001", MARCALOJA: "LOJA 01", MARCADESC: "NIKE", TIPOLOJA: "CALÇADOS", TIPO: "TENIS", TIPODESC: "TENIS MASCULINO CORRIDA", REFERENCIA: "NK-AIR-001 599.90", COR1DESC: "PRETO", COR2DESC: "", COR3DESC: "", DATAENTRADA: "2023-10-15", CODLOJA: "001", sizes: { P: 0, M: 0, G: 0, GG: 0, '36': 0, '38': 2, '40': 5, '42': 3, '44': -1, '46': 0, '48': 0, '50': 0, '52': 0 }, QTDE: 10 }
];

const sizeColumns = ['P', 'M', 'G', 'GG', '36', '38', '40', '42', '44', '46', '48', '50', '52'];

// ==========================================
// 2. HELPERS GLOBAIS
// ==========================================
const calculateTotal = (sizesObj) => sizeColumns.reduce((acc, size) => acc + (parseInt(sizesObj[size]) || 0), 0);

const parseDate = (dateStr) => {
  if (!dateStr) return 0;
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) return isoDate.getTime();
  try {
    const parts = dateStr.split(' ')[0].split('/');
    if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
  } catch (e) { return 0; }
  return 0;
};

const getItemKey = (item) => `${item.REFERENCIA}-${item.COR1DESC}`.trim();
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const parseCurrency = (str) => {
  if (typeof str === 'number') return str;
  if (!str || typeof str !== 'string') return 0;
  return parseFloat(str.replace(/\./g, '').replace(',', '.'));
};

const getMonthName = (monthIndex) => {
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return months[monthIndex - 1] || "";
};

const roundToSpecial = (value) => {
  if (value <= 0) return 0;
  const thousands = Math.floor(value / 1000);
  const remainder = value % 1000;
  if (remainder === 0) return value; // exact thousand → keep (e.g. 20.000)
  if (remainder <= 900) return (thousands * 1000) + 900; // 001–900 → same milhar .900
  return ((thousands + 1) * 1000) + 900; // 901–999 → next milhar .900
};

// ==========================================
// COMPONENTE: PAINEL DETALHES DA CATEGORIA (Dashboard)
// ==========================================
const CategoryDetailPanel = ({ category, items, onClose }) => {
  const [sizeFilter, setSizeFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Tamanhos disponíveis nesta categoria
  const availableSizes = useMemo(() => {
    const sizeSet = new Set();
    items.forEach(item => {
      sizeColumns.forEach(s => {
        if ((parseInt(item.sizes[s]) || 0) > 0) sizeSet.add(s);
      });
    });
    return sizeColumns.filter(s => sizeSet.has(s));
  }, [items]);

  // Itens filtrados
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const total = calculateTotal(item.sizes);
      if (total <= 0) return false;

      // Filtro por tamanho
      if (sizeFilter && !((parseInt(item.sizes[sizeFilter]) || 0) > 0)) return false;

      // Filtro por texto
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        if (
          !(item.REFERENCIA || '').toLowerCase().includes(q) &&
          !(item.MARCADESC || '').toLowerCase().includes(q) &&
          !(item.COR1DESC || '').toLowerCase().includes(q) &&
          !(item.TIPODESC || '').toLowerCase().includes(q)
        ) return false;
      }

      return true;
    });
  }, [items, sizeFilter, searchFilter]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-indigo-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-5 rounded-t-2xl flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xl">{category}</h3>
            <p className="text-sm opacity-80 mt-0.5">{filteredItems.length} modelo{filteredItems.length !== 1 ? 's' : ''} encontrado{filteredItems.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filtros */}
        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 space-y-3">
          {/* Busca textual */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por referência, marca ou cor..."
              className="w-full pl-9 pr-4 py-2.5 border border-indigo-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none transition-all"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
            />
            {searchFilter && (
              <button onClick={() => setSearchFilter('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtro de tamanhos */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Filtrar por Tamanho</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSizeFilter('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${sizeFilter === ''
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
              >
                Todos
              </button>
              {availableSizes.map(size => (
                <button
                  key={size}
                  onClick={() => setSizeFilter(sizeFilter === size ? '' : size)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${sizeFilter === size
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de itens */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum modelo encontrado</p>
              <p className="text-sm mt-1">Tente ajustar os filtros</p>
            </div>
          ) : (
            filteredItems.map(item => {
              const sizesInStock = sizeColumns.filter(s => (parseInt(item.sizes[s]) || 0) > 0);
              const total = calculateTotal(item.sizes);

              return (
                <div
                  key={item.id}
                  className="bg-gradient-to-br from-white to-indigo-50/30 rounded-xl border border-indigo-100 p-4 hover:shadow-md transition-all hover:border-indigo-300"
                >
                  {/* Linha principal */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-sm leading-tight">{item.TIPODESC}</div>
                      <div className="text-xs text-indigo-700 font-mono mt-0.5">{item.REFERENCIA}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.MARCADESC}{item.COR1DESC ? ` · ${item.COR1DESC}` : ''}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${total === 1 ? 'bg-orange-100 text-orange-700' :
                        total >= 5 ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                        {total} {total === 1 ? 'peça' : 'peças'}
                      </span>
                    </div>
                  </div>

                  {/* Grade de tamanhos */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1.5 font-medium">Grade disponível:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {sizesInStock.map(s => (
                        <span
                          key={s}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${sizeFilter === s
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-indigo-700 border-indigo-200'
                            }`}
                        >
                          <span>{s}</span>
                          <span className="text-indigo-400 font-normal">×{item.sizes[s]}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer com resumo */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {sizeFilter ? (
                <span>
                  Mostrando modelos disponíveis no tamanho <span className="font-bold text-indigo-700">{sizeFilter}</span>
                </span>
              ) : (
                <span>Mostrando todos os tamanhos disponíveis</span>
              )}
            </span>
            <span className="font-bold text-indigo-700">
              {filteredItems.reduce((acc, i) => acc + calculateTotal(i.sizes), 0)} peças no total
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. COMPONENTE PRINCIPAL
// ==========================================
const App = () => {
  // --- Estados de Interface ---
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'dashboard');
  const changeTab = (tab) => { setActiveTab(tab); localStorage.setItem('activeTab', tab); };
  const [searchTerm, setSearchTerm] = useState("");
  const [localAuditSearch, setLocalAuditSearch] = useState("");
  // Ref sempre fresco do auditData — evita closure stale no handleAuditChange
  const auditDataRef = useRef([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [importText, setImportText] = useState("");
  // Estados LOCAIS do modal de importação — isolados de selectedMonth/selectedYear
  const [importTargetStore, setImportTargetStore] = useState('10');
  const [printMode, setPrintMode] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [marketingSort, setMarketingSort] = useState('recent');
  const [marketingStore, setMarketingStore] = useState('all'); // 'all' ou código de loja

  // --- Estados Dashboard Filtros ---
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [dashboardSizeFilter, setDashboardSizeFilter] = useState('');
  const [dashboardCategoryFilter, setDashboardCategoryFilter] = useState('');
  const [showDashboardFilters, setShowDashboardFilters] = useState(false);
  const [dashboardStore, setDashboardStore] = useState('all'); // 'all' ou código de loja específico
  const [expandedMonthRow, setExpandedMonthRow] = useState(null); // for seller drill-down in projection table

  // --- Estados de Negócio ---
  const [selectedStore, setSelectedStore] = useState('10');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [clearBeforeImport, setClearBeforeImport] = useState(false);


  // --- Auth ---
  const [userId, setUserId] = useState(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // --- Dados Persistentes via Supabase ---
  const {
    loading: dbLoading,
    syncStatus,
    systemData,
    auditData,
    salesHistory,
    dreValues,
    projectionSellers,
    updateProjectionSellers,
    marketingStatus,
    completedIds,
    sellerOverrides,
    hrCandidates,
    setSystemData: _setSystemData,
    setAuditData: _seedAudit,
    updateAuditItem: _updateAuditItem,
    upsertSalesHistory,
    updateDreKey,
    deleteDreKey,
    toggleMarketing: _toggleMarketing,
    toggleCompleted: _toggleCompleted,
    setSellerOverride: _setSellerOverride,
    saveHrCandidate: _saveHrCandidate,
    deleteHrCandidate: _deleteHrCandidate,
    moveHrStatus: _moveHrStatus,
    updateProjectionSeller: _updateProjectionSeller,
    tasks,
    saveTask,
    moveTaskStatus,
    moveTaskCamada,
    deleteTask,
    archiveTask,
    crmLeads,
    crmWishlist,
    crmCustomTags,
    saveCrmLead,
    moveCrmLeadStage,
    deleteCrmLead,
    archiveCrmLead,
    saveCrmWishlist,
    deleteCrmWishlist,
    updateCrmWishlistStatus,
    addCrmCustomTag,
    archiveHrCandidate,
    setMarketingPhoto: _setMarketingPhoto,
    upsertMarketingFields: _upsertMarketingFields,
    reloadAll,
  } = useSupabaseData(userId);

  // --- UI State (não persistido) ---
  const [dreScenario, setDreScenario] = useState('base');
  const [goalsSellerOverride, setGoalsSellerOverride] = useState(null);
  const [selectedSellerNames, setSelectedSellerNames] = useState(new Set());

  // --- RH State ---
  const [hrFilterYear, setHrFilterYear] = useState(new Date().getFullYear());
  const [hrFilterStore, setHrFilterStore] = useState('all');
  const [activeDaysFilter, setActiveDaysFilter] = useState(60);
  const [hrFilterStatus, setHrFilterStatus] = useState('all');
  const [hrSearch, setHrSearch] = useState('');
  const [hrShowForm, setHrShowForm] = useState(false);
  const [photoModal, setPhotoModal] = useState(null); // null | { key, storeId, currentUrl }
  const [hrEditId, setHrEditId] = useState(null);
  const [hrForm, setHrForm] = useState({
    nome: '', telefone: '', cargo: '', loja: '10',
    status: 'triagem', motivo: '',
    recebimento_curriculo: new Date().toISOString().slice(0, 10),
    entrevista_data: '', contratacao_data: '', observacoes: ''
  });
  const [hrExpandedCols, setHrExpandedCols] = useState({}); // { [statusId]: true } quando expandido
  const [hrOptimistic, setHrOptimistic] = useState(null);
  const [hrDragOverCol, setHrDragOverCol] = useState(null);

  // Sync optimistic UI with DB
  useEffect(() => {
    setHrOptimistic(null);
  }, [hrCandidates]);

  // ── FIX #310: useEffect movido do IIFE da Aba Auditoria para o topo do componente ──
  // Garante ordem de hooks estável entre renders/transições de aba.
  useEffect(() => {
    setLocalAuditSearch('');
    setSearchTerm('');
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(new Date().getFullYear());
  }, [selectedStore]);
  // Mantém auditDataRef sempre sincronizado com o estado mais recente
  // Isso evita que handleAuditChange leia um closure stale entre digitações rápidas
  useEffect(() => { auditDataRef.current = auditData; }, [auditData]);

  // --- Lógica de Negócio ---
  const filterData = useCallback((data) => {
    if (!data) return [];
    const t = searchTerm.toLowerCase();
    return data.filter(item =>
      (item.REFERENCIA || "").toLowerCase().includes(t) ||
      (item.MARCADESC || "").toLowerCase().includes(t) ||
      (item.TIPODESC || "").toLowerCase().includes(t) ||
      (item.COR1DESC || "").toLowerCase().includes(t)
    );
  }, [searchTerm]);

  const getSellerStatus = (storeId, month, year, sellerName, daysWorked) => {
    const key = `${storeId}-${month}-${year}-${sellerName}`;
    if (sellerOverrides[key]) return sellerOverrides[key];
    // EXTRA com dias trabalhados >= 5 pode ser ativado manualmente
    // Por padrão EXTRA vai como 'extra', mas vendas são sempre incluídas no total da loja
    if (daysWorked >= 5 && !sellerName.toUpperCase().includes('EXTRA')) return 'active';
    return 'extra';
  };


  const toggleSellerStatus = (storeId, month, year, sellerName, currentStatus) => {
    const key = `${storeId}-${month}-${year}-${sellerName}`;
    const newStatus = currentStatus === 'active' ? 'extra' : 'active';
    _setSellerOverride(key, newStatus);
  };

  const getHistoricalDataForStorePeriod = (storeId, month, year) => {
    const periodKey = `${year}-${String(month).padStart(2, '0')}`;
    return salesHistory.filter(h => h?.storeCode == storeId && h?.period === periodKey);
  };

  const hasHistoricalData = (storeId, month, year) => getHistoricalDataForStorePeriod(storeId, month, year).length > 0;

  const calculateTrend = (storeId, month) => {
    const getSales = (year) =>
      getHistoricalDataForStorePeriod(storeId, month, year).reduce((acc, r) => acc + r.totalSales, 0);

    const v2024 = getSales(2024);
    const v2025 = getSales(2025);
    const v2026 = getSales(2026);

    // Sem dados suficientes → mostra '--'
    if (!v2024 && !v2025) return { trend: 'neutral', percent: null, arrow: '→' };
    if (!v2026) return { trend: 'neutral', percent: null, arrow: '→' };

    const mediaAnteriores = (v2024 + v2025) / (v2024 && v2025 ? 2 : 1);
    if (mediaAnteriores === 0) return { trend: 'neutral', percent: null, arrow: '→' };

    const variacao = ((v2026 / mediaAnteriores) - 1) * 100;
    if (variacao > 3) return { trend: 'up', percent: variacao, arrow: '↗' };
    if (variacao < -3) return { trend: 'down', percent: variacao, arrow: '↘' };
    return { trend: 'neutral', percent: variacao, arrow: '→' };
  };

  const hasAllYearsData = (storeId, month) => {
    return [2021, 2022, 2023, 2024, 2025, 2026].every(year => hasHistoricalData(storeId, month, year));
  };

  const getFinancialData = (storeId, month, year) => {
    const config = STORE_CONFIGS[storeId] || STORE_CONFIGS['10'];
    const history = getHistoricalDataForStorePeriod(storeId, month, year);
    let activeSellers = history.length > 0
      ? history.filter(h => getSellerStatus(storeId, month, year, h.sellerName, h.daysWorked) === 'active').length
      : config.collaborators;
    const totalFixed = Object.values(config.fixedCosts).reduce((a, b) => a + b, 0);
    const totalVariablePercent = Object.values(config.variableCosts).reduce((a, b) => a + b, 0);
    const contributionMargin = 100 - totalVariablePercent;
    const marginRate = contributionMargin / 100;
    const breakEven = marginRate > 0 ? totalFixed / marginRate : 0;
    const goalPerSeller = activeSellers > 0 ? breakEven / activeSellers : 0;
    const realTotalSales = history.reduce((acc, curr) => acc + curr.totalSales, 0);
    const surplus = realTotalSales - breakEven;
    const profit = surplus > 0 ? surplus * marginRate : 0;
    return { totalFixed, totalVariablePercent, contributionMargin, breakEven, goalPerSeller, activeSellers, realTotalSales, surplus, profit, config };
  };

  const getGoalsData = (storeId, month, numSellersOverride) => {
    const currentYear = new Date().getFullYear();
    const currentFinancial = getFinancialData(storeId, month, currentYear);
    const { breakEven, activeSellers } = currentFinancial;
    const numSellers = numSellersOverride != null ? numSellersOverride : (activeSellers > 0 ? activeSellers : 1);

    // === HISTÓRICO ÚLTIMOS 3 ANOS ===
    const last3Years = [2024, 2025, 2026];
    const last3YearsRaw = last3Years.map(y => {
      const periodKey = `${y}-${String(month).padStart(2, '0')}`;
      return salesHistory.filter(h => h?.storeCode == storeId && h?.period === periodKey)
        .reduce((acc, r) => acc + (r?.totalSales || 0), 0);
    });
    const last3YearsValid = last3YearsRaw.filter(v => v > 10000);
    const mediaUltimos3Anos = last3YearsValid.length > 0
      ? last3YearsValid.reduce((a, b) => a + b, 0) / last3YearsValid.length
      : 0;

    // Recorde histórico INDIVIDUAL (maior venda de um único vendedor em qualquer ano)
    const allYearsForRecord = [2021, 2022, 2023, 2024, 2025, 2026];
    const allIndividualSales = allYearsForRecord.flatMap(y => {
      const periodKey = `${y}-${String(month).padStart(2, '0')}`;
      return salesHistory
        .filter(h => h?.storeCode == storeId && h?.period === periodKey && (h?.totalSales || 0) > 5000)
        .map(h => h?.totalSales || 0);
    });
    const recorde = allIndividualSales.length > 0 ? Math.max(...allIndividualSales) : 0;

    // F_vend: maior dos últimos 3 anos ÷ média dos últimos 3 anos
    const maiorUltimos3Anos = last3YearsValid.length > 0 ? Math.max(...last3YearsValid) : 0;
    const fVend = mediaUltimos3Anos > 0 ? maiorUltimos3Anos / mediaUltimos3Anos : 1;

    const baseMedia = mediaUltimos3Anos > 0 ? mediaUltimos3Anos : breakEven;

    // =====================================================
    // 1. META BRONZE INDIVIDUAL (B_ind) — Lógica 2.1
    // Fórmula: (Média 3 anos × F_vend × 0.80) ÷ Vendedoras
    // Fator Newbie 0.80: Bronze é 20% menor que o potencial máx do time
    // Trava: SEM piso de R$ 20.000
    // =====================================================
    const bronzeIndRaw = (baseMedia * fVend * 0.80) / numSellers;
    const metaBronzeInd = roundToSpecial(bronzeIndRaw);

    // =====================================================
    // 2. META BRONZE LOJA (B_loja) — Lógica 2.1
    // Fórmula: B_ind × Vendedoras
    // =====================================================
    const metaBronzeLoja = roundToSpecial(metaBronzeInd * numSellers);

    // =====================================================
    // 3. META PRATA INDIVIDUAL (P_ind) — Lógica 2.1
    // Fórmula: (Média 3 anos × 1,10) ÷ Vendedoras
    // Travas: P_ind >= B_ind  e  P_ind <= Recorde × 1,05
    // =====================================================
    // =====================================================
    // 3. META PRATA INDIVIDUAL (P_ind) — Spec v2.2
    // Fórmula: MAX(B_ind ; round900((M * 1.10) / V))
    // Trava: resultado final <= Recorde × 1.05 / V
    // =====================================================
    const prataIndRound = roundToSpecial((baseMedia * 1.10) / numSellers);
    const prataIndMax = recorde > 0 ? recorde * 1.05 : Infinity;
    const metaPrataInd = Math.min(Math.max(metaBronzeInd, prataIndRound), prataIndMax);

    // =====================================================
    // 4. META PRATA LOJA (P_loja) — Spec v2.2
    // Fórmula: MAX(B_loja ; round900(P_ind × V))
    // =====================================================
    const metaPrataLoja = Math.max(metaBronzeLoja, roundToSpecial(metaPrataInd * numSellers));

    // =====================================================
    // 5. META OURO LOJA (O_loja) — Spec v2.2 (calculada ANTES de O_ind)
    // Fórmula: MAX(P_loja ; BE ; round900(M × 1.15 × 1.02))
    // =====================================================
    const ouroLojaHist = mediaUltimos3Anos > 0 ? roundToSpecial(mediaUltimos3Anos * 1.15 * 1.02) : 0;
    const metaOuroLoja = Math.max(metaPrataLoja, breakEven, ouroLojaHist);

    // =====================================================
    // 6. META OURO INDIVIDUAL (O_ind) — Spec v2.2
    // Fórmula: MAX(20000 ; P_ind ; round900(O_loja / V))
    // Trava: resultado final <= Recorde × 1.15
    // =====================================================
    const ouroIndRound = roundToSpecial(metaOuroLoja / numSellers);
    const ouroIndMax = recorde > 0 ? recorde * 1.15 : Infinity;
    const metaOuroInd = Math.min(Math.max(20000, metaPrataInd, ouroIndRound), ouroIndMax);

    // === HISTÓRICO PARA O GRÁFICO ===
    const baseHistory = [2022, 2023, 2024, 2025, 2026];
    const currentYearNum = new Date().getFullYear();
    let historyYears = [...new Set([...baseHistory, currentYearNum])].sort();
    historyYears = historyYears.filter(yr => yr <= Number(selectedYear));

    const historicalData = historyYears.map(y => {
      const periodKey = `${y}-${String(month).padStart(2, '0')}`;
      const records = salesHistory.filter(h => h.storeCode == storeId && h.period === periodKey);
      return { year: y, total: records.reduce((acc, r) => acc + r.totalSales, 0) };
    });

    return {
      metaBronzeInd, metaBronzeLoja,
      metaPrataInd, metaPrataLoja,
      metaOuroInd, metaOuroLoja,
      // auxiliares
      mediaUltimos3Anos, recorde, fVend, breakEven,
      contributionMarginRate: currentFinancial.contributionMargin / 100,
      totalFixed: currentFinancial.totalFixed,
      historicalData,
      activeSellers: numSellers,
      // compat legada (DRE)
      metaConservadora: metaOuroLoja,
      metaBronze: metaBronzeInd,
      metaPrataIndividual: metaPrataInd,
    };
  };

  // --- Memos ---
  // Filtro por loja na aba Auditoria (systemData e auditData separados por store_id)
  const storeSystemData = useMemo(() =>
    systemData.filter(i => String(i.store_id || i.storeId) === String(selectedStore)),
    [systemData, selectedStore]);
  const storeAuditData = useMemo(() => {
    const filtered = auditData.filter(i => String(i.store_id || i.storeId) === String(selectedStore));
    // Dedup por item_id: se o mesmo produto entrou duas vezes no banco (resíduo de inserts
    // anteriores ao fix delete-first), o Map mantém apenas a última ocorrência
    return Array.from(new Map(filtered.map(i => [i.id, i])).values());
  }, [auditData, selectedStore]);
  const filteredStoreSystemData = useMemo(() => filterData(storeSystemData), [storeSystemData, filterData]);

  const filteredStoreAuditData = useMemo(() => {
    // Enriquece cada item de auditoria com os campos descritivos do systemData
    // (normalizeAuditRow só salva REFERENCIA — TIPODESC/MARCADESC/COR1DESC vêm do ERP)
    const systemIndex = new Map(systemData.map(s => [String(s.REFERENCIA), s]));
    const enriched = storeAuditData.map(item => {
      const sys = systemIndex.get(String(item.REFERENCIA)) || {};
      return {
        ...item,
        TIPODESC: item.TIPODESC || sys.TIPODESC || '',
        MARCADESC: item.MARCADESC || sys.MARCADESC || '',
        COR1DESC: item.COR1DESC || sys.COR1DESC || '',
      };
    });

    // Filtra pelo texto digitado nos campos descritivos reais
    const filtered = !localAuditSearch
      ? enriched
      : (() => {
        const q = localAuditSearch.toLowerCase();
        return enriched.filter(i =>
          (i.REFERENCIA || '').toLowerCase().includes(q) ||
          (i.TIPODESC || '').toLowerCase().includes(q) ||
          (i.MARCADESC || '').toLowerCase().includes(q) ||
          (i.COR1DESC || '').toLowerCase().includes(q)
        );
      })();

    // Sort estável por REFERENCIA — evita jumps de renderização
    return [...filtered].sort((a, b) =>
      String(a.REFERENCIA || '').localeCompare(String(b.REFERENCIA || ''))
    );
  }, [storeAuditData, systemData, localAuditSearch]);

  const differences = useMemo(() => {
    // RIGOROUS FILTER BY SELECTED STORE
    const filteredSystem = systemData.filter(s => String(s.store_id || s.storeId) === String(selectedStore));
    // Deduplicate audit data by REFERENCIA for the selected store
    const storeAuditDataStrict = Array.from(new Map(auditData.filter(a => String(a.store_id || a.storeId) === String(selectedStore)).map(i => [i.REFERENCIA, i])).values());

    // Apply localAuditSearch filter to the deduplicated audit data
    const filteredStoreAuditDataForDifferences = (() => {
      if (!localAuditSearch) return storeAuditDataStrict;
      const t = localAuditSearch.toLowerCase();
      return storeAuditDataStrict.filter(i =>
        (i.REFERENCIA || "").toLowerCase().includes(t) ||
        (i.TIPODESC || "").toLowerCase().includes(t) ||
        (i.MARCADESC || "").toLowerCase().includes(t) ||
        (i.COR1DESC || "").toLowerCase().includes(t)
      );
    })();

    return filteredSystem.map(sys => {
      // Find audit item in the filtered and deduplicated audit data
      const audit = filteredStoreAuditDataForDifferences.find(a => String(a.REFERENCIA) === String(sys.REFERENCIA));
      if (!audit) return null; // If no matching audit item, skip

      const diffs = {};
      let has = false;
      sizeColumns.forEach(s => {
        const d = (parseInt(audit.sizes[s]) || 0) - (parseInt(sys.sizes[s]) || 0);
        if (d !== 0) { diffs[s] = d; has = true; }
      });
      const auditTotal = calculateTotal(audit.sizes);
      return { ...sys, diffSizes: diffs, hasDifference: has, auditTotal, diffTotal: auditTotal - sys.QTDE };
    }).filter(i => i && i.hasDifference);
  }, [systemData, auditData, selectedStore]);

  const exits = differences.filter(d => d.diffTotal < 0 && !(completedIds.has(`${d.store_id || selectedStore}|${d.id}`) || completedIds.has(String(d.id))));
  const entries = differences.filter(d => d.diffTotal > 0 && !(completedIds.has(`${d.store_id || selectedStore}|${d.id}`) || completedIds.has(String(d.id))));

  // Dados de auditoria filtrados pela loja selecionada no dashboard
  const dashboardAuditData = useMemo(() => {
    const storeFilter = dashboardStore === 'all' ? null : dashboardStore;
    // norm() para filtro de loja — tolera '03' e '3' como o mesmo valor
    const norm = s => String(s || '').replace(/^0+/, '') || '0';
    const baseData = storeFilter
      ? auditData.filter(i => norm(i.store_id || i.storeId) === norm(storeFilter))
      : auditData;
    // Enriquece com TIPODESC/MARCADESC/COR1DESC do systemData
    // normalizeAuditRow não persiste campos descritivos — eles ficam só no systemData
    const sysIndex = new Map(systemData.map(s => [String(s.REFERENCIA), s]));
    const enriched = baseData.map(i => {
      const sys = sysIndex.get(String(i.REFERENCIA)) || {};
      return {
        ...i,
        TIPODESC: i.TIPODESC || sys.TIPODESC || 'OUTROS',
        MARCADESC: i.MARCADESC || sys.MARCADESC || '',
        COR1DESC: i.COR1DESC || sys.COR1DESC || '',
      };
    });
    // Deduplicação por REFERENCIA+store_id
    return Array.from(new Map(enriched.map(i => [`${i.REFERENCIA}|${i.store_id || i.storeId}`, i])).values());
  }, [auditData, systemData, dashboardStore]);

  const dashboardStats = useMemo(() => {
    const categoryStats = {};
    const categoryItems = {}; // itens por categoria
    dashboardAuditData.forEach(item => {
      const category = item.TIPODESC || "OUTROS";
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, sizes: {} };
        categoryItems[category] = [];
        sizeColumns.forEach(s => categoryStats[category].sizes[s] = 0);
      }
      const itemTotal = calculateTotal(item.sizes);
      if (itemTotal > 0) {
        categoryStats[category].total += itemTotal;
        categoryItems[category].push(item);
        sizeColumns.forEach(size => {
          if ((parseInt(item.sizes[size]) || 0) > 0) categoryStats[category].sizes[size] += (parseInt(item.sizes[size]) || 0);
        });
      }
    });
    const sortedCategories = Object.entries(categoryStats).sort(([, a], [, b]) => b.total - a.total);
    const lastPieces = dashboardAuditData.filter(item => calculateTotal(item.sizes) === 1).sort((a, b) => (a.TIPODESC || "").localeCompare(b.TIPODESC || ""));
    const heavyStock = dashboardAuditData.filter(item => calculateTotal(item.sizes) >= 5).sort((a, b) => calculateTotal(b.sizes) - calculateTotal(a.sizes));
    const totalItems = dashboardStore === 'all'
      ? new Set(dashboardAuditData.map(i => i.REFERENCIA)).size
      : dashboardAuditData.length;
    const totalPieces = dashboardAuditData.reduce((acc, item) => Number(acc) + Number(calculateTotal(item.sizes)), 0);
    const avgPiecesPerItem = totalItems > 0 ? (totalPieces / totalItems).toFixed(1) : 0;
    const zeroStock = dashboardAuditData.filter(item => calculateTotal(item.sizes) === 0).length;
    return { sortedCategories, categoryItems, lastPieces, heavyStock, totalItems, totalPieces, avgPiecesPerItem, zeroStock };
  }, [dashboardAuditData]);

  // Tamanhos disponíveis no estoque inteiro (para filtro global)
  const allAvailableSizes = useMemo(() => {
    const sizeSet = new Set();
    dashboardAuditData.forEach(item => {
      sizeColumns.forEach(s => {
        if ((parseInt(item.sizes[s]) || 0) > 0) sizeSet.add(s);
      });
    });
    return sizeColumns.filter(s => sizeSet.has(s));
  }, [dashboardAuditData]);

  // Itens filtrados pelo painel de filtros global do dashboard
  const dashboardFilteredItems = useMemo(() => {
    if (!dashboardSizeFilter && !dashboardCategoryFilter) return [];
    return dashboardAuditData.filter(item => {
      const total = calculateTotal(item.sizes);
      if (total <= 0) return false;
      if (dashboardCategoryFilter && (item.TIPODESC || 'OUTROS') !== dashboardCategoryFilter) return false;
      if (dashboardSizeFilter && !((parseInt(item.sizes[dashboardSizeFilter]) || 0) > 0)) return false;
      return true;
    });
  }, [dashboardAuditData, dashboardSizeFilter, dashboardCategoryFilter]);

  const heavyStockToDisplay = printMode ? dashboardStats.heavyStock : dashboardStats.heavyStock.slice(0, 20);

  // --- Handlers ---

  // --- Handlers ---
  const handleAuditChange = useCallback((id, size, value) => {
    const newValue = value === "" ? 0 : parseInt(value) || 0;
    // norm(): normaliza store_id removendo zeros à esquerda
    // normalizeStoreCode('3') → '03', mas STORE_CONFIGS usa '3'
    // sem isso, a comparação '03' === '3' falha silenciosamente
    const norm = s => String(s || '').replace(/^0+/, '') || '0';
    const item = auditDataRef.current.find(i =>
      String(i.id) === String(id) &&
      norm(i.store_id || i.storeId) === norm(selectedStore)
    );
    if (!item) {
      console.error('[handleAuditChange] item NÃO encontrado — store_id mismatch!', {
        buscando_id: id,
        selectedStore,
        store_norm: norm(selectedStore),
        amostra: auditDataRef.current.slice(0, 3).map(x => ({
          id: x.id, store_id: x.store_id, store_norm: norm(x.store_id)
        }))
      });
      return;
    }
    _updateAuditItem(selectedStore, id, item.REFERENCIA, size, newValue);
  }, [selectedStore, _updateAuditItem]);

  const confirmFillAuditWithSystem = async () => {
    // Usa _seedAudit (delete-first + bulk insert) em vez de iterar com _updateAuditItem
    // pois _updateAuditItem agora recebe (sizeKey, sizeValue) não newSizes completo
    const storeItems = systemData.filter(i => String(i.store_id || i.storeId) === String(selectedStore));
    await _seedAudit(selectedStore, storeItems);
    setShowResetModal(false);
  };

  // toggleCompleted: aceita "storeId|itemId" ou itemId numérico (legado)
  const toggleCompleted = (splitIdOrId) => {
    if (typeof splitIdOrId === 'string' && splitIdOrId.includes('|')) {
      const [storeId, itemId] = splitIdOrId.split('|');
      _toggleCompleted(storeId, Number(itemId));
    } else {
      _toggleCompleted(selectedStore, Number(splitIdOrId));
    }
  };

  const isCompleted = (itemId, storeId) => {
    const sc = storeId || selectedStore;
    return completedIds.has(`${sc}|${itemId}`) || completedIds.has(String(itemId));
  };

  const toggleCategory = (category) => { const newSet = new Set(expandedCategories); newSet.has(category) ? newSet.delete(category) : newSet.add(category); setExpandedCategories(newSet); };

  // toggleMarketing: usa o store_id real do item para não escrever na loja errada
  // quando marketingStore !== selectedStore
  const toggleMarketing = (key, field, itemStoreId) => {
    const storeId = itemStoreId || selectedStore;
    const compositeKey = `${storeId}|${key}`;
    const current = marketingStatus[compositeKey] || marketingStatus[key] || {};
    _toggleMarketing(storeId, key, field, current[field]);
  };

  // Helper: lê mktStatus usando chave composta store|key
  const getMktStatus = (item) => {
    const key = getItemKey(item);
    const storeId = item.store_id || item.storeId || selectedStore;
    return marketingStatus[`${storeId}|${key}`] || marketingStatus[key] || {};
  };

  // Converte URL do Google Drive em URL de thumbnail direta
  const getGDriveThumbnail = (url) => {
    if (!url) return null;
    const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (matchD) return `https://drive.google.com/thumbnail?id=${matchD[1]}&sz=w200`;
    const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchId) return `https://drive.google.com/thumbnail?id=${matchId[1]}&sz=w200`;
    // URL direta de imagem (jpg, png, etc.)
    if (url.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i)) return url;
    return url;
  };

  const savePhotoUrl = async (key, storeId, url) => {
    if (!_setMarketingPhoto) return;
    await _setMarketingPhoto(storeId, key, url || null);
    setPhotoModal(null);
  };

  // ── HANDLERS: Fila de Postagens ──
  const addToQueue = useCallback((item) => {
    const key = getItemKey(item);
    const storeId = item.store_id || item.storeId || selectedStore;
    _upsertMarketingFields(storeId, key, { in_queue: true });
  }, [selectedStore, _upsertMarketingFields]);

  const removeFromQueue = useCallback((item) => {
    const key = getItemKey(item);
    const storeId = item.store_id || item.storeId || selectedStore;
    _upsertMarketingFields(storeId, key, { in_queue: false });
  }, [selectedStore, _upsertMarketingFields]);

  const postFromQueue = useCallback((item) => {
    const key = getItemKey(item);
    const storeId = item.store_id || item.storeId || selectedStore;
    _upsertMarketingFields(storeId, key, { posted: true, in_queue: false, posted_at: new Date().toISOString() });
  }, [selectedStore, _upsertMarketingFields]);

  const processImport = async () => {
    try {
      const rows = importText.trim().split('\n'); if (rows.length < 2) return;
      const sep = rows[0].includes('\t') ? '\t' : (rows[0].includes(';') ? ';' : ',');
      const headers = rows[0].split(sep).map(h => h.trim().toUpperCase());
      const parsed = rows.slice(1).map((row, idx) => {
        const vals = row.split(sep);
        const item = { id: idx + 1, sizes: {}, store_id: importTargetStore };
        headers.forEach((h, i) => { if (sizeColumns.includes(h)) item.sizes[h] = parseInt(vals[i]) || 0; else item[h] = vals[i]; });
        sizeColumns.forEach(s => { if (item.sizes[s] === undefined) item.sizes[s] = 0; });
        item.QTDE = calculateTotal(item.sizes);
        item.REFERENCIA = item.REFERENCIA || `ITEM-${idx}`; item.MARCADESC = item.MARCADESC || "GENERICO"; item.TIPODESC = item.TIPODESC || "OUTROS";
        return item;
      });
      await _setSystemData(importTargetStore, parsed);
      setShowImportModal(false); setImportText("");
      alert(`Importado para ${STORE_CONFIGS[importTargetStore]?.name || importTargetStore}!`);
    } catch (e) { console.error(e); alert("Erro importação"); }
  };


  const handleExport = () => {
    if (differences.length === 0) { alert("Sem dados"); return; }
    const csvContent = "data:text/csv;charset=utf-8,REFERENCIA;QTDE\n" + auditData.map(i => `${i.REFERENCIA};${i.QTDE}`).join("\n");
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", "estoque.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const marketingItems = useMemo(() => {
    // Divulgação usa visão GLOBAL — todas as lojas para facilitar gestão de postagens.
    // O filtro interno (marketingStore) ainda limita dentro desta aba.
    const storeFiltered = (() => {
      if (marketingStore === 'all') return auditData;
      return auditData.filter(i => (i.store_id || i.storeId) === marketingStore);
    })();

    let filtered = storeFiltered.filter(item => {
      const stock = calculateTotal(item.sizes);
      const matchesSearch = !searchTerm ||
        (item.REFERENCIA || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.TIPODESC || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.MARCADESC || "").toLowerCase().includes(searchTerm.toLowerCase());
      const key = getItemKey(item);
      const storeId = item.store_id || item.storeId || 'all';
      const mStatus = marketingStatus[`${storeId}|${key}`] || marketingStatus[key] || {};
      if (marketingSort === 'archived') return !!mStatus.discontinued && matchesSearch;
      if (mStatus.discontinued) return false; // ocultar arquivados nas outras views
      if (marketingSort === 'cleanup') return stock === 0 && mStatus.catalog && matchesSearch;
      if (marketingSort === 'no-photo') return stock > 0 && !mStatus.photo && matchesSearch;
      if (marketingSort === 'no-catalog') return stock > 0 && mStatus.photo && !mStatus.catalog && matchesSearch;
      if (marketingSort === 'to-post') return stock > 0 && mStatus.photo && mStatus.catalog && !mStatus.posted && matchesSearch;
      return stock > 0 && matchesSearch;
    });
    return filtered.sort((a, b) => {
      if (marketingSort === 'recent') return parseDate(b.DATAENTRADA) - parseDate(a.DATAENTRADA);
      if (marketingSort === 'quantity') return calculateTotal(b.sizes) - calculateTotal(a.sizes);
      return 0;
    });
  }, [auditData, searchTerm, marketingStatus, marketingSort, marketingStore]);

  // Itens na fila: in_queue true, ainda não postados
  const queueItems = useMemo(() => {
    return auditData.filter(item => {
      const key = getItemKey(item);
      const storeId = item.store_id || item.storeId || 'all';
      const mStatus = marketingStatus[`${storeId}|${key}`] || marketingStatus[key] || {};
      return mStatus.in_queue === true && mStatus.posted !== true && !mStatus.discontinued;
    });
  }, [auditData, marketingStatus]);

  // --- RENDERIZAÇÃO COMPONENTES ---
  const GroupedDifferenceTable = ({ items, title, icon: Icon, colorClass, bgClass, isExit }) => {
    if (!items || items.length === 0) return null;
    const grouped = items.reduce((acc, item) => {
      const groupKey = item.TIPODESC || "OUTROS";
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(item);
      return acc;
    }, {});
    const sizeColorClass = isExit ? 'text-red-600' : 'text-green-600';
    return (
      <div className={`rounded-xl border mb-4 ${colorClass} print:border-none shadow-sm`}>
        <div className={`p-3 border-b flex items-center gap-2 ${bgClass}`}><Icon className="w-5 h-5" /> <span className="font-bold">{title}</span> <span className="ml-auto text-xs bg-white/50 px-2 rounded">{items.length}</span></div>
        <div className="p-2 space-y-1">
          {Object.entries(grouped).map(([group, groupItems]) => (
            <div key={group}>
              <div className="text-xs font-bold text-gray-500 uppercase mt-2 mb-1 px-1">{group}</div>
              {groupItems.map(i => {
                const sizesWithDiff = sizeColumns.filter(s => i.diffSizes[s] !== undefined && i.diffSizes[s] !== 0);
                return (
                  <div key={i.id} className="text-sm flex justify-between border-b p-1 last:border-0 hover:bg-white/50 transition-colors">
                    <span className="font-medium">{i.REFERENCIA} <span className="text-xs text-gray-400">({i.COR1DESC})</span></span>
                    <div className="flex gap-2">
                      {sizesWithDiff.map(s => (
                        <span key={s} className="text-xs bg-white border px-1.5 py-0.5 rounded-md">
                          <span className={`font-bold ${sizeColorClass}`}>{s}</span>: <span className="text-black">{i.diffSizes[s] > 0 ? '+' : ''}{i.diffSizes[s]}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderViabilityTab = () => {
    const finData = getFinancialData(selectedStore, selectedMonth, selectedYear);
    if (!finData || !finData.config) return <div className="p-8 text-gray-400 text-center">Carregando DRE...</div>;
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
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-slate-800 font-sans pb-20 ${printMode ? 'bg-white' : ''}`}>
      <style>{`@media print { @page { margin: 1.5cm; size: auto; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; } .no-print { display: none !important; } .break-inside-avoid { break-inside: avoid; } }`}</style>

      {/* PAINEL DETALHES DA CATEGORIA */}
      {selectedCategory && (
        <CategoryDetailPanel
          category={selectedCategory}
          items={dashboardStats.categoryItems[selectedCategory] || []}
          onClose={() => setSelectedCategory(null)}
        />
      )}

      {!printMode && (
        <>
          {showImportModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 border border-gray-200">
                <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-blue-800"><Upload className="w-5 h-5" /> Importar Dados do Sistema (ERP)</h3>
                <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <label className="block text-xs font-bold text-blue-800 mb-2 uppercase tracking-wide">🏪 Loja de Destino — Dados serão isolados por loja</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(STORE_CONFIGS).map(([k, v]) => (
                      <button key={k} onClick={() => setImportTargetStore(k)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${importTargetStore === k ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                        {v.name}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea className="w-full h-52 border border-gray-300 p-3 text-xs font-mono rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none" value={importText} onChange={e => setImportText(e.target.value)} placeholder="Cole os dados do ERP aqui (MARCA, REFERENCIA, tamanhos...)" />
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100">Cancelar</button>
                  <button onClick={processImport} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-md font-bold">
                    Importar para {STORE_CONFIGS[importTargetStore]?.name}
                  </button>
                </div>
              </div>
            </div>
          )}
          {showResetModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-yellow-200">
                <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-200 flex items-center gap-3"><AlertTriangle className="w-6 h-6 text-yellow-600" /><h3 className="font-bold text-lg text-yellow-800">Cuidado!</h3></div>
                <div className="p-6"><p className="text-gray-700 mb-4">Você está prestes a preencher toda a contagem com os dados do sistema.</p><p className="text-sm text-gray-500 font-bold">Isso irá SOBRESCREVER qualquer contagem manual que você já tenha feito.</p></div>
                <div className="p-4 bg-gray-50 flex justify-end gap-2">
                  <button onClick={() => setShowResetModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium">Cancelar</button>
                  <button onClick={confirmFillAuditWithSystem} className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:from-yellow-700 hover:to-orange-700 rounded-lg text-sm font-bold shadow-md">Sim, Preencher Tudo</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!printMode && (
        <nav className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm no-print overflow-x-auto">
          <div className="max-w-7xl mx-auto flex px-4">
            <div className="flex overflow-x-auto">
              <button onClick={() => changeTab('dashboard')} className={`py-4 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'dashboard' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><BarChart3 className="w-4 h-4 inline mr-1" /> 1. Painel</button>
              <button onClick={() => changeTab('audit')} className={`py-4 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${['audit', 'system', 'diff'].includes(activeTab) ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Package className="w-4 h-4 inline mr-1" /> 2. Estoque</button>
              <button onClick={() => changeTab('goals')} className={`py-4 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'goals' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Target className="w-4 h-4 inline mr-1" /> 3. Metas</button>
              <button onClick={() => changeTab('hr')} className={`py-4 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'hr' ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><UserCheck className="w-4 h-4 inline mr-1" /> 4. RH</button>
              <button onClick={() => changeTab('marketing')} className={`py-4 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'marketing' ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Share2 className="w-4 h-4 inline mr-1" /> 5. Divulgação</button>
              <button onClick={() => changeTab('viability')} className={`py-4 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'viability' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><PieChart className="w-4 h-4 inline mr-1" /> 6. DRE</button>
              <button onClick={() => changeTab('crm')} className={`py-4 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'crm' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Users className="w-4 h-4 inline mr-1" /> 7. CRM</button>
            </div>
            {/* Logout — far right */}
            <button
              onClick={() => supabase.auth.signOut()}
              title="Sair"
              className="ml-auto flex items-center gap-1.5 px-4 py-2 my-auto text-xs font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </nav>
      )}

      <main className={['crm'].includes(activeTab) ? 'w-full h-screen' : `max-w-7xl mx-auto p-4 md:p-6 ${printMode ? 'pt-20' : ''}`}>

        {/* ═══════════════════════════════════════════════════
            ABA UNIFICADA: AUDITORIA DE ESTOQUE
            • Seção 1: ERP (volátil) — importação sobrescreve
            • Seção 2: Contagem Física (persistente) — manual
            • Seção 3: Divergências (isoladas por tamanho)
        ═══════════════════════════════════════════════════ */}
        {['audit', 'system', 'diff'].includes(activeTab) && (
          <Estoque
            selectedStore={selectedStore} setSelectedStore={setSelectedStore} STORE_CONFIGS={STORE_CONFIGS}
            systemData={systemData} storeAuditData={storeAuditData} sizeColumns={sizeColumns}
            _seedAudit={_seedAudit} isCompleted={isCompleted} setShowImportModal={setShowImportModal}
            searchTerm={searchTerm} setSearchTerm={setSearchTerm} filteredStoreSystemData={filteredStoreSystemData}
            localAuditSearch={localAuditSearch} setLocalAuditSearch={setLocalAuditSearch}
            filteredStoreAuditData={filteredStoreAuditData} handleAuditChange={handleAuditChange}
            printMode={printMode} setPrintMode={setPrintMode}
            showDashboardFilters={showDashboardFilters} setShowDashboardFilters={setShowDashboardFilters}
            dashboardSizeFilter={dashboardSizeFilter} setDashboardSizeFilter={setDashboardSizeFilter}
            dashboardCategoryFilter={dashboardCategoryFilter} setDashboardCategoryFilter={setDashboardCategoryFilter}
            dashboardStore={dashboardStore} setDashboardStore={setDashboardStore}
            dashboardStats={dashboardStats} allAvailableSizes={allAvailableSizes}
            dashboardFilteredItems={dashboardFilteredItems}
            calculateTotal={calculateTotal} setSelectedCategory={setSelectedCategory}
            heavyStockToDisplay={heavyStockToDisplay}
          />
        )}

        {/* ABA 4: DASHBOARD — COM FILTROS */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* ═══════════════════════ PAINEL CEO ═══════════════════════ */}
            {(() => {
              const storeHistory = getHistoricalDataForStorePeriod(selectedStore, selectedMonth, selectedYear);
              const ceoSales = storeHistory.reduce((acc, r) => acc + (r.totalSales || 0), 0);
              const ceoMeta = getGoalsData(selectedStore, selectedMonth).metaOuroLoja;
              const ceoGaps = exits.length + entries.length;
              const ceoLeads = crmLeads.filter(l => !l.archived).length;
              return (
                <PainelCEO
                  realTotalSales={ceoSales}
                  metaOuro={ceoMeta}
                  auditGaps={ceoGaps}
                  crmLeadsCount={ceoLeads}
                  selectedStoreName={STORE_CONFIGS[selectedStore]?.name || selectedStore}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                />
              );
            })()}

          </div>
        )}

        {activeTab === 'marketing' && (
          <Divulgacao
            marketingItems={marketingItems}
            queueItems={queueItems}
            selectedStore={selectedStore}
            marketingStore={marketingStore}
            setMarketingStore={setMarketingStore}
            marketingSort={marketingSort}
            setMarketingSort={setMarketingSort}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            setPrintMode={setPrintMode}
            STORE_CONFIGS={STORE_CONFIGS}
            auditData={auditData}
            sizeColumns={sizeColumns}
            getMktStatus={getMktStatus}
            getItemKey={getItemKey}
            calculateTotal={calculateTotal}
            getGDriveThumbnail={getGDriveThumbnail}
            toggleMarketing={toggleMarketing}
            addToQueue={addToQueue}
            postFromQueue={postFromQueue}
            removeFromQueue={removeFromQueue}
            _upsertMarketingFields={_upsertMarketingFields}
            setPhotoModal={setPhotoModal}
          />
        )}

        {activeTab === 'viability' && (
          <Financeiro
            selectedStore={selectedStore}
            setSelectedStore={setSelectedStore}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            STORE_CONFIGS={STORE_CONFIGS}
            getFinancialData={getFinancialData}
            getGoalsData={getGoalsData}
            getHistoricalDataForStorePeriod={getHistoricalDataForStorePeriod}
            dreValues={dreValues}
            updateDreKey={updateDreKey}
            deleteDreKey={deleteDreKey}
          />
        )}
        {activeTab === 'goals' && (
          <Metas
            activeTab={activeTab}
            selectedStore={selectedStore} setSelectedStore={setSelectedStore}
            selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear} setSelectedYear={setSelectedYear}
            STORE_CONFIGS={STORE_CONFIGS}
            salesHistory={salesHistory}
            getHistoricalDataForStorePeriod={getHistoricalDataForStorePeriod}
            getFinancialData={getFinancialData}
            getSellerStatus={getSellerStatus}
            getGoalsData={getGoalsData}
            toggleSellerStatus={toggleSellerStatus}
            hasHistoricalData={hasHistoricalData}
            printMode={printMode} setPrintMode={setPrintMode}
            upsertSalesHistory={upsertSalesHistory}
            goalsSellerOverride={goalsSellerOverride} setGoalsSellerOverride={setGoalsSellerOverride}
            selectedSellerNames={selectedSellerNames} setSelectedSellerNames={setSelectedSellerNames}
            getMonthName={getMonthName}
            formatCurrency={formatCurrency}
            calculateTrend={calculateTrend}
            projectionSellers={projectionSellers || {}}
            setProjectionSellers={updateProjectionSellers}
            hasAllYearsData={hasAllYearsData}
          />
        )}

        {/* ═══════════════════ ABA CRM ════════════════════════ */}
        {activeTab === 'crm' && (
          <CRM
            crmLeads={crmLeads || []}
            saveCrmLead={saveCrmLead}
            moveCrmLeadStage={moveCrmLeadStage}
            deleteCrmLead={deleteCrmLead}
            archiveCrmLead={archiveCrmLead}
            crmWishlist={crmWishlist || []}
            saveCrmWishlist={saveCrmWishlist}
            deleteCrmWishlist={deleteCrmWishlist}
            updateCrmWishlistStatus={updateCrmWishlistStatus}
            crmCustomTags={crmCustomTags || []}
            addCrmCustomTag={addCrmCustomTag}
            selectedStore={selectedStore}
          />
        )}

        {/* ═══════════════════ ABA RH ═══════════════════ */}
        {activeTab === 'hr' && (() => {
          const HR_STATUS = [
            { id: 'triagem', label: 'Triagem', order: 1, activeClass: 'bg-sky-500 text-white border-sky-500', bg: 'from-sky-400 to-sky-600', emoji: '📋', color: 'sky' },
            { id: 'contato', label: 'Contato Realizado', order: 2, activeClass: 'bg-blue-500 text-white border-blue-500', bg: 'from-blue-400 to-blue-600', emoji: '📞', color: 'blue' },
            { id: 'entrevista_agendada', label: 'Entrevista Agendada', order: 3, activeClass: 'bg-violet-500 text-white border-violet-500', bg: 'from-violet-400 to-violet-600', emoji: '📅', color: 'violet' },
            { id: 'entrevista_realizada', label: 'Entrevista Realizada', order: 4, activeClass: 'bg-purple-600 text-white border-purple-600', bg: 'from-purple-500 to-purple-700', emoji: '🗣️', color: 'purple' },
            { id: 'teste_agendado', label: 'Teste Agendado', order: 5, activeClass: 'bg-amber-500 text-white border-amber-500', bg: 'from-amber-400 to-amber-600', emoji: '📝', color: 'amber' },
            { id: 'fase_teste', label: 'Fase de Teste', order: 6, activeClass: 'bg-orange-500 text-white border-orange-500', bg: 'from-orange-400 to-orange-600', emoji: '🧪', color: 'orange' },
            { id: 'contratado', label: 'Contratado', order: 7, activeClass: 'bg-green-600 text-white border-green-600', bg: 'from-green-500 to-emerald-700', emoji: '✅', color: 'green' },
            { id: 'finalizado', label: 'Finalizado (Sem Contratação)', order: 8, activeClass: 'bg-red-600 text-white border-red-600', bg: 'from-red-500 to-red-700', emoji: '🚫', color: 'red' },
            { id: 'banco_talentos', label: 'Banco de Talentos', order: 9, activeClass: 'bg-indigo-500 text-white border-indigo-500', bg: 'from-indigo-400 to-indigo-600', emoji: '🌟', color: 'indigo' },
          ];

          const CARGO_OPTIONS = ['Vendedora', 'Gerente', 'Caixa', 'Estoquista', 'Auxiliar', 'Outro'];
          const FONTE_OPTIONS = ['', 'Anúncio', 'Indicação', 'Entregue em Mãos', 'LinkedIn', 'Instagram', 'Outro'];
          const MOTIVO_OPTIONS = ['', 'Não compareceu', 'Não atende ao perfil', 'Rejeitado', 'Já está trabalhando', 'Freelance', 'Menor de idade', 'Número inválido', 'Desligada da empresa', 'Indisponível (Férias/Licença)', 'Pendente', 'Perfil incompatível', 'Salário acima da faixa', 'Desistiu', 'Sem experiência', 'Contratado por outra empresa', 'Sem vagas', 'Outro'];

          // Anos disponíveis baseados em recebimento_curriculo
          const allYears = [...new Set(hrCandidates.map(c => {
            const raw = c.recebimento_curriculo || '';
            // aceita DD/MM/YYYY e YYYY-MM-DD
            if (raw.includes('/')) return parseInt(raw.split('/')[2]);
            return parseInt(raw.split('-')[0]);
          }).filter(y => y > 2000))].sort();
          const yearOptions = [...new Set([...allYears, new Date().getFullYear()])].sort((a, b) => b - a);

          const getYear = (raw) => {
            if (!raw) return 0;
            if (raw.includes('/')) return parseInt(raw.split('/')[2]);
            return parseInt(raw.split('-')[0]);
          };

          const getWhatsAppLink = (phone) => {
            const clean = String(phone || '').replace(/\D/g, '');
            const num = clean.startsWith('55') ? clean : '55' + clean;
            return `https://api.whatsapp.com/send?phone=${num}`;
          };

          const daysSince = (dateStr) => {
            if (!dateStr) return null;
            let d;
            if (dateStr.includes('/')) {
              const [day, mon, yr] = dateStr.split('/');
              d = new Date(`${yr}-${mon}-${day}T00:00:00`);
            } else {
              d = new Date(dateStr + 'T00:00:00');
            }
            return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
          };

          // Filtro
          const currentHr = hrOptimistic || hrCandidates;
          const filtered = currentHr.filter(c => {
            const cYear = getYear(c.recebimento_curriculo);
            if (hrFilterYear !== 'all' && cYear !== Number(hrFilterYear)) return false;
            if (hrFilterStore !== 'all' && c.loja !== hrFilterStore) return false;
            if (hrFilterStatus !== 'all' && c.status !== hrFilterStatus) return false;
            if (hrSearch && !c.nome.toLowerCase().includes(hrSearch.toLowerCase()) &&
              !(c.cargo || '').toLowerCase().includes(hrSearch.toLowerCase()) &&
              !(c.observacoes || '').toLowerCase().includes(hrSearch.toLowerCase())) return false;
            return true;
          });

          // Stats e funil
          const stats = HR_STATUS.map(s => ({ ...s, count: filtered.filter(c => c.status === s.id).length }));
          const total = filtered.length;
          const slaAlerts = filtered.filter(c => c.status === 'triagem' && daysSince(c.recebimento_curriculo) > 5).length;
          const hired = filtered.filter(c => c.status === 'contratado').length;
          const convRate = total > 0 ? ((hired / total) * 100).toFixed(1) : '0.0';

          const openForm = (candidate = null) => {
            if (candidate) {
              setHrEditId(candidate.id);
              setHrForm({ ...candidate });
            } else {
              setHrEditId(null);
              setHrForm({
                nome: '', telefone: '', cargo: 'Vendedora', loja: selectedStore || '10',
                status: 'triagem', fonte: '', motivo: '',
                recebimento_curriculo: new Date().toISOString().slice(0, 10),
                entrevista_data: '', contratacao_data: '', observacoes: ''
              });
            }
            setHrShowForm(true);
          };

          const saveCandidate = async () => {
            if (!hrForm.nome.trim()) return;
            const payload = {
              ...hrForm,
              loja: hrForm.loja || (selectedStore === 'all' ? '10' : selectedStore),
              store_id: hrForm.loja || (selectedStore === 'all' ? '10' : selectedStore),
            };
            const ok = await _saveHrCandidate(payload, hrEditId);
            if (ok) { setHrShowForm(false); setHrEditId(null); }
          };

          const deleteCandidate = async (id) => {
            if (window.confirm('Remover candidato?')) await _deleteHrCandidate(id);
          };

          const moveStatus = async (id, newStatus) => {
            const extraFields = {};
            const candidate = hrCandidates.find(c => c.id === id);
            if ((newStatus === 'entrevista_agendada' || newStatus === 'entrevista_realizada') && candidate && !candidate.entrevista_data)
              extraFields.entrevista_data = new Date().toISOString().slice(0, 10);
            if (newStatus === 'contratado' && candidate && !candidate.contratacao_data)
              extraFields.contratacao_data = new Date().toISOString().slice(0, 10);
            await _moveHrStatus(id, newStatus, extraFields);
          };

          const hrHandleDragStart = (e, candidate) => {
            e.dataTransfer.setData('text/plain', candidate.id);
            e.dataTransfer.effectAllowed = 'move';
          };

          const hrHandleDrop = async (e, targetStatus) => {
            e.preventDefault();
            setHrDragOverCol(null);
            const id = e.dataTransfer.getData('text/plain');
            if (!id) return;

            const currentHr = hrOptimistic || hrCandidates;
            const candidate = currentHr.find(c => String(c.id) === String(id));
            if (!candidate || candidate.status === targetStatus) return;

            // Atualização Otimista
            const updated = currentHr.map(c => String(c.id) === String(id) ? { ...c, status: targetStatus } : c);
            setHrOptimistic(updated);

            try {
              await moveStatus(id, targetStatus);
            } catch (err) {
              console.error("Falha ao mover candidato", err);
              setHrOptimistic(null); // Rollback
            }
          };

          return (
            <div className="space-y-6">

              {/* ─── EQUIPE DE VENDAS ATIVA (fonte: salesHistory) ─── */}
              {(() => {
                // Limite flexível pelos botões de tempo
                const cutoff = new Date(Date.now() - activeDaysFilter * 86400000);

                const sellerMap = {};
                // Filtro na raiz: contabilizar apenas vendas e períodos da loja selecionada (se houver)
                const relevantHistory = hrFilterStore !== 'all' 
                  ? salesHistory.filter(h => String(h.storeCode) === hrFilterStore)
                  : salesHistory;
                
                relevantHistory.forEach(h => {
                  const name = (h.sellerName || '').trim();
                  if (!name || /MEGA|EXTRA/i.test(name)) return;
                  if (!sellerMap[name]) sellerMap[name] = {
                    name, stores: new Set(), totalSales: 0, daysWorked: 0,
                    totalPeriods: 0, lastPeriod: '', lastDaysWorked: 0
                  };
                  sellerMap[name].stores.add(String(h.storeCode));
                  sellerMap[name].totalSales += (h.totalSales || 0);
                  sellerMap[name].daysWorked += (h.daysWorked || 0);
                  sellerMap[name].totalPeriods += 1;
                  if ((h.period || '') > sellerMap[name].lastPeriod) {
                    sellerMap[name].lastPeriod = h.period;
                    sellerMap[name].lastDaysWorked = h.daysWorked || 0;
                  }
                });

                const allSellers = Object.values(sellerMap)
                  .filter(s => {
                    if (!s.lastPeriod) return false;
                    const [yyyy, mm] = s.lastPeriod.split('-').map(Number);
                    const lastDate = new Date(yyyy, mm - 1, 28);
                    // Filtro duplo: recência ≤ 60 dias E ≥ 5 dias trabalhados no último período
                    return lastDate >= cutoff && s.lastDaysWorked >= 5;
                  })
                  .sort((a, b) => b.totalSales - a.totalSales);

                const filteredSellers = allSellers.filter(s => {
                  if (hrSearch && !s.name.toLowerCase().includes(hrSearch.toLowerCase())) return false;
                  return true;
                });

                return (
                  <div className="bg-white rounded-2xl border border-teal-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-white flex flex-wrap items-center gap-3 justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">Equipe de Vendas Ativa</h3>
                          <p className="text-xs text-gray-400">
                            {filteredSellers.length} vendedora{filteredSellers.length !== 1 ? 's' : ''} ativas nos últimos {activeDaysFilter} dias
                            &nbsp;· MEGA/EXTRA excluídos · filtra com seletor de loja acima
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200 shadow-inner">
                        <button onClick={() => setActiveDaysFilter(30)} className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-colors ${activeDaysFilter === 30 ? 'bg-teal-600 text-white shadow-sm' : 'bg-transparent text-gray-500 hover:text-teal-700 hover:bg-teal-50'}`}>1 mês</button>
                        <button onClick={() => setActiveDaysFilter(60)} className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-colors ${activeDaysFilter === 60 ? 'bg-teal-600 text-white shadow-sm' : 'bg-transparent text-gray-500 hover:text-teal-700 hover:bg-teal-50'}`}>2 meses</button>
                        <button onClick={() => setActiveDaysFilter(90)} className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-colors ${activeDaysFilter === 90 ? 'bg-teal-600 text-white shadow-sm' : 'bg-transparent text-gray-500 hover:text-teal-700 hover:bg-teal-50'}`}>3 meses</button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[560px]">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-gray-400">#</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-gray-400">Vendedora</th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-gray-400">Loja(s)</th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-gray-400 w-48">Constância</th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-gray-400">Último Mês</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {filteredSellers.length === 0 && (
                            <tr><td colSpan={5} className="py-10 text-center text-gray-300 text-sm">Nenhuma vendedora ativa nos últimos {activeDaysFilter} dias</td></tr>
                          )}
                          {filteredSellers.map((s, i) => {
                            const maxDays = s.totalPeriods * 30;
                            const constPct = maxDays > 0 ? Math.min(100, Math.round((s.daysWorked / maxDays) * 100)) : 0;
                            const constColor = constPct >= 70 ? 'bg-emerald-500' : constPct >= 40 ? 'bg-amber-400' : 'bg-red-400';
                            return (
                              <tr key={s.name} className="hover:bg-teal-50/30 transition-colors">
                                <td className="px-4 py-3 text-xs font-black text-teal-600">{i + 1}</td>
                                <td className="px-4 py-3 font-semibold text-gray-800">{s.name}</td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex flex-wrap justify-center gap-1">
                                    {[...s.stores].sort().map(st => (
                                      <span key={st} className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">L{st}</span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                      <div className={`h-2 rounded-full transition-all ${constColor}`} style={{ width: `${constPct}%` }} />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-500 w-8 text-right">{constPct}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center text-xs text-gray-400">{s.lastPeriod ? s.lastPeriod.slice(0, 7) : '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* HEADER */}
              <div className="bg-gradient-to-br from-white to-teal-50/30 p-6 rounded-2xl border border-teal-100 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <h2 className="text-2xl font-bold text-teal-800 flex items-center gap-2"><UserCheck className="w-6 h-6" /> RH — Recrutamento</h2>
                  <button onClick={() => openForm()}
                    className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-md font-medium transition-all">
                    <PlusCircle className="w-4 h-4" /> Novo Candidato
                  </button>
                </div>

                {/* FILTROS */}
                <div className="flex flex-wrap gap-4">
                  {/* ANO — Leads aquecidos */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-teal-700 uppercase tracking-wide">Ano:</span>
                    <button onClick={() => setHrFilterYear('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${hrFilterYear === 'all' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'}`}>
                      Histórico
                    </button>
                    {yearOptions.map(y => (
                      <button key={y} onClick={() => setHrFilterYear(y)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${hrFilterYear === y ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'}`}>
                        {y} {y === new Date().getFullYear() ? '🔥' : ''}
                      </button>
                    ))}
                  </div>

                  {/* LOJA */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-teal-700 uppercase tracking-wide">Loja:</span>
                    <button onClick={() => setHrFilterStore('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${hrFilterStore === 'all' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'}`}>
                      Todas
                    </button>
                    {Object.entries(STORE_CONFIGS).map(([k, v]) => (
                      <button key={k} onClick={() => setHrFilterStore(k)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${hrFilterStore === k ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'}`}>
                        {v.name}
                      </button>
                    ))}
                  </div>

                  {/* STATUS — Pipeline stepper */}
                  <div className="w-full mt-2">
                    <div className="flex items-center gap-0 flex-wrap bg-gray-50 border border-gray-200 rounded-2xl p-2 gap-1">
                      <button onClick={() => setHrFilterStatus('all')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${hrFilterStatus === 'all' ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <span className="text-sm">📊</span> Todos
                      </button>
                      {HR_STATUS.map((s, i) => {
                        const stageCount = filtered.filter(c => c.status === s.id).length;
                        const isActive = hrFilterStatus === s.id;
                        const terminalIds = ['contratado', 'finalizado', 'banco_talentos'];
                        const isTerminal = terminalIds.includes(s.id);
                        return (
                          <React.Fragment key={s.id}>
                            {i > 0 && !isTerminal && !(terminalIds.includes(HR_STATUS[i - 1]?.id)) && (
                              <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
                            )}
                            {isTerminal && i > 0 && !terminalIds.includes(HR_STATUS[i - 1]?.id) && (
                              <div className="w-px h-4 bg-gray-300 mx-1" />
                            )}
                            <button onClick={() => setHrFilterStatus(isActive ? 'all' : s.id)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all relative ${isActive ? s.activeClass + ' shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>
                              <span>{s.emoji}</span>
                              <span className="hidden sm:inline">{s.label}</span>
                              {stageCount > 0 && (
                                <span className={`text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center leading-none ${isActive ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                  {stageCount}
                                </span>
                              )}
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* BUSCA */}
                  <div className="relative ml-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input value={hrSearch} onChange={e => setHrSearch(e.target.value)}
                      placeholder="Nome, cargo, obs..."
                      className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-400 focus:outline-none w-48" />
                  </div>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-4 rounded-2xl shadow-md">
                  <div className="text-xs opacity-80 font-bold uppercase">Total Leads</div>
                  <div className="text-3xl font-black mt-1">{total}</div>
                  <div className="text-xs opacity-70 mt-1">{hrFilterYear === 'all' ? 'Histórico completo' : `Curríc. ${hrFilterYear}`}</div>
                </div>
                <div className={`bg-gradient-to-br ${slaAlerts > 0 ? 'from-red-500 to-red-700' : 'from-gray-400 to-gray-600'} text-white p-4 rounded-2xl shadow-md`}>
                  <div className="text-xs opacity-80 font-bold uppercase">⚠️ Alertas SLA</div>
                  <div className="text-3xl font-black mt-1">{slaAlerts}</div>
                  <div className="text-xs opacity-70 mt-1">Triagem há +5 dias</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white p-4 rounded-2xl shadow-md">
                  <div className="text-xs opacity-80 font-bold uppercase">✅ Contratados</div>
                  <div className="text-3xl font-black mt-1">{hired}</div>
                  <div className="text-xs opacity-70 mt-1">Conversão: {convRate}%</div>
                </div>
                <div className="bg-gradient-to-br from-indigo-500 to-purple-700 text-white p-4 rounded-2xl shadow-md">
                  <div className="text-xs opacity-80 font-bold uppercase">Em Processo</div>
                  <div className="text-3xl font-black mt-1">{filtered.filter(c => ['triagem', 'contato', 'entrevista_agendada', 'entrevista_realizada', 'teste_agendado', 'fase_teste'].includes(c.status)).length}</div>
                  <div className="text-xs opacity-70 mt-1">Em processo ativo</div>
                </div>
              </div>

              {/* FUNIL DE CONVERSÃO */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-teal-600" /> Funil de Conversão</h3>
                <div className="space-y-2">
                  {HR_STATUS.map(s => {
                    const count = filtered.filter(c => c.status === s.id).length;
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    const barColorMap = {
                      triagem: 'bg-sky-400', contato: 'bg-blue-500',
                      entrevista_agendada: 'bg-violet-500', entrevista_realizada: 'bg-purple-600',
                      teste_agendado: 'bg-amber-500', fase_teste: 'bg-orange-500',
                      contratado: 'bg-green-500', finalizado: 'bg-red-500', banco_talentos: 'bg-indigo-500'
                    };
                    return (
                      <div key={s.id} className="flex items-center gap-3">
                        <div className="w-32 text-xs font-bold text-gray-600 text-right shrink-0 leading-tight">{s.emoji} {s.label}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden relative">
                          <div className={`h-5 rounded-full transition-all ${barColorMap[s.id] || 'bg-gray-400'}`} style={{ width: `${pct}%`, minWidth: count > 0 ? 32 : 0 }} />
                          {count > 0 && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white">{count}</span>}
                        </div>
                        <div className="w-12 text-xs font-mono text-gray-500 shrink-0">{pct.toFixed(0)}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* KANBAN */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {HR_STATUS.map(col => {
                  const colCandidates = filtered.filter(c => c.status === col.id)
                    .sort((a, b) => new Date(b.recebimento_curriculo) - new Date(a.recebimento_curriculo));
                  const isExpanded = hrExpandedCols[col.id];
                  const visible = isExpanded ? colCandidates : colCandidates.slice(0, 10);
                  const hasMore = colCandidates.length > 10;
                  return (
                    <div key={col.id} 
                         className={`rounded-2xl border transition-all overflow-hidden flex flex-col ${hrDragOverCol === col.id ? 'bg-teal-50 border-teal-400 ring-2 ring-teal-100' : 'bg-gray-50 border-gray-200'}`}
                         onDragOver={e => { e.preventDefault(); setHrDragOverCol(col.id); }}
                         onDragLeave={() => setHrDragOverCol(null)}
                         onDrop={e => hrHandleDrop(e, col.id)}
                    >
                      <div className={`bg-gradient-to-r ${col.bg} text-white px-4 py-3 flex items-center justify-between shrink-0`}>
                        <span className="font-bold text-sm">{col.emoji} {col.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="bg-white/25 text-xs font-bold px-2 py-0.5 rounded-full">{colCandidates.length}</span>
                          <button onClick={() => openForm({ status: col.id })} className="bg-white/20 hover:bg-white/35 rounded-lg p-0.5 transition-colors" title="Adicionar">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                          </button>
                        </div>
                      </div>
                      <div className="p-2.5 space-y-2 flex-1">
                        {colCandidates.length === 0 && (
                          <div className="text-center py-8 text-gray-300 text-xs">Nenhum candidato</div>
                        )}
                        {visible.map(c => {
                          const dias = daysSince(c.recebimento_curriculo);
                          const slaAlert = col.id === 'triagem' && dias > 5;
                          const phoneClean = String(c.telefone || '').replace(/\D/g, '');
                          const isTerminal = ['contratado', 'finalizado', 'banco_talentos'].includes(col.id);
                          return (
                            <div key={c.id} 
                                 draggable
                                 onDragStart={e => hrHandleDragStart(e, c)}
                                 className={`bg-white rounded-xl border shadow-sm transition-all group cursor-grab active:cursor-grabbing ${slaAlert ? 'border-red-200 ring-1 ring-red-200' : 'border-gray-100 hover:border-gray-200 hover:shadow-md'}`}>
                              <div className="p-3">
                                <div className="flex items-start justify-between gap-1 mb-1.5">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm text-gray-900 leading-tight">{c.nome}</div>
                                    {c.cargo && <div className="text-xs text-gray-500 mt-0.5">{c.cargo}</div>}
                                    {c.fonte && <div className="text-xs text-indigo-600 font-medium mt-0.5">{c.fonte}</div>}
                                  </div>
                                  <button onClick={() => openForm(c)} className="text-gray-300 hover:text-teal-600 shrink-0 transition-colors p-0.5 opacity-0 group-hover:opacity-100">
                                    <SlidersHorizontal className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                {dias !== null && (
                                  <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mb-2 ${slaAlert ? 'bg-red-100 text-red-700 font-bold border border-red-200' : 'bg-gray-100 text-gray-500'}`}>
                                    <Calendar className="w-2.5 h-2.5" /> {dias}d {slaAlert ? '⚠️' : ''}
                                  </div>
                                )}
                                {phoneClean.length >= 8 && (
                                  <a href={getWhatsAppLink(phoneClean)} target="_blank" rel="noreferrer"
                                    className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold w-full justify-center transition-all shadow-sm">
                                    <Send className="w-3 h-3" /> WhatsApp
                                  </a>
                                )}
                              </div>
                              <div className="overflow-hidden max-h-0 group-hover:max-h-96 transition-all duration-200 ease-in-out border-t border-gray-50 group-hover:border-gray-100">
                                <div className="p-2.5 pt-2">
                                  <div className="flex flex-wrap gap-1 mb-1.5">
                                    {HR_STATUS.filter(s => s.id !== col.id).map(s => (
                                      <button key={s.id} onClick={() => moveStatus(c.id, s.id)}
                                        className="text-[10px] px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50 transition-all leading-none">
                                        → {s.label}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    {isTerminal && (
                                      <button onClick={() => archiveHrCandidate(c.id)}
                                        className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-lg border border-amber-200 text-amber-600 bg-amber-50 hover:bg-amber-100 transition-all">
                                        📦 Arquivar
                                      </button>
                                    )}
                                    <button onClick={() => deleteCandidate(c.id)}
                                      className="ml-auto text-[10px] px-2 py-1 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-all">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {hasMore && (
                          <button
                            onClick={() => setHrExpandedCols(p => ({ ...p, [col.id]: !p[col.id] }))}
                            className="w-full text-xs font-bold text-gray-400 hover:text-teal-600 py-2 rounded-xl hover:bg-teal-50 transition-all border border-dashed border-gray-200 hover:border-teal-300">
                            {isExpanded ? '▲ Ver menos' : `▼ Ver mais ${colCandidates.length - 10} candidatos`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* MODAL FORMULÁRIO */}
              {hrShowForm && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setHrShowForm(false)}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
                      <h3 className="font-bold text-lg">{hrEditId ? 'Editar Candidato' : 'Novo Candidato'}</h3>
                      <button onClick={() => setHrShowForm(false)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Nome *</label>
                          <input value={hrForm.nome} onChange={e => setHrForm(p => ({ ...p, nome: e.target.value }))}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none" placeholder="Nome completo" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Telefone</label>
                          <input value={hrForm.telefone} onChange={e => setHrForm(p => ({ ...p, telefone: e.target.value }))}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none" placeholder="(11) 9xxxx-xxxx" />
                          {hrForm.telefone && String(hrForm.telefone).replace(/\D/g, '').length >= 8 && (
                            <a href={getWhatsAppLink(hrForm.telefone)} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 mt-1 text-xs text-green-600 hover:text-green-700 font-medium">
                              <Send className="w-3 h-3" /> Abrir WhatsApp
                            </a>
                          )}
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Fonte</label>
                          <select value={hrForm.fonte || ''} onChange={e => setHrForm(p => ({ ...p, fonte: e.target.value }))}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none">
                            {FONTE_OPTIONS.map(f => <option key={f} value={f}>{f || 'Selecione...'}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Cargo</label>
                          <select value={hrForm.cargo} onChange={e => setHrForm(p => ({ ...p, cargo: e.target.value }))}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none">
                            <option value="">Selecione...</option>
                            {CARGO_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Loja</label>
                          <select value={hrForm.loja} onChange={e => setHrForm(p => ({ ...p, loja: e.target.value }))}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none">
                            {Object.entries(STORE_CONFIGS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Status</label>
                          <select value={hrForm.status} onChange={e => setHrForm(p => ({ ...p, status: e.target.value }))}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none">
                            {HR_STATUS.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Recebimento Currículo</label>
                          <input type="date" value={hrForm.recebimento_curriculo} onChange={e => setHrForm(p => ({ ...p, recebimento_curriculo: e.target.value }))}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Data Entrevista</label>
                          <input type="date" value={hrForm.entrevista_data || ''} onChange={e => setHrForm(p => ({ ...p, entrevista_data: e.target.value }))}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Data Contratação</label>
                          <input type="date" value={hrForm.contratacao_data || ''} onChange={e => setHrForm(p => ({ ...p, contratacao_data: e.target.value }))}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none" />
                        </div>
                        {(hrForm.status === 'finalizado' || hrForm.status === 'banco_talentos') && (
                          <div className="col-span-2">
                            <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Motivo {hrForm.status === 'banco_talentos' ? '(Banco de Talentos)' : '(Sem Contratação)'}</label>
                            <select value={hrForm.motivo || ''} onChange={e => setHrForm(p => ({ ...p, motivo: e.target.value }))}
                              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none">
                              {MOTIVO_OPTIONS.map(m => <option key={m} value={m}>{m || 'Selecione...'}</option>)}
                            </select>
                          </div>
                        )}
                        <div className="col-span-2">
                          <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Observações</label>
                          <textarea value={hrForm.observacoes || ''} onChange={e => setHrForm(p => ({ ...p, observacoes: e.target.value }))}
                            rows={3} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none resize-none" placeholder="Anotações livres..." />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={saveCandidate} disabled={!hrForm.nome.trim()}
                          className="flex-1 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-bold py-2.5 rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                          {hrEditId ? 'Salvar Alterações' : 'Adicionar Candidato'}
                        </button>
                        {hrEditId && (
                          <button onClick={() => { deleteCandidate(hrEditId); setHrShowForm(false); }}
                            className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-medium transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      </main>

      {/* ════ MODAL DE FOTO DO PRODUTO (Divulgação) ════ */}
      {photoModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setPhotoModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2"><Camera className="w-5 h-5" /> Foto do Produto</h3>
              <button onClick={() => setPhotoModal(null)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Preview */}
              {photoModal.currentUrl && getGDriveThumbnail(photoModal.currentUrl) && (
                <div className="flex justify-center">
                  <img
                    src={getGDriveThumbnail(photoModal.currentUrl)}
                    alt="preview"
                    className="w-40 h-40 object-cover rounded-xl border border-gray-200 shadow-sm"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase mb-2 block">🔗 Link do Google Drive ou URL da imagem</label>
                <input
                  type="url"
                  value={photoModal.currentUrl || ''}
                  onChange={e => setPhotoModal(p => ({ ...p, currentUrl: e.target.value }))}
                  placeholder="https://drive.google.com/file/d/…/view"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-700 space-y-1">
                <div className="font-bold">Como usar o Google Drive:</div>
                <div>1. Carregue a foto no Drive</div>
                <div>2. Clique com botão direito → <strong>Compartilhar → Qualquer pessoa com o link</strong></div>
                <div>3. Copie o link e cole aqui</div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => savePhotoUrl(photoModal.key, photoModal.storeId, photoModal.currentUrl)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-all"
                >
                  Salvar Foto
                </button>
                {photoModal.currentUrl && (
                  <button
                    onClick={() => savePhotoUrl(photoModal.key, photoModal.storeId, '')}
                    className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 font-medium transition-all text-sm"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <BottomNav activeTab={activeTab} changeTab={changeTab} />
    </div>
  );
};

export default App;