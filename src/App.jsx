import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from './supabase';
import { Package, AlertTriangle, Save, RefreshCw, CheckCircle, Search, ArrowRight, Download, Upload, X, Copy, Trash2, CheckSquare, List, ArrowDownCircle, ArrowUpCircle, BarChart3, TrendingUp, Sparkles, AlertOctagon, FileJson, Printer, ChevronLeft, ChevronDown, ChevronUp, Share2, Camera, Smartphone, Instagram, Calendar, ArrowDownUp, EyeOff, CameraOff, PlusCircle, Send, Archive, Calculator, Target, DollarSign, PieChart, Users, TrendingDown, Award, UserCheck, UserMinus, Filter, ChevronRight, SlidersHorizontal, Briefcase, Phone, Clock, AlertCircle, MessageCircle } from 'lucide-react';

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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  sizeFilter === ''
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    sizeFilter === size
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
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                        total === 1 ? 'bg-orange-100 text-orange-700' :
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
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                            sizeFilter === s
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
  const [activeTab, setActiveTab] = useState(() => { const p = new URLSearchParams(window.location.search); const t = p.get('tab'); return ['system','audit','dashboard','marketing','viability','goals','hr'].includes(t) ? t : 'audit'; });
  const navigateTab = (tab) => { setActiveTab(tab); const u = new URL(window.location); u.searchParams.set('tab', tab); window.history.replaceState({}, '', u); };
  const [searchTerm, setSearchTerm] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [showHistoryImportModal, setShowHistoryImportModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [historyImportText, setHistoryImportText] = useState("");
  const [printMode, setPrintMode] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [marketingSort, setMarketingSort] = useState('recent');

  // --- Estados Dashboard Filtros ---
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [dashboardSizeFilter, setDashboardSizeFilter] = useState('');
  const [dashboardCategoryFilter, setDashboardCategoryFilter] = useState('');
  const [showDashboardFilters, setShowDashboardFilters] = useState(false);
  const [expandedMonthRow, setExpandedMonthRow] = useState(null); // for seller drill-down in projection table
  
  // --- Estados de Negócio ---
  const [selectedStore, setSelectedStore] = useState('10');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [importTargetStore, setImportTargetStore] = useState('10');
  const [clearBeforeImport, setClearBeforeImport] = useState(false);
  
  // --- Estados Persistentes (Supabase) ---
  const [systemData, setSystemData] = useState([]);
  const [auditData, setAuditData] = useState([]);
  const [completedIds, setCompletedIds] = useState(new Set());
  const [marketingStatus, setMarketingStatus] = useState({});
  const [salesHistory, setSalesHistory] = useState([]);
  const [sellerOverrides, setSellerOverrides] = useState({});
  const [projectionSellers, setProjectionSellers] = useState({});
  const [dreValues, setDreValues] = useState({});
  const [dbLoading, setDbLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userStoreAccess, setUserStoreAccess] = useState([]);
  const [hrCandidates, setHrCandidates] = useState([]);
  const [hrFilter, setHrFilter] = useState('all');
  const [hrSearch, setHrSearch] = useState('');
  const [hrExpanded, setHrExpanded] = useState(new Set());
  const [hrImportText, setHrImportText] = useState('');
  const [showHrImportModal, setShowHrImportModal] = useState(false);
  // Goals tab: manual seller count override for quick scenario testing
  const [goalsSellerOverride, setGoalsSellerOverride] = useState(null);
  // Goals tab: selected seller names for chip-based count
  const [selectedSellerNames, setSelectedSellerNames] = useState(new Set());

  const dbToItem = (r) => ({ id: r.item_id, MARCA: r.marca, MARCADESC: r.marcadesc, TIPODESC: r.tipodesc, REFERENCIA: r.referencia, COR1DESC: r.cor1desc, DATAENTRADA: r.dataentrada, sizes: r.sizes || {}, QTDE: r.qtde || 0 });
  const itemToDb = (item, sc) => ({ store_code: sc || selectedStore, item_id: item.id, marca: item.MARCA, marcadesc: item.MARCADESC, tipodesc: item.TIPODESC, referencia: item.REFERENCIA, cor1desc: item.COR1DESC, dataentrada: item.DATAENTRADA, sizes: item.sizes || {}, qtde: item.QTDE || 0, updated_at: new Date().toISOString() });
  const dbToSale = (r) => ({ storeCode: r.store_code, sellerCode: r.seller_code, sellerName: r.seller_name, daysWorked: r.days_worked, salesCount: r.sales_count, itemsCount: r.items_count, pa: r.pa, totalSales: r.total_sales, ticketAvg: r.ticket_avg, period: r.period });
  const saleToDb = (s) => ({ store_code: s.storeCode, seller_code: s.sellerCode, seller_name: s.sellerName, days_worked: s.daysWorked, sales_count: s.salesCount, items_count: s.itemsCount, pa: s.pa, total_sales: s.totalSales, ticket_avg: s.ticketAvg, period: s.period });

  const loadAllData = async () => {
    setDbLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const { data: storeAccess } = await supabase.from('user_store_access').select('store_code').eq('user_id', user.id);
      const role = profile?.role || 'manager_limited';
      const stores = storeAccess?.map(r => r.store_code) || [];
      setUserRole(role); setUserStoreAccess(stores);
      if (role !== 'owner' && stores.length > 0) setSelectedStore(stores[0]);
      await Promise.all([loadSystemData(), loadAuditData(), loadSalesHistory(), loadDreValues(), loadProjectionSellers(), loadMarketingStatus(), loadCompletedIds(), loadSellerOverrides(), loadHrCandidates()]);
    } finally { setDbLoading(false); }
  };
  const loadSystemData = async () => { const { data } = await supabase.from('system_data').select('*').order('item_id'); if (data) setSystemData(data.map(dbToItem)); };
  const loadAuditData = async () => { const { data } = await supabase.from('audit_data').select('*').order('item_id'); if (data) setAuditData(data.map(dbToItem)); };
  const loadSalesHistory = async () => { const { data } = await supabase.from('sales_history').select('*'); if (data) setSalesHistory(data.map(dbToSale)); };
  const loadDreValues = async () => { const { data } = await supabase.from('dre_values').select('*'); if (data) { const obj = {}; data.forEach(r => { obj[r.dre_key] = r.values; }); setDreValues(obj); } };
  const loadProjectionSellers = async () => { const { data } = await supabase.from('projection_sellers').select('*'); if (data) { const obj = {}; data.forEach(r => { obj[r.projection_key] = r.seller_count; }); setProjectionSellers(obj); } };
  const loadMarketingStatus = async () => { const { data } = await supabase.from('marketing_status').select('*'); if (data) { const obj = {}; data.forEach(r => { obj[r.item_key] = { photo: r.photo, catalog: r.catalog, posted: r.posted, discontinued: r.discontinued }; }); setMarketingStatus(obj); } };
  const loadCompletedIds = async () => { const { data } = await supabase.from('completed_ids').select('item_id'); if (data) setCompletedIds(new Set(data.map(r => r.item_id))); };
  const loadSellerOverrides = async () => { const { data } = await supabase.from('seller_overrides').select('*'); if (data) { const obj = {}; data.forEach(r => { obj[r.override_key] = r.status; }); setSellerOverrides(obj); } };
  const loadHrCandidates = async () => { const { data } = await supabase.from('hr_candidates').select('*').order('id', { ascending: false }); if (data) setHrCandidates(data); };

  useEffect(() => { loadAllData(); }, []);

  const loadStoreData = async () => {
    await Promise.all([loadSystemData(), loadAuditData(), loadMarketingStatus(), loadCompletedIds(), loadSellerOverrides()]);
  };

  useEffect(() => {
    if (salesHistory.length === 0) return;
    const now = new Date(); const cy = now.getFullYear(), cm = now.getMonth() + 1;
    const cleaned = salesHistory.filter(h => { const [y, m] = h.period.split('-').map(Number); return y < cy || (y === cy && m <= cm); });
    if (cleaned.length !== salesHistory.length) setSalesHistory(cleaned);
  }, [salesHistory.length]);

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
      if (daysWorked >= 5 && !sellerName.toUpperCase().includes('EXTRA')) return 'active';
      return 'extra';
  };

  const toggleSellerStatus = async (storeId, month, year, sellerName, currentStatus) => { const key = `${storeId}-${month}-${year}-${sellerName}`; const ns = currentStatus === 'active' ? 'extra' : 'active'; setSellerOverrides(prev => ({ ...prev, [key]: ns })); await supabase.from('seller_overrides').upsert({ store_code: storeId, override_key: key, status: ns, updated_at: new Date().toISOString() }, { onConflict: 'store_code,override_key' }); };

  const getHistoricalDataForStorePeriod = (storeId, month, year) => {
    const periodKey = `${year}-${String(month).padStart(2, '0')}`;
    return salesHistory.filter(h => h.storeCode == storeId && h.period === periodKey);
  };

  const hasHistoricalData = (storeId, month, year) => getHistoricalDataForStorePeriod(storeId, month, year).length > 0;

  const calculateTrend = (storeId, month) => {
    const years = [2021, 2022, 2023, 2024, 2025, 2026];
    const salesData = years.map(y => {
      const sales = getHistoricalDataForStorePeriod(storeId, month, y).reduce((acc, r) => acc + r.totalSales, 0);
      return { year: y, sales };
    }).filter(d => d.sales > 0);
    if (salesData.length < 2) return { trend: 'neutral', percent: 0, arrow: '→' };
    let totalGrowth = 0, validComparisons = 0;
    for (let i = 1; i < salesData.length; i++) {
      const growth = ((salesData[i].sales - salesData[i-1].sales) / salesData[i-1].sales) * 100;
      if (Math.abs(growth) < 50) { totalGrowth += growth; validComparisons++; }
    }
    const avgGrowth = validComparisons > 0 ? totalGrowth / validComparisons : 0;
    if (avgGrowth > 3) return { trend: 'up', percent: avgGrowth, arrow: '↗' };
    if (avgGrowth < -3) return { trend: 'down', percent: avgGrowth, arrow: '↘' };
    return { trend: 'neutral', percent: avgGrowth, arrow: '→' };
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
    const last3Years = [2023, 2024, 2025];
    const last3YearsRaw = last3Years.map(y => {
      const periodKey = `${y}-${String(month).padStart(2, '0')}`;
      return salesHistory.filter(h => h.storeCode == storeId && h.period === periodKey)
        .reduce((acc, r) => acc + r.totalSales, 0);
    });
    const last3YearsValid = last3YearsRaw.filter(v => v > 10000);
    const mediaUltimos3Anos = last3YearsValid.length > 0
      ? last3YearsValid.reduce((a, b) => a + b, 0) / last3YearsValid.length
      : 0;

    // Recorde histórico (todos os anos disponíveis)
    const allYearsForRecord = [2021, 2022, 2023, 2024, 2025, 2026];
    const allSales = allYearsForRecord.map(y => {
      const periodKey = `${y}-${String(month).padStart(2, '0')}`;
      return salesHistory.filter(h => h.storeCode == storeId && h.period === periodKey)
        .reduce((acc, r) => acc + r.totalSales, 0);
    }).filter(v => v > 10000);
    const recorde = allSales.length > 0 ? Math.max(...allSales) : 0;

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
    const prataIndBase = (baseMedia * 1.10) / numSellers;
    const prataIndMin = metaBronzeInd;
    const prataIndMax = recorde > 0 ? (recorde * 1.05) / numSellers : Infinity;
    const metaPrataInd = roundToSpecial(Math.min(Math.max(prataIndBase, prataIndMin), prataIndMax));

    // =====================================================
    // 4. META PRATA LOJA (P_loja) — Lógica 2.1
    // Fórmula: P_ind × Vendedoras
    // Trava: P_loja >= B_loja
    // =====================================================
    const prataLojaRaw = metaPrataInd * numSellers;
    const metaPrataLoja = roundToSpecial(Math.max(prataLojaRaw, metaBronzeLoja));

    // =====================================================
    // 6. META OURO LOJA (O_loja) — calculada ANTES do individual
    // Fórmula: MAX(Break-Even ; Média 3 anos × 1,15 × 1,02)
    // Trava: O_loja >= P_loja
    // =====================================================
    const ouroLojaA = breakEven;
    const ouroLojaB = mediaUltimos3Anos > 0 ? mediaUltimos3Anos * 1.15 * 1.02 : 0;
    const ouroLojaRaw = Math.max(ouroLojaA, ouroLojaB);
    const metaOuroLoja = roundToSpecial(Math.max(ouroLojaRaw, metaPrataLoja));

    // =====================================================
    // 5. META OURO INDIVIDUAL (O_ind)
    // Fórmula: MAX(20.000 ; O_loja ÷ Vendedoras)
    // Travas: O_ind >= P_ind  e  O_ind <= Recorde × 1,15
    // =====================================================
    const ouroIndBase = Math.max(20000, metaOuroLoja / numSellers);
    const ouroIndMin = metaPrataInd;
    const ouroIndMax = recorde > 0 ? (recorde * 1.15) / numSellers : Infinity;
    const metaOuroInd = roundToSpecial(Math.min(Math.max(ouroIndBase, ouroIndMin), ouroIndMax));

    // === HISTÓRICO PARA O GRÁFICO ===
    const historyYears = [2021, 2022, 2023, 2024, 2025];
    const historicalData = historyYears.map(y => {
      const periodKey = `${y}-${String(month).padStart(2, '0')}`;
      const records = salesHistory.filter(h => h.storeCode == storeId && h.period === periodKey);
      return { year: y, total: records.reduce((acc, r) => acc + r.totalSales, 0) };
    });

    return {
      metaBronzeInd, metaBronzeLoja,
      metaPrataInd,  metaPrataLoja,
      metaOuroInd,   metaOuroLoja,
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
  const filteredSystemData = useMemo(() => filterData(systemData), [systemData, filterData]);
  const filteredAuditData = useMemo(() => filterData(auditData), [auditData, filterData]);

  const differences = useMemo(() => {
    return systemData.map(sys => {
      const audit = auditData.find(a => a.id === sys.id);
      if (!audit) return null;
      const diffs = {};
      let has = false;
      sizeColumns.forEach(s => {
        const d = (parseInt(audit.sizes[s]) || 0) - (sys.sizes[s] || 0);
        if (d !== 0) { diffs[s] = d; has = true; }
      });
      const auditTotal = calculateTotal(audit.sizes);
      return { ...sys, diffSizes: diffs, hasDifference: has, auditTotal, diffTotal: auditTotal - sys.QTDE };
    }).filter(i => i && i.hasDifference);
  }, [systemData, auditData]);

  const exits = differences.filter(d => d.diffTotal < 0 && !completedIds.has(d.id));
  const entries = differences.filter(d => d.diffTotal > 0 && !completedIds.has(d.id));

  const dashboardStats = useMemo(() => {
    const categoryStats = {};
    const categoryItems = {}; // itens por categoria
    auditData.forEach(item => {
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
    const lastPieces = auditData.filter(item => calculateTotal(item.sizes) === 1).sort((a, b) => (a.TIPODESC || "").localeCompare(b.TIPODESC || ""));
    const heavyStock = auditData.filter(item => calculateTotal(item.sizes) >= 5).sort((a, b) => b.QTDE - a.QTDE);
    const totalItems = auditData.length;
    const totalPieces = auditData.reduce((acc, item) => acc + calculateTotal(item.sizes), 0);
    const avgPiecesPerItem = totalItems > 0 ? (totalPieces / totalItems).toFixed(1) : 0;
    const zeroStock = auditData.filter(item => calculateTotal(item.sizes) === 0).length;
    return { sortedCategories, categoryItems, lastPieces, heavyStock, totalItems, totalPieces, avgPiecesPerItem, zeroStock };
  }, [auditData]);

  // Tamanhos disponíveis no estoque inteiro (para filtro global)
  const allAvailableSizes = useMemo(() => {
    const sizeSet = new Set();
    auditData.forEach(item => {
      sizeColumns.forEach(s => {
        if ((parseInt(item.sizes[s]) || 0) > 0) sizeSet.add(s);
      });
    });
    return sizeColumns.filter(s => sizeSet.has(s));
  }, [auditData]);

  // Itens filtrados pelo painel de filtros global do dashboard
  const dashboardFilteredItems = useMemo(() => {
    if (!dashboardSizeFilter && !dashboardCategoryFilter) return [];
    return auditData.filter(item => {
      const total = calculateTotal(item.sizes);
      if (total <= 0) return false;
      if (dashboardCategoryFilter && (item.TIPODESC || 'OUTROS') !== dashboardCategoryFilter) return false;
      if (dashboardSizeFilter && !((parseInt(item.sizes[dashboardSizeFilter]) || 0) > 0)) return false;
      return true;
    });
  }, [auditData, dashboardSizeFilter, dashboardCategoryFilter]);

  const heavyStockToDisplay = printMode ? dashboardStats.heavyStock : dashboardStats.heavyStock.slice(0, 20);

  // --- Handlers ---
  const handleAuditChange = useCallback((id, size, value) => {
    const nv = value === '' ? 0 : (parseInt(value) || 0);
    setAuditData(prev => prev.map(item => { if (item.id !== id) return item; const ns = { ...item.sizes, [size]: nv }; const nq = calculateTotal(ns); supabase.from('audit_data').update({ sizes: ns, qtde: nq, updated_at: new Date().toISOString() }).eq('store_code', selectedStore).eq('item_id', id); return { ...item, sizes: ns, QTDE: nq }; }));
  }, [selectedStore]);

  const confirmFillAuditWithSystem = async () => { const filled = systemData.map(item => ({ ...item, sizes: { ...item.sizes }, QTDE: calculateTotal(item.sizes) })); setAuditData(filled); setShowResetModal(false); await supabase.from('audit_data').delete().eq('store_code', selectedStore); if (filled.length > 0) await supabase.from('audit_data').insert(filled.map(i => itemToDb(i, selectedStore))); };
  const toggleCompleted = async (itemId) => { const ns = new Set(completedIds); if (ns.has(itemId)) { ns.delete(itemId); await supabase.from('completed_ids').delete().eq('store_code', selectedStore).eq('item_id', itemId); } else { ns.add(itemId); await supabase.from('completed_ids').insert({ store_code: selectedStore, item_id: itemId }); } setCompletedIds(ns); };
  const toggleCategory = (category) => { const newSet = new Set(expandedCategories); newSet.has(category) ? newSet.delete(category) : newSet.add(category); setExpandedCategories(newSet); };
  const toggleMarketing = async (key, field) => { const cur = marketingStatus[key] || {}; const upd = { ...cur, [field]: !cur[field] }; setMarketingStatus(prev => ({ ...prev, [key]: upd })); await supabase.from('marketing_status').upsert({ store_code: selectedStore, item_key: key, photo: upd.photo||false, catalog: upd.catalog||false, posted: upd.posted||false, discontinued: upd.discontinued||false, updated_at: new Date().toISOString() }, { onConflict: 'store_code,item_key' }); };
  
  const processImport = async () => { try { const rows = importText.trim().split('\n'); if (rows.length < 2) return; const sep = rows[0].includes('\t') ? '\t' : (rows[0].includes(';') ? ';' : ','); const headers = rows[0].split(sep).map(h => h.trim().toUpperCase()); const parsed = rows.slice(1).map((row, idx) => { const vals = row.split(sep); const item = { id: idx + 1, sizes: {} }; headers.forEach((h, i) => { if (sizeColumns.includes(h)) item.sizes[h] = parseInt(vals[i]) || 0; else item[h] = vals[i]; }); sizeColumns.forEach(s => { if (item.sizes[s] === undefined) item.sizes[s] = 0; }); item.QTDE = calculateTotal(item.sizes); item.REFERENCIA = item.REFERENCIA || `ITEM-${idx}`; item.MARCADESC = item.MARCADESC || 'GENERICO'; item.TIPODESC = item.TIPODESC || 'OUTROS'; return item; }); await supabase.from('system_data').delete().eq('store_code', importTargetStore); if (parsed.length > 0) await supabase.from('system_data').insert(parsed.map(i => itemToDb(i, importTargetStore))); setSystemData(parsed); const zeroed = parsed.map(i => { const z = {}; sizeColumns.forEach(s => z[s] = 0); return { ...i, sizes: z, QTDE: 0 }; }); await supabase.from('audit_data').delete().eq('store_code', importTargetStore); if (zeroed.length > 0) await supabase.from('audit_data').insert(zeroed.map(i => itemToDb(i, importTargetStore))); setAuditData(zeroed); await supabase.from('completed_ids').delete().eq('store_code', importTargetStore); setCompletedIds(new Set()); setShowImportModal(false); setImportText(''); alert('Importado!'); } catch(e) { console.error(e); alert('Erro importação'); } };

  const processSalesHistoryImport = async () => { const now = new Date(); if (selectedYear > now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth > now.getMonth() + 1)) { alert('Não é possível importar dados de meses futuros.'); return; } try { const period = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`; const rows = historyImportText.trim().split('\n'); const newEntries = rows.map(row => { const cols = row.split('\t'); if (cols.length < 5 || isNaN(parseInt(cols[0]))) return null; return { storeCode: importTargetStore, sellerCode: cols[1]?.trim(), sellerName: cols[2]?.trim(), daysWorked: parseInt(cols[3])||0, salesCount: parseInt(cols[4])||0, itemsCount: parseInt(cols[6])||0, pa: parseFloat(cols[8]?.replace(',','.'))||0, totalSales: parseCurrency(cols[10]), ticketAvg: parseCurrency(cols[12]), period }; }).filter(Boolean); await supabase.from('sales_history').delete().eq('store_code', importTargetStore).eq('period', period); const base = salesHistory.filter(h => !(h.period === period && h.storeCode === importTargetStore)); if (newEntries.length > 0) await supabase.from('sales_history').insert(newEntries.map(saleToDb)); setSalesHistory([...base, ...newEntries]); setShowHistoryImportModal(false); setHistoryImportText(''); setClearBeforeImport(false); alert('Histórico importado!'); } catch(e) { console.error(e); alert('Erro importação histórico'); } };

  const handleExport = () => {
    if (differences.length === 0) { alert("Sem dados"); return; }
    const csvContent = "data:text/csv;charset=utf-8,REFERENCIA;QTDE\n" + auditData.map(i => `${i.REFERENCIA};${i.QTDE}`).join("\n");
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", "estoque.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const marketingItems = useMemo(() => {
    let filtered = auditData.filter(item => {
      const stock = calculateTotal(item.sizes);
      const matchesSearch = (item.REFERENCIA || "").toLowerCase().includes(searchTerm.toLowerCase());
      const key = getItemKey(item);
      const mStatus = marketingStatus[key] || {};
      if (marketingSort === 'cleanup') return stock === 0 && mStatus.catalog && matchesSearch;
      if (mStatus.discontinued && marketingSort !== 'cleanup') return false;
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
  }, [auditData, searchTerm, marketingStatus, marketingSort]);

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
         <div className={`p-3 border-b flex items-center gap-2 ${bgClass}`}><Icon className="w-5 h-5"/> <span className="font-bold">{title}</span> <span className="ml-auto text-xs bg-white/50 px-2 rounded">{items.length}</span></div>
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
    const goalsData = getGoalsData(selectedStore, selectedMonth);
    const currentData = getHistoricalDataForStorePeriod(selectedStore, selectedMonth, selectedYear);
    const totalSalesMonth = currentData.reduce((acc, curr) => acc + curr.totalSales, 0);
    const dreKey = `${selectedStore}-${selectedMonth}-${selectedYear}`;
    const savedDre = dreValues[dreKey] || {};
    const updateDreValue = (field, value) => { const upd = { ...(dreValues[dreKey] || {}), [field]: parseFloat(value) || 0 }; setDreValues(prev => ({ ...prev, [dreKey]: upd })); supabase.from('dre_values').upsert({ store_code: selectedStore, dre_key: dreKey, values: upd, updated_at: new Date().toISOString() }, { onConflict: 'store_code,dre_key' }); };
    const receitaBruta = totalSalesMonth;
    const percCMV = savedDre.percCMV ?? finData.config.variableCosts.cmv;
    const percImpostos = savedDre.percImpostos ?? finData.config.variableCosts.imposto;
    const percTaxasCartao = savedDre.percTaxasCartao ?? finData.config.variableCosts.taxaCartao;
    const percEmbalagens = savedDre.percEmbalagens ?? finData.config.variableCosts.embalagem;
    const percObsolescencia = savedDre.percObsolescencia ?? finData.config.variableCosts.obsoleto;
    const cmv = receitaBruta * (percCMV / 100);
    const lucroBruto = receitaBruta - cmv;
    const margemBruta = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0;
    const impostos = receitaBruta * (percImpostos / 100);
    const taxasCartao = receitaBruta * (percTaxasCartao / 100);
    const embalagens = receitaBruta * (percEmbalagens / 100);
    const obsolescencia = receitaBruta * (percObsolescencia / 100);
    const deducoesReceita = impostos + taxasCartao + embalagens + obsolescencia;
    const receitaLiquida = lucroBruto - deducoesReceita;
    const margemLiquida = receitaBruta > 0 ? (receitaLiquida / receitaBruta) * 100 : 0;
    const aluguel = savedDre.aluguel ?? finData.config.fixedCosts.aluguel;
    const proLabore = savedDre.proLabore ?? finData.config.fixedCosts.proLabore;
    const agua = savedDre.agua ?? finData.config.fixedCosts.agua;
    const luz = savedDre.luz ?? finData.config.fixedCosts.luz;
    const internet = savedDre.internet ?? finData.config.fixedCosts.internet;
    const software = savedDre.software ?? finData.config.fixedCosts.software;
    const contabilidade = savedDre.contabilidade ?? finData.config.fixedCosts.contabilidade;
    const salarios = savedDre.salarios ?? finData.config.fixedCosts.colaboradoras;
    const administracao = savedDre.administracao ?? finData.config.fixedCosts.adm;
    const alimentacao = savedDre.alimentacao ?? finData.config.fixedCosts.alimentacao;
    const transporte = savedDre.transporte ?? finData.config.fixedCosts.transporte;
    const totalDespesasFixas = aluguel + proLabore + agua + luz + internet + software + contabilidade + salarios + administracao + alimentacao + transporte;
    const resultadoOperacional = receitaLiquida - totalDespesasFixas;
    const margemOperacional = receitaBruta > 0 ? (resultadoOperacional / receitaBruta) * 100 : 0;
    const breakEvenDiff = receitaBruta - finData.breakEven;
    const breakEvenPercent = finData.breakEven > 0 ? (breakEvenDiff / finData.breakEven) * 100 : 0;
    const metaLojaDiff = receitaBruta - goalsData.metaConservadora;
    const metaLojaPercent = goalsData.metaConservadora > 0 ? (metaLojaDiff / goalsData.metaConservadora) * 100 : 0;

    return (
      <div className="space-y-6">
          <div className="bg-gradient-to-br from-white to-emerald-50/30 p-6 rounded-2xl border border-emerald-100 shadow-lg no-print">
            <h2 className="text-2xl font-bold text-emerald-800 flex items-center gap-2 mb-4"><PieChart className="w-6 h-6"/> DRE - Demonstração do Resultado do Exercício</h2>
            <div className="flex gap-4">
               <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)} className="border border-emerald-200 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none">{Object.entries(STORE_CONFIGS).map(([k,v]) => <option key={k} value={k}>{v.name}</option>)}</select>
               <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="border border-emerald-200 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none">{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{getMonthName(i+1)}</option>)}</select>
               <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="border border-emerald-200 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none">{Array.from({length:5},(_,i)=><option key={i} value={2023+i}>{2023+i}</option>)}</select>
            </div>
          </div>
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
                  </div>
                  <div className="ml-6 bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
                      <div className="flex justify-between items-center mb-2"><span className="font-semibold text-red-900">(-) Custo da Mercadoria Vendida (CMV)</span><span className="font-bold text-xl text-red-900">{formatCurrency(cmv)}</span></div>
                      <div className="flex items-center gap-2 text-sm"><span className="text-red-700">Percentual:</span><input type="number" step="0.01" value={percCMV} onChange={e => updateDreValue('percCMV', e.target.value)} className="w-20 border border-red-300 rounded px-2 py-1 text-center font-mono focus:ring-2 focus:ring-red-400"/><span className="text-red-700">%</span></div>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-5 rounded-xl shadow-md">
                      <div className="flex justify-between items-center"><div><div className="font-bold text-lg">2. Lucro Bruto</div><div className="text-sm opacity-90">Margem: {margemBruta.toFixed(2)}%</div></div><span className="font-bold text-3xl">{formatCurrency(lucroBruto)}</span></div>
                  </div>
                  <div className="ml-6 space-y-3">
                      <div className="font-bold text-gray-700 text-sm uppercase tracking-wide">(-) Deduções da Receita:</div>
                      <div className="grid grid-cols-2 gap-4">
                          {[['Impostos','percImpostos',impostos,'orange'],['Taxas Cartão','percTaxasCartao',taxasCartao,'orange'],['Embalagens','percEmbalagens',embalagens,'orange'],['Obsolescência','percObsolescencia',obsolescencia,'orange']].map(([label, field, val]) => (
                            <div key={field} className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                                <div className="flex justify-between items-center mb-2"><span className="text-sm font-semibold text-orange-900">{label}</span><span className="font-bold text-orange-900">{formatCurrency(val)}</span></div>
                                <div className="flex items-center gap-2 text-xs"><input type="number" step="0.01" value={savedDre[field] ?? finData.config.variableCosts[field === 'percImpostos' ? 'imposto' : field === 'percTaxasCartao' ? 'taxaCartao' : field === 'percEmbalagens' ? 'embalagem' : 'obsoleto']} onChange={e => updateDreValue(field, e.target.value)} className="w-16 border border-orange-300 rounded px-2 py-1 text-center font-mono focus:ring-2 focus:ring-orange-400"/><span className="text-orange-700">%</span></div>
                            </div>
                          ))}
                      </div>
                      <div className="flex justify-between items-center p-3 bg-orange-100 rounded-lg border border-orange-300"><span className="font-bold text-orange-900">Total Deduções</span><span className="font-bold text-xl text-orange-900">{formatCurrency(deducoesReceita)}</span></div>
                  </div>
                  <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-5 rounded-xl shadow-md">
                      <div className="flex justify-between items-center"><div><div className="font-bold text-lg">3. Receita Líquida</div><div className="text-sm opacity-90">Margem: {margemLiquida.toFixed(2)}%</div></div><span className="font-bold text-3xl">{formatCurrency(receitaLiquida)}</span></div>
                  </div>
                  <div className="ml-6 space-y-3">
                      <div className="font-bold text-gray-700 text-sm uppercase tracking-wide">(-) Despesas Operacionais:</div>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                          {[['Aluguel','aluguel',aluguel],['Pró-labore','proLabore',proLabore],['Salários + Encargos','salarios',salarios],['Água','agua',agua],['Luz','luz',luz],['Internet','internet',internet],['Software','software',software],['Contabilidade','contabilidade',contabilidade],['Administração','administracao',administracao],['Alimentação','alimentacao',alimentacao],['Transporte','transporte',transporte]].map(([label, field, val]) => (
                            <div key={field} className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                <div className="text-xs text-purple-700 mb-1">{label}</div>
                                <input type="number" step="0.01" value={val} onChange={e => updateDreValue(field, e.target.value)} className="w-full border border-purple-300 rounded px-2 py-1.5 font-mono font-bold text-purple-900 focus:ring-2 focus:ring-purple-400"/>
                            </div>
                          ))}
                      </div>
                      <div className="flex justify-between items-center p-4 bg-purple-100 rounded-lg border border-purple-300"><span className="font-bold text-purple-900">Total Despesas Fixas</span><span className="font-bold text-2xl text-purple-900">{formatCurrency(totalDespesasFixas)}</span></div>
                  </div>
                  <div className={`p-6 rounded-xl shadow-xl border-4 ${resultadoOperacional >= 0 ? 'bg-gradient-to-r from-emerald-600 to-green-700 border-emerald-400' : 'bg-gradient-to-r from-red-600 to-red-800 border-red-400'} text-white`}>
                      <div className="flex justify-between items-center">
                          <div><div className="text-xl font-bold mb-1">4. {resultadoOperacional >= 0 ? 'LUCRO' : 'PREJUÍZO'} OPERACIONAL</div><div className="text-sm opacity-90">Margem Operacional: {margemOperacional.toFixed(2)}%</div></div>
                          <span className="font-bold text-5xl">{formatCurrency(Math.abs(resultadoOperacional))}</span>
                      </div>
                  </div>
                  <div className="mt-6 p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-blue-200">
                      <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-600"/> Indicadores de Performance</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          {[['Margem Bruta', margemBruta, 'green'],['Margem Líquida', margemLiquida, 'teal'],['Margem Operacional', margemOperacional, resultadoOperacional >= 0 ? 'emerald' : 'red'],['CMV / Receita', percCMV, 'red'],['Desp. Fixas / Receita', receitaBruta > 0 ? (totalDespesasFixas/receitaBruta*100) : 0, 'purple']].map(([label, val, color]) => (
                            <div key={label} className="text-center p-3 bg-white rounded-lg shadow-sm">
                                <div className="text-xs text-gray-600 mb-1">{label}</div>
                                <div className={`text-2xl font-bold text-${color}-700`}>{parseFloat(val).toFixed(1)}%</div>
                            </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      </div>
    );
  };

  const renderGoalsTab = () => {
    const effectiveSellers = goalsSellerOverride != null ? goalsSellerOverride : (getFinancialData(selectedStore, selectedMonth, selectedYear).activeSellers || STORE_CONFIGS[selectedStore]?.collaborators || 3);
    const goalsData = getGoalsData(selectedStore, selectedMonth, goalsSellerOverride);
    const currentSales = getHistoricalDataForStorePeriod(selectedStore, selectedMonth, selectedYear).reduce((acc, r) => acc + r.totalSales, 0);
    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-white to-indigo-50/30 p-6 rounded-2xl border border-indigo-100 shadow-lg no-print">
                <div className="flex justify-between items-center mb-6">
                     <h2 className="text-2xl font-bold text-indigo-800 flex items-center gap-2"><Target className="w-6 h-6"/> Metas</h2>
                     <div className="flex items-center gap-2">
                       <button onClick={() => { setPrintMode(true); setTimeout(() => { window.print(); setPrintMode(false); }, 300); }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600 transition-all no-print">
                         <Printer className="w-4 h-4"/> Imprimir
                       </button>
                       <button onClick={() => setShowHistoryImportModal(true)} className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-md hover:shadow-lg transition-all"><Upload className="w-4 h-4"/> Importar Histórico</button>
                     </div>
                </div>
                 <div className="flex gap-4 mb-6">
                    <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)} className="border border-indigo-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none">{Object.entries(STORE_CONFIGS).map(([k,v]) => <option key={k} value={k}>{v.name}</option>)}</select>
                    <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="border border-indigo-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none">{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{getMonthName(i+1)}</option>)}</select>
                    <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="border border-indigo-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none">{Array.from({length:5},(_,i)=><option key={i} value={2023+i}>{2023+i}</option>)}</select>
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
                           <Users className="w-4 h-4 text-indigo-600"/>
                           <span className="text-sm font-bold text-indigo-800">Vendedoras ativas — cenário de metas:</span>
                         </div>
                         {(goalsSellerOverride !== null || selectedSellerNames.size > 0) && (
                           <button onClick={() => { setGoalsSellerOverride(null); setSelectedSellerNames(new Set()); }}
                             className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                             <X className="w-3 h-3"/> Limpar
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
                                 className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                                   isHighlighted
                                     ? 'bg-white text-gray-900 shadow-md scale-105'
                                     : 'bg-gray-50 border-gray-100 text-gray-400 opacity-50 hover:opacity-80'
                                 }`}
                                 style={isHighlighted ? { borderColor: color, boxShadow: `0 0 0 1.5px ${color}55` } : {}}
                               >
                                 <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: isHighlighted ? color : '#d1d5db' }}/>
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
                             className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                               activeCount === n
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
                 <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-xl shadow-lg mb-6">
                    <div className="text-sm opacity-90 mb-1">Vendas Realizadas - {getMonthName(selectedMonth)}/{selectedYear}</div>
                    <div className="text-5xl font-bold">{formatCurrency(currentSales)}</div>
                 </div>
            </div>
            {/* === LINHA 1: METAS INDIVIDUAIS === */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-indigo-200"></div>
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-500 flex items-center gap-1.5"><Users className="w-3.5 h-3.5"/> Metas Individuais</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-indigo-200"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 🥉 BRONZE INDIVIDUAL */}
                <div className="bg-gradient-to-br from-amber-800 via-amber-700 to-yellow-800 text-white p-5 rounded-2xl shadow-xl border-2 border-amber-600 relative overflow-hidden">
                  <div className="absolute -top-2 -right-2 text-6xl opacity-10 select-none">🥉</div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🥉</span>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider opacity-90">Bronze Individual</div>
                      <div className="text-xs opacity-70">Viabilidade do time</div>
                    </div>
                  </div>
                  <div className="text-3xl font-bold my-3">{formatCurrency(goalsData.metaBronzeInd)}</div>
                  <div className="pt-3 border-t border-white/20 space-y-1 text-xs opacity-75">
                    <div className="flex justify-between"><span>Fórmula:</span><span className="font-mono">(Média×Fvend×0,80) ÷ Vend.</span></div>
                    <div className="flex justify-between"><span>F<sub>vend</sub>:</span><span className="font-bold">{goalsData.fVend.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Fator Newbie:</span><span className="font-bold">0,80 (−20%)</span></div>
                    <div className="flex justify-between"><span>Vendedoras:</span><span className="font-bold">{goalsData.activeSellers}</span></div>
                    <div className="mt-1 text-yellow-200 font-semibold">Sem piso — espaço para quem começa</div>
                  </div>
                </div>

                {/* 🥈 PRATA INDIVIDUAL */}
                <div className="bg-gradient-to-br from-slate-600 via-slate-500 to-gray-600 text-white p-5 rounded-2xl shadow-xl border-2 border-slate-400 relative overflow-hidden">
                  <div className="absolute -top-2 -right-2 text-6xl opacity-10 select-none">🥈</div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🥈</span>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider opacity-90">Prata Individual</div>
                      <div className="text-xs opacity-70">+10% histórico c/ travas</div>
                    </div>
                  </div>
                  <div className="text-3xl font-bold my-3">{formatCurrency(goalsData.metaPrataInd)}</div>
                  <div className="pt-3 border-t border-white/20 space-y-1 text-xs opacity-75">
                    <div className="flex justify-between"><span>Fórmula:</span><span className="font-mono">(Média×1,10) ÷ Vend.</span></div>
                    <div className="flex justify-between"><span>Teto (Recorde×1,05÷Vend):</span><span className="font-bold">{goalsData.recorde > 0 ? formatCurrency((goalsData.recorde * 1.05) / goalsData.activeSellers) : '—'}</span></div>
                    <div className="mt-1 text-green-200 font-semibold">🎁 R$ 100 em voucher</div>
                  </div>
                </div>

                {/* 🥇 OURO INDIVIDUAL */}
                <div className="bg-gradient-to-br from-yellow-600 via-amber-500 to-yellow-700 text-white p-5 rounded-2xl shadow-xl border-2 border-yellow-400 relative overflow-hidden">
                  <div className="absolute -top-2 -right-2 text-6xl opacity-10 select-none">🥇</div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🥇</span>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider opacity-90">Ouro Individual</div>
                      <div className="text-xs opacity-70">Teto humano 115%</div>
                    </div>
                  </div>
                  <div className="text-3xl font-bold my-3">{formatCurrency(goalsData.metaOuroInd)}</div>
                  <div className="pt-3 border-t border-white/20 space-y-1 text-xs opacity-75">
                    <div className="flex justify-between"><span>Fórmula:</span><span className="font-mono">MAX(20k ; Ouro÷Vend)</span></div>
                    <div className="flex justify-between"><span>Teto (Recorde×1,15÷Vend):</span><span className="font-bold">{goalsData.recorde > 0 ? formatCurrency((goalsData.recorde * 1.15) / goalsData.activeSellers) : '—'}</span></div>
                    <div className="mt-1 text-yellow-100 font-semibold">💰 R$ 200 no holerite</div>
                  </div>
                </div>
              </div>
            </div>

            {/* === LINHA 2: METAS LOJA === */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-purple-200"></div>
                <span className="text-xs font-bold uppercase tracking-widest text-purple-500 flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5"/> Metas da Loja (Equipe)</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-purple-200"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 🥉 BRONZE LOJA */}
                <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-yellow-900 text-white p-5 rounded-2xl shadow-xl border-2 border-amber-700 relative overflow-hidden">
                  <div className="absolute -top-2 -right-2 text-6xl opacity-10 select-none">🥉</div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🥉</span>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider opacity-90">Bronze Loja</div>
                      <div className="text-xs opacity-70">Partida histórica ajustada</div>
                    </div>
                  </div>
                  <div className="text-3xl font-bold my-3">{formatCurrency(goalsData.metaBronzeLoja)}</div>
                  <div className="pt-3 border-t border-white/20 space-y-1 text-xs opacity-75">
                    <div className="flex justify-between"><span>Fórmula:</span><span className="font-mono">B<sub>ind</sub> × Vendedoras</span></div>
                    <div className="flex justify-between"><span>B<sub>ind</sub>:</span><span className="font-bold">{formatCurrency(goalsData.metaBronzeInd)}</span></div>
                    <div className="flex justify-between"><span>Vendedoras:</span><span className="font-bold">{goalsData.activeSellers}</span></div>
                  </div>
                </div>

                {/* 🥈 PRATA LOJA */}
                <div className="bg-gradient-to-br from-slate-700 via-slate-600 to-gray-700 text-white p-5 rounded-2xl shadow-xl border-2 border-slate-500 relative overflow-hidden">
                  <div className="absolute -top-2 -right-2 text-6xl opacity-10 select-none">🥈</div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🥈</span>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider opacity-90">Prata Loja</div>
                      <div className="text-xs opacity-70">Esforço coletivo</div>
                    </div>
                  </div>
                  <div className="text-3xl font-bold my-3">{formatCurrency(goalsData.metaPrataLoja)}</div>
                  <div className="pt-3 border-t border-white/20 space-y-1 text-xs opacity-75">
                    <div className="flex justify-between"><span>Fórmula:</span><span className="font-mono">P<sub>ind</sub> × Vendedoras</span></div>
                    <div className="flex justify-between"><span>P<sub>ind</sub>:</span><span className="font-bold">{formatCurrency(goalsData.metaPrataInd)}</span></div>
                    <div className="flex justify-between"><span>Trava min (B<sub>loja</sub>):</span><span className="font-bold">{formatCurrency(goalsData.metaBronzeLoja)}</span></div>
                  </div>
                </div>

                {/* 🥇 OURO LOJA */}
                <div className="bg-gradient-to-br from-yellow-700 via-amber-600 to-yellow-800 text-white p-5 rounded-2xl shadow-xl border-2 border-yellow-500 relative overflow-hidden">
                  <div className="absolute -top-2 -right-2 text-6xl opacity-10 select-none">🥇</div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🥇</span>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider opacity-90">Ouro Loja</div>
                      <div className="text-xs opacity-70">Ponto de vitória</div>
                    </div>
                  </div>
                  <div className="text-3xl font-bold my-3">{formatCurrency(goalsData.metaOuroLoja)}</div>
                  <div className="pt-3 border-t border-white/20 space-y-1 text-xs opacity-75">
                    <div className="flex justify-between"><span>Fórmula:</span><span className="font-mono">MAX(BE ; M×1,15×1,02)</span></div>
                    <div className="flex justify-between"><span>Opção A (Break-Even):</span><span className="font-bold">{formatCurrency(goalsData.breakEven)}</span></div>
                    <div className="flex justify-between"><span>Opção B (Hist.):</span><span className="font-bold">{goalsData.mediaUltimos3Anos > 0 ? formatCurrency(goalsData.mediaUltimos3Anos * 1.15 * 1.02) : '—'}</span></div>
                    <div className="flex justify-between"><span>Trava min (P<sub>loja</sub>):</span><span className="font-bold">{formatCurrency(goalsData.metaPrataLoja)}</span></div>
                  </div>
                </div>
              </div>
            </div>
            {/* === RESUMO DE ATINGIMENTO — standalone card === */}
            {(() => {
              const currentYear = new Date().getFullYear();
              // Get current month's sellers for selected store
              const curRecords = getHistoricalDataForStorePeriod(selectedStore, selectedMonth, currentYear);
              const curActive  = curRecords.filter(r => getSellerStatus(selectedStore, selectedMonth, currentYear, r.sellerName, r.daysWorked) === 'active');
              const curSellers = [...curActive].sort((a,b) => b.totalSales - a.totalSales);
              if (curSellers.length === 0) return null;
              const totalVendas = curSellers.reduce((acc, s) => acc + s.totalSales, 0);
              const n = goalsSellerOverride != null ? goalsSellerOverride : (curSellers.length || 1);
              const yg = getGoalsData(selectedStore, selectedMonth, n);
              const bInd = yg.metaBronzeInd, pInd = yg.metaPrataInd, oInd = yg.metaOuroInd;
              const bLoja = yg.metaBronzeLoja, pLoja = yg.metaPrataLoja, oLoja = yg.metaOuroLoja;
              const lojaOuro   = totalVendas >= oLoja;
              const lojaPrata  = totalVendas >= pLoja;
              const lojaBronze = totalVendas >= bLoja;
              const lojaMedal  = lojaOuro ? '🥇 OURO' : lojaPrata ? '🥈 PRATA' : lojaBronze ? '🥉 BRONZE' : null;
              const lojaNext   = lojaOuro ? null : lojaPrata ? { label: 'Ouro', val: oLoja } : lojaBronze ? { label: 'Prata', val: pLoja } : { label: 'Bronze', val: bLoja };
              const lojaBg     = lojaOuro ? 'from-yellow-600 to-amber-700' : lojaPrata ? 'from-slate-500 to-slate-700' : lojaBronze ? 'from-amber-700 to-amber-900' : 'from-red-700 to-red-900';
              return (
                <div className="bg-white rounded-2xl border border-indigo-100 shadow-lg overflow-hidden">
                  <div className={`bg-gradient-to-r ${lojaBg} text-white px-5 py-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5"/>
                      <span className="font-bold text-sm">Resumo de Atingimento — {getMonthName(selectedMonth)}/{currentYear}</span>
                    </div>
                    <div className="text-sm font-bold opacity-90">{lojaMedal ? `Loja: ${lojaMedal}` : 'Loja: Abaixo do Bronze'}</div>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Individual performance */}
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Performance Individual</div>
                      <div className="space-y-2">
                        {curSellers.map(seller => {
                          const v = seller.totalSales;
                          const hitO = v >= oInd, hitP = v >= pInd, hitB = v >= bInd;
                          const medal = hitO ? '🥇' : hitP ? '🥈' : hitB ? '🥉' : null;
                          const bgClass = hitO ? 'bg-yellow-50 border-yellow-200' : hitP ? 'bg-slate-50 border-slate-200' : hitB ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-100';
                          const nameColor = hitO ? '#d97706' : hitP ? '#64748b' : hitB ? '#92400e' : '#dc2626';
                          let statusLine;
                          if (hitO) {
                            statusLine = { text: `Ouro ✅ +${formatCurrency(v - oInd)} acima`, color: '#d97706' };
                          } else if (hitP) {
                            statusLine = { text: `Prata ✅  |  Faltou ${formatCurrency(oInd - v)} p/ Ouro 🥇`, color: '#64748b' };
                          } else if (hitB) {
                            statusLine = { text: `Bronze ✅  |  Faltou ${formatCurrency(pInd - v)} p/ Prata 🥈`, color: '#b45309' };
                          } else {
                            statusLine = { text: `Faltou ${formatCurrency(bInd - v)} p/ Bronze 🥉`, color: '#dc2626' };
                          }
                          return (
                            <div key={seller.sellerName} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${bgClass}`}>
                              <span className="text-base shrink-0">{medal || '—'}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold truncate" style={{color: nameColor}}>{seller.sellerName}</div>
                                <div className="text-xs mt-0.5" style={{color: statusLine.color}}>{statusLine.text}</div>
                              </div>
                              <div className="text-xs font-bold text-gray-700 shrink-0">{formatCurrency(v)}</div>
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
                          { label: 'Prata Loja',  val: pLoja, hit: lojaPrata,  color: '#64748b' },
                          { label: 'Ouro Loja',   val: oLoja, hit: lojaOuro,   color: '#d97706' },
                        ].map(g => {
                          const pct = Math.min(100, (totalVendas / g.val) * 100);
                          return (
                            <div key={g.label}>
                              <div className="flex justify-between text-xs mb-0.5">
                                <span className="font-semibold" style={{color: g.color}}>{g.hit ? '✅' : '◻'} {g.label}</span>
                                <span className="font-mono text-gray-600">{formatCurrency(g.val)}</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div className="h-2 rounded-full transition-all" style={{width: `${pct}%`, background: g.hit ? g.color : `${g.color}66`}}/>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {(() => {
                        const sellersAboveBronze = curSellers.filter(s => s.totalSales >= bInd).length;
                        const disparity = curSellers.length > 1 ? curSellers[0].totalSales / (curSellers[curSellers.length-1].totalSales || 1) : 1;
                        let msg = '';
                        if (lojaMedal && disparity > 3) msg = 'Alta disparidade entre veteranas e novatas.';
                        else if (lojaMedal) msg = 'Time coeso, resultado satisfatório.';
                        else if (sellersAboveBronze > 0) msg = `${sellersAboveBronze} vendedora${sellersAboveBronze>1?'s':''} bateu${sellersAboveBronze>1?'ram':''} Bronze individualmente.`;
                        else msg = 'Nenhuma vendedora atingiu Bronze. Requer atenção.';
                        return msg ? <div className="mt-2 text-xs text-gray-500 italic px-1">{msg}</div> : null;
                      })()}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="bg-gradient-to-br from-white to-indigo-50/30 p-6 rounded-2xl border border-indigo-100 shadow-xl">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-600"/> Comparativo Histórico ({selectedMonth}/{selectedYear})</h3>
                <div className="relative bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 overflow-hidden" style={{height: '360px'}}>
                  {/* Background grid */}
                  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35"/>
                        <stop offset="40%" stopColor="#a78bfa" stopOpacity="0.18"/>
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0"/>
                      </linearGradient>
                      <linearGradient id="chartLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#818cf8"/>
                        <stop offset="50%" stopColor="#a78bfa"/>
                        <stop offset="100%" stopColor="#34d399"/>
                      </linearGradient>
                      <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                      </filter>
                      <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="4" result="blur"/>
                        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                      </filter>
                    </defs>
                    {/* Horizontal grid lines */}
                    {[0,20,40,60,80].map(pct => (
                      <line key={pct} x1="8%" y1={`${10+pct*0.8}%`} x2="96%" y2={`${10+pct*0.8}%`} stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.08"/>
                    ))}
                  </svg>

                  {(() => {
                    const currentYearSales = getHistoricalDataForStorePeriod(selectedStore, selectedMonth, selectedYear).reduce((acc, r) => acc + r.totalSales, 0);
                    const data = [...goalsData.historicalData.map(d => ({ ...d, isHistorical: true })), { year: selectedYear, total: currentYearSales, isCurrent: true }];
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
                    const areaPath = linePath + ` L ${pts[pts.length-1].x} ${PAD_T + H} L ${pts[0].x} ${PAD_T + H} Z`;

                    return (
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        {/* Area fill */}
                        <path d={areaPath} fill="url(#chartAreaGrad)" opacity="1"/>
                        {/* Line with glow */}
                        <path d={linePath} fill="none" stroke="url(#chartLineGrad)" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" filter="url(#lineGlow)" opacity="1"/>
                        {/* Second pass: crisp line on top */}
                        <path d={linePath} fill="none" stroke="url(#chartLineGrad)" strokeWidth="0.35" strokeLinecap="round" strokeLinejoin="round" opacity="1"/>
                      </svg>
                    );
                  })()}

                  {/* Dots and labels rendered in HTML on top of SVG */}
                  {(() => {
                    const currentYearSales = getHistoricalDataForStorePeriod(selectedStore, selectedMonth, selectedYear).reduce((acc, r) => acc + r.totalSales, 0);
                    const data = [...goalsData.historicalData.map(d => ({ ...d, isHistorical: true })), { year: selectedYear, total: currentYearSales, isCurrent: true }];
                    const maxVal = data.filter(d=>d.total>0).length > 0 ? Math.max(...data.map(d=>d.total)) * 1.2 : 100000;
                    const PAD_L = 9, PAD_R = 5, PAD_T = 10, PAD_B = 14;
                    const W = 100 - PAD_L - PAD_R, H = 100 - PAD_T - PAD_B;
                    return data.map((d, i) => {
                      const xPct = PAD_L + (i / (data.length - 1)) * W;
                      const yPct = PAD_T + H - (maxVal > 0 ? (d.total / maxVal) * H : 0);
                      const isLast = d.isCurrent;
                      const color = isLast ? '#34d399' : '#818cf8';
                      const hasSales = d.total > 0;
                      return (
                        <div key={i} className="absolute" style={{left: `${xPct}%`, top: `${yPct}%`, transform: 'translate(-50%, -50%)'}}>
                          {/* Outer glow ring */}
                          <div className="absolute rounded-full" style={{width:24, height:24, background: color, opacity:0.15, top:-8, left:-8}}/>
                          {/* Dot */}
                          <div className="rounded-full border-2 border-white shadow-lg" style={{width:10, height:10, background: hasSales ? color : '#4b5563', boxShadow: hasSales ? `0 0 10px ${color}88` : 'none'}}/>
                          {/* Value label */}
                          {hasSales && (
                            <div className="absolute whitespace-nowrap text-center" style={{bottom: '100%', left:'50%', transform:'translateX(-50%)', marginBottom:8}}>
                              <span className="text-white font-bold px-2 py-0.5 rounded-lg text-xs" style={{background:'rgba(30,27,75,0.85)', fontSize:'0.65rem', color: isLast ? '#34d399' : '#c7d2fe', border: `1px solid ${color}44`}}>
                                {formatCurrency(d.total)}
                              </span>
                            </div>
                          )}
                          {/* Year label below */}
                          <div className="absolute whitespace-nowrap text-center" style={{top:'100%', left:'50%', transform:'translateX(-50%)', marginTop:8}}>
                            <span style={{fontSize:'0.6rem', fontWeight:700, color: isLast ? '#34d399' : '#94a3b8'}}>{d.year}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
            </div>
            {/* === GRÁFICO DE BARRAS: TOP 5 VENDEDORAS POR ANO === */}
            {(() => {
              const CHART_YEARS = [2023, 2024, 2025, new Date().getFullYear()];
              // 5 high-contrast, visually distinct colors
              const SELLER_COLORS = ['#f59e0b', '#10b981', '#e11d48', '#3b82f6', '#a855f7'];
              const currentYear = new Date().getFullYear();

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
                { value: goalsData.metaPrataInd,  label: '🥈 Prata',  color: '#94a3b8', glow: '#cbd5e1' },
                { value: goalsData.metaOuroInd,   label: '🥇 Ouro',   color: '#eab308', glow: '#fde047' },
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
                    <Users className="w-5 h-5 text-indigo-600"/> Top 5 Vendedoras por Ano — {getMonthName(selectedMonth)}/{currentYear}
                  </h3>
                  <p className="text-xs text-gray-400 mb-4">Barras = vendas individuais · Linhas pontilhadas = metas individuais · Passe o mouse nas barras para detalhes</p>

                  {!hasAnyData ? (
                    <div className="flex items-center justify-center h-48 text-gray-400">
                      <div className="text-center"><Users className="w-10 h-10 mx-auto mb-2 opacity-20"/><p className="text-sm">Sem dados de vendedoras para este mês/loja</p></div>
                    </div>
                  ) : (
                    <>
                      {/* LEGEND: only current-year active sellers */}
                      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4">
                        <div className="w-full text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Vendedoras ativas ({currentYear})</div>
                        {currentYearActive.length > 0 ? currentYearActive.map(name => (
                          <div key={name} className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm shrink-0 shadow-sm" style={{ background: sellerColorMap[name] }}/>
                            <span className="text-xs text-gray-700 font-semibold truncate max-w-[140px]">{name}</span>
                          </div>
                        )) : (
                          <span className="text-xs text-gray-400 italic">Sem vendedoras ativas registradas para {getMonthName(selectedMonth)}/{currentYear}</span>
                        )}
                        <div className="w-full h-px bg-gray-100 my-0.5"/>
                        {goalLines.map(g => (
                          <div key={g.label} className="flex items-center gap-1.5">
                            <div className="w-5 border-t-2 border-dashed shrink-0" style={{ borderColor: g.color }}/>
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
                                <stop offset="0%" stopColor={c} stopOpacity="1"/>
                                <stop offset="100%" stopColor={c} stopOpacity="0.4"/>
                              </linearGradient>
                            ))}
                          </defs>

                          {/* Y grid + labels */}
                          {ySteps.map(v => {
                            const yPx = toY(v);
                            return (
                              <g key={v}>
                                <line x1={PAD_LEFT} y1={yPx} x2={800 - PAD_RIGHT} y2={yPx} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.07"/>
                                <text x={PAD_LEFT - 6} y={yPx + 3.5} textAnchor="end" fill="#64748b" fontSize="9.5" fontFamily="monospace">
                                  {v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
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
                                <line x1={PAD_LEFT} y1={yPx} x2={800 - PAD_RIGHT} y2={yPx} stroke={g.glow} strokeWidth="4" strokeOpacity="0.18"/>
                                <line x1={PAD_LEFT} y1={yPx} x2={800 - PAD_RIGHT} y2={yPx} stroke={g.color} strokeWidth="1.4" strokeOpacity="0.95" strokeDasharray="7,5"/>
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
                                  <rect x={barX + 1.5} y={barY + 3} width={barW} height={barH} fill={SELLER_COLORS[colorIdx]} fillOpacity="0.12" rx="3"/>
                                  <rect x={barX} y={barY} width={barW} height={barH} fill={`url(#bsg6_${colorIdx})`} rx="3"/>
                                  {barH > 22 && (
                                    <text x={barX + barW / 2} y={barY - 5} textAnchor="middle" fill={SELLER_COLORS[colorIdx]} fontSize="7.5" fontWeight="700" fontFamily="monospace">
                                      {seller.totalSales >= 1000 ? `${(seller.totalSales/1000).toFixed(1)}k` : seller.totalSales}
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
                          {[1,2,3].map(i => {
                            const chartW = 800 - PAD_LEFT - PAD_RIGHT;
                            const x = PAD_LEFT + i * (chartW / CHART_YEARS.length);
                            return <line key={i} x1={x} y1={PAD_TOP} x2={x} y2={CHART_H - PAD_BOTTOM} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.06"/>;
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
                                  <div className="mx-auto" style={{ width:0, height:0, borderLeft:'5px solid transparent', borderRight:'5px solid transparent', borderBottom:`5px solid ${bp.color}`, marginTop:-1 }}/>
                                ) : (
                                  <div className="mx-auto" style={{ width:0, height:0, borderLeft:'5px solid transparent', borderRight:'5px solid transparent', borderTop:`5px solid ${bp.color}`, marginTop:0 }}/>
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
            })()}

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-indigo-600"/> Projeção Anual (Histórico Completo)</h3>
                <p className="text-xs text-gray-400 mb-4 flex items-center gap-1"><ChevronRight className="w-3 h-3"/> Clique em um mês para ver as top vendedoras de cada ano</p>
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
                        {Array.from({length: 12}).map((_, i) => {
                            const m = i + 1;
                            const projData = getGoalsData(selectedStore, m);
                            const currentSellers = projectionSellers[`${selectedStore}-${m}`] || STORE_CONFIGS[selectedStore].collaborators;

                            const allYearsComplete = hasAllYearsData(selectedStore, m);
                            const trendData = calculateTrend(selectedStore, m);
                            const sales2021 = getHistoricalDataForStorePeriod(selectedStore, m, 2021).reduce((acc, r) => acc + r.totalSales, 0);
                            const sales2022 = getHistoricalDataForStorePeriod(selectedStore, m, 2022).reduce((acc, r) => acc + r.totalSales, 0);
                            const sales2023 = getHistoricalDataForStorePeriod(selectedStore, m, 2023).reduce((acc, r) => acc + r.totalSales, 0);
                            const sales2024 = getHistoricalDataForStorePeriod(selectedStore, m, 2024).reduce((acc, r) => acc + r.totalSales, 0);
                            const sales2025 = getHistoricalDataForStorePeriod(selectedStore, m, 2025).reduce((acc, r) => acc + r.totalSales, 0);
                            const sales2026 = getHistoricalDataForStorePeriod(selectedStore, m, 2026).reduce((acc, r) => acc + r.totalSales, 0);
                            let trendColor = 'text-gray-500 bg-gray-100';
                            if (trendData.trend === 'up') trendColor = 'text-green-700 bg-green-100';
                            if (trendData.trend === 'down') trendColor = 'text-red-700 bg-red-100';
                            const isExpanded = expandedMonthRow === m;

                            // Top 5 sellers per year for this month
                            const TOP_YEARS = [2021,2022,2023,2024,2025,2026];
                            const topSellersByYear = TOP_YEARS.map(yr => {
                              const records = getHistoricalDataForStorePeriod(selectedStore, m, yr);
                              const active = records.filter(r => getSellerStatus(selectedStore, m, yr, r.sellerName, r.daysWorked) === 'active');
                              const sorted = [...active].sort((a,b) => b.totalSales - a.totalSales).slice(0,5);
                              return { year: yr, sellers: sorted, total: records.reduce((a,r)=>a+r.totalSales,0) };
                            }).filter(y => y.total > 0);

                            const MEDAL_COLORS = ['#f59e0b','#94a3b8','#b45309','#6366f1','#10b981'];

                            return (
                                <React.Fragment key={m}>
                                <tr
                                  className={`border-b transition-colors cursor-pointer select-none ${isExpanded ? 'bg-indigo-50' : 'hover:bg-indigo-50/30'}`}
                                  onClick={() => setExpandedMonthRow(isExpanded ? null : m)}
                                >
                                    <td className={`p-3 font-bold sticky left-0 z-10 flex items-center gap-1.5 ${isExpanded ? 'bg-indigo-50 text-indigo-800' : 'bg-white text-gray-800'}`}>
                                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-indigo-500"/> : <ChevronRight className="w-3.5 h-3.5 text-gray-400"/>}
                                      {getMonthName(m)}
                                    </td>
                                    <td className="p-3 text-center"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${trendColor}`}><span className="text-base">{trendData.arrow}</span>{Math.abs(trendData.percent).toFixed(1)}%</span></td>
                                    <td className="p-3 text-center">{allYearsComplete ? <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs font-bold"><CheckCircle className="w-3 h-3"/> Completo</span> : <span className="inline-flex items-center gap-1 text-gray-400 bg-gray-100 px-2 py-1 rounded-full text-xs"><AlertTriangle className="w-3 h-3"/> Pendente</span>}</td>
                                    <td className="p-3 text-right text-gray-600 font-mono">{sales2021 > 0 ? formatCurrency(sales2021) : '-'}</td>
                                    <td className="p-3 text-right text-gray-600 font-mono">{sales2022 > 0 ? formatCurrency(sales2022) : '-'}</td>
                                    <td className="p-3 text-right text-gray-600 font-mono">{sales2023 > 0 ? formatCurrency(sales2023) : '-'}</td>
                                    <td className="p-3 text-right text-gray-600 font-mono">{sales2024 > 0 ? formatCurrency(sales2024) : '-'}</td>
                                    <td className="p-3 text-right text-gray-600 font-mono">{sales2025 > 0 ? formatCurrency(sales2025) : '-'}</td>
                                    <td className="p-3 text-right text-green-700 font-mono font-bold">{sales2026 > 0 ? formatCurrency(sales2026) : '-'}</td>
                                    <td className="p-3 text-center"><input type="number" className="w-14 border border-indigo-200 text-center rounded-lg p-1.5 focus:ring-2 focus:ring-indigo-400 focus:outline-none" value={currentSellers} onClick={e => e.stopPropagation()} onChange={(e) => { const k=`${selectedStore}-${m}`,v=parseInt(e.target.value)||1; setProjectionSellers(prev=>({...prev,[k]:v})); supabase.from('projection_sellers').upsert({store_code:selectedStore,projection_key:k,seller_count:v,updated_at:new Date().toISOString()},{onConflict:'store_code,projection_key'}); }}/></td>
                                </tr>
                                {isExpanded && (
                                  <tr key={`${m}-detail`}>
                                    <td colSpan={10} className="bg-gradient-to-br from-indigo-50 to-purple-50 border-b border-indigo-200 p-0">
                                      <div className="p-4 space-y-4">
                                        <div className="flex items-center gap-2">
                                          <Users className="w-4 h-4 text-indigo-600"/>
                                          <span className="font-bold text-indigo-800 text-sm">Top Vendedoras — {getMonthName(m)}</span>
                                          <span className="text-xs text-gray-400">• Ordenadas por maior venda individual</span>
                                        </div>
                                        {topSellersByYear.length === 0 ? (
                                          <div className="text-center py-6 text-gray-400 text-xs">Sem dados de vendedoras para este mês</div>
                                        ) : (
                                          <>
                                            {/* Year cards */}
                                            <div className="grid gap-4" style={{gridTemplateColumns: `repeat(${Math.min(topSellersByYear.length, 3)}, 1fr)`}}>
                                              {topSellersByYear.map(({year, sellers}) => {
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
                                                      {Array.from({length: 5}).map((_, rank) => {
                                                        const seller = sellers[rank];
                                                        if (!seller) return (
                                                          <div key={rank} className="flex items-center gap-2 px-3 py-2 opacity-20">
                                                            <span className="text-xs w-5 text-center text-gray-400">{rank+1}º</span>
                                                            <span className="text-xs text-gray-400">—</span>
                                                          </div>
                                                        );
                                                        const v = seller.totalSales;
                                                        // Correct medal: highest threshold crossed
                                                        const hitOuro  = v >= oInd;
                                                        const hitPrata = v >= pInd;
                                                        const hitBronze = v >= bInd;
                                                        const medal = hitOuro ? '🥇' : hitPrata ? '🥈' : hitBronze ? '🥉' : null;
                                                        const medalColor = hitOuro ? '#d97706' : hitPrata ? '#94a3b8' : hitBronze ? '#b45309' : '#ef4444';
                                                        // Correct % — relative to next unachieved goal, or if ouro hit → % of ouro
                                                        let pctLabel, pctColor;
                                                        if (hitOuro) {
                                                          pctLabel = `🥇 ${((v/oInd)*100).toFixed(1)}% do Ouro`;
                                                          pctColor = '#d97706';
                                                        } else if (hitPrata) {
                                                          pctLabel = `🥈 ${((v/oInd)*100).toFixed(1)}% do Ouro`;
                                                          pctColor = '#94a3b8';
                                                        } else if (hitBronze) {
                                                          pctLabel = `🥉 ${((v/pInd)*100).toFixed(1)}% da Prata`;
                                                          pctColor = '#b45309';
                                                        } else {
                                                          pctLabel = `${((v/bInd)*100).toFixed(1)}% do Bronze`;
                                                          pctColor = '#ef4444';
                                                        }
                                                        return (
                                                          <div key={rank} className="flex items-center gap-2 px-3 py-2">
                                                            <span className="text-sm font-bold w-5 text-center shrink-0" style={{color: medalColor}}>
                                                              {medal || `${rank+1}º`}
                                                            </span>
                                                            <div className="flex-1 min-w-0">
                                                              <div className="text-xs font-semibold text-gray-800 truncate">{seller.sellerName}</div>
                                                              <div className="text-xs text-gray-400">{seller.daysWorked}d · {seller.salesCount} vendas</div>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                              <div className="text-xs font-bold" style={{color: medalColor}}>{formatCurrency(v)}</div>
                                                              <div className="text-xs font-medium" style={{color: pctColor}}>{pctLabel}</div>
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
            {(() => {
              const currentYear = new Date().getFullYear();
              const currentActualMonth = new Date().getMonth() + 1; // real current month
              const months = Array.from({length: 12}, (_, i) => i + 1);

              // For each month, compute goals and real results
              const monthRows = months.map(m => {
                const n = projectionSellers[`${selectedStore}-${m}`] || STORE_CONFIGS[selectedStore]?.collaborators || 3;
                const goals = getGoalsData(selectedStore, m, n);
                const records = getHistoricalDataForStorePeriod(selectedStore, m, currentYear);
                const totalSales = records.reduce((acc, r) => acc + r.totalSales, 0);
                const hasData = totalSales > 0;
                const hitOuro   = hasData && totalSales >= goals.metaOuroLoja;
                const hitPrata  = hasData && totalSales >= goals.metaPrataLoja;
                const hitBronze = hasData && totalSales >= goals.metaBronzeLoja;
                return {
                  m, goals, totalSales, hasData,
                  hitOuro, hitPrata, hitBronze,
                  isPast: m <= currentActualMonth,
                };
              });

              // Summary counts
              const pastMonths = monthRows.filter(r => r.isPast && r.hasData);
              const ouroCount  = pastMonths.filter(r => r.hitOuro).length;
              const prataCount = pastMonths.filter(r => r.hitPrata && !r.hitOuro).length;
              const bronzeCount= pastMonths.filter(r => r.hitBronze && !r.hitPrata).length;
              const missCount  = pastMonths.filter(r => !r.hitBronze).length;

              const tierCards = [
                {
                  tier: 'bronze',
                  emoji: '🥉',
                  label: 'Bronze Individual',
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
                  label: 'Prata Individual',
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
                  label: 'Ouro Individual',
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
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-indigo-200"/>
                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-500 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5"/> Acompanhamento Anual {currentYear}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-indigo-200"/>
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
                                <div className="h-1.5 rounded-full bg-white transition-all" style={{width: `${hitRate}%`}}/>
                              </div>
                            </div>
                          </div>

                          {/* Month-by-month breakdown */}
                          <div className="px-4 py-3 space-y-1 max-h-80 overflow-y-auto">
                            {monthRows.map(row => {
                              const metaInd = card.getMeta(row.goals);
                              const metaLoja = card.getLojaThreshold(row.goals);
                              const hit = row.hasData && card.hitFn(row);
                              const diff = row.totalSales - metaLoja;
                              const pct = metaLoja > 0 ? ((row.totalSales / metaLoja) * 100).toFixed(0) : 0;
                              const isFuture = !row.isPast;
                              const noData = row.isPast && !row.hasData;
                              return (
                                <div key={row.m}
                                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                                    isFuture ? 'opacity-40' :
                                    noData ? 'opacity-50' :
                                    hit ? 'bg-white/20' : 'bg-black/15'
                                  }`}
                                >
                                  {/* Month name */}
                                  <div className="w-8 font-bold opacity-80 shrink-0 text-xs">
                                    {getMonthName(row.m).substring(0,3)}
                                  </div>

                                  {/* Status icon */}
                                  <span className="text-sm shrink-0 w-5 text-center">
                                    {isFuture ? '·' : noData ? '—' : hit ? card.emoji : '✗'}
                                  </span>

                                  {/* Progress bar or dash */}
                                  <div className="flex-1">
                                    {!isFuture && row.hasData ? (
                                      <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                                        <div className="h-1.5 rounded-full transition-all"
                                          style={{width: `${Math.min(100, pct)}%`, background: hit ? 'white' : 'rgba(255,255,255,0.5)'}}/>
                                      </div>
                                    ) : (
                                      <div className="w-full bg-white/10 rounded-full h-1.5"/>
                                    )}
                                  </div>

                                  {/* Value / projection */}
                                  <div className="text-right shrink-0 font-mono text-xs" style={{minWidth: 80}}>
                                    {isFuture ? (
                                      <span className="opacity-50">{formatCurrency(metaInd)}</span>
                                    ) : noData ? (
                                      <span className="opacity-40">sem dados</span>
                                    ) : (
                                      <span className={hit ? 'font-bold' : 'opacity-75'}>
                                        {pct}% {diff >= 0 ? <span className="text-green-200">+{formatCurrency(diff)}</span> : <span className="text-red-300">{formatCurrency(diff)}</span>}
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
    );
  };

  if (dbLoading) return (<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 to-slate-900"><div className="text-center"><div className="text-white text-xl font-bold animate-pulse mb-2">Carregando dados...</div><div className="text-indigo-300 text-sm">Conectando ao banco de dados</div></div></div>);

  // ── RH TAB ────────────────────────────────────────────────
  const formatDateBR = (s) => { if (!s) return '—'; const ts = parseDate(s); return ts ? new Date(ts).toLocaleDateString('pt-BR') : s; };
  const HR_STATUS_COLORS = {
    'Banco de Talentos':    { bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-300' },
    'Recusado':             { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300' },
    'Contratado':           { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300' },
    'Em análise':        { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    'Entrevista agendada':  { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-300' },
    'Entrevista realizada': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    'Aguardando retorno':   { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  };
  const processHrImport = async () => {
    const lines = hrImportText.trim().split('\n').filter(Boolean);
    if (lines.length === 0) { alert('Cole os dados antes de processar'); return; }
    const entries = lines.map(line => {
      const col = line.split('\t');
      return { store_code: selectedStore, candidato: col[0]?.trim() || '', telefone: col[1]?.trim() || null, recebimento_curriculo: col[2]?.trim() || null, data_resposta: col[3]?.trim() || null, status_processo: col[4]?.trim() || null, motivo_detalhes: col[5]?.trim() || null, entrevista_agendada: col[6]?.trim() || null, nota_interna: col[9]?.trim() || null, fonte_captacao: col[10]?.trim() || null, observacoes: col[11]?.trim() || null, retornou: col[12]?.trim()?.toUpperCase() === 'TRUE', interessado: col[13]?.trim()?.toUpperCase() === 'TRUE', recusa: col[14]?.trim()?.toUpperCase() === 'TRUE', desvio: col[15]?.trim()?.toUpperCase() === 'TRUE', responsavel: col[16]?.trim() || null, whatsapp: col[17]?.trim() || null, etapa_maxima: col[20]?.trim() || null, macro_status_final: col[21]?.trim() || null, gargalo: col[22]?.trim() || null };
    }).filter(e => e.candidato);
    if (entries.length === 0) { alert('Nenhum candidato encontrado'); return; }
    const { error } = await supabase.from('hr_candidates').insert(entries);
    if (error) { alert('Erro: ' + error.message); return; }
    await loadHrCandidates();
    setShowHrImportModal(false); setHrImportText('');
    alert(entries.length + ' candidato(s) importado(s)!');
  };
  const renderHrTab = () => {
    const STATUSES = ['all','Banco de Talentos','Em análise','Entrevista agendada','Entrevista realizada','Contratado','Recusado','Aguardando retorno'];
    const filtered = hrCandidates.filter(c => (hrFilter === 'all' || c.status_processo === hrFilter) && (!hrSearch || c.candidato?.toLowerCase().includes(hrSearch.toLowerCase()) || c.telefone?.includes(hrSearch)));
    const stats = { total: hrCandidates.length, interessados: hrCandidates.filter(c => c.interessado).length, entrevistas: hrCandidates.filter(c => c.entrevista_agendada).length, contratados: hrCandidates.filter(c => c.status_processo === 'Contratado').length };
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3"><div className="bg-rose-100 p-2 rounded-xl"><Briefcase className="w-5 h-5 text-rose-600"/></div><div><h2 className="font-bold text-gray-800 text-lg">Recrutamento &amp; Sele\u00e7\u00e3o</h2><p className="text-xs text-gray-500">Gest\u00e3o de candidatos</p></div></div>
            <button onClick={() => setShowHrImportModal(true)} className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors"><Upload className="w-4 h-4"/> Importar Candidatos</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {[{label:'Total',value:stats.total,color:'text-gray-700',bg:'bg-gray-50'},{label:'Interessados',value:stats.interessados,color:'text-blue-700',bg:'bg-blue-50'},{label:'Entrevistas',value:stats.entrevistas,color:'text-purple-700',bg:'bg-purple-50'},{label:'Contratados',value:stats.contratados,color:'text-green-700',bg:'bg-green-50'}].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div><div className="text-xs text-gray-500 mt-0.5">{s.label}</div></div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-48"><Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400"/><input value={hrSearch} onChange={e => setHrSearch(e.target.value)} placeholder="Buscar candidato..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-300 focus:outline-none"/></div>
            <div className="flex flex-wrap gap-1.5">{STATUSES.map(s => (<button key={s} onClick={() => setHrFilter(s)} className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${hrFilter === s ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-gray-600 border-gray-200 hover:border-rose-300'}`}>{s === 'all' ? 'Todos' : s}</button>))}</div>
          </div>
        </div>
        <div className="space-y-2">
          {filtered.length === 0 && (<div className="bg-white rounded-2xl border border-gray-200 p-12 text-center"><Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3"/><p className="text-gray-500 font-medium">Nenhum candidato encontrado</p><p className="text-gray-400 text-sm mt-1">Importe candidatos usando o bot\u00e3o acima</p></div>)}
          {filtered.map(cand => {
            const isOpen = hrExpanded.has(cand.id);
            const sc = HR_STATUS_COLORS[cand.status_processo] || HR_STATUS_COLORS['Banco de Talentos'];
            const toggleExpand = () => { const ns = new Set(hrExpanded); ns.has(cand.id) ? ns.delete(cand.id) : ns.add(cand.id); setHrExpanded(ns); };
            return (
              <div key={cand.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={toggleExpand}>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-800">{cand.candidato}</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${sc.bg} ${sc.text} ${sc.border}`}>{cand.status_processo || '\u2014'}</span>
                      {cand.interessado && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">\u2713 Interessado</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
                      {cand.telefone && <span className="flex items-center gap-1"><Phone className="w-3 h-3"/>{cand.telefone}</span>}
                      {cand.recebimento_curriculo && <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/>Curr\u00edculo: {formatDateBR(cand.recebimento_curriculo)}</span>}
                      {cand.entrevista_agendada && <span className="flex items-center gap-1 text-purple-600"><Clock className="w-3 h-3"/>Entrevista: {formatDateBR(cand.entrevista_agendada)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {cand.gargalo && cand.gargalo !== 'Fluxo ok' && <AlertCircle className="w-4 h-4 text-orange-500"/>}
                    {cand.whatsapp && (<a href={`https://wa.me/${cand.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-lg hover:bg-green-200"><MessageCircle className="w-3.5 h-3.5"/> WA</a>)}
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400"/> : <ChevronDown className="w-4 h-4 text-gray-400"/>}
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[{label:'Data Resposta',value:formatDateBR(cand.data_resposta)},{label:'Entrevista',value:formatDateBR(cand.entrevista_agendada)},{label:'Respons\u00e1vel',value:cand.responsavel},{label:'Etapa M\u00e1xima',value:cand.etapa_maxima},{label:'Macro Status',value:cand.macro_status_final},{label:'Gargalo',value:cand.gargalo},{label:'Fonte',value:cand.fonte_captacao},{label:'Nota',value:cand.nota_interna}].filter(f => f.value && f.value !== '\u2014').map(f => (<div key={f.label} className="bg-white rounded-lg p-2.5 border border-gray-100"><div className="text-xs text-gray-400 mb-0.5">{f.label}</div><div className="text-sm font-medium text-gray-700">{f.value}</div></div>))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cand.retornou && <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full border border-blue-200">\u21a9 Retornou</span>}
                      {cand.interessado && <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200">\u2713 Interessado</span>}
                      {cand.recusa && <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full border border-red-200">\u2717 Recusa</span>}
                      {cand.desvio && <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full border border-orange-200">\u26a0 Desvio</span>}
                    </div>
                    {cand.motivo_detalhes && (<div className="bg-white rounded-lg p-3 border border-gray-100"><div className="text-xs text-gray-400 mb-1">Motivo / Detalhes</div><p className="text-sm text-gray-700 whitespace-pre-wrap">{cand.motivo_detalhes}</p></div>)}
                    {cand.observacoes && (<div className="bg-white rounded-lg p-3 border border-gray-100"><div className="text-xs text-gray-400 mb-1">\U0001f4dd Observa\u00e7\u00f5es</div><p className="text-sm text-gray-700 whitespace-pre-wrap">{cand.observacoes}</p></div>)}
                    {cand.gargalo && cand.gargalo !== 'Fluxo ok' && (<div className="bg-orange-50 rounded-lg p-3 border border-orange-200"><div className="text-xs text-orange-500 mb-1">\u26a0\ufe0f Gargalo</div><p className="text-sm text-orange-700 font-medium">{cand.gargalo}</p></div>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {showHrImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
              <div className="p-5 border-b flex items-center justify-between"><h3 className="font-bold text-gray-800 text-lg flex items-center gap-2"><Upload className="w-5 h-5 text-rose-600"/> Importar Candidatos</h3><button onClick={() => setShowHrImportModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600"/></button></div>
              <div className="p-5 space-y-4">
                <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700 border border-blue-200"><strong>Formato:</strong> Cole direto do Excel. Colunas na ordem do seu sistema de RH.</div>
                <textarea value={hrImportText} onChange={e => setHrImportText(e.target.value)} placeholder="Cole aqui os dados copiados do Excel..." rows={10} className="w-full border border-gray-200 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-rose-300 focus:outline-none resize-none"/>
              </div>
              <div className="p-5 border-t flex justify-end gap-3"><button onClick={() => setShowHrImportModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium">Cancelar</button><button onClick={processHrImport} className="px-6 py-2 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition-colors">Processar</button></div>
            </div>
          </div>
        )}
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
            {showHistoryImportModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 border border-gray-200">
                    <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-indigo-800"><Upload className="w-5 h-5"/> Importar Histórico de Vendas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-200">
                        <div><label className="block text-xs font-bold text-indigo-900 mb-1.5">Loja de Destino</label><select className="w-full border border-indigo-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none" value={importTargetStore} onChange={e => setImportTargetStore(e.target.value)}>{Object.entries(STORE_CONFIGS).map(([key, config]) => (<option key={key} value={key}>{config.name}</option>))}</select></div>
                        <div><label className="block text-xs font-bold text-indigo-900 mb-1.5">Mês</label><select className="w-full border border-indigo-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>{Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{getMonthName(i+1)}</option>)}</select></div>
                        <div><label className="block text-xs font-bold text-indigo-900 mb-1.5">Ano</label><select className="w-full border border-indigo-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>{Array.from({length: 10}, (_, i) => <option key={i} value={2020+i}>{2020+i}</option>)}</select></div>
                    </div>
                    <div className="mb-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={clearBeforeImport} onChange={(e) => setClearBeforeImport(e.target.checked)} className="w-4 h-4 text-yellow-600 rounded"/><span className="font-medium text-yellow-800">Limpar dados existentes deste período antes de importar</span></label>
                      <p className="text-xs text-yellow-700 mt-1 ml-6">Use esta opção para sobrescrever dados antigos e evitar duplicação</p>
                    </div>
                    <textarea className="w-full h-48 border border-gray-300 p-3 text-xs font-mono rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none" value={historyImportText} onChange={e => setHistoryImportText(e.target.value)} placeholder="Cole aqui os dados copiados do Excel..."/>
                    <div className="flex justify-end gap-2 mt-4">
                      <button onClick={() => { setShowHistoryImportModal(false); setClearBeforeImport(false); }} className="px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100">Cancelar</button>
                      <button onClick={processSalesHistoryImport} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 shadow-md">Processar</button>
                    </div>
                </div>
            </div>
            )}
            {showImportModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 border border-gray-200">
                  <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-blue-800"><Upload className="w-5 h-5"/> Importar Dados do Sistema</h3>
                  <textarea className="w-full h-64 border border-gray-300 p-3 text-xs font-mono rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none" value={importText} onChange={e => setImportText(e.target.value)} placeholder="MARCA..."/>
                  <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100">Cancelar</button>
                    <button onClick={processImport} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-md">Processar</button>
                  </div>
                </div>
              </div>
            )}
            {showResetModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-yellow-200">
                  <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-200 flex items-center gap-3"><AlertTriangle className="w-6 h-6 text-yellow-600"/><h3 className="font-bold text-lg text-yellow-800">Cuidado!</h3></div>
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
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm no-print overflow-x-auto">
          <div className="max-w-7xl mx-auto flex px-4">
            <button onClick={() => navigateTab('system')} className={`py-4 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'system' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Package className="w-4 h-4 inline mr-1"/> 1. Sistema</button>
            <button onClick={() => navigateTab('audit')} className={`py-4 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'audit' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><CheckCircle className="w-4 h-4 inline mr-1"/> 2. Contagem</button>
            <button onClick={() => navigateTab('dashboard')} className={`py-4 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'dashboard' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><BarChart3 className="w-4 h-4 inline mr-1"/> 3. Dashboard</button>
            <button onClick={() => navigateTab('marketing')} className={`py-4 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'marketing' ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Share2 className="w-4 h-4 inline mr-1"/> 4. Divulgação</button>
            <button onClick={() => navigateTab('viability')} className={`py-4 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'viability' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><PieChart className="w-4 h-4 inline mr-1"/> 5. DRE</button>
            <button onClick={() => navigateTab('goals')} className={`py-4 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'goals' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Target className="w-4 h-4 inline mr-1"/> 6. Metas</button>
            <button onClick={() => navigateTab('hr')} className={`py-4 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'hr' ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Briefcase className="w-4 h-4 inline mr-1"/> 7. RH</button>
            <div className="ml-auto flex items-center px-4 gap-2">{userRole && <span className="text-xs text-gray-400 hidden md:block capitalize">{userRole}</span>}<button onClick={() => supabase.auth.signOut()} className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-all">Sair</button></div>
          </div>
        </nav>
      )}

      <main className={`max-w-7xl mx-auto p-4 md:p-6 ${printMode ? 'pt-20' : ''}`}>
        
        {activeTab === 'system' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
             <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex justify-between items-center">
                 <h2 className="font-bold text-gray-700 flex items-center gap-2"><Package className="w-5 h-5"/> Estoque no Sistema</h2>
<div className="flex items-center gap-2">
                   <span className="text-xs text-gray-500 font-medium">Loja:</span>
                   <select value={selectedStore} onChange={async (e) => { setSelectedStore(e.target.value); setTimeout(loadStoreData, 50); }}
                     className="text-sm font-bold border border-blue-200 rounded-lg px-3 py-1.5 bg-white text-blue-700 focus:ring-2 focus:ring-blue-300 focus:outline-none">
                     {(userRole === 'owner' ? ['3','4','7','8','10'] : userStoreAccess).map(s => (
                       <option key={s} value={s}>Loja {s}</option>
                     ))}
                   </select>
                 </div>
                 <button onClick={() => setShowImportModal(true)} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all shadow-md"><Upload className="w-4 h-4 mr-2"/> Importar</button>
             </div>
             <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                     <thead className="text-xs text-gray-700 uppercase bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                         <tr><th className="px-4 py-3">Ref / Marca</th>{sizeColumns.map(s => <th key={s} className="px-2 py-3 text-center">{s}</th>)}<th className="px-4 py-3 text-right">Total</th></tr>
                     </thead>
                     <tbody>
                         {filteredSystemData.map(item => (
                             <tr key={item.id} className="border-b hover:bg-blue-50/30 transition-colors">
                                 <td className="px-4 py-3"><div>{item.REFERENCIA}</div><div className="text-xs text-gray-500">{item.MARCADESC}</div></td>
                                 {sizeColumns.map(s => <td key={s} className="text-center px-2">{item.sizes[s]}</td>)}
                                 <td className="text-right px-4 font-bold">{item.QTDE}</td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-0">
             <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50">
                    <div className="flex items-center gap-3">
                      <h2 className="font-bold text-green-800 flex items-center gap-2"><CheckCircle className="w-5 h-5"/> Contagem Física</h2>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-xs text-gray-500 font-medium">Loja:</span>
                        <select value={selectedStore} onChange={async (e) => { setSelectedStore(e.target.value); setTimeout(loadStoreData, 50); }}
                          className="text-sm font-bold border border-green-200 rounded-lg px-3 py-1.5 bg-white text-green-700 focus:ring-2 focus:ring-green-300 focus:outline-none">
                          {(userRole === 'owner' ? ['3','4','7','8','10'] : userStoreAccess).map(s => (
                            <option key={s} value={s}>Loja {s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button onClick={() => setShowResetModal(true)} className="text-xs text-green-700 underline hover:text-green-900 transition-colors flex items-center gap-1"><Copy className="w-3 h-3"/> Preencher c/ Sistema</button>
                </div>
                <div className="p-4 bg-gray-50">
                  <input type="text" placeholder="Buscar por referência, marca, tipo ou cor..." className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-green-400 focus:outline-none transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                </div>
                <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                     <thead className="text-xs text-gray-700 uppercase bg-gradient-to-r from-gray-50 to-green-50 border-b-2 border-green-200">
                         <tr><th className="px-4 py-3">Ref</th>{sizeColumns.map(s => <th key={s} className="px-2 py-3 text-center">{s}</th>)}<th className="px-4 py-3 text-right">Total</th></tr>
                     </thead>
                     <tbody>
                         {filteredAuditData.map(item => (
                             <tr key={item.id} className="border-b hover:bg-green-50/30 transition-colors">
                                 <td className="px-4 py-3 font-medium">{item.REFERENCIA}</td>
                                 {sizeColumns.map(s => (<td key={s} className="px-1 py-2 text-center"><input type="number" className="w-10 border border-gray-300 text-center rounded focus:ring-2 focus:ring-green-400 focus:outline-none" value={item.sizes[s]} onChange={e => handleAuditChange(item.id, s, e.target.value)}/></td>))}
                                 <td className="px-4 py-3 text-right font-bold text-green-800">{item.QTDE}</td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
             </div>

              {/* === DIVERGENCIAS === */}
              <div className="mt-10 pt-8 border-t-4 border-dashed border-red-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-red-100 p-2 rounded-xl"><AlertTriangle className="w-5 h-5 text-red-500"/></div>
                  <div>
                    <h2 className="font-bold text-red-700 text-lg">Relatório de Divergências</h2>
                    <p className="text-xs text-gray-500">Diferenças entre estoque no sistema e contagem física</p>
                  </div>
                </div>
             <div className="max-w-4xl mx-auto space-y-6">
                 <div className="bg-white p-6 rounded-2xl border shadow-lg">
                     <h2 className="font-bold text-gray-800 mb-4 text-xl flex items-center gap-2"><AlertTriangle className="w-6 h-6 text-red-500"/> Relatório de Divergências</h2>
                     <div className="grid grid-cols-2 gap-4 mb-6">
                         <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl text-red-800 border border-red-200 font-bold shadow-sm"><div className="text-3xl">{exits.length}</div><div className="text-sm opacity-80">Baixas</div></div>
                         <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl text-green-800 border border-green-200 font-bold shadow-sm"><div className="text-3xl">{entries.length}</div><div className="text-sm opacity-80">Entradas</div></div>
                     </div>
                     {differences.length === 0 ? (
                       <div className="text-center py-12"><CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4"/><p className="text-gray-500 text-lg font-medium">Estoque Perfeito!</p></div>
                     ) : (
                        <div className="space-y-4">
                            <GroupedDifferenceTable items={exits} title="Pendentes - Baixas (Saídas)" icon={ArrowDownCircle} colorClass="border-red-200" bgClass="bg-red-50 text-red-800" isExit={true}/>
                            <GroupedDifferenceTable items={entries} title="Pendentes - Entradas (Sobras)" icon={ArrowUpCircle} colorClass="border-green-200" bgClass="bg-green-50 text-green-800" isExit={false}/>
                        </div>
                     )}
                 </div>
             </div>
              </div>

          </div>
        )}
        {/* ABA 3: DASHBOARD */}
        {activeTab === 'dashboard' && (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="font-bold text-gray-800 text-xl flex items-center gap-2"><BarChart3 className="w-6 h-6 text-purple-600"/> Dashboard</h2>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setPrintMode(true); setTimeout(() => { window.print(); setPrintMode(false); }, 300); }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600 transition-all no-print">
                          <Printer className="w-4 h-4"/> Imprimir
                        </button>
                        <button
                          onClick={() => setShowDashboardFilters(!showDashboardFilters)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                            showDashboardFilters || dashboardSizeFilter || dashboardCategoryFilter
                              ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                          }`}
                        >
                          <Filter className="w-4 h-4"/>
                          Filtros
                          {(dashboardSizeFilter || dashboardCategoryFilter) && (
                            <span className="bg-white/30 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                              {[dashboardSizeFilter, dashboardCategoryFilter].filter(Boolean).length}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* PAINEL DE FILTROS GLOBAL */}
                    {showDashboardFilters && (
                      <div className="mb-6 p-5 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 shadow-inner">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-purple-800 flex items-center gap-2"><SlidersHorizontal className="w-4 h-4"/> Filtrar Estoque</h3>
                          {(dashboardSizeFilter || dashboardCategoryFilter) && (
                            <button
                              onClick={() => { setDashboardSizeFilter(''); setDashboardCategoryFilter(''); }}
                              className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 font-medium"
                            >
                              <X className="w-3 h-3"/> Limpar filtros
                            </button>
                          )}
                        </div>

                        {/* Filtro por categoria */}
                        <div className="mb-4">
                          <div className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-2">Modelo / Categoria</div>
                          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                            <button
                              onClick={() => setDashboardCategoryFilter('')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                !dashboardCategoryFilter
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                              }`}
                            >
                              Todos
                            </button>
                            {dashboardStats.sortedCategories.map(([cat, data]) => (
                              <button
                                key={cat}
                                onClick={() => setDashboardCategoryFilter(dashboardCategoryFilter === cat ? '' : cat)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${
                                  dashboardCategoryFilter === cat
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                                }`}
                              >
                                {cat}
                                <span className={`text-xs px-1 rounded ${dashboardCategoryFilter === cat ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                  {data.total}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Filtro por tamanho */}
                        <div className="mb-4">
                          <div className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-2">Tamanho</div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setDashboardSizeFilter('')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                !dashboardSizeFilter
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                              }`}
                            >
                              Todos
                            </button>
                            {allAvailableSizes.map(size => (
                              <button
                                key={size}
                                onClick={() => setDashboardSizeFilter(dashboardSizeFilter === size ? '' : size)}
                                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border min-w-[44px] ${
                                  dashboardSizeFilter === size
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                                }`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Resultados dos filtros */}
                        {(dashboardSizeFilter || dashboardCategoryFilter) && (
                          <div className="mt-5 border-t border-purple-200 pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-bold text-purple-900 text-sm flex items-center gap-2">
                                <Search className="w-4 h-4"/>
                                {dashboardFilteredItems.length} modelo{dashboardFilteredItems.length !== 1 ? 's' : ''} encontrado{dashboardFilteredItems.length !== 1 ? 's' : ''}
                                {dashboardSizeFilter && <span className="bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full text-xs">Tam. {dashboardSizeFilter}</span>}
                                {dashboardCategoryFilter && <span className="bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full text-xs">{dashboardCategoryFilter}</span>}
                              </h4>
                              <span className="text-xs text-purple-600 font-bold">
                                {dashboardSizeFilter
                                  ? dashboardFilteredItems.reduce((acc, i) => acc + (parseInt(i.sizes[dashboardSizeFilter]) || 0), 0)
                                  : dashboardFilteredItems.reduce((acc, i) => acc + calculateTotal(i.sizes), 0)} peças
                              </span>
                            </div>
                            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                              {dashboardFilteredItems.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                  <Package className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                                  <p className="text-sm">Nenhum item encontrado com estes filtros</p>
                                </div>
                              ) : dashboardFilteredItems.map(item => {
                                const sizesInStock = sizeColumns.filter(s => (parseInt(item.sizes[s]) || 0) > 0);
                                const total = dashboardSizeFilter
                                  ? (parseInt(item.sizes[dashboardSizeFilter]) || 0)
                                  : calculateTotal(item.sizes);
                                return (
                                  <div key={item.id} className="bg-white rounded-xl border border-purple-100 p-3 hover:shadow-md hover:border-purple-300 transition-all">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div>
                                        <div className="font-bold text-gray-900 text-sm">{item.TIPODESC}</div>
                                        <div className="text-xs text-purple-700 font-mono">{item.REFERENCIA}</div>
                                        <div className="text-xs text-gray-500">{item.MARCADESC}{item.COR1DESC ? ` · ${item.COR1DESC}` : ''}</div>
                                      </div>
                                      <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                        total === 1 ? 'bg-orange-100 text-orange-700' :
                                        total >= 5 ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {total} {total === 1 ? 'peça' : 'peças'}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {sizesInStock.map(s => (
                                        <span key={s} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border ${
                                          s === dashboardSizeFilter
                                            ? 'bg-purple-600 text-white border-purple-600'
                                            : 'bg-white text-indigo-700 border-indigo-200'
                                        }`}>
                                          {s} <span className="text-indigo-400 font-normal">×{item.sizes[s]}</span>
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* STATS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 shadow-sm"><div className="text-xs text-blue-600 font-bold uppercase">Total de Itens</div><div className="text-3xl font-bold text-blue-900 mt-1">{dashboardStats.totalItems}</div></div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200 shadow-sm"><div className="text-xs text-purple-600 font-bold uppercase">Total de Peças</div><div className="text-3xl font-bold text-purple-900 mt-1">{dashboardStats.totalPieces}</div></div>
                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200 shadow-sm"><div className="text-xs text-indigo-600 font-bold uppercase">Média por Item</div><div className="text-3xl font-bold text-indigo-900 mt-1">{dashboardStats.avgPiecesPerItem}</div></div>
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200 shadow-sm"><div className="text-xs text-gray-600 font-bold uppercase">Estoque Zero</div><div className="text-3xl font-bold text-gray-700 mt-1">{dashboardStats.zeroStock}</div></div>
                    </div>
                    
                    {/* DISTRIBUIÇÃO DE ESTOQUE — clicável */}
                    <div className="mb-8">
                       <div className="flex items-center justify-between mb-4">
                         <h3 className="font-bold text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-600"/> Distribuição de Estoque</h3>
                         <span className="text-xs text-gray-400 flex items-center gap-1"><ChevronRight className="w-3 h-3"/> Clique para detalhar</span>
                       </div>
                       <div className="space-y-4">
                         {dashboardStats.sortedCategories.map(([cat, data]) => {
                            const max = dashboardStats.sortedCategories.length > 0 ? dashboardStats.sortedCategories[0][1].total : 1;
                            const pct = (data.total / max) * 100;
                            return (
                                <div
                                  key={cat}
                                  className="cursor-pointer group"
                                  onClick={() => setSelectedCategory(cat)}
                                >
                                    <div className="flex justify-between text-sm font-medium mb-1.5">
                                      <span className="text-gray-700 group-hover:text-indigo-700 transition-colors flex items-center gap-1.5">
                                        {cat}
                                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0 text-indigo-500"/>
                                      </span>
                                      <span className="text-indigo-700 font-bold">{data.total} peças</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden shadow-sm group-hover:bg-indigo-100 transition-colors">
                                      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-500 group-hover:from-indigo-600 group-hover:to-purple-700" style={{ width: `${pct}%` }}></div>
                                    </div>
                                </div>
                            );
                         })}
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200 shadow-sm">
                            <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2"><AlertOctagon className="w-4 h-4"/> Últimas Peças (1un)</h3>
                            <div className="max-h-64 overflow-y-auto">
                                {dashboardStats.lastPieces.map(i => (
                                    <div key={i.id} className="text-sm border-b border-orange-200 py-2 flex justify-between hover:bg-orange-50 transition-colors">
                                        <span className="font-medium">{i.REFERENCIA}</span>
                                        <span className="font-bold text-orange-700">TAM {sizeColumns.find(s => i.sizes[s] > 0)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 shadow-sm">
                             <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2"><Package className="w-4 h-4"/> Estoque Pesado</h3>
                             <div className="max-h-64 overflow-y-auto">
                                {heavyStockToDisplay.map(i => (
                                    <div key={i.id} className="text-sm border-b border-blue-200 py-2 flex justify-between hover:bg-blue-50 transition-colors">
                                        <span className="font-medium">{i.REFERENCIA}</span>
                                        <span className="font-bold text-blue-700">{i.QTDE} un</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'marketing' && (
            <div className="space-y-6">
                 <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
                      <div className="flex justify-between items-center mb-4">
                          <h2 className="font-bold text-pink-700 flex items-center gap-2 text-xl"><Share2 className="w-6 h-6"/> Marketing / Divulgação</h2>
                          <div className="flex items-center gap-2">
                            <button onClick={() => { setPrintMode(true); setTimeout(() => { window.print(); setPrintMode(false); }, 300); }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border bg-white text-gray-600 border-gray-200 hover:border-pink-300 hover:text-pink-600 transition-all no-print">
                              <Printer className="w-4 h-4"/> Imprimir
                            </button>
                            <div className="text-xs space-x-2">
                              <button onClick={() => setMarketingSort('recent')} className={`px-3 py-1.5 rounded-lg transition-all ${marketingSort === 'recent' ? 'bg-pink-100 text-pink-800 font-bold shadow-sm' : 'bg-gray-100 hover:bg-gray-200'}`}>Recentes</button>
                              <button onClick={() => setMarketingSort('no-photo')} className={`px-3 py-1.5 rounded-lg transition-all ${marketingSort === 'no-photo' ? 'bg-pink-100 text-pink-800 font-bold shadow-sm' : 'bg-gray-100 hover:bg-gray-200'}`}>Sem Foto</button>
                              <button onClick={() => setMarketingSort('to-post')} className={`px-3 py-1.5 rounded-lg transition-all ${marketingSort === 'to-post' ? 'bg-pink-100 text-pink-800 font-bold shadow-sm' : 'bg-gray-100 hover:bg-gray-200'}`}>Postar</button>
                            </div>
                          </div>
                      </div>
                      <input type="text" placeholder="Filtrar..." className="w-full border border-gray-300 p-2.5 rounded-lg mb-4 focus:ring-2 focus:ring-pink-400 focus:outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                      <div className="space-y-4">
                          {marketingItems.map(item => {
                              const key = getItemKey(item);
                              const isDisc = marketingStatus[key]?.discontinued;
                              return (
                                  <div key={key} className={`border rounded-xl p-4 flex flex-col md:flex-row justify-between gap-4 transition-all hover:shadow-md ${isDisc ? 'opacity-50 bg-gray-50' : 'bg-white'}`}>
                                      <div>
                                          <div className="font-bold text-lg">{item.TIPODESC} <span className="text-gray-500 font-normal text-sm">{item.REFERENCIA}</span></div>
                                          <div className="text-sm text-gray-600 mt-1">{item.MARCADESC} - {item.COR1DESC}</div>
                                          <div className="text-xs mt-2 font-mono bg-gray-100 inline-block px-2 py-1 rounded">Grade: {sizeColumns.filter(s => item.sizes[s] > 0).join(', ')}</div>
                                      </div>
                                      <div className="flex gap-2">
                                          <button onClick={() => toggleMarketing(key, 'photo')} className={`p-2.5 rounded-lg border text-xs flex flex-col items-center w-20 transition-all ${marketingStatus[key]?.photo ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm' : 'border-gray-300 hover:bg-gray-50'}`}><Camera className="w-4 h-4 mb-1"/> {marketingStatus[key]?.photo ? 'Foto OK' : 'Sem Foto'}</button>
                                          <button onClick={() => toggleMarketing(key, 'catalog')} className={`p-2.5 rounded-lg border text-xs flex flex-col items-center w-20 transition-all ${marketingStatus[key]?.catalog ? 'bg-green-50 border-green-300 text-green-700 shadow-sm' : 'border-gray-300 hover:bg-gray-50'}`}><Smartphone className="w-4 h-4 mb-1"/> {marketingStatus[key]?.catalog ? 'Catálogo' : 'Add Whats'}</button>
                                          <button onClick={() => toggleMarketing(key, 'posted')} className={`p-2.5 rounded-lg border text-xs flex flex-col items-center w-20 transition-all ${marketingStatus[key]?.posted ? 'bg-pink-50 border-pink-300 text-pink-700 shadow-sm' : 'border-gray-300 hover:bg-gray-50'}`}><Instagram className="w-4 h-4 mb-1"/> {marketingStatus[key]?.posted ? 'Postado' : 'Postar'}</button>
                                          <button onClick={() => toggleMarketing(key, 'discontinued')} className="text-gray-400 hover:text-gray-600 ml-2 transition-colors" title="Fora de Linha"><Archive className="w-4 h-4"/></button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                 </div>
            </div>
        )}

        {activeTab === 'viability' && renderViabilityTab()}
        {activeTab === 'goals' && renderGoalsTab()}
        {activeTab === 'hr' && renderHrTab()}

      </main>
    </div>
  );
};

export default App;
