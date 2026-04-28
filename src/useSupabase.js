import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { normalizeStoreCode } from './utils/formatters';

export function useSupabaseData(userId) {
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('idle');

  const [systemData, setSystemData] = useState([]);
  const [auditData, setAuditData] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [dreValues, setDreValues] = useState({});
  const [projectionSellers, setProjectionSellers] = useState({});
  const [marketingStatus, setMarketingStatus] = useState({});
  const [sellerOverrides, setSellerOverrides] = useState({});
  const [sellerStoreMap, setSellerStoreMap] = useState({});
  const [hrCandidates, setHrCandidates] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [crmLeads, setCrmLeads] = useState([]);
  const [crmWishlist, setCrmWishlist] = useState([]);
  const [crmCustomTags, setCrmCustomTags] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [userStoreId, setUserStoreId] = useState(null);

  const flash = useCallback((status) => {
    setSyncStatus(status);
    if (status === 'saved') setTimeout(() => setSyncStatus('idle'), 2000);
  }, []);

  const reloadAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    // ── RBAC: busca o perfil ANTES de qualquer query de dados ──────────────
    // Garante que a regra de loja está correta em TODA chamada de reloadAll,
    // independente da ordem de montagem dos useEffects.
    let resolvedRole = 'owner';
    let resolvedStoreId = null;
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, store_id')
        .eq('id', userId)
        .maybeSingle();
      if (profile) {
        resolvedRole = profile.role || 'owner';
        resolvedStoreId = profile.store_id || null;
      }
    } catch (_) { /* fallback owner já definido acima */ }
    setUserRole(resolvedRole);
    setUserStoreId(resolvedStoreId);

    // Helper: se gerente, força filtro pela loja do crachá; owner vê tudo
    const isGerente = resolvedRole === 'gerente' && resolvedStoreId;
    const storeQ = (q) => isGerente ? q.eq('store_id', String(resolvedStoreId)) : q;

    try {
      const [
        { data: sysD }, { data: audD }, { data: salesD }, { data: dreD },
        { data: projD }, { data: mktD }, { data: ovD },
        { data: hrD }, { data: crmD },
        { data: crmWishD }, { data: crmTagsD },
      ] = await Promise.all([
        storeQ(supabase.from('system_data').select('*')),
        storeQ(supabase.from('audit_data').select('*')),
        storeQ(supabase.from('sales_performance').select('*').gte('period_start', '2021-01-01').order('period_start', { ascending: false }).limit(10000)),
        supabase.from('dre_values').select('*'),
        supabase.from('user_config').select('*').like('config_key', 'proj_%'),
        supabase.from('marketing_status').select('*'),
        supabase.from('user_config').select('*').like('config_key', 'seller_%'),
        storeQ(supabase.from('candidates').select('*')).eq('is_archived', false),
        supabase.from('crm_leads').select('*').eq('is_archived', false),
        supabase.from('crm_wishlist').select('*'),
        supabase.from('crm_custom_tags').select('*'),
      ]);

      setSystemData((sysD || []).map(normalizeSystemRow));
      setAuditData((audD || []).map(normalizeAuditRow));
      const mappedSalesHistory = (salesD || []).map(row => ({
        id: row.id,
        storeCode: String(row.store_id || ''),
        storeId: String(row.store_id || ''),
        sellerName: row.seller_name,
        daysWorked: Number(row.days_worked) || 0,
        salesCount: Number(row.sales_count) || 0,
        itemsCount: Number(row.items_count) || 0,
        totalSales: Number(row.total_sales) || 0,
        pa: Number(row.pa) || 0,
        ticketAvg: Number(row.ticket_avg) || 0,
        priceAvg: Number(row.price_avg) || 0,
        period: row.period_start ? String(row.period_start).substring(0, 7) : '',
      }));
      console.log('🔥 [FETCH] salesHistory carregados:', mappedSalesHistory.length, 'rows');
      setSalesHistory(mappedSalesHistory);

      const dreObj = {}; (dreD || []).forEach(r => { dreObj[r.dre_key] = r.values; });
      setDreValues(dreObj);

      const projObj = {}; (projD || []).forEach(r => { projObj[r.config_key.replace('proj_', '')] = r.config_value.count; });
      setProjectionSellers(projObj);

      const mktObj = {}; (mktD || []).forEach(r => {
        mktObj[`${r.store_id}|${r.item_key}`] = { photo: r.photo, photo_url: r.photo_url || null, catalog: r.catalog, posted: r.posted, discontinued: r.discontinued, posted_at: r.posted_at, in_queue: r.in_queue || false, post_week: r.post_week || '', post_day: r.post_day || '', post_type: r.post_type || '', post_date: r.post_date || null, posted_dates: r.posted_dates || [] };
      });
      setMarketingStatus(mktObj);

      const ovObj = {};
      const storeMapObj = {};
      (ovD || []).forEach(r => {
        if (r.config_key.startsWith('seller_store_')) {
          // seller_store_NOME_DA_VENDEDORA -> preferred store id
          const sellerName = r.config_key.replace('seller_store_', '').replace(/_/g, ' ');
          storeMapObj[sellerName.trim().toUpperCase()] = String(r.config_value.store_id || '');
        } else {
          ovObj[r.config_key.replace('seller_', '')] = r.config_value.status;
        }
      });
      setSellerOverrides(ovObj);
      setSellerStoreMap(storeMapObj);

      setHrCandidates((hrD || []).map(r => ({ ...r, store_id: normalizeStoreCode(r.store_id) })));
      setCrmLeads((crmD || []).map(r => ({ ...r, store_id: normalizeStoreCode(r.store_id), updated_at: r.updated_at || r.created_at || null })));
      setCrmWishlist((crmWishD || []).map(r => ({ ...r, store_id: normalizeStoreCode(r.store_id) })));
      setCrmCustomTags(crmTagsD || []);

    } catch (err) { console.error('[useSupabaseData] reloadAll error:', err); }
    finally { setLoading(false); }
  }, [userId, userRole, userStoreId]);

  useEffect(() => { reloadAll(); }, [reloadAll]);

  // --- NORMALIZERS ---
  function normalizeSystemRow(r) {
    return { id: r.item_id, _dbId: r.id, store_id: String(r.store_id), MARCA: r.marca, MARCADESC: r.marcadesc, TIPODESC: r.tipodesc, REFERENCIA: r.referencia, COR1DESC: r.cor1desc, DATAENTRADA: r.dataentrada, sizes: r.sizes || {}, QTDE: r.qtde || 0 };
  }
  function normalizeAuditRow(r) {
    return { id: r.item_id, _dbId: r.id, store_id: String(r.store_id), REFERENCIA: r.referencia, sizes: r.sizes || {}, QTDE: r.qtde || 0 };
  }
  function normalizeSalesRow(r) {
    const storeCode = String(r.store_id || '');
    const period = r.period_start ? String(r.period_start).substring(0, 7) : '';
    return {
      id: r.id,
      storeCode,
      storeId: storeCode,            // alias — compatibilidade com filtros legados
      sellerName: r.seller_name,
      daysWorked: parseInt(r.days_worked) || 0,
      salesCount: parseInt(r.sales_count) || 0,
      itemsCount: parseInt(r.items_count) || 0,
      pa: parseFloat(r.pa) || 0,
      totalSales: Number(r.total_sales) || 0,
      ticketAvg: parseFloat(r.ticket_avg) || 0,
      priceAvg: parseFloat(r.price_avg) || 0,
      period,
    };
  }

  // --- ACTIONS ---
  const upsertSalesHistory = useCallback(async (newEntries, clearStore, clearPeriod) => {
    if (!userId) return;
    flash('saving');
    try {
      // ── Blindagem RLS: confirma sessão ativa antes de qualquer write ──────
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado. Faça login novamente.');
      const uid = user.id;

      const fmt = (p) => (p && String(p).length === 7) ? `${p}-01` : String(p || '');

      // ── 1. Tradução ABSOLUTA front‑end → banco (snake_case) ───────────────
      const cleanRowsMap = new Map();
      newEntries.forEach(e => {
        const name = String(e.sellerName || e.seller_name || '').trim().toUpperCase();
        if (!name || name === 'TOTAL' || name === 'N/A') return;
        const rowDate = fmt(e.period || e.period_start);
        const key = `${e.storeCode || e.storeId}_${name}_${rowDate}`;
        const incoming = {
          user_id: uid,
          store_id: String(e.storeCode || e.storeId || ''),
          seller_name: name,
          days_worked: Number(e.daysWorked || e.days_worked) || 0,
          sales_count: Number(e.salesCount || e.sales_count) || 0,
          items_count: Number(e.itemsCount || e.items_count) || 0,
          total_sales: Number(e.totalSales || e.total_sales) || 0,
          pa: Number(e.pa) || 0,
          ticket_avg: Number(e.ticketAvg || e.ticket_avg) || 0,
          price_avg: Number(e.priceAvg || e.price_avg) || 0,
          period_start: rowDate,
        };
        if (cleanRowsMap.has(key)) {
          const ex = cleanRowsMap.get(key);
          const cnt = ex.sales_count + incoming.sales_count;
          const itm = ex.items_count + incoming.items_count;
          cleanRowsMap.set(key, {
            ...ex,
            total_sales: ex.total_sales + incoming.total_sales,
            sales_count: cnt,
            items_count: itm,
            days_worked: Math.max(ex.days_worked, incoming.days_worked),
            pa: cnt > 0 ? itm / cnt : ex.pa,
            ticket_avg: cnt > 0 ? (ex.total_sales + incoming.total_sales) / cnt : ex.ticket_avg,
          });
        } else {
          cleanRowsMap.set(key, incoming);
        }
      });

      const finalRows = Array.from(cleanRowsMap.values());
      console.log('🔥 [UPSERT] Payload mapeado para o banco:', finalRows);

      // ── 2. Smart Wipe — apaga a loja no período antes de injetar se for nova importação
      if (clearPeriod) {
        const periodDate = fmt(clearPeriod);
        const storesToWipe = [...new Set(finalRows.map(r => r.store_id))];
        for (const sid of storesToWipe) {
          await supabase.from('sales_performance').delete()
            .eq('store_id', sid)
            .eq('period_start', periodDate);
        }
      }

      // ── 3. Bypass de Constraint: SELECT -> UPDATE by ID (Multi-Tenant) ─────
      if (finalRows.length > 0) {
        for (const row of finalRows) {
          const { data: existing } = await supabase.from('sales_performance')
            .select('id')
            .eq('store_id', row.store_id)
            .eq('seller_name', row.seller_name)
            .eq('period_start', row.period_start)
            .maybeSingle();

          if (existing?.id) {
            await supabase.from('sales_performance').update(row).eq('id', existing.id);
          } else {
            await supabase.from('sales_performance').insert(row);
          }
        }
      }

      // ── 4. Re‑fetch e mapeamento DB → camelCase para a UI ─────────────────
      const { data } = await supabase.from('sales_performance').select('*').eq('user_id', uid).gte('period_start', '2021-01-01').order('period_start', { ascending: false }).limit(10000);
      const refreshed = (data || []).map(row => ({
        id: row.id,
        storeCode: String(row.store_id || ''),
        storeId: String(row.store_id || ''),
        sellerName: row.seller_name,
        daysWorked: Number(row.days_worked) || 0,
        salesCount: Number(row.sales_count) || 0,
        itemsCount: Number(row.items_count) || 0,
        totalSales: Number(row.total_sales) || 0,
        pa: Number(row.pa) || 0,
        ticketAvg: Number(row.ticket_avg) || 0,
        priceAvg: Number(row.price_avg) || 0,
        period: row.period_start ? String(row.period_start).substring(0, 7) : '',
      }));
      console.log('🔥 [UPSERT] salesHistory após re-fetch:', refreshed.length, 'rows');
      setSalesHistory(refreshed);
      reloadAll();
      flash('saved');
    } catch (err) {
      console.error('[upsertSalesHistory]', err);
      flash('error');
      throw err;
    }
  }, [userId, flash, reloadAll]);

  const setSystemDataForStore = useCallback(async (storeId, parsedItems) => {
    if (!userId) return;
    flash('saving');
    try {
      // Deleta toda a loja antes de injetar (ignora de qual usuário).
      await supabase.from('system_data').delete().eq('store_id', String(storeId));
      const rows = parsedItems.map((item, idx) => ({ user_id: userId, store_id: String(storeId), item_id: item.id || idx + 1, marca: item.MARCA, marcadesc: item.MARCADESC, tipodesc: item.TIPODESC, referencia: item.REFERENCIA, cor1desc: item.COR1DESC, dataentrada: item.DATAENTRADA, sizes: item.sizes || {}, qtde: item.QTDE || 0 }));
      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        // Usa insert direto, pois os dados velhos já foram vaporizados
        await supabase.from('system_data').insert(rows.slice(i, i + chunkSize));
      }
      reloadAll();
      flash('saved');
    } catch (err) { flash('error'); }
  }, [userId, flash, reloadAll]);

  const updateAuditItem = useCallback(async (storeId, itemId, referencia, sizeKey, sizeValue) => {
    if (!userId) return;
    flash('saving');

    // SELECT de merge: busca sem user_id para achar a linha independente de quem digitou
    const { data: existing, error: selErr } = await supabase
      .from('audit_data')
      .select('sizes')
      .eq('store_id', String(storeId))
      .eq('item_id', Number(itemId))
      .maybeSingle();

    if (selErr) console.warn('[updateAuditItem] SELECT falhou, usando estado local:', selErr.message);

    // Fallback para estado local se SELECT falhar ou linha ainda não existir
    const localItem = auditDataRef?.current?.find(i =>
      String(i.store_id) === String(storeId) && String(i.id) === String(itemId)
    );
    const currentSizes = existing?.sizes || localItem?.sizes || {};

    // Merge: preserva todos os tamanhos, sobrescreve só o tamanho digitado
    const merged = { ...currentSizes, [sizeKey]: sizeValue };
    const qty = Object.values(merged).reduce((a, b) => a + (parseInt(b) || 0), 0);

    // Update otimista: usuário vê o número antes da resposta do banco
    setAuditData(prev => prev.map(i =>
      String(i.store_id) === String(storeId) && String(i.id) === String(itemId)
        ? { ...i, sizes: merged, QTDE: qty }
        : i
    ));

    // Bypass Constraint: Busca ID sem depender do user_id
    const { data: existingLine } = await supabase
      .from('audit_data')
      .select('id')
      .eq('store_id', String(storeId))
      .eq('item_id', Number(itemId))
      .maybeSingle();

    if (existingLine?.id) {
      const { error } = await supabase.from('audit_data')
        .update({ referencia, sizes: merged, qtde: qty })
        .eq('id', existingLine.id);
      if (error) console.error('[updateAuditItem] UPDATE falhou', error);
      else flash('saved');
    } else {
      const { error } = await supabase.from('audit_data')
        .insert({ user_id: userId, store_id: String(storeId), item_id: Number(itemId), referencia, sizes: merged, qtde: qty });
      if (error) console.error('[updateAuditItem] INSERT falhou', error);
      else flash('saved');
    }
  }, [userId, flash]);

  const seedAuditFromSystem = useCallback(async (storeId, systemItems) => {
    if (!userId) return;
    flash('saving');
    try {
      // 🔒 Delete-first: garante exclusão isolada da filial, abrindo caminho limpo.
      await supabase.from('audit_data')
        .delete()
        .eq('store_id', String(storeId));
      const rows = systemItems.map(item => ({
        user_id: userId,
        store_id: String(storeId),
        item_id: item.id,
        referencia: item.REFERENCIA,
        sizes: item.sizes || {},
        qtde: item.QTDE || 0
      }));
      if (rows.length > 0) {
        const { error } = await supabase.from('audit_data').insert(rows);
        if (error) throw error;
      }
      flash('saved');
    } catch (err) {
      console.error('[seedAuditFromSystem]', err);
      flash('error');
    }
    reloadAll();
  }, [userId, reloadAll, flash]);

  const updateDreKey = useCallback(async (dreKey, field, value) => {
    if (!userId) return;
    const current = dreValues[dreKey] || {};
    const newValues = { ...current, [field]: parseFloat(value) || 0 };
    setDreValues(prev => ({ ...prev, [dreKey]: newValues }));
    flash('saving');

    // Bypass constraint global usando apenas dre_key
    const { data: existing } = await supabase.from('dre_values').select('id').eq('dre_key', dreKey).maybeSingle();
    if (existing?.id) {
      await supabase.from('dre_values').update({ values: newValues }).eq('id', existing.id);
    } else {
      await supabase.from('dre_values').insert({ user_id: userId, store_id: dreKey.split('-')[0], dre_key: dreKey, values: newValues });
    }
    flash('saved');
  }, [userId, dreValues, flash]);

  const deleteDreKey = useCallback(async (dreKey) => {
    if (!userId) return;
    setDreValues(prev => { const n = { ...prev }; delete n[dreKey]; return n; });
    await supabase.from('dre_values').delete().eq('dre_key', dreKey);
  }, [userId]);

  const toggleMarketing = useCallback(async (storeId, itemKey, field, currentVal) => {
    if (!userId) return;
    const compositeKey = `${storeId}|${itemKey}`;
    const newVal = !currentVal;
    const updated = { [field]: newVal, ...(field === 'posted' && newVal ? { posted_at: new Date().toISOString() } : {}) };
    // Optimistic UI update
    setMarketingStatus(prev => ({ ...prev, [compositeKey]: { ...prev[compositeKey], ...updated } }));
    flash('saving');
    // SELECT por store_id + item_key (ignora user_id — marketing é da loja, não do usuário)
    const { data: existing } = await supabase
      .from('marketing_status')
      .select('id')
      .eq('store_id', String(storeId))
      .eq('item_key', itemKey)
      .maybeSingle();
    if (existing?.id) {
      // Linha já existe: UPDATE pelo id — não cria duplicata
      const { error } = await supabase
        .from('marketing_status')
        .update(updated)
        .eq('id', existing.id);
      if (error) console.error('[toggleMarketing] UPDATE falhou:', error.code, error.message);
    } else {
      // Linha nova: INSERT com todos os campos necessários
      const { error } = await supabase
        .from('marketing_status')
        .insert({ ...updated, user_id: userId, store_id: String(storeId), item_key: itemKey });
      if (error) console.error('[toggleMarketing] INSERT falhou:', error.code, error.message);
    }
    flash('saved');
  }, [userId, flash]);

  // Seta campos específicos em vez de toggle — usado pela Fila de Postagens
  const upsertMarketingFields = useCallback(async (storeId, itemKey, fields) => {
    if (!userId) return;
    const compositeKey = `${storeId}|${itemKey}`;
    // Optimistic UI update
    setMarketingStatus(prev => ({ ...prev, [compositeKey]: { ...(prev[compositeKey] || {}), ...fields } }));
    flash('saving');
    // SELECT por store_id + item_key — marketing é global por loja
    const { data: existing } = await supabase
      .from('marketing_status')
      .select('id')
      .eq('store_id', String(storeId))
      .eq('item_key', itemKey)
      .maybeSingle();
    if (existing?.id) {
      // Linha já existe: UPDATE direto pelo id
      const { error } = await supabase
        .from('marketing_status')
        .update(fields)
        .eq('id', existing.id);
      if (error) console.error('[upsertMarketingFields] UPDATE falhou:', error.code, error.message);
    } else {
      // Linha nova: INSERT
      const { error } = await supabase
        .from('marketing_status')
        .insert({ ...fields, user_id: userId, store_id: String(storeId), item_key: itemKey });
      if (error) console.error('[upsertMarketingFields] INSERT falhou:', error.code, error.message);
    }
    flash('saved');
  }, [userId, flash]);

  const setMarketingPhoto = useCallback(async (storeId, itemKey, photoUrl) => {
    if (!userId) return;
    const compositeKey = `${storeId}|${itemKey}`;
    // Optimistic UI
    setMarketingStatus(prev => ({
      ...prev,
      [compositeKey]: { ...(prev[compositeKey] || {}), photo: !!photoUrl, photo_url: photoUrl || null }
    }));
    flash('saving');
    const photoFields = {
      photo: !!photoUrl,
      photo_url: photoUrl || null,
    };
    // SELECT por store_id + item_key — não depende de user_id
    const { data: existing } = await supabase
      .from('marketing_status')
      .select('id')
      .eq('store_id', String(storeId))
      .eq('item_key', itemKey)
      .maybeSingle();
    if (existing?.id) {
      const { error } = await supabase
        .from('marketing_status')
        .update(photoFields)
        .eq('id', existing.id);
      if (error) console.error('[setMarketingPhoto] UPDATE falhou:', error.code, error.message);
    } else {
      const { error } = await supabase
        .from('marketing_status')
        .insert({ ...photoFields, user_id: userId, store_id: String(storeId), item_key: itemKey });
      if (error) console.error('[setMarketingPhoto] INSERT falhou:', error.code, error.message);
    }
    flash('saved');
  }, [userId, flash]);

  const setSellerOverride = useCallback(async (key, status) => {
    if (!userId) return;
    setSellerOverrides(prev => ({ ...prev, [key]: status }));
    await supabase.from('user_config').upsert({ user_id: userId, config_key: `seller_${key}`, config_value: { status } }, { onConflict: 'user_id,config_key' });
  }, [userId]);

  const updateSellerStore = useCallback(async (sellerName, storeId) => {
    if (!userId || !sellerName) return;
    const nameKey = sellerName.trim().toUpperCase();
    const configKey = `seller_store_${sellerName.trim().toUpperCase().replace(/ /g, '_')}`;
    // Optimistic update
    setSellerStoreMap(prev => ({ ...prev, [nameKey]: String(storeId) }));
    await supabase.from('user_config').upsert(
      { user_id: userId, config_key: configKey, config_value: { store_id: String(storeId) } },
      { onConflict: 'user_id,config_key' }
    );
  }, [userId]);

  // ── DRE Scenario Persistence (user_config) ──────────────────────────────
  const saveDreScenario = useCallback(async (storeId, period, dreData) => {
    if (!userId || !storeId || !period) return false;
    const configKey = `dre_scenario_${storeId}_${period}`;
    const { error } = await supabase.from('user_config').upsert(
      { user_id: userId, config_key: configKey, config_value: dreData },
      { onConflict: 'user_id,config_key' }
    );
    return !error;
  }, [userId]);

  const loadDreScenario = useCallback(async (storeId, period) => {
    if (!userId || !storeId || !period) return null;
    const configKey = `dre_scenario_${storeId}_${period}`;
    const { data, error } = await supabase
      .from('user_config')
      .select('config_value')
      .eq('user_id', userId)
      .eq('config_key', configKey)
      .maybeSingle();
    if (error || !data) return null;
    return data.config_value || null;
  }, [userId]);

  const saveHrCandidate = useCallback(async (form, editId) => {
    if (!userId) return;
    flash('saving');
    // Helper: converte string vazia em null (Supabase rejeita "" em colunas date)
    const d = (v) => (v && String(v).trim() !== '') ? String(v).trim() : null;
    const t = (v) => (v && String(v).trim() !== '') ? String(v).trim() : null;
    const row = {
      user_id: userId,
      store_id: (form.store_id === 'all' || form.loja === 'all') ? '10' : String(form.store_id || form.loja || '10').replace(/\D/g, '') || '10',
      nome: form.nome,
      telefone: t(form.telefone),
      email: t(form.email),
      cargo: t(form.cargo),
      recebimento_curriculo: d(form.recebimento_curriculo),
      data_resposta: d(form.data_resposta),
      entrevista_data: d(form.entrevista_data),
      data_teste: d(form.data_teste),
      status: form.status || 'triagem',
      motivo: t(form.motivo),
      nota_interna: form.nota_interna ? parseInt(form.nota_interna) : null,
      fonte: t(form.fonte),
      observacoes: t(form.observacoes),
      responsavel: t(form.responsavel),
      updated_at: new Date().toISOString()
    };
    try {
      if (editId) {
        setHrCandidates(prev => prev.map(c => c.id === editId ? { ...c, ...row } : c));
      }
      const { error } = editId
        ? await supabase.from('candidates').update(row).eq('id', editId)
        : await supabase.from('candidates').insert(row);
      if (error) throw error;
      reloadAll(); flash('saved'); return true;
    } catch (err) {
      console.error('[saveHrCandidate] Erro 400:', err);
      flash('error'); return false;
    }
  }, [userId, flash, reloadAll]);

  const deleteHrCandidate = useCallback(async (id) => { if (!userId) return; await supabase.from('candidates').delete().eq('id', id); reloadAll(); }, [userId, reloadAll]);
  const archiveHrCandidate = useCallback(async (id) => { if (!userId) return; await supabase.from('candidates').update({ is_archived: true }).eq('id', id); reloadAll(); }, [userId, reloadAll]);
  const moveHrStatus = useCallback(async (id, newStatus, extra = {}) => { if (!userId) return; await supabase.from('candidates').update({ status: newStatus, ...extra }).eq('id', id); reloadAll(); }, [userId, reloadAll]);

  const saveTask = useCallback(async (f, editId) => {
    if (!userId) return;
    flash('saving');
    // Timezone-safe: gera data local YYYY-MM-DD sem conversão UTC
    const todayLocal = new Date();
    const todayStr = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`;
    const storeId = (f.store_id && f.store_id !== 'all') ? normalizeStoreCode(f.store_id) : null;
    const row = {
      user_id: userId,
      store_id: storeId,
      title: f.title,
      status: f.status || 'To Do',
      camada: f.camada || 'plano_acao',
      weekday: f.weekday || null,
      frequency: f.frequency || 'nenhuma',
      priority: f.priority || 'medium',
      due_date: f.due_date || todayStr,
      description: f.description || '',
      subtasks_list: f.subtasks_list || [],
      sprint_id: f.sprint_id || null,
      project_id: f.project_id || null,
    };
    if (editId) {
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === editId ? { ...t, ...row, id: editId } : t));
      await supabase.from('tasks').update(row).eq('id', editId);
    } else {
      const tempId = `temp-${Date.now()}`;
      // Optimistic insert
      setTasks(prev => [...prev, { ...row, id: tempId, is_archived: false, created_at: new Date().toISOString() }]);
      await supabase.from('tasks').insert(row);
    }
    reloadAll(); flash('saved'); return true;
  }, [userId, flash, reloadAll]);

  const deleteTask = useCallback(async (id) => { if (!userId) return; setTasks(prev => prev.filter(t => t.id !== id)); await supabase.from('tasks').delete().eq('id', id); reloadAll(); }, [userId, reloadAll]);
  const moveTaskStatus = useCallback(async (id, s) => { if (!userId) return; setTasks(prev => prev.map(t => t.id === id ? { ...t, status: s } : t)); await supabase.from('tasks').update({ status: s }).eq('id', id); reloadAll(); }, [userId, reloadAll]);
  const moveTaskCamada = useCallback(async (id, c, ex = {}) => { if (!userId) return; setTasks(prev => prev.map(t => t.id === id ? { ...t, camada: c, ...ex } : t)); await supabase.from('tasks').update({ camada: c, ...ex }).eq('id', id); reloadAll(); }, [userId, reloadAll]);
  const archiveTask = useCallback(async (id) => {
    if (!userId) return;
    // Busca a tarefa ANTES de remover do estado — necessário para lógica de recorrência
    const task = tasks.find(t => t.id === id);
    setTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from('tasks').update({ is_archived: true, status: 'Done' }).eq('id', id);

    // ── Recorrência Semanal: clona com due_date + 7 dias ──────────────────────────
    if (task && (task.frequency === 'semanal' || task.frequency === 'Semanal')) {
      const addDays = (dateStr, days) => {
        const [y, m, d] = (dateStr || '').split('-').map(Number);
        const base = (y && m && d) ? new Date(y, m - 1, d) : new Date();
        base.setDate(base.getDate() + days);
        return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
      };
      const cloneRow = {
        user_id: userId,
        store_id: task.store_id || null,
        title: task.title,
        status: 'To Do',           // sempre recomeça como "To Do"
        camada: task.camada || 'quick_task',
        weekday: task.weekday || null,
        frequency: task.frequency,
        priority: task.priority || 'medium',
        due_date: addDays(task.due_date, 7),
        description: task.description || '',
        subtasks_list: task.subtasks_list || [],
        sprint_id: task.sprint_id || null,
        project_id: task.project_id || null,
        is_archived: false,
      };
      const { data: inserted } = await supabase.from('tasks').insert(cloneRow).select().single();
      if (inserted) setTasks(prev => [...prev, inserted]);
    }
    reloadAll();
  }, [userId, tasks, reloadAll]);

  const updateProjectionSeller = useCallback(async (key, count) => {
    if (!userId) return;
    setProjectionSellers(prev => ({ ...prev, [key]: count }));
    await supabase.from('user_config').upsert({ user_id: userId, config_key: `proj_${key}`, config_value: { count } }, { onConflict: 'user_id,config_key' });
  }, [userId]);

  const saveCrmLead = useCallback(async (f, editId) => {
    if (!userId) return;
    flash('saving');
    // Trava Anti-Global: nunca escrever 'Todas' ou 'all' no BD
    const rawStore = f.store_id;
    const safeStore = (!rawStore || rawStore === 'all' || rawStore === 'Todas')
      ? '10'
      : String(rawStore).replace(/\D/g, '') || '10';
    const row = {
      user_id: userId,
      store_id: safeStore,
      nome: f.nome,
      name: f.nome,
      telefone: f.telefone,
      origem: f.origem,
      estagio: f.estagio || f.status,
      status: f.status || f.estagio,
      produto: Array.isArray(f.produto) ? f.produto.join(', ') : (f.produto || ''),
      marca: Array.isArray(f.marca) ? f.marca.join(', ') : (f.marca || ''),
      modelo: Array.isArray(f.modelo) ? f.modelo.join(', ') : (f.modelo || ''),
      tamanho: Array.isArray(f.tamanho) ? f.tamanho.join(', ') : (f.tamanho || ''),
      tipo_cliente: f.tipo_cliente || 'cliente',
      observacoes: f.observacoes,
      updated_at: new Date().toISOString(),
    };
    // UPDATE se temos UUID; INSERT se é novo lead
    const id = editId || f.id;
    try {
      const { error } = id
        ? await supabase.from('crm_leads').update(row).eq('id', id)
        : await supabase.from('crm_leads').insert(row);
      if (error) throw error;
      reloadAll(); flash('saved'); return true;
    } catch (err) {
      console.error('[saveCrmLead] Erro ao salvar lead:', err);
      flash('error'); return false;
    }
  }, [userId, flash, reloadAll]);

  const moveCrmLeadStage = useCallback(async (id, s, ex = {}) => { if (!userId) return; await supabase.from('crm_leads').update({ status: s, updated_at: new Date().toISOString(), ...ex }).eq('id', id); reloadAll(); }, [userId, reloadAll]);
  const deleteCrmLead = useCallback(async (id) => { if (!userId) return; await supabase.from('crm_leads').delete().eq('id', id); reloadAll(); }, [userId, reloadAll]);
  const archiveCrmLead = useCallback(async (id) => { if (!userId) return; await supabase.from('crm_leads').update({ is_archived: true, updated_at: new Date().toISOString() }).eq('id', id); reloadAll(); }, [userId, reloadAll]);

  const saveCrmWishlist = useCallback(async (f, editId) => {
    if (!userId) return;
    flash('saving');
    // Mapeamento EXATO das colunas de crm_wishlist — colunas extras causam erro 400
    const userModel = Array.isArray(f.modelo) ? f.modelo.join(', ') : (f.modelo || f.model || '');
    const userSize = Array.isArray(f.tamanho) ? f.tamanho.join(', ') : (f.tamanho || f.size || '');
    const extraNotes = [userModel ? `Modelo: ${userModel}` : '', userSize ? `Tamanho: ${userSize}` : ''].filter(Boolean).join(' | ');

    // Trava Anti-Global: nunca escrever 'Todas' ou 'all' no BD
    const rawStore = f.store_id;
    const safeStore = (!rawStore || rawStore === 'all' || rawStore === 'Todas')
      ? '10'
      : String(rawStore).replace(/\D/g, '') || '10';

    const row = {
      user_id: userId,
      store_id: safeStore,
      client_name: (f.cliente || f.client_name || '').trim() || null,
      product_name: (f.produto || f.product || '').trim() || null,
      brand: Array.isArray(f.marca) ? f.marca.join(', ') : (f.marca || f.brand || null) || null,
      contact_info: (f.wpp || f.contato || f.contact || f.contact_info || '').trim() || null,
      priority: f.tipo_cliente || f.prioridade || f.priority || 'cliente',
      status: f.status || 'waiting',
      target_date: f.data || f.prazo || f.target_date || 'Indefinido',
      notes: extraNotes || null
    };
    try {
      // ✔️ Regra de Negócio: O campo telefone (contact_info) NÃO é chave única.
      // UPDATE apenas se o card já tem um UUID (edição explícita).
      // INSERT sempre que for um novo card — permite múltiplos pedidos por cliente.
      const editIdToUse = editId || f.id;
      const { error } = editIdToUse
        ? await supabase.from('crm_wishlist').update(row).eq('id', editIdToUse)
        : await supabase.from('crm_wishlist').insert(row);
      if (error) throw error;
      reloadAll(); flash('saved'); return true;
    } catch (err) {
      console.error('[saveCrmWishlist] Erro 400 — verificar colunas da tabela:', err);
      flash('error'); return false;
    }
  }, [userId, flash, reloadAll]);

  const deleteCrmWishlist = useCallback(async (id) => { if (!userId) return; await supabase.from('crm_wishlist').delete().eq('id', id); reloadAll(); }, [userId, reloadAll]);
  const updateCrmWishlistStatus = useCallback(async (id, status) => { if (!userId) return; await supabase.from('crm_wishlist').update({ status }).eq('id', id); reloadAll(); }, [userId, reloadAll]);

  // Persiste uma nova tag customizada e atualiza estado local imediatamente
  const addCrmCustomTag = useCallback(async (storeId, category, value) => {
    if (!value || !category) return;
    const trimmed = String(value).trim();
    if (!trimmed) return;
    // Evita duplicata local antes de ir ao banco
    const alreadyExists = crmCustomTags.some(
      t => String(t.store_id) === String(storeId) && t.category === category && t.value === trimmed
    );
    if (alreadyExists) return;
    // Update otimista
    setCrmCustomTags(prev => [...prev, { store_id: String(storeId), category, value: trimmed }]);
    const { error } = await supabase
      .from('crm_custom_tags')
      .insert({ store_id: String(storeId), category, value: trimmed });
    if (error) {
      console.error('[addCrmCustomTag] insert falhou:', error.message);
      // Reverte update otimista em caso de falha
      setCrmCustomTags(prev => prev.filter(t => !(String(t.store_id) === String(storeId) && t.category === category && t.value === trimmed)));
    }
  }, [crmCustomTags]);

  // --- ⚙️ OP. MULTI-TENANT (OWNER ONLY) ---
  const getSystemProfiles = useCallback(async () => {
    if (userRole !== 'owner') return [];
    const { data, error } = await supabase.from('user_profiles').select('*').order('email', { ascending: true });
    if (error) { console.error('[getSystemProfiles]', error); return []; }
    return data || [];
  }, [userRole]);

  const saveSystemProfile = useCallback(async (profile) => {
    if (userRole !== 'owner') return { success: false, error: 'Acesso Negado' };
    flash('saving');
    // Upsert expects email as unique if no id is provided or valid.
    const payload = {
      email: profile.email.trim().toLowerCase(),
      role: profile.role,
      store_id: profile.role === 'owner' ? null : profile.store_id
    };
    if (profile.id) payload.id = profile.id;

    const { error } = await supabase.from('user_profiles').upsert(payload, { onConflict: 'email' });
    if (error) {
      console.error('[saveSystemProfile]', error);
      flash('error');
      return { success: false, error: error.message };
    }
    flash('saved');
    return { success: true };
  }, [userRole, flash]);

  const deleteSystemProfile = useCallback(async (id) => {
    if (userRole !== 'owner') return false;
    flash('saving');
    const { error } = await supabase.from('user_profiles').delete().eq('id', id);
    if (error) { console.error('[deleteSystemProfile]', error); flash('error'); return false; }
    flash('saved');
    return true;
  }, [userRole, flash]);

  // ── Log silencioso de ações do Owner ──────────────────────────────────────
  const logOwnerAction = useCallback(async (action, payload = {}) => {
    if (!userId) return;
    try {
      await supabase.from('owner_logs').insert({
        user_id: userId,
        action: String(action),
        payload,
      });
    } catch (err) {
      // Falha silenciosa — nunca bloquear a UX por causa do log
      console.warn('[logOwnerAction] falhou silenciosamente:', err.message);
    }
  }, [userId]);

  return {
    loading, syncStatus, userRole, userStoreId, systemData, auditData, salesHistory, dreValues, projectionSellers, marketingStatus, sellerOverrides, sellerStoreMap, hrCandidates, tasks, crmLeads, crmWishlist, crmCustomTags,
    setSystemData: setSystemDataForStore, setAuditData: seedAuditFromSystem, updateAuditItem, upsertSalesHistory, updateDreKey, deleteDreKey, toggleMarketing, upsertMarketingFields, setMarketingPhoto, setSellerOverride, updateSellerStore, saveDreScenario, loadDreScenario, saveHrCandidate, deleteHrCandidate, archiveHrCandidate, moveHrStatus, saveTask, deleteTask, archiveTask, moveTaskStatus, moveTaskCamada, updateProjectionSeller, saveCrmLead, moveCrmLeadStage, deleteCrmLead, archiveCrmLead, saveCrmWishlist, deleteCrmWishlist, updateCrmWishlistStatus, addCrmCustomTag, getSystemProfiles, saveSystemProfile, deleteSystemProfile, logOwnerAction, reloadAll
  };
}