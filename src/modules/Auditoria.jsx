import React, { useState, useEffect } from 'react';
import { Package, Upload, Search, CheckCircle, Copy, RefreshCw, AlertTriangle, ArrowDownCircle, ArrowUpCircle, Shield, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

// ── Modal de Segurança com countdown ──────────────────────────────
const SafetyModal = ({ onConfirm, onCancel, title, message, countdownSec = 5 }) => {
  const [countdown, setCountdown] = useState(countdownSec);
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-red-200">
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 flex items-center gap-3">
          <Shield className="w-5 h-5" />
          <h3 className="font-bold text-base">{title}</h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
          {/* Progress bar — fills as countdown decreases */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: countdownSec, ease: "linear" }}
              className="h-full bg-red-500 rounded-full"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-bold hover:bg-gray-50 transition-all text-sm">
              Cancelar
            </button>
            <button
              disabled={countdown > 0}
              onClick={onConfirm}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${countdown > 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                }`}>
              {countdown > 0 ? (<><Clock className="w-3.5 h-3.5" /> Aguarde {countdown}s</>) : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export function Auditoria({
  STORE_CONFIGS,
  selectedStore,
  setSelectedStore,
  systemData,
  auditData,
  sizeColumns,
  isCompleted,
  _seedAudit,
  setShowImportModal,
  searchTerm,
  setSearchTerm,
  filteredStoreSystemData,
  filteredStoreAuditData,
  setShowResetModal,
  handleAuditChange,
  _updateAuditItem
}) {
  const storeOptions = Object.keys(STORE_CONFIGS);

  const [localAuditSearch, setLocalAuditSearch] = useState('');

  // ── Safety modal state ────────────────────────────────────────
  const [safetyModal, setSafetyModal] = useState(null); // null | { type: 'zerar' | 'preencher' }

  // ── Zerar Estoque: via seedAudit (delete-first) com qty=0 ──────
  const handleZerarEstoque = async () => {
    const storeItems = systemData.filter(i => String(i.store_id || i.storeId) === String(selectedStore));
    const uniqueItems = Array.from(new Map(storeItems.map(i => [i.REFERENCIA, i])).values());
    const zeroed = uniqueItems.map(item => {
      const z = {};
      sizeColumns.forEach(s => { z[s] = 0; });
      return { ...item, sizes: z, QTDE: 0 };
    });
    await _seedAudit(selectedStore, zeroed);
    setSafetyModal(null);
  };

  // ── Preencher c/ Sistema ──────────────────────────────────────
  const handlePreencherComSistema = async () => {
    const storeItems = systemData.filter(i => String(i.store_id || i.storeId) === String(selectedStore));
    const uniqueItems = Array.from(new Map(storeItems.map(i => [i.REFERENCIA, i])).values());
    await _seedAudit(selectedStore, uniqueItems);
    setSafetyModal(null);
  };

  // ── Divergências: filtradas estritamente pela loja de divergência ──────
  const { divergences, exitItems, entryItems } = React.useMemo(() => {
    const storeSystemData = systemData.filter(s => String(s.store_id || s.storeId) === String(selectedStore));
    const storeAuditData = auditData.filter(a => String(a.store_id || a.storeId) === String(selectedStore));
    
    // Deduplicate system data to prevent ghost duplicates from ERP affecting reports
    const uniqueSystemData = Array.from(new Map(storeSystemData.map(i => [i.REFERENCIA, i])).values());

    const divs = uniqueSystemData.map(sys => {
      // Find the corresponding audit count, specifically for this store
      const audit = storeAuditData.find(a => a.REFERENCIA === sys.REFERENCIA);
      if (!audit) return null;

      const baixasSizes = {};
      const entradasSizes = {};
      let hasBaixa = false, hasEntrada = false;

      sizeColumns.forEach(s => {
        const sysQ = parseInt(sys.sizes[s]) || 0;
        const audQ = parseInt(audit.sizes[s]) || 0;
        if (sysQ > audQ) { baixasSizes[s] = sysQ - audQ; hasBaixa = true; } // Bug fix: Baixa = Sys > Aud (sysQ - audQ)
        if (audQ > sysQ) { entradasSizes[s] = audQ - sysQ; hasEntrada = true; }
      });

      if (!hasBaixa && !hasEntrada) return null;
      return { ...sys, baixasSizes, entradasSizes, hasBaixa, hasEntrada };
    }).filter(Boolean);

    const exits = divs.filter(d => d.hasBaixa && !isCompleted(d.id, selectedStore));
    const entries = divs.filter(d => d.hasEntrada && !isCompleted(d.id, selectedStore));

    return { divergences: divs, exitItems: exits, entryItems: entries };
  }, [systemData, auditData, selectedStore, sizeColumns, isCompleted]);

  const localFilteredAuditData = React.useMemo(() => {
    const storeAudit = auditData.filter(a => String(a.store_id || a.storeId) === String(selectedStore));
    if (!localAuditSearch) return storeAudit;
    const lowerSearch = localAuditSearch.toLowerCase();
    return storeAudit.filter(i =>
      (i.REFERENCIA || "").toLowerCase().includes(lowerSearch) ||
      (i.TIPODESC || "").toLowerCase().includes(lowerSearch) ||
      (i.MARCADESC || "").toLowerCase().includes(lowerSearch) ||
      (i.COR1DESC || "").toLowerCase().includes(lowerSearch)
    );
  }, [auditData, selectedStore, localAuditSearch]);

  return (
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
            <input type="text" placeholder="Filtrar ERP local..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-blue-300 rounded-lg text-sm bg-blue-50/50 focus:bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none" />
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
            <button onClick={() => setSafetyModal({ type: 'preencher' })}
              className="flex items-center gap-1.5 text-xs border border-green-300 text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-lg font-medium transition-colors">
              <Copy className="w-3 h-3" /> Preencher c/ Sistema
            </button>
            <button onClick={() => setSafetyModal({ type: 'zerar' })}
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
              {localFilteredAuditData.length === 0 && (
                <tr><td colSpan={sizeColumns.length + 2} className="text-center py-8 text-gray-400 text-xs">
                  Sem dados. Use "Zerar Estoque" para contagem cega ou "Preencher c/ Sistema" para partir do ERP.
                </td></tr>
              )}
              {localFilteredAuditData.map(item => (
                <tr key={item.id} className="border-b hover:bg-green-50/30 text-xs">
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-800">{item.REFERENCIA}</div>
                    <div className="text-gray-400">{item.MARCADESC}</div>
                  </td>
                  {sizeColumns.map(s => (
                    <td key={s} className="px-1 py-1.5 text-center">
                      <input type="number" min="0" placeholder="—"
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
          <div className="flex gap-3 items-center">
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

      {/* ── Safety Modal ── */}
      {safetyModal && (
        <SafetyModal
          title={safetyModal.type === 'zerar' ? '⚠️ Zerar Estoque' : '📋 Preencher c/ Sistema'}
          message={
            safetyModal.type === 'zerar'
              ? `Isso limpará TODA a contagem manual da ${STORE_CONFIGS[selectedStore]?.name || 'loja selecionada'}. Esta ação é irreversível.`
              : `Isso substituirá suas contagens manuais pelos dados atuais do ERP para a ${STORE_CONFIGS[selectedStore]?.name || 'loja selecionada'}.`
          }
          onConfirm={safetyModal.type === 'zerar' ? handleZerarEstoque : handlePreencherComSistema}
          onCancel={() => setSafetyModal(null)}
        />
      )}

    </div>
  );

}
