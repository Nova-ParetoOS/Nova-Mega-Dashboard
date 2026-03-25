import React, { useState } from 'react';
import { Package, Upload, Search, CheckCircle, Copy, RefreshCw, AlertTriangle, ArrowDownCircle, ArrowUpCircle, BarChart3, Printer, Filter, SlidersHorizontal, X, TrendingUp, ChevronRight, AlertOctagon } from 'lucide-react';

export default function Estoque(props) {
  const {
    selectedStore, setSelectedStore, STORE_CONFIGS,
    systemData, storeAuditData, sizeColumns,
    _seedAudit, isCompleted, setShowImportModal,

    // Search states for audit
    searchTerm, setSearchTerm, filteredStoreSystemData,
    localAuditSearch, setLocalAuditSearch, filteredStoreAuditData, handleAuditChange,

    // Dashboard (now Estoque) vars
    printMode, setPrintMode, showDashboardFilters, setShowDashboardFilters,
    dashboardSizeFilter, setDashboardSizeFilter, dashboardCategoryFilter, setDashboardCategoryFilter,
    dashboardStore, setDashboardStore, dashboardStats, allAvailableSizes, dashboardFilteredItems,
    calculateTotal, setSelectedCategory, heavyStockToDisplay
  } = props;

  const storeOptions = Object.keys(STORE_CONFIGS);

  // ── Zerar Estoque: copia lista do ERP da loja atual com qty=0 ──────
  const handleZerarEstoque = async () => {
    if (!window.confirm(`Isso vai zerar as contagens físicas da ${STORE_CONFIGS[selectedStore]?.name}. Ideal para contagem cega. Confirmar?`)) return;
    const storeItems = systemData.filter(i => String(i.store_id || i.storeId) === String(selectedStore));
    const uniqueStoreItems = Array.from(new Map(storeItems.map(i => [i.REFERENCIA, i])).values());
    const zeroed = uniqueStoreItems.map(item => {
      const z = {};
      sizeColumns.forEach(s => { z[s] = 0; });
      return { ...item, sizes: z, QTDE: 0 };
    });
    await _seedAudit(selectedStore, zeroed);
  };

  const handlePreencherComSistema = async () => {
    const storeItems = systemData.filter(i => String(i.store_id || i.storeId) === String(selectedStore));
    const uniqueStoreItems = Array.from(new Map(storeItems.map(i => [i.REFERENCIA, i])).values());
    await _seedAudit(selectedStore, uniqueStoreItems);
  };

  // ── Divergências isoladas por tamanho ────────────────
  const localStoreSystemData = systemData.filter(s => String(s.store_id || s.storeId) === String(selectedStore));
  const divergences = localStoreSystemData.map(sys => {
    const audit = storeAuditData.find(a => String(a.id) === String(sys.id));
    if (!audit) return null;
    const baixasSizes = {};
    const entradasSizes = {};
    let hasBaixa = false, hasEntrada = false;
    sizeColumns.forEach(s => {
      const sysQ = parseInt(sys.sizes[s]) || 0;
      const audQ = parseInt(audit.sizes[s]) || 0;
      if (sysQ > audQ) { baixasSizes[s] = audQ - sysQ; hasBaixa = true; }
      if (audQ > sysQ) { entradasSizes[s] = audQ - sysQ; hasEntrada = true; }
    });
    if (!hasBaixa && !hasEntrada) return null;
    return { ...sys, baixasSizes, entradasSizes, hasBaixa, hasEntrada };
  }).filter(Boolean);

  const exitItems = divergences.filter(d => d.hasBaixa && !isCompleted(d.id, selectedStore));
  const entryItems = divergences.filter(d => d.hasEntrada && !isCompleted(d.id, selectedStore));

  return (
    <div className="space-y-10">
      {/* ── SEÇÃO A: AUDITORIA ── */}
      <div className="space-y-5">
        {/* ── HEADER / SELETOR DE LOJA ── */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-2xl p-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2.5 rounded-xl"><Package className="w-5 h-5 text-white" /></div>
              <div>
                <div className="text-white font-bold text-lg">Auditoria de Estoque</div>
                <div className="text-indigo-300 text-xs">Gestão unificada · ERP + Contagem física + Divergências</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {storeOptions.map(s => (
                <button key={s} onClick={() => setSelectedStore(s)}
                  className={'px-4 py-2 rounded-xl text-sm font-bold transition-all ' +
                    (selectedStore === s
                      ? 'bg-white text-indigo-900 shadow-lg scale-105'
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/20')}>
                  {STORE_CONFIGS[s]?.name || 'Loja ' + s}
                </button>
              ))}
              <button onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all">
                <Upload className="w-4 h-4" /> Importar ERP
              </button>
            </div>
          </div>
        </div>

        {/* ── SEÇÃO 1: ESTOQUE NO SISTEMA (ERP / VOLÁTIL) ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
          <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-1.5 rounded-lg"><Package className="w-4 h-4 text-blue-600" /></div>
              <div>
                <h3 className="font-bold text-blue-800 text-sm">Estoque no Sistema (ERP)</h3>
                <p className="text-xs text-blue-400">Volátil — cada importação substitui os dados anteriores</p>
              </div>
            </div>
            <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-bold">{systemData.length} itens</span>
          </div>
          <div className="p-3 bg-gray-50 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Filtrar por referência, marca, tipo ou cor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" />
            </div>
          </div>
          <div className="overflow-x-auto" style={{ maxHeight: 280, overflowY: 'auto' }}>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-600 uppercase bg-gradient-to-r from-gray-50 to-blue-50 border-b sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 font-bold">Ref / Marca</th>
                  {sizeColumns.map(s => <th key={s} className="px-2 py-2.5 text-center font-bold">{s}</th>)}
                  <th className="px-4 py-2.5 text-right font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredStoreSystemData.length === 0 && (
                  <tr><td colSpan={sizeColumns.length + 2} className="text-center py-8 text-gray-400 text-xs">Nenhum dado importado. Clique em "Importar ERP" para começar.</td></tr>
                )}
                {filteredStoreSystemData.map(item => (
                  <tr key={item.id} className="border-b hover:bg-blue-50/30 text-xs">
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-800">{item.REFERENCIA}</div>
                      <div className="text-gray-400">{item.MARCADESC}</div>
                    </td>
                    {sizeColumns.map(s => (
                      <td key={s} className={'text-center px-2 ' + ((parseInt(item.sizes[s]) || 0) > 0 ? 'font-bold text-blue-700' : 'text-gray-300')}>
                        {(parseInt(item.sizes[s]) || 0) > 0 ? item.sizes[s] : '—'}
                      </td>
                    ))}
                    <td className="text-right px-4 font-bold text-blue-800">{item.QTDE}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SEÇÃO 2: CONTAGEM FÍSICA (PERSISTENTE) ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
          <div className="p-4 border-b bg-gradient-to-r from-green-50 to-emerald-50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="bg-green-100 p-1.5 rounded-lg"><CheckCircle className="w-4 h-4 text-green-600" /></div>
              <div>
                <h3 className="font-bold text-green-800 text-sm">Contagem Física (Auditoria)</h3>
                <p className="text-xs text-green-400">Persistente — não é afetada pela importação do ERP</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handlePreencherComSistema()}
                className="flex items-center gap-1.5 text-xs border border-green-300 text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-lg font-medium transition-colors">
                <Copy className="w-3 h-3" /> Preencher c/ Sistema
              </button>
              <button onClick={() => handleZerarEstoque()}
                className="flex items-center gap-1.5 text-xs border border-orange-300 text-orange-700 hover:bg-orange-50 px-3 py-1.5 rounded-lg font-medium transition-colors">
                <RefreshCw className="w-3 h-3" /> Zerar Estoque
              </button>
            </div>
          </div>
          <div className="p-3 bg-gray-50 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar por referência, marca, tipo ou cor..." value={localAuditSearch} onChange={e => setLocalAuditSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:outline-none" />
            </div>
          </div>
          <div className="overflow-x-auto" style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-600 uppercase bg-gradient-to-r from-gray-50 to-green-50 border-b sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 font-bold">Ref / Marca</th>
                  {sizeColumns.map(s => <th key={s} className="px-2 py-2.5 text-center font-bold">{s}</th>)}
                  <th className="px-4 py-2.5 text-right font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredStoreAuditData.length === 0 && (
                  <tr><td colSpan={sizeColumns.length + 2} className="text-center py-8 text-gray-400 text-xs">
                    Sem dados. Use "Zerar Estoque" para contagem cega ou "Preencher c/ Sistema" para partir do ERP.
                  </td></tr>
                )}
                {filteredStoreAuditData.map(item => (
                  <tr key={item.id || item.REFERENCIA} className="border-b hover:bg-green-50/30 text-xs">
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-800">{item.REFERENCIA}</div>
                      <div className="text-gray-400">{item.MARCADESC}</div>
                    </td>
                    {sizeColumns.map(s => (
                      <td key={s} className="px-1 py-1.5 text-center">
                        <input type="number" min="0" placeholder="—"
                          id={`audit-${item.id}-${s}`}
                          name={`audit-${item.id}-${s}`}
                          autoComplete="off"
                          className={'w-10 border text-center rounded text-xs py-1 focus:ring-2 focus:ring-green-400 focus:outline-none ' +
                            ((parseInt(item.sizes[s]) || 0) > 0
                              ? 'border-green-300 bg-green-50 font-bold text-green-800'
                              : 'border-gray-200 text-gray-400')}
                          value={item.sizes[s] || ''}
                          onChange={e => handleAuditChange(item.id, s, e.target.value)} />
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right font-bold text-green-800">{item.QTDE || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SEÇÃO 3: RELATÓRIO DE DIVERGÊNCIAS (ISOLADAS) ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b bg-gradient-to-r from-red-50 to-orange-50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="bg-red-100 p-1.5 rounded-lg"><AlertTriangle className="w-4 h-4 text-red-600" /></div>
              <div>
                <h3 className="font-bold text-red-800 text-sm">Relatório de Divergências</h3>
                <p className="text-xs text-red-400">Cada tamanho avaliado isoladamente — sem compensação cruzada</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-center bg-red-100 rounded-xl px-3 py-1.5">
                <div className="text-xl font-black text-red-700">{exitItems.length}</div>
                <div className="text-xs text-red-500 font-medium">Baixas</div>
              </div>
              <div className="text-center bg-green-100 rounded-xl px-3 py-1.5">
                <div className="text-xl font-black text-green-700">{entryItems.length}</div>
                <div className="text-xs text-green-500 font-medium">Entradas</div>
              </div>
            </div>
          </div>
          <div className="p-4">
            {exitItems.length === 0 && entryItems.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Sem divergências! Estoque conferido.</p>
                <p className="text-xs text-gray-400 mt-1">ERP e Contagem Física estão alinhados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* BAIXAS (Sistema > Auditoria) */}
                <div className="border border-red-200 rounded-xl overflow-hidden">
                  <div className="bg-red-50 px-4 py-2.5 flex items-center gap-2 border-b border-red-200">
                    <ArrowDownCircle className="w-4 h-4 text-red-600" />
                    <span className="font-bold text-red-800 text-sm">Baixas — Sistema maior</span>
                    <span className="ml-auto text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-bold">{exitItems.length}</span>
                  </div>
                  <div className="divide-y divide-red-50 max-h-96 overflow-y-auto">
                    {exitItems.length === 0
                      ? <div className="py-6 text-center text-xs text-gray-400">Nenhuma baixa</div>
                      : exitItems.map(item => (
                        <div key={item.id} className="px-4 py-2.5 hover:bg-red-50/50">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-semibold text-sm text-gray-800">{item.REFERENCIA}</span>
                            {item.COR1DESC && <span className="text-xs text-gray-400">{item.COR1DESC}</span>}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(item.baixasSizes).map(([s, diff]) => (
                              <span key={s} className="text-xs bg-red-100 border border-red-200 px-2 py-0.5 rounded-md font-bold text-red-700">
                                {s}: {diff}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>

                {/* ENTRADAS (Auditoria > Sistema) */}
                <div className="border border-green-200 rounded-xl overflow-hidden">
                  <div className="bg-green-50 px-4 py-2.5 flex items-center gap-2 border-b border-green-200">
                    <ArrowUpCircle className="w-4 h-4 text-green-600" />
                    <span className="font-bold text-green-800 text-sm">Entradas — Auditoria maior</span>
                    <span className="ml-auto text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-bold">{entryItems.length}</span>
                  </div>
                  <div className="divide-y divide-green-50 max-h-96 overflow-y-auto">
                    {entryItems.length === 0
                      ? <div className="py-6 text-center text-xs text-gray-400">Nenhuma entrada</div>
                      : entryItems.map(item => (
                        <div key={item.id} className="px-4 py-2.5 hover:bg-green-50/50">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-semibold text-sm text-gray-800">{item.REFERENCIA}</span>
                            {item.COR1DESC && <span className="text-xs text-gray-400">{item.COR1DESC}</span>}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(item.entradasSizes).map(([s, diff]) => (
                              <span key={s} className="text-xs bg-green-100 border border-green-200 px-2 py-0.5 rounded-md font-bold text-green-700">
                                {s}: +{diff}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SEÇÃO B: VISÕES DE ESTOQUE GLOBAL E FILTROS ── */}
      <div className="space-y-6 border-t-[3px] border-indigo-100 pt-10">
        <div className="bg-white p-6 rounded-2xl border shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 text-xl flex items-center gap-2"><BarChart3 className="w-6 h-6 text-purple-600" /> Visões de Estoque e Modelos</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => { setPrintMode(true); setTimeout(() => { window.print(); setPrintMode(false); }, 300); }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600 transition-all no-print">
                <Printer className="w-4 h-4" /> Imprimir
              </button>
              <button
                onClick={() => setShowDashboardFilters(!showDashboardFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${showDashboardFilters || dashboardSizeFilter || dashboardCategoryFilter
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                  }`}
              >
                <Filter className="w-4 h-4" />
                Filtros
                {(dashboardSizeFilter || dashboardCategoryFilter) && (
                  <span className="bg-white/30 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                    {[dashboardSizeFilter, dashboardCategoryFilter].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* SELETOR DE LOJA — fonte: Auditoria de Estoque */}
          <div className="mb-6 flex flex-wrap items-center gap-2 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-100">
            <div className="flex items-center gap-2 mr-1">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Visualizando:</span>
            </div>
            <button
              onClick={() => { setDashboardStore('all'); setDashboardSizeFilter(''); setDashboardCategoryFilter(''); }}
              className={'px-3 py-2 rounded-xl text-sm font-bold transition-all border ' +
                (dashboardStore === 'all'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md scale-105'
                  : 'bg-white text-purple-600 border-purple-200 hover:border-purple-400 hover:bg-purple-50')}>
              🏪 Todas
            </button>
            {Object.entries(STORE_CONFIGS).map(([k, v]) => (
              <button key={k}
                onClick={() => { setDashboardStore(k); setDashboardSizeFilter(''); setDashboardCategoryFilter(''); }}
                className={'px-3 py-2 rounded-xl text-sm font-bold transition-all border ' +
                  (dashboardStore === k
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md scale-105'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600')}>
                {v.name}
              </button>
            ))}
            <span className="ml-auto text-xs text-purple-400 italic hidden md:block">
              Fonte: Auditoria (contagem física)
            </span>
          </div>

          {/* PAINEL DE FILTROS GLOBAL */}
          {showDashboardFilters && (
            <div className="mb-6 p-5 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 shadow-inner">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-purple-800 flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> Filtrar Estoque</h3>
                {(dashboardSizeFilter || dashboardCategoryFilter) && (
                  <button
                    onClick={() => { setDashboardSizeFilter(''); setDashboardCategoryFilter(''); }}
                    className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 font-medium"
                  >
                    <X className="w-3 h-3" /> Limpar filtros
                  </button>
                )}
              </div>

              {/* Filtro por categoria */}
              <div className="mb-4">
                <div className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-2">Modelo / Categoria</div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  <button
                    onClick={() => setDashboardCategoryFilter('')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${!dashboardCategoryFilter
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                      }`}
                  >
                    Todos
                  </button>
                  {dashboardStats?.sortedCategories?.map(([cat, data]) => (
                    <button
                      key={cat}
                      onClick={() => setDashboardCategoryFilter(dashboardCategoryFilter === cat ? '' : cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${dashboardCategoryFilter === cat
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                        }`}
                    >
                      {cat}
                      <span className={`text-xs px-1 rounded ${dashboardCategoryFilter === cat ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {Number(data.total) || 0}
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${!dashboardSizeFilter
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                      }`}
                  >
                    Todos
                  </button>
                  {allAvailableSizes?.map(size => (
                    <button
                      key={size}
                      onClick={() => setDashboardSizeFilter(dashboardSizeFilter === size ? '' : size)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border min-w-[44px] ${dashboardSizeFilter === size
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
                      <Search className="w-4 h-4" />
                      {dashboardFilteredItems?.length || 0} modelo{(dashboardFilteredItems?.length !== 1) ? 's' : ''} encontrado{(dashboardFilteredItems?.length !== 1) ? 's' : ''}
                      {dashboardSizeFilter && <span className="bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full text-xs">Tam. {dashboardSizeFilter}</span>}
                      {dashboardCategoryFilter && <span className="bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full text-xs">{dashboardCategoryFilter}</span>}
                    </h4>
                    <span className="text-xs text-purple-600 font-bold">
                      {dashboardFilteredItems?.reduce((acc, i) => acc + calculateTotal(i.sizes), 0) || 0} peças
                    </span>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {!dashboardFilteredItems || dashboardFilteredItems.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Nenhum item encontrado com estes filtros</p>
                      </div>
                    ) : dashboardFilteredItems.map(item => {
                      const sizesInStock = sizeColumns.filter(s => (parseInt(item.sizes[s]) || 0) > 0);
                      const total = calculateTotal(item.sizes);
                      return (
                        <div key={item.id} className="bg-white rounded-xl border border-purple-100 p-3 hover:shadow-md hover:border-purple-300 transition-all">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="font-bold text-gray-900 text-sm">{item.TIPODESC}</div>
                              <div className="text-xs text-purple-700 font-mono">{item.REFERENCIA}</div>
                              <div className="text-xs text-gray-500">{item.MARCADESC}{item.COR1DESC ? ` · ${item.COR1DESC}` : ''}</div>
                            </div>
                            <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold ${total === 1 ? 'bg-orange-100 text-orange-700' :
                              total >= 5 ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                              {total} {total === 1 ? 'peça' : 'peças'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {sizesInStock.map(s => (
                              <span key={s} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border ${s === dashboardSizeFilter
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

          {/* DISTRIBUIÇÃO DE ESTOQUE — clicável */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-600" /> Distribuição de Estoque</h3>
              <span className="text-xs text-gray-400 flex items-center gap-1"><ChevronRight className="w-3 h-3" /> Clique para detalhar</span>
            </div>
            <div className="space-y-4">
              {dashboardStats?.sortedCategories?.map(([cat, data]) => {
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
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0 text-indigo-500" />
                      </span>
                      <span className="text-indigo-700 font-bold">{Number(data.total) || 0} peças</span>
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
              <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2"><AlertOctagon className="w-4 h-4" /> Últimas Peças (1un)</h3>
              <div className="max-h-64 overflow-y-auto thin-scrollbar pr-1">
                {dashboardStats?.lastPieces?.map(i => (
                  <div key={i.id} className="text-sm border-b border-orange-200 py-2 flex justify-between hover:bg-orange-50 transition-colors">
                    <span className="font-medium">{i.REFERENCIA}</span>
                    <span className="font-bold text-orange-700">TAM {sizeColumns.find(s => parseInt(i.sizes[s]) > 0)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 shadow-sm">
              <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2"><Package className="w-4 h-4" /> Estoque Pesado</h3>
              <div className="max-h-64 overflow-y-auto thin-scrollbar pr-1">
                {heavyStockToDisplay?.map(i => (
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
    </div>
  );
}
