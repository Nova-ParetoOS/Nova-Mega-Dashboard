import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

// ─────────────────────────────────────────────────────────────
// Hook central: carrega e persiste todos os dados no Supabase
// ─────────────────────────────────────────────────────────────
export function useSupabaseData(userId) {
  const [loading, setLoading]               = useState(true);
  const [syncStatus, setSyncStatus]         = useState('idle'); // 'idle'|'saving'|'saved'|'error'

  // ── Dados ─────────────────────────────────────────────────
  const [systemData, setSystemData]         = useState([]);
  const [auditData, setAuditData]           = useState([]);
  const [salesHistory, setSalesHistory]     = useState([]);
  const [dreValues, setDreValues]           = useState({});
  const [projectionSellers, setProjectionSellers] = useState({});
  const [marketingStatus, setMarketingStatus]     = useState({});
  const [completedIds, setCompletedIds]           = useState(new Set());
  const [sellerOverrides, setSellerOverrides]     = useState({});
  const [hrCandidates, setHrCandidates]           = useState([]);

  // ── Helper: feedback visual de salvamento ─────────────────
  const flash = useCallback((status) => {
    setSyncStatus(status);
    if (status === 'saved') setTimeout(() => setSyncStatus('idle'), 2000);
  }, []);

  // ─────────────────────────────────────────────────────────
  // LOAD ALL — chamado no mount e no reloadAll
  // ─────────────────────────────────────────────────────────
  const reloadAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [
        { data: sysD },
        { data: audD },
        { data: salesD },
        { data: dreD },
        { data: projD },
        { data: mktD },
        { data: compD },
        { data: ovD },
        { data: hrD },
      ] = await Promise.all([
        supabase.from('system_data').select('*').eq('user_id', userId).order('store_code').order('id'),
        supabase.from('audit_data').select('*').eq('user_id', userId).order('store_code').order('id'),
        supabase.from('sales_history').select('*').eq('user_id', userId).order('period'),
        supabase.from('dre_values').select('*').eq('user_id', userId),
        supabase.from('user_config').select('*').eq('user_id', userId).like('config_key', 'proj_%'),
        supabase.from('marketing_status').select('*').eq('user_id', userId),
        supabase.from('completed_ids').select('*').eq('user_id', userId),
        supabase.from('user_config').select('*').eq('user_id', userId).like('config_key', 'seller_%'),
        supabase.from('hr_candidates').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);

      // system_data → array com campos normalizados
      setSystemData((sysD || []).map(normalizeSystemRow));

      // audit_data → array normalizado
      setAuditData((audD || []).map(normalizeAuditRow));

      // sales_history → array com camelCase
      setSalesHistory((salesD || []).map(normalizeSalesRow));

      // dre_values → objeto { [dre_key]: values }
      const dreObj = {};
      (dreD || []).forEach(r => { dreObj[r.dre_key] = r.values; });
      setDreValues(dreObj);

      // projection_sellers → objeto { [proj_key]: count }
      const projObj = {};
      (projD || []).forEach(r => { projObj[r.config_key.replace('proj_', '')] = r.config_value.count; });
      setProjectionSellers(projObj);

      // marketing_status → objeto { [item_key]: { photo, catalog, posted, discontinued, posted_at } }
      const mktObj = {};
      (mktD || []).forEach(r => {
        mktObj[`${r.store_code}|${r.item_key}`] = {
          photo: r.photo, catalog: r.catalog,
          posted: r.posted, discontinued: r.discontinued,
          posted_at: r.posted_at,
        };
      });
      setMarketingStatus(mktObj);

      // completed_ids → Set de `${store_code}|${item_id}`
      setCompletedIds(new Set((compD || []).map(r => `${r.store_code}|${r.item_id}`)));

      // seller_overrides → objeto { [key]: status }
      const ovObj = {};
      (ovD || []).forEach(r => { ovObj[r.config_key.replace('seller_', '')] = r.config_value.status; });
      setSellerOverrides(ovObj);

      // hr_candidates → array direto
      setHrCandidates(hrD || []);

    } catch (err) {
      console.error('[useSupabaseData] reloadAll error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Mount
  useEffect(() => { reloadAll(); }, [reloadAll]);

  // ─────────────────────────────────────────────────────────
  // NORMALIZERS — banco → formato que o App.jsx espera
  // ─────────────────────────────────────────────────────────
  function normalizeSystemRow(r) {
    return {
      id: r.item_id,
      _dbId: r.id,
      store_code: r.store_code,
      MARCA: r.marca,
      MARCADESC: r.marcadesc,
      TIPODESC: r.tipodesc,
      REFERENCIA: r.referencia,
      COR1DESC: r.cor1desc,
      DATAENTRADA: r.dataentrada,
      sizes: r.sizes || {},
      QTDE: r.qtde || 0,
    };
  }

  function normalizeAuditRow(r) {
    return {
      id: r.item_id,
      _dbId: r.id,
      store_code: r.store_code,
      REFERENCIA: r.referencia,
      sizes: r.sizes || {},
      QTDE: r.qtde || 0,
    };
  }

  function normalizeSalesRow(r) {
    return {
      id: r.id,
      storeCode: r.store_code,
      sellerCode: r.seller_code,
      sellerName: r.seller_name,
      daysWorked: r.days_worked,
      salesCount: r.sales_count,
      itemsCount: r.items_count,
      pa: r.pa,
      totalSales: r.total_sales,
      ticketAvg: r.ticket_avg,
      period: r.period,
    };
  }

  // ─────────────────────────────────────────────────────────
  // SYSTEM DATA — importação ERP por loja
  // ─────────────────────────────────────────────────────────
  const setSystemDataForStore = useCallback(async (storeCode, parsedItems) => {
    if (!userId) return;
    flash('saving');
    try {
      // 1. Deleta todos os itens desta loja
      await supabase.from('system_data').delete()
        .eq('user_id', userId).eq('store_code', storeCode);

      if (parsedItems.length === 0) {
        setSystemData(prev => prev.filter(i => i.store_code !== storeCode));
        flash('saved');
        return;
      }

      // 2. Insere novos em batch (chunks de 500)
      const rows = parsedItems.map((item, idx) => ({
        user_id: userId,
        store_code: storeCode,
        item_id: item.id || idx + 1,
        marca: item.MARCA,
        marcadesc: item.MARCADESC,
        tipodesc: item.TIPODESC,
        referencia: item.REFERENCIA,
        cor1desc: item.COR1DESC,
        dataentrada: item.DATAENTRADA,
        sizes: item.sizes || {},
        qtde: item.QTDE || 0,
      }));

      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const { error } = await supabase.from('system_data').insert(rows.slice(i, i + chunkSize));
        if (error) throw error;
      }

      // 3. Atualiza estado local
      const normalized = rows.map((r, idx) => normalizeSystemRow({ ...r, id: idx }));
      setSystemData(prev => [
        ...prev.filter(i => i.store_code !== storeCode),
        ...normalized,
      ]);
      flash('saved');
    } catch (err) {
      console.error('[setSystemData] error:', err);
      flash('error');
    }
  }, [userId, flash]);

  // ─────────────────────────────────────────────────────────
  // AUDIT DATA — atualização de contagem por item
  // ─────────────────────────────────────────────────────────
  const updateAuditItem = useCallback(async (storeCode, itemId, referencia, newSizes) => {
    if (!userId) return;
    // Otimista local
    setAuditData(prev => prev.map(i =>
      (i.store_code === storeCode && i.id === itemId)
        ? { ...i, sizes: newSizes, QTDE: Object.values(newSizes).reduce((a, b) => a + (parseInt(b) || 0), 0) }
        : i
    ));
    flash('saving');
    const { error } = await supabase.from('audit_data').upsert({
      user_id: userId,
      store_code: storeCode,
      item_id: itemId,
      referencia,
      sizes: newSizes,
      qtde: Object.values(newSizes).reduce((a, b) => a + (parseInt(b) || 0), 0),
    }, { onConflict: 'user_id,store_code,item_id' });
    if (error) { console.error('[updateAuditItem]', error); flash('error'); }
    else flash('saved');
  }, [userId, flash]);

  // Seed: inicializa audit_data com base no system_data quando vazio
  const seedAuditFromSystem = useCallback(async (storeCode, systemItems) => {
    if (!userId || systemItems.length === 0) return;
    const rows = systemItems.map(item => ({
      user_id: userId,
      store_code: storeCode,
      item_id: item.id,
      referencia: item.REFERENCIA,
      sizes: Object.fromEntries(Object.keys(item.sizes).map(k => [k, 0])),
      qtde: 0,
    }));
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      await supabase.from('audit_data').upsert(rows.slice(i, i + chunkSize), { onConflict: 'user_id,store_code,item_id', ignoreDuplicates: true });
    }
    // Reload audit after seed
    const { data } = await supabase.from('audit_data').select('*').eq('user_id', userId).eq('store_code', storeCode);
    setAuditData(prev => [
      ...prev.filter(i => i.store_code !== storeCode),
      ...(data || []).map(normalizeAuditRow),
    ]);
  }, [userId]);

  // ─────────────────────────────────────────────────────────
  // SALES HISTORY — upsert de registros
  // ─────────────────────────────────────────────────────────
  const upsertSalesHistory = useCallback(async (newEntries, clearStore, clearPeriod) => {
    if (!userId) return;
    flash('saving');
    try {
      if (clearStore && clearPeriod) {
        await supabase.from('sales_history').delete()
          .eq('user_id', userId).eq('store_code', clearStore).eq('period', clearPeriod);
      }
      const rows = newEntries.map(e => ({
        user_id: userId,
        store_code: e.storeCode,
        seller_code: e.sellerCode || null,
        seller_name: e.sellerName,
        days_worked: e.daysWorked || 0,
        sales_count: e.salesCount || 0,
        items_count: e.itemsCount || 0,
        pa: e.pa || 0,
        total_sales: e.totalSales,
        ticket_avg: e.ticketAvg || 0,
        period: e.period,
      }));
      const { error } = await supabase.from('sales_history')
        .upsert(rows, { onConflict: 'user_id,store_code,seller_name,period' });
      if (error) throw error;
      // Reload
      const { data } = await supabase.from('sales_history').select('*').eq('user_id', userId).order('period');
      setSalesHistory((data || []).map(normalizeSalesRow));
      flash('saved');
    } catch (err) {
      console.error('[upsertSalesHistory]', err);
      flash('error');
    }
  }, [userId, flash]);

  // ─────────────────────────────────────────────────────────
  // DRE VALUES
  // ─────────────────────────────────────────────────────────
  const updateDreKey = useCallback(async (dreKey, field, value) => {
    if (!userId) return;
    const current = dreValues[dreKey] || {};
    const newValues = { ...current, [field]: parseFloat(value) || 0 };
    // Otimista local
    setDreValues(prev => ({ ...prev, [dreKey]: newValues }));
    flash('saving');
    const { error } = await supabase.from('dre_values').upsert({
      user_id: userId,
      dre_key: dreKey,
      values: newValues,
    }, { onConflict: 'user_id,dre_key' });
    if (error) { console.error('[updateDreKey]', error); flash('error'); }
    else flash('saved');
  }, [userId, dreValues, flash]);

  const deleteDreKey = useCallback(async (dreKey) => {
    if (!userId) return;
    setDreValues(prev => { const n = { ...prev }; delete n[dreKey]; return n; });
    await supabase.from('dre_values').delete()
      .eq('user_id', userId).eq('dre_key', dreKey);
  }, [userId]);

  // ─────────────────────────────────────────────────────────
  // MARKETING STATUS
  // ─────────────────────────────────────────────────────────
  const toggleMarketing = useCallback(async (storeCode, itemKey, field, currentVal, item) => {
    if (!userId) return;
    const compositeKey = `${storeCode}|${itemKey}`;
    const current = marketingStatus[compositeKey] || {};
    const newVal = !currentVal;
    const updated = {
      ...current,
      [field]: newVal,
      ...(field === 'posted' && newVal ? { posted_at: new Date().toISOString() } : {}),
    };
    // Otimista local
    setMarketingStatus(prev => ({ ...prev, [compositeKey]: updated }));
    flash('saving');
    const { error } = await supabase.from('marketing_status').upsert({
      user_id: userId,
      store_code: storeCode,
      item_key: itemKey,
      ...updated,
    }, { onConflict: 'user_id,store_code,item_key' });
    if (error) { console.error('[toggleMarketing]', error); flash('error'); }
    else flash('saved');
  }, [userId, marketingStatus, flash]);

  // ─────────────────────────────────────────────────────────
  // COMPLETED IDS
  // ─────────────────────────────────────────────────────────
  const toggleCompleted = useCallback(async (storeCode, itemId) => {
    if (!userId) return;
    const key = `${storeCode}|${itemId}`;
    const isCompleted = completedIds.has(key);
    // Otimista local
    setCompletedIds(prev => {
      const next = new Set(prev);
      isCompleted ? next.delete(key) : next.add(key);
      return next;
    });
    if (isCompleted) {
      await supabase.from('completed_ids').delete()
        .eq('user_id', userId).eq('store_code', storeCode).eq('item_id', itemId);
    } else {
      await supabase.from('completed_ids').upsert(
        { user_id: userId, store_code: storeCode, item_id: itemId },
        { onConflict: 'user_id,store_code,item_id', ignoreDuplicates: true }
      );
    }
  }, [userId, completedIds]);

  // ─────────────────────────────────────────────────────────
  // SELLER OVERRIDES
  // ─────────────────────────────────────────────────────────
  const setSellerOverride = useCallback(async (key, status) => {
    if (!userId) return;
    setSellerOverrides(prev => ({ ...prev, [key]: status }));
    await supabase.from('user_config').upsert({
      user_id: userId,
      config_key: `seller_${key}`,
      config_value: { status },
    }, { onConflict: 'user_id,config_key' });
  }, [userId]);

  // ─────────────────────────────────────────────────────────
  // HR CANDIDATES
  // ─────────────────────────────────────────────────────────
  const saveHrCandidate = useCallback(async (form, editId) => {
    if (!userId) return;
    flash('saving');
    const row = {
      user_id: userId,
      store_code: form.loja || '10',
      nome: form.nome,
      telefone: form.telefone || null,
      cargo: form.cargo || null,
      fonte: form.fonte || null,
      status: form.status,
      motivo: form.motivo || null,
      observacoes: form.observacoes || null,
      recebimento_curriculo: form.recebimento_curriculo || null,
      entrevista_data: form.entrevista_data || null,
      contratacao_data: form.contratacao_data || null,
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from('hr_candidates').update(row).eq('id', editId).eq('user_id', userId));
      if (!error) {
        setHrCandidates(prev => prev.map(c => c.id === editId ? { ...c, ...row, id: editId } : c));
      }
    } else {
      const { data, error: insertError } = await supabase.from('hr_candidates')
        .insert(row).select().single();
      error = insertError;
      if (!error && data) setHrCandidates(prev => [data, ...prev]);
    }

    if (error) { console.error('[saveHrCandidate]', error); flash('error'); return false; }
    flash('saved');
    return true;
  }, [userId, flash]);

  const deleteHrCandidate = useCallback(async (id) => {
    if (!userId) return;
    setHrCandidates(prev => prev.filter(c => c.id !== id));
    await supabase.from('hr_candidates').delete().eq('id', id).eq('user_id', userId);
  }, [userId]);

  const moveHrStatus = useCallback(async (id, newStatus, extraFields = {}) => {
    if (!userId) return;
    const updates = { status: newStatus, ...extraFields };
    setHrCandidates(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    flash('saving');
    const { error } = await supabase.from('hr_candidates').update(updates).eq('id', id).eq('user_id', userId);
    if (error) { console.error('[moveHrStatus]', error); flash('error'); }
    else flash('saved');
  }, [userId, flash]);

  // ─────────────────────────────────────────────────────────
  // PROJECTION SELLERS
  // ─────────────────────────────────────────────────────────
  const updateProjectionSeller = useCallback(async (projKey, count) => {
    if (!userId) return;
    setProjectionSellers(prev => ({ ...prev, [projKey]: count }));
    await supabase.from('user_config').upsert({
      user_id: userId,
      config_key: `proj_${projKey}`,
      config_value: { count },
    }, { onConflict: 'user_id,config_key' });
  }, [userId]);

  return {
    loading,
    syncStatus,
    systemData,
    auditData,
    salesHistory,
    dreValues,
    projectionSellers,
    marketingStatus,
    completedIds,
    sellerOverrides,
    hrCandidates,
    setSystemData: setSystemDataForStore,
    setAuditData: seedAuditFromSystem,
    updateAuditItem,
    upsertSalesHistory,
    updateDreKey,
    deleteDreKey,
    toggleMarketing,
    toggleCompleted,
    setSellerOverride,
    saveHrCandidate,
    deleteHrCandidate,
    moveHrStatus,
    updateProjectionSeller,
    reloadAll,
  };
}