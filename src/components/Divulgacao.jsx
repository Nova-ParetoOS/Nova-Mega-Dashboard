import React, { useState } from 'react';
import { Camera, Instagram, X, Target, Calendar, Share2, Printer, Archive, Package, RefreshCw, Smartphone, CheckCircle } from 'lucide-react';

export default function Divulgacao({
  marketingItems,
  queueItems,
  selectedStore,
  marketingStore,
  setMarketingStore,
  marketingSort,
  setMarketingSort,
  searchTerm,
  setSearchTerm,
  setPrintMode,
  STORE_CONFIGS,
  auditData,
  sizeColumns,
  getMktStatus,
  getItemKey,
  calculateTotal,
  getGDriveThumbnail,
  toggleMarketing,
  addToQueue,
  postFromQueue,
  removeFromQueue,
  _upsertMarketingFields,
  setPhotoModal
}) {
  const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
  const SEMANAS = ['Semana 01', 'Semana 02', 'Semana 03', 'Semana 04'];
  const FORMATOS_VERDE = ['WhatsApp', 'Transmissão'];
  const FORMATOS_ROSA = ['Storie', 'Reels', 'Feed'];
  const ALL_FORMATOS = [...FORMATOS_VERDE, ...FORMATOS_ROSA];

  // ==========================================
  // ESTADO DO MODAL DE AGENDAMENTO
  // ==========================================
  const [scheduleModal, setScheduleModal] = useState({ isOpen: false, item: null, week: '', day: '', formats: [] });

  const openScheduleModal = (item) => {
    const mStatus = getMktStatus(item);
    setScheduleModal({
      isOpen: true,
      item,
      week: mStatus.post_week || '',
      day: mStatus.post_day || '',
      formats: mStatus.post_type ? mStatus.post_type.split(', ').filter(Boolean) : []
    });
  };

  const toggleFormatInModal = (fmt) => {
    setScheduleModal(prev => ({
      ...prev,
      formats: prev.formats.includes(fmt) 
        ? prev.formats.filter(f => f !== fmt) 
        : [...prev.formats, fmt]
    }));
  };

  const confirmSchedule = () => {
    if (!scheduleModal.item) return;
    const { item, week, day, formats } = scheduleModal;
    const storeId = item.store_id || item.storeId || selectedStore;
    const key = getItemKey(item);
    
    // Salvar configurações
    _upsertMarketingFields(storeId, key, { 
      post_week: week, 
      post_day: day, 
      post_type: formats.join(', ') 
    });
    
    // Adicionar na fila visual se não estiver
    const mStatus = getMktStatus(item);
    if (!mStatus.in_queue) addToQueue(item);
    
    setScheduleModal({ isOpen: false, item: null, week: '', day: '', formats: [] });
  };

  // ==========================================
  // LÓGICA MANTIDA PARA COMPATIBILIDADE FUTURA
  // ==========================================
  const bySemana = {};
  const semSemana = [];
  queueItems.forEach(item => {
    const mStatus = getMktStatus(item);
    const semana = mStatus.post_week;
    if (semana && SEMANAS.includes(semana)) {
      if (!bySemana[semana]) bySemana[semana] = {};
      const dia = mStatus.post_day && DIAS.includes(mStatus.post_day) ? mStatus.post_day : '__sem_dia__';
      if (!bySemana[semana][dia]) bySemana[semana][dia] = [];
      bySemana[semana][dia].push(item);
    } else {
      semSemana.push(item);
    }
  });

  const toggleFormato = (item, fmt) => {
    const storeId = item.store_id || item.storeId || selectedStore;
    const key = getItemKey(item);
    const mStatus = getMktStatus(item);
    const current = mStatus.post_type ? mStatus.post_type.split(', ').filter(Boolean) : [];
    const next = current.includes(fmt)
      ? current.filter(f => f !== fmt)
      : [...current, fmt];
    _upsertMarketingFields(storeId, key, { post_type: next.join(', ') });
  };

  const renderQueueCard = (item) => {
    const key = getItemKey(item);
    const storeId = item.store_id || item.storeId || selectedStore;
    const mStatus = getMktStatus(item);
    const stockTotal = calculateTotal(item.sizes);
    const thumbUrl = getGDriveThumbnail(mStatus.photo_url);
    const activeFmts = mStatus.post_type ? mStatus.post_type.split(', ').filter(Boolean) : [];

    return (
      <div key={`queue-${key}`} className="bg-white rounded-xl border border-orange-100 p-3 shadow-sm hover:shadow-md transition-all flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="shrink-0 w-10 h-10 rounded-lg border border-gray-100 overflow-hidden flex items-center justify-center bg-gray-50">
            {thumbUrl
              ? <img src={thumbUrl} alt="produto" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
              : <Camera className="w-4 h-4 text-gray-300" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-xs text-gray-900 truncate">{item.TIPODESC}</div>
            <div className="text-[10px] text-gray-400 font-mono truncate">{item.REFERENCIA}</div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stockTotal > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {stockTotal}p
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          <select
            value={mStatus.post_week || ''}
            onChange={e => _upsertMarketingFields(storeId, key, { post_week: e.target.value })}
            className="flex-1 text-[9px] border border-gray-200 rounded-lg px-1 py-1 focus:ring-1 focus:ring-orange-300 focus:outline-none bg-white text-gray-600"
          >
            <option value="">-- Sem --</option>
            {SEMANAS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={mStatus.post_day || ''}
            onChange={e => _upsertMarketingFields(storeId, key, { post_day: e.target.value })}
            className="flex-1 text-[9px] border border-gray-200 rounded-lg px-1 py-1 focus:ring-1 focus:ring-orange-300 focus:outline-none bg-white text-gray-600"
          >
            <option value="">-- Dia --</option>
            {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap gap-1">
            {FORMATOS_VERDE.map(fmt => (
              <button key={fmt} type="button"
                onClick={() => toggleFormato(item, fmt)}
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all ${activeFmts.includes(fmt)
                  ? 'bg-green-500 border-green-500 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-400 hover:border-green-300 hover:text-green-600'
                  }`}>
                {fmt}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {FORMATOS_ROSA.map(fmt => (
              <button key={fmt} type="button"
                onClick={() => toggleFormato(item, fmt)}
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all ${activeFmts.includes(fmt)
                  ? 'bg-pink-500 border-pink-500 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-400 hover:border-pink-300 hover:text-pink-600'
                  }`}>
                {fmt}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1 pt-1 border-t border-gray-50">
          <button type="button"
            onClick={() => postFromQueue(item)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 transition-all"
          >
            <Instagram className="w-3 h-3" /> Postar
          </button>
          <button type="button"
            onClick={() => removeFromQueue(item)}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"
            title="Remover da fila"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
    <div className="flex flex-col md:flex-row gap-6 w-full items-start">
      
      {/* ─────────────────────────────────────────────────────────
          PAINEL ESQUERDO: CATÁLOGO DE PRODUTOS E FILTROS (40%)
      ───────────────────────────────────────────────────────── */}
      <div className="w-full md:w-[40%] bg-white p-6 rounded-2xl border border-gray-200 shadow-lg flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-pink-700 flex items-center gap-2 text-xl"><Share2 className="w-6 h-6" /> Catálogo</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => { setPrintMode(true); setTimeout(() => { window.print(); setPrintMode(false); }, 300); }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border bg-white text-gray-600 border-gray-200 hover:border-pink-300 hover:text-pink-600 transition-all no-print">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
          </div>
        </div>

        {/* SELETOR DE LOJA */}
        <div className="mb-5 flex flex-wrap items-center gap-2 p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl border border-pink-100">
          <button
            onClick={() => setMarketingStore('all')}
            className={'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ' +
              (marketingStore === 'all'
                ? 'bg-pink-600 text-white border-pink-600 shadow-sm scale-105'
                : 'bg-white text-pink-600 border-pink-200 hover:border-pink-400 hover:bg-pink-50')}>
            🏪 Todas
          </button>
          {Object.entries(STORE_CONFIGS).map(([k, v]) => (
            <button key={k}
              onClick={() => setMarketingStore(k)}
              className={'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ' +
                (marketingStore === k
                  ? 'bg-pink-600 text-white border-pink-600 shadow-sm scale-105'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-pink-300 hover:text-pink-600')}>
              {v.name}
            </button>
          ))}
        </div>

        {/* FILTROS DE VIEW */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { id: 'recent', label: 'Recentes' },
            { id: 'no-photo', label: 'Sem Foto' },
            { id: 'to-post', label: 'Postar' },
            { id: 'archived', label: '🗂 Arquivados' },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setMarketingSort(id)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all font-medium border ${marketingSort === id
                ? id === 'archived'
                  ? 'bg-gray-700 text-white border-gray-700 shadow-sm'
                  : 'bg-pink-100 text-pink-800 border-pink-200 shadow-sm'
                : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
                }`}>
              {label}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400 self-center">
            {(() => {
              const count = Object.keys(marketingItems.reduce((acc, i) => { acc[i.REFERENCIA||i.referencia] = 1; return acc; }, {})).length;
              return `${count} ite${count !== 1 ? 'ns' : 'm'}`;
            })()}
          </span>
        </div>

        <input id="search-marketing" name="search-marketing" type="text" placeholder="Buscar por referência, modelo ou marca..." className="w-full border border-gray-300 p-2 text-sm rounded-lg mb-4 focus:ring-2 focus:ring-pink-400 focus:outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />

        {/* LISTA DE ITENS */}
        <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
          {marketingItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {marketingSort === 'archived'
                ? <><Archive className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="font-medium text-sm">Nenhum item arquivado</p></>
                : <><Package className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="font-medium text-sm">Nenhum item encontrado</p></>
              }
            </div>
          ) : Object.values(marketingItems.reduce((acc, item) => {
            const ref = item.REFERENCIA || item.referencia;
            if (!acc[ref]) {
              acc[ref] = { ...item, availableStores: new Set() };
            }
            const storeId = item.store_id || item.storeId || selectedStore;
            acc[ref].availableStores.add(storeId);
            return acc;
          }, {})).map(item => ({ 
            ...item, 
            availableStores: Array.from(item.availableStores).sort() 
          })).map(item => {
            const key = getItemKey(item);
            const mStatus = getMktStatus(item);
            const isArchived = marketingSort === 'archived';
            const stockTotal = calculateTotal(item.sizes);
            const photoUrl = mStatus.photo_url;
            const thumbUrl = getGDriveThumbnail(photoUrl);
            const auditItem = auditData.find(a => (a.REFERENCIA || a.referencia) === item.REFERENCIA);
            const auditQty = auditItem ? auditItem.QTDE : 0;
            return (
              <div key={key} className={`border rounded-xl p-3 flex flex-col xl:flex-row justify-between gap-3 transition-all hover:shadow-md ${isArchived ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-gray-200'
                }`}>
                <div className="flex gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => !isArchived && setPhotoModal({ key, storeId: item.store_id || item.storeId || selectedStore, currentUrl: photoUrl || '' })}
                    className={`shrink-0 w-16 h-16 rounded-xl border overflow-hidden flex flex-col items-center justify-center transition-all group relative
                      ${thumbUrl ? 'border-indigo-200 bg-indigo-50' : 'border-dashed border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50'}`}
                  >
                    {thumbUrl ? (
                      <>
                        <img src={thumbUrl} alt="produto" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                        <div className="hidden w-full h-full flex-col items-center justify-center">
                          <Camera className="w-4 h-4 text-indigo-400" />
                        </div>
                      </>
                    ) : (
                      <Camera className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                    )}
                    {auditQty > 0 && (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm border border-white">
                        {auditQty}
                      </div>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{item.TIPODESC} <span className="text-gray-500 font-normal text-xs">{item.REFERENCIA}</span></div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">{item.MARCADESC}{item.COR1DESC ? ` · ${item.COR1DESC}` : ''}</div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${stockTotal > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{stockTotal}p</span>
                      {item.availableStores && item.availableStores.map(st => (
                        <span key={st} className="text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 px-1.5 py-0.5 rounded">L{st}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-start xl:justify-end gap-1 shrink-0 flex-wrap">
                  {isArchived ? (
                    <button onClick={() => toggleMarketing(key, 'discontinued')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-all">
                      <RefreshCw className="w-3.5 h-3.5" /> Restaurar
                    </button>
                  ) : (
                    (() => {
                      const itemStoreId = item.store_id || item.storeId || selectedStore;
                      return (
                        <>
                          <button onClick={() => toggleMarketing(key, 'photo', itemStoreId)} className={`p-1.5 rounded-md border text-[10px] flex flex-col items-center w-14 transition-all ${mStatus.photo ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm' : 'border-gray-300 hover:bg-gray-50'}`}><Camera className="w-3.5 h-3.5 mb-1" /> {mStatus.photo ? 'OK' : 'S/Foto'}</button>
                          <button onClick={() => toggleMarketing(key, 'catalog', itemStoreId)} className={`p-1.5 rounded-md border text-[10px] flex flex-col items-center w-14 transition-all ${mStatus.catalog ? 'bg-green-50 border-green-300 text-green-700 shadow-sm' : 'border-gray-300 hover:bg-gray-50'}`}><Smartphone className="w-3.5 h-3.5 mb-1" /> Catálogo</button>
                          <button onClick={() => toggleMarketing(key, 'posted', itemStoreId)} className={`p-1.5 rounded-md border text-[10px] flex flex-col items-center w-14 transition-all ${mStatus.posted ? 'bg-pink-50 border-pink-300 text-pink-700 shadow-sm' : 'border-gray-300 hover:bg-gray-50'}`}><Instagram className="w-3.5 h-3.5 mb-1" /> {mStatus.posted ? 'OK' : 'Postar'}</button>
                          <button onClick={() => openScheduleModal(item)} className={`p-1.5 rounded-md border text-[10px] flex flex-col items-center w-14 transition-all ${mStatus.in_queue && !mStatus.posted ? 'bg-orange-50 border-orange-300 text-orange-700 shadow-sm' : 'border-gray-300 hover:bg-gray-50'}`}><Calendar className="w-3.5 h-3.5 mb-1" /> Agendar</button>
                          <button onClick={() => toggleMarketing(key, 'discontinued', itemStoreId)} className="text-gray-300 hover:text-gray-500 ml-1 transition-colors p-1.5 rounded-md hover:bg-gray-100"><Archive className="w-3.5 h-3.5" /></button>
                        </>
                      );
                    })()
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────
          PAINEL DIREITO: CALENDÁRIO VISUAL ESQUELETO (60%)
      ───────────────────────────────────────────────────────── */}
      <div className="w-full md:w-[60%] bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-200 shadow-lg p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-orange-800 flex items-center gap-2">
            <Target className="w-6 h-6 text-orange-600" /> Calendário de Divulgação
          </h2>
          <span className="bg-white/50 text-orange-800 text-xs font-bold px-3 py-1.5 rounded-full border border-orange-200">
            {queueItems.length} na fila global
          </span>
        </div>

        {/* Grade 4x7 (Semanas x Dias) */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 gap-2">
            {DIAS.map(dia => (
              <div key={`header-${dia}`} className="text-center font-black text-xs uppercase text-orange-600/70">{dia}</div>
            ))}
          </div>

          {/* Linhas das Semanas */}
          {SEMANAS.map(semana => (
            <div key={`row-${semana}`} className="relative bg-white/60 rounded-xl border border-orange-100 flex-1 min-h-[140px] flex flex-col">
              <div className="absolute -left-3 top-4 -rotate-90 origin-left text-[9px] font-black tracking-widest text-orange-300 uppercase w-20 text-center pointer-events-none">
                {semana}
              </div>
              <div className="grid grid-cols-7 gap-2 p-2 flex-1 pl-6">
                {DIAS.map(dia => {
                  const cellItems = (bySemana[semana] && bySemana[semana][dia]) || [];
                  return (
                    <div key={`${semana}-${dia}`} className="bg-white border border-dashed border-orange-200 rounded-lg flex flex-col p-1 min-h-[100px] hover:bg-orange-50/50 transition-colors">
                      {cellItems.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-orange-200 uppercase tracking-wider">Soltar Card</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 w-full flex-1">
                          {cellItems.map(item => {
                            const mStatus = getMktStatus(item);
                            const thumbUrl = getGDriveThumbnail(mStatus.photo_url);
                            const activeFmts = mStatus.post_type ? mStatus.post_type.split(', ').filter(Boolean) : [];
                            return (
                              <div key={`mini-${getItemKey(item)}`} onClick={() => openScheduleModal(item)} className="cursor-pointer bg-orange-50 rounded border border-orange-100 p-1.5 flex items-center gap-1.5 hover:shadow-md hover:border-orange-300 transition-all">
                                {thumbUrl ? (
                                  <div className="w-6 h-6 shrink-0 rounded bg-gray-200 overflow-hidden border border-orange-200">
                                    <img src={thumbUrl} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display='none'; }} />
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 shrink-0 rounded bg-orange-100 border border-orange-200 flex items-center justify-center">
                                    <Camera className="w-3 h-3 text-orange-400" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                  <span className="text-[9px] font-bold text-gray-800 leading-none truncate">{item.REFERENCIA}</span>
                                  {activeFmts.length > 0 && (
                                    <div className="flex gap-[3px] mt-1 max-w-full overflow-hidden">
                                      {activeFmts.map(f => <span key={f} className="w-2 h-2 rounded-full border border-white shadow-sm" style={{backgroundColor: FORMATOS_VERDE.includes(f) ? '#22c55e' : '#ec4899'}} title={f}></span>)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>

    {/* ==========================================
        MODAL DE AGENDAMENTO DE MARKETING
        ========================================== */}
    {scheduleModal.isOpen && scheduleModal.item && (() => {
      const { item, week, day, formats } = scheduleModal;
      const thumbUrl = getGDriveThumbnail(getMktStatus(item).photo_url);
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50">
              <h3 className="font-bold text-orange-800 flex items-center gap-2 text-base">
                <Calendar className="w-5 h-5" /> Agendar Postagem
              </h3>
              <button onClick={() => setScheduleModal({ isOpen: false, item: null, week: '', day: '', formats: [] })} className="text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-5">
              {/* Resumo do Produto */}
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="w-12 h-12 rounded-lg bg-gray-200 border border-gray-300 overflow-hidden flex shrink-0 items-center justify-center">
                  {thumbUrl ? <img src={thumbUrl} alt="" className="w-full h-full object-cover" /> : <Camera className="w-6 h-6 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-gray-900 truncate">{item.TIPODESC}</div>
                  <div className="text-xs text-gray-500 font-mono">{item.REFERENCIA}</div>
                </div>
              </div>

              {/* Seletores Semana/Dia */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Semana de Postagem</label>
                  <select value={week} onChange={e => setScheduleModal(p => ({ ...p, week: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-orange-400 outline-none transition-shadow">
                    <option value="">-- Selecione --</option>
                    {SEMANAS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Dia da Semana</label>
                  <select value={day} onChange={e => setScheduleModal(p => ({ ...p, day: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-orange-400 outline-none transition-shadow">
                    <option value="">-- Selecione --</option>
                    {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Formatos */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Formatos de Produção</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_FORMATOS.map(fmt => {
                    const isSelected = formats.includes(fmt);
                    const isGreen = FORMATOS_VERDE.includes(fmt);
                    return (
                      <button key={fmt} onClick={() => toggleFormatInModal(fmt)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${isSelected ? (isGreen ? 'bg-green-500 border-green-500 text-white shadow-md' : 'bg-pink-500 border-pink-500 text-white shadow-md') : 'bg-white border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50'}`}>
                        {fmt}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setScheduleModal({ isOpen: false, item: null, week: '', day: '', formats: [] })} className="px-5 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors">
                Agora Não
              </button>
              <button onClick={confirmSchedule} className="px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-md transition-all flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Pronto, Agendar
              </button>
            </div>
          </div>
        </div>
      );
    })()}

    </>
  );
}
