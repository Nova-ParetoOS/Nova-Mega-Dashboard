import React, { useState } from 'react';
import { Camera, Instagram, X, Target, Calendar, Share2, Printer, Archive, Package, RefreshCw, Smartphone, CheckCircle, ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';

// ── HACK DO GOOGLE DRIVE ─────────────────────────────────────────────────────
// Converte qualquer link /file/d/{ID} do Google Drive numa URL pública de imagem.
// Se não for link do Drive, retorna a URL original sem modificação.
const parseDriveImage = (url) => {
  if (!url) return url;
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  return url;
};

// ── GERADOR DE CALENDÁRIO DE DATAS REAIS ─────────────────────────────────────
// Gera 5 semanas (seg-dom) que cobrem o mês exibido.
const NOMES_DIA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const NOMES_MES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const getCalendarWeeks = (year, month) => {
  const firstDay = new Date(year, month - 1, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Segunda = 0
  const start = new Date(firstDay);
  start.setDate(1 - startOffset);
  const todayISO = new Date().toISOString().split('T')[0];
  const weeks = [];
  for (let w = 0; w < 5; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      const iso = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      days.push({
        date,
        iso,
        label: date.getDate(),
        dd: `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${String(date.getFullYear()).slice(-2)}`,
        isCurrentMonth: date.getMonth() === month - 1,
        isToday: iso === todayISO,
      });
    }
    weeks.push(days);
  }
  return weeks;
};

export default function Divulgacao({
  marketingItems,
  queueItems,
  setQueueItems,
  setCatalogueItems,
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
  const FORMATOS_VERDE = ['WhatsApp', 'Transmissão'];
  const FORMATOS_ROSA  = ['Storie', 'Reels', 'Feed'];
  const ALL_FORMATOS   = [...FORMATOS_VERDE, ...FORMATOS_ROSA];

  // ==========================================
  // ESTADO DO CALENDÁRIO E UI
  // ==========================================
  const [calYear,  setCalYear]  = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [scheduleModal, setScheduleModal] = useState({ isOpen: false, item: null, targetDate: '', formats: [] });
  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false);

  // Navegação de mês
  const prevMonth = () => {
    if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };
  const weeks = getCalendarWeeks(calYear, calMonth);

  // Abre modal: via clique em item existente (passa o item) ou em célula vazia (passa targetDate)
  const openScheduleModal = (item, targetDate = '') => {
    const mStatus = getMktStatus(item);
    setScheduleModal({
      isOpen: true,
      item,
      targetDate: mStatus.post_date || targetDate || '',
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

  const closeModal = () => setScheduleModal({ isOpen: false, item: null, targetDate: '', formats: [] });

  const confirmSchedule = () => {
    if (!scheduleModal.item) return;
    const { item, targetDate, formats } = scheduleModal;
    const storeId = item.store_id || item.storeId || selectedStore;
    const key = getItemKey(item);
    const mStatus = getMktStatus(item);

    // Acumula a data no array posted_dates (fila imortal: item nunca sai do catálogo)
    const existingDates = Array.isArray(mStatus.posted_dates) ? mStatus.posted_dates : [];
    const newDates = targetDate && !existingDates.includes(targetDate)
      ? [...existingDates, targetDate]
      : existingDates;

    // Persiste no Supabase com data ISO real
    _upsertMarketingFields(storeId, key, {
      post_date: targetDate || null,
      post_type: formats.join(', '),
      in_queue: true,
      posted: false,
      posted_dates: newDates,
    });

    // FIX Fila Imortal: não esconde o item do catálogo após agendar
    // setVisuallyHidden(prev => [...prev, key]); // REMOVIDO
    closeModal();
  };

  // Drop em célula: recebe ISO da data
  const handleCalendarDrop = async (e, iso) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('app/product');
    if (!data) return;
    try {
      const parsed = JSON.parse(data);
      const mStatus = getMktStatus(parsed);
      const existingDates = Array.isArray(mStatus?.posted_dates) ? mStatus.posted_dates : [];
      const newDates = iso && !existingDates.includes(iso) ? [...existingDates, iso] : existingDates;
      await _upsertMarketingFields(parsed.storeId, parsed.key, {
        post_date: iso,
        in_queue: true,
        posted: false,
        posted_dates: newDates,
      });
      // FIX Fila Imortal: não esconde o item do catálogo após agendar via drag
      // setVisuallyHidden(prev => [...prev, parsed.key]); // REMOVIDO
    } catch (err) {
      console.error('Drop Parse Error', err);
    }
  };

  // ==========================================
  // MAPEAMENTO: ISO -> itens do calendário
  // ==========================================
  const byDate = {};
  queueItems.forEach(item => {
    const mStatus = getMktStatus(item);
    const postDate = mStatus.post_date;
    if (postDate) {
      if (!byDate[postDate]) byDate[postDate] = [];
      byDate[postDate].push(item);
    }
  });
  // Items sem data ficam disponíveis na Fila Lateral (drawer)


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

    const todayStr = new Date().toISOString().slice(0, 10);
    const hasHistory = Array.isArray(mStatus.posted_dates) && mStatus.posted_dates.length > 0;
    const isScheduledToday = mStatus.post_date === todayStr;
    const isCurrentlyScheduled = hasHistory || isScheduledToday;
    const activeStyle = isCurrentlyScheduled 
       ? 'bg-amber-800/10 border-amber-700 shadow-amber-900/20' 
       : 'bg-white border-orange-100 hover:border-orange-500/50';

    return (
      <div key={`queue-${key}`} className={`rounded-xl border p-3 shadow-sm transition-all flex flex-col gap-2 ${activeStyle}`}>
        {/* Badge re-postagem */}
        {isCurrentlyScheduled && (
          <div className="flex items-center gap-1 text-[9px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full w-fit">
            🔄 {isScheduledToday ? 'Ativo Hoje' : `Recorrente (${mStatus.posted_dates?.length || 0}x)`}
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="shrink-0 w-10 h-10 rounded-lg border border-gray-100 overflow-hidden flex items-center justify-center bg-gray-50">
            {thumbUrl
              ? <img src={thumbUrl} alt="produto" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
              : <Camera className="w-4 h-4 text-gray-300" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-xs text-gray-900 truncate">{item.TIPODESC}</div>
            <div className="flex items-center gap-1 mt-0.5">
                <span className="font-bold text-[11px] text-gray-800 truncate">{item.MODELO || 'Sem Modelo'}</span>
                <span className="text-[9px] text-gray-400 font-mono">- {item.REFERENCIA}</span>
            </div>
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
          PAINEL ESQUERDO: CATÁLOGO DE PRODUTOS E FILTROS (35%)
      ───────────────────────────────────────────────────────── */}
        <div className="w-full xl:w-[35%] bg-white p-6 rounded-2xl border border-gray-200 shadow-lg flex flex-col">
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
              { id: 'recent', label: '+ Novos' },
              { id: 'oldest', label: '+ Antigos' },
              { id: 'no-photo', label: 'Sem Foto' },
              { id: 'to-post', label: 'Postar' },
              { id: 'posted', label: '✓ Postados' },
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
                const availableMkt = marketingItems;
                const count = Object.keys(availableMkt.reduce((acc, i) => { acc[i.REFERENCIA || i.referencia] = 1; return acc; }, {})).length;
                return `${count} ite${count !== 1 ? 'ns' : 'm'}`;
              })()}
            </span>
          </div>

          <input id="search-marketing" name="search-marketing" type="text" placeholder="Buscar por referência, modelo ou marca..." className="w-full border border-gray-300 p-2 text-sm rounded-lg mb-4 focus:ring-2 focus:ring-pink-400 focus:outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />

          {/* LISTA DE ITENS REFORMULADA EM GRID */}
          <div className="flex flex-col gap-4 flex-1 overflow-y-auto max-h-[700px] pr-2 custom-scrollbar">
            {(() => {
              const availableMkt = marketingItems;
              if (availableMkt.length === 0) {
                return (
                  <div className="text-center py-12 text-gray-400">
                    {marketingSort === 'archived'
                      ? <><Archive className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="font-medium text-sm">Nenhum item arquivado</p></>
                      : <><Package className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="font-medium text-sm">Nenhum item encontrado</p></>
                    }
                  </div>
                );
              }
              return Object.values(availableMkt.reduce((acc, item) => {
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
                const photoUrlRaw = mStatus.photo_url || '';
                let parsedImg = '';
                let parsedFolder = '';
                let parsedCaption = '';
                let parsedManufacturer = '';
                if (photoUrlRaw) {
                    try {
                        const parsed = JSON.parse(photoUrlRaw);
                        parsedImg = parsed.image || '';
                        parsedFolder = parsed.folder || '';
                        parsedCaption = parsed.legenda || '';
                        parsedManufacturer = parsed.fabricante || '';
                    } catch (e) {
                        parsedFolder = photoUrlRaw;
                    }
                }
                const thumbUrl = parsedImg || getGDriveThumbnail(parsedFolder);
                const auditItem = auditData.find(a => (a.REFERENCIA || a.referencia) === item.REFERENCIA);
                const auditQty = auditItem ? auditItem.QTDE : 0;
                return (
                <div key={key} draggable onDragStart={(e) => e.dataTransfer.setData('app/product', JSON.stringify({ key, reference: item.REFERENCIA, title: item.DESCRICAO, storeId: item.store_id || item.storeId || selectedStore, sizes: item.sizes }))} className={`border rounded-xl p-3 flex flex-col justify-between gap-3 transition-all hover:shadow-md cursor-grab active:cursor-grabbing ${isArchived ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-gray-200'
                  }`}>
                  <div className="flex gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => !isArchived && setPhotoModal({ 
                        key, 
                        storeId: item.store_id || item.storeId || selectedStore, 
                        directUrl: parsedImg,
                        driveUrl: parsedFolder,
                        legenda: parsedCaption,
                        fabricante: parsedManufacturer
                      })}
                      className={`shrink-0 w-16 h-16 rounded-xl border flex flex-col items-center justify-center transition-all group relative overflow-hidden
                      ${(parsedImg || parsedFolder) ? 'border-indigo-200 bg-indigo-50 shadow-inner p-0' : 'border-dashed border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50'}`}
                    >
                      {(parsedImg || parsedFolder) ? (
                        // ── FIX #4: Miniatura real em vez de texto plano ──────────
                        (() => {
                          const previewSrc = parsedImg ? parseDriveImage(parsedImg) : getGDriveThumbnail(parsedFolder);
                          return previewSrc ? (
                            <img
                              src={previewSrc}
                              alt="miniatura"
                              className="w-full h-full object-cover rounded-xl"
                              onError={e => {
                                e.target.style.display = 'none';
                                e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <ImageIcon className="w-5 h-5 text-indigo-500" />
                              <span className="text-[8px] font-black text-green-600">✓</span>
                            </div>
                          );
                        })()
                      ) : (
                        <Camera className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                      )}
                      {auditQty > 0 && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm border border-white">
                          {auditQty}
                        </div>
                      )}
                    </button>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="font-bold text-sm text-gray-800 truncate" title={item.TIPODESC}>{item.TIPODESC}</div>
                      <div className="text-xs text-gray-500 font-mono truncate mt-0.5" title={item.REFERENCIA}>{item.REFERENCIA}</div>
                      <p className="text-[10px] text-gray-500 uppercase">{item.COR1DESC || item.cor1desc}{(item.DATAENTRADA || item.dataentrada) ? ` • Chegou: ${(item.DATAENTRADA || item.dataentrada).split(' ')[0]}` : ''}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${stockTotal > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{stockTotal}p</span>
                        {item.availableStores && item.availableStores.map(st => (
                          <span key={st} className="text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 px-1.5 py-0.5 rounded">L{st}</span>
                        ))}
                        {mStatus.posted && (
                           <span className="text-[10px] font-black bg-pink-100 border border-pink-200 text-pink-700 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm"><Instagram className="w-2.5 h-2.5" /> Postado</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-start gap-2 shrink-0 flex-wrap mt-2">
                    {isArchived ? (
                      <button onClick={() => toggleMarketing(key, 'discontinued')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-all">
                        <RefreshCw className="w-3.5 h-3.5" /> Restaurar
                      </button>
                    ) : (
                      (() => {
                        const itemStoreId = item.store_id || item.storeId || selectedStore;
                        return (
                          <>
                            <button onClick={() => toggleMarketing(key, 'photo', itemStoreId)} className={`flex-1 p-1.5 rounded-lg border text-[10px] sm:text-xs flex items-center justify-center gap-1.5 transition-all ${mStatus.photo ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm' : 'border-gray-300 hover:bg-gray-50'}`}><Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Foto {mStatus.photo ? 'OK' : ''}</button>
                            <button onClick={() => toggleMarketing(key, 'catalog', itemStoreId)} className={`flex-1 p-1.5 rounded-lg border text-[10px] sm:text-xs flex items-center justify-center gap-1.5 transition-all ${mStatus.catalog ? 'bg-green-50 border-green-300 text-green-700 shadow-sm' : 'border-gray-300 hover:bg-gray-50'}`}><Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Catálogo {mStatus.catalog ? 'OK' : ''}</button>
                            <button
                              onClick={() => openScheduleModal(item)}
                              disabled={!mStatus.photo || !mStatus.catalog}
                              title={!mStatus.photo || !mStatus.catalog ? 'Cadastre Foto e Catálogo antes de agendar' : 'Agendar postagem'}
                              className={`flex-1 p-1.5 rounded-lg border text-[10px] sm:text-xs flex items-center justify-center gap-1.5 transition-all ${
                                !mStatus.photo || !mStatus.catalog
                                  ? 'border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed opacity-60'
                                  : mStatus.in_queue && !mStatus.posted
                                    ? 'bg-orange-50 border-orange-300 text-orange-700 shadow-sm'
                                    : 'border-gray-300 hover:bg-gray-50 text-gray-600 hover:text-gray-900'
                              }`}><Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {mStatus.in_queue && !mStatus.posted ? 'Na Fila' : 'Agendar'}</button>
                            <button onClick={() => toggleMarketing(key, 'discontinued', itemStoreId)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 transition-colors bg-gray-50 hover:bg-red-50 flex items-center justify-center w-8"><Archive className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
                          </>
                        );
                      })()
                    )}
                  </div>
                </div>
              );
            });
          })()}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────
          PAINEL DIREITO: CALENDÁRIO VISUAL ESQUELETO (65%)
      ───────────────────────────────────────────────────────── */}
        <div className="w-full xl:w-[65%] xl:flex-1 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-200 shadow-lg p-6 flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-orange-800 flex items-center gap-2">
              <Target className="w-6 h-6 text-orange-600" /> Calendário de Divulgação
            </h2>
            <button
              onClick={() => setQueueDrawerOpen(true)}
              className="bg-white/70 hover:bg-white text-orange-800 text-xs font-bold px-3 py-1.5 rounded-full border border-orange-200 hover:border-orange-400 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Target className="w-3.5 h-3.5" />
              {queueItems.length} na fila global
            </button>
          </div>

          {/* Cabeçalho de navegação de mês */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 rounded-xl border border-orange-200 bg-white text-orange-600 hover:bg-orange-50 hover:border-orange-400 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <div className="font-black text-orange-800 text-base">{NOMES_MES[calMonth - 1]} {calYear}</div>
              <div className="text-[10px] text-orange-400 font-medium">{queueItems.filter(i => !getMktStatus(i).post_date).length} sem data na fila</div>
            </div>
            <button onClick={nextMonth} className="p-2 rounded-xl border border-orange-200 bg-white text-orange-600 hover:bg-orange-50 hover:border-orange-400 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Grade Real 5x7 com datas */}
          <div className="flex-1 overflow-x-auto custom-scrollbar pb-4">
            <div className="flex flex-col gap-2 min-w-[700px]">
              {/* Cabeçalho dos dias */}
              <div className="grid grid-cols-7 gap-1.5">
                {NOMES_DIA.map(d => (
                  <div key={d} className="text-center font-black text-[10px] uppercase text-orange-500/70 py-1">{d}</div>
                ))}
              </div>

              {/* Linhas de semanas com datas reais */}
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1.5">
                  {week.map(day => {
                    const cellItems = byDate[day.iso] || [];
                    return (
                      <div
                        key={day.iso}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => handleCalendarDrop(e, day.iso)}
                        className={`rounded-xl border flex flex-col min-h-[100px] transition-all ${
                          day.isToday
                            ? 'border-orange-400 bg-orange-50/80 shadow-sm'
                            : day.isCurrentMonth
                            ? 'border-orange-100 bg-white hover:bg-orange-50/40'
                            : 'border-gray-100 bg-gray-50/40 opacity-50'
                        }`}
                      >
                        {/* Cabeçalho da célula com data */}
                        <div className={`px-1.5 pt-1 pb-0.5 text-[9px] font-black ${
                          day.isToday ? 'text-orange-600' : day.isCurrentMonth ? 'text-gray-500' : 'text-gray-300'
                        }`}>
                          {day.dd}
                          {day.isToday && <span className="ml-1 text-orange-500">&#9679;</span>}
                        </div>

                        {/* Área de drop */}
                        <div className="flex-1 p-1 flex flex-col gap-1">
                          {cellItems.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center">
                              <span className="text-[9px] text-orange-200 font-bold">Soltar</span>
                            </div>
                          ) : (
                            cellItems.map(item => {
                              const mStatus  = getMktStatus(item);
                              const thumbUrl = getGDriveThumbnail(mStatus.photo_url);
                              const activeFmts = mStatus.post_type ? mStatus.post_type.split(', ').filter(Boolean) : [];
                              return (
                                <div key={`mini-${getItemKey(item)}`} className="bg-orange-50 rounded-lg border border-orange-100 p-1 flex items-center gap-1 hover:shadow-md hover:border-orange-300 transition-all group cursor-pointer">
                                  <div className="flex-1 flex items-center gap-1 min-w-0" onClick={() => openScheduleModal(item)}>
                                    {thumbUrl ? (
                                      <div className="w-5 h-5 shrink-0 rounded overflow-hidden border border-orange-200">
                                        <img src={thumbUrl} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 shrink-0 rounded bg-orange-100 border border-orange-200 flex items-center justify-center">
                                        <Camera className="w-2.5 h-2.5 text-orange-400" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[9px] font-bold text-gray-800 truncate leading-tight">{item.TIPODESC}</div>
                                      {activeFmts.length > 0 && (
                                        <div className="flex flex-wrap gap-[2px] mt-0.5">
                                          {activeFmts.map(f => <span key={f} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: FORMATOS_VERDE.includes(f) ? '#22c55e' : '#ec4899' }} title={f} />)}
                                        </div>
                                      )}
                                      {mStatus.posted && <span className="text-[7px] font-black text-pink-600">✓ Postado</span>}
                                    </div>
                                  </div>
                                  <button onClick={e => { e.stopPropagation(); removeFromQueue(item); }} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-100 text-gray-300 hover:text-red-500" title="Remover">
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

        </div> {/* fecha painel direito */}

      </div> {/* fecha container principal */}

      {/* ==========================================
        MODAL DE AGENDAMENTO DE MARKETING
        ========================================== */}
      {scheduleModal.isOpen && scheduleModal.item && (() => {
        const { item, targetDate, formats } = scheduleModal;
        const thumbUrl = getGDriveThumbnail(getMktStatus(item).photo_url);
        // Formata data ISO para exibição legivel
        const displayDate = targetDate
          ? (() => { const [y,m,d] = targetDate.split('-'); const diaIdx = new Date(targetDate + 'T12:00:00').getDay(); return `${d}/${m}/${y.slice(-2)} — ${NOMES_DIA[(diaIdx + 6) % 7]}`; })()
          : 'Sem data definida';
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50">
                <h3 className="font-bold text-orange-800 flex items-center gap-2 text-base">
                  <Calendar className="w-5 h-5" /> Agendar Postagem
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
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

                {/* Data de Postagem */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Data de Postagem</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      onClick={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      value={scheduleModal.targetDate}
                      onChange={e => setScheduleModal(p => ({ ...p, targetDate: e.target.value }))}
                      className="flex-1 border border-orange-300 bg-orange-50 rounded-xl px-3 py-2.5 text-sm font-bold text-orange-800 focus:ring-2 focus:ring-orange-400 outline-none transition-colors"
                    />
                    <div className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-3 py-2.5 rounded-xl whitespace-nowrap">
                      {displayDate}
                    </div>
                  </div>
                </div>

                {/* Formatos */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">Formatos de Produção</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_FORMATOS.map(fmt => {
                      const isSelected = formats.includes(fmt);
                      const isGreen    = FORMATOS_VERDE.includes(fmt);
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
                <button onClick={closeModal} className="px-5 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors">Agora Não</button>
                <button onClick={confirmSchedule} className="px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-md transition-all flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Agendar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==========================================
        DRAWER: FILA GLOBAL
        ========================================== */}
      {queueDrawerOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          {/* Overlay */}
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setQueueDrawerOpen(false)} />
          {/* Panel */}
          <div className="relative z-10 w-full max-w-sm h-full bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-orange-800 text-base flex items-center gap-2">
                  <Target className="w-5 h-5" /> Fila Global
                </h3>
                <p className="text-xs text-orange-600/70 mt-0.5">{queueItems.length} item{queueItems.length !== 1 ? 'ns' : ''} agendado{queueItems.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setQueueDrawerOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {queueItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-300">
                  <Calendar className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm font-medium">Nenhum item na fila</p>
                </div>
              ) : (
                queueItems.map(item => {
                  const key = getItemKey(item);
                  const mStatus = getMktStatus(item);
                  const thumbUrl = getGDriveThumbnail(mStatus.photo_url);
                  const activeFmts = mStatus.post_type ? mStatus.post_type.split(', ').filter(Boolean) : [];
                  return (
                    <div key={`drawer-${key}`} className="bg-gray-50 rounded-xl border border-gray-100 p-3 flex items-center gap-3 hover:border-orange-200 transition-all">
                      <div className="w-10 h-10 shrink-0 rounded-lg bg-gray-200 border border-gray-200 overflow-hidden flex items-center justify-center">
                        {thumbUrl
                          ? <img src={thumbUrl} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                          : <Camera className="w-4 h-4 text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-gray-800 truncate">{item.TIPODESC}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{item.REFERENCIA}</div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {mStatus.post_week && (
                            <span className="text-[9px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">{mStatus.post_week}</span>
                          )}
                          {mStatus.post_day && (
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{mStatus.post_day}</span>
                          )}
                          {activeFmts.map(f => (
                            <span key={f} className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: FORMATOS_VERDE.includes(f) ? '#dcfce7' : '#fce7f3', color: FORMATOS_VERDE.includes(f) ? '#166534' : '#9d174d' }}>{f}</span>
                          ))}
                          {mStatus.posted && (
                            <span className="text-[9px] font-black text-pink-600 flex items-center gap-0.5"><CheckCircle className="w-2.5 h-2.5" /> Postado</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromQueue(item)}
                        className="shrink-0 p-1.5 rounded-lg border border-gray-200 text-gray-300 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"
                        title="Remover da fila"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
}
