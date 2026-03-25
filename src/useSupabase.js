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
  const [completedIds, setCompletedIds] = useState(new Set());
  const [sellerOverrides, setSellerOverrides] = useState({});
  const [hrCandidates, setHrCandidates] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [crmLeads, setCrmLeads] = useState([]);
  const [hrCollaborators, setHrCollaborators] = useState([]);
  const [hrAbsences, setHrAbsences] = useState([]);
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
        { data: projD }, { data: mktD }, { data: compD }, { data: ovD },
        { data: hrD }, { data: tasksD }, { data: crmD }, { data: collabD },
        { data: absencesD }, { data: crmWishD }, { data: crmTagsD },
      ] = await Promise.all([
        storeQ(supabase.from('system_data').select('*')),
        storeQ(supabase.from('audit_data').select('*')),
        storeQ(supabase.from('sales_performance').select('*')),
        supabase.from('dre_values').select('*'),
        supabase.from('user_config').select('*').like('config_key', 'proj_%'),
        storeQ(supabase.from('marketing_status').select('*')),
        storeQ(supabase.from('completed_ids').select('*')),
        supabase.from('user_config').select('*').like('config_key', 'seller_%'),
        storeQ(supabase.from('candidates').select('*')).eq('is_archived', false),
        storeQ(supabase.from('tasks').select('*')).eq('is_archived', false),
        storeQ(supabase.from('crm_leads').select('*')).eq('is_archived', false),
        storeQ(supabase.from('employees').select('*')).eq('is_archived', false),
        supabase.from('hr_absences').select('*'),
        storeQ(supabase.from('crm_wishlist').select('*')),
        supabase.from('crm_custom_tags').select('*'),
      ]);

      setSystemData((sysD || []).map(normalizeSystemRow));
      setAuditData((audD || []).map(normalizeAuditRow));
      setSalesHistory((salesD || []).map(normalizeSalesRow));

      const dreObj = {}; (dreD || []).forEach(r => { dreObj[r.dre_key] = r.values; });
      setDreValues(dreObj);

      const projObj = {}; (projD || []).forEach(r => { projObj[r.config_key.replace('proj_', '')] = r.config_value.count; });
      setProjectionSellers(projObj);

      const mktObj = {}; (mktD || []).forEach(r => {
        mktObj[`${r.store_id}|${r.item_key}`] = { photo: r.photo, photo_url: r.photo_url || null, catalog: r.catalog, posted: r.posted, discontinued: r.discontinued, posted_at: r.posted_at, in_queue: r.in_queue || false, post_week: r.post_week || '', post_day: r.post_day || '', post_type: r.post_type || '' };
      });
      setMarketingStatus(mktObj);

      setCompletedIds(new Set((compD || []).map(r => `${r.store_id}|${r.item_id}`)));

      const ovObj = {}; (ovD || []).forEach(r => { ovObj[r.config_key.replace('seller_', '')] = r.config_value.status; });
      setSellerOverrides(ovObj);

      setHrCandidates((hrD || []).map(r => ({ ...r, store_id: normalizeStoreCode(r.store_id) })));
      setTasks((tasksD || []).map(r => ({ ...r, store_id: normalizeStoreCode(r.store_id) })));
      setCrmLeads((crmD || []).map(r => ({ ...r, store_id: normalizeStoreCode(r.store_id) })));
      setHrCollaborators((collabD || []).map(r => ({ ...r, store_id: normalizeStoreCode(r.store_id) })));
      setHrAbsences(absencesD || []);
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
    return {
      id: r.id,
      storeCode: String(r.store_id || ''),
      sellerName: r.seller_name,
      daysWorked: parseInt(r.days_worked) || 0,
      salesCount: parseInt(r.sales_count) || 0,
      itemsCount: parseInt(r.items_count) || 0,
      pa: parseFloat(r.pa) || 0,
      totalSales: parseFloat(r.total_sales) || 0,
      ticketAvg: parseFloat(r.ticket_avg) || 0,
      period: r.period_start ? String(r.period_start).slice(0, 7) : '',
    };
  }

  // --- ACTIONS ---
  const upsertSalesHistory = useCallback(async (newEntries, clearStore, clearPeriod) => {
    if (!userId) return;
    flash('saving');
    try {
      const fmt = (p) => (p && p.length === 7) ? `${p}-01` : p;

      // 1. Limpeza opcional
      if (clearStore && clearPeriod) {
        await supabase.from('sales_performance').delete()
          .eq('user_id', userId).eq('store_id', String(clearStore)).eq('period_start', fmt(clearPeriod));
      }

      // 2. Mapeamento e Peneira Fina
      // IMPORTANTE: vendedoras com nomes iguais (ex: múltiplas "EXTRA") no mesmo
      // mês/loja são SOMADAS — não sobrescritas — para preservar o total real de vendas.
      const cleanRowsMap = new Map();
      newEntries.forEach(e => {
        const name = e.sellerName ? String(e.sellerName).trim().toUpperCase() : '';
        if (!name || name === 'TOTAL' || name === 'N/A') return;

        const rowDate = fmt(e.period);
        const key = `${e.storeCode}_${name}_${rowDate}`;

        const incoming = {
          user_id: userId,
          store_id: String(e.storeCode),
          seller_name: e.sellerName,
          days_worked: parseInt(e.daysWorked) || 0,
          sales_count: parseInt(e.salesCount) || 0,
          items_count: parseInt(e.itemsCount) || 0,
          total_sales: parseFloat(e.totalSales) || 0,
          pa: parseFloat(e.pa) || 0,
          ticket_avg: parseFloat(e.ticketAvg) || 0,
          price_avg: parseFloat(e.priceAvg || 0),
          period_start: rowDate
        };

        if (cleanRowsMap.has(key)) {
          // Soma os valores numéricos para vendedoras com nome duplicado no mesmo mês
          const existing = cleanRowsMap.get(key);
          const combinedCount = existing.sales_count + incoming.sales_count;
          const combinedItems = existing.items_count + incoming.items_count;
          cleanRowsMap.set(key, {
            ...existing,
            total_sales: existing.total_sales + incoming.total_sales,
            sales_count: combinedCount,
            items_count: combinedItems,
            days_worked: Math.max(existing.days_worked, incoming.days_worked),
            // PA recalculado: itens/vendas combinados
            pa: combinedCount > 0 ? combinedItems / combinedCount : existing.pa,
            // Ticket médio recalculado: total / vendas
            ticket_avg: combinedCount > 0
              ? (existing.total_sales + incoming.total_sales) / combinedCount
              : existing.ticket_avg,
          });
        } else {
          cleanRowsMap.set(key, incoming);
        }
      });

      const finalRows = Array.from(cleanRowsMap.values());
      if (finalRows.length > 0) {
        const { error } = await supabase.from('sales_performance')
          .upsert(finalRows, { onConflict: 'store_id,seller_name,period_start' });
        if (error) throw error;
      }

      const { data } = await supabase.from('sales_performance').select('*');
      setSalesHistory((data || []).map(normalizeSalesRow));
      flash('saved');
    } catch (err) { console.error('[upsertSalesHistory]', err); flash('error'); }
  }, [userId, flash]);

  const setSystemDataForStore = useCallback(async (storeId, parsedItems) => {
    if (!userId) return;
    flash('saving');
    try {
      await supabase.from('system_data').delete().eq('user_id', userId).eq('store_id', storeId);
      const rows = parsedItems.map((item, idx) => ({ user_id: userId, store_id: storeId, item_id: item.id || idx + 1, marca: item.MARCA, marcadesc: item.MARCADESC, tipodesc: item.TIPODESC, referencia: item.REFERENCIA, cor1desc: item.COR1DESC, dataentrada: item.DATAENTRADA, sizes: item.sizes || {}, qtde: item.QTDE || 0 }));
      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        await supabase.from('system_data').upsert(rows.slice(i, i + chunkSize), { onConflict: 'user_id,store_id,item_id' });
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

    const { error } = await supabase
      .from('audit_data')
      .upsert(
        { user_id: userId, store_id: String(storeId), item_id: Number(itemId),
          referencia, sizes: merged, qtde: qty },
        { onConflict: 'user_id,store_id,item_id' }
      );

    if (error) {
      console.error('[updateAuditItem] upsert FALHOU:', error.code, error.message, error.details);
      flash('error');
    } else {
      flash('saved');
    }
  }, [userId, flash]);

  const seedAuditFromSystem = useCallback(async (storeId, systemItems) => {
    if (!userId) return;
    flash('saving');
    try {
      // 🔒 Delete-first: garante que não há duplicação/triplicação no banco
      await supabase.from('audit_data')
        .delete()
        .eq('user_id', userId)
        .eq('store_id', String(storeId));
      const rows = systemItems.map(item => ({
        user_id: userId,
        store_id: storeId,
        item_id: item.id,
        referencia: item.REFERENCIA,
        // sizes já vem zerado quando chamado pelo handleZerarEstoque
        sizes: item.sizes || {},
        qtde: item.QTDE || 0
      }));
      if (rows.length > 0) {
        const { error } = await supabase.from('audit_data')
          .upsert(rows, { onConflict: 'user_id,store_id,item_id' });
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
    await supabase.from('dre_values').upsert({ user_id: userId, dre_key: dreKey, values: newValues }, { onConflict: 'user_id,dre_key' });
    flash('saved');
  }, [userId, dreValues, flash]);

  const deleteDreKey = useCallback(async (dreKey) => {
    if (!userId) return;
    setDreValues(prev => { const n = { ...prev }; delete n[dreKey]; return n; });
    await supabase.from('dre_values').delete().eq('user_id', userId).eq('dre_key', dreKey);
  }, [userId]);

  const toggleMarketing = useCallback(async (storeId, itemKey, field, currentVal) => {
    if (!userId) return;
    const compositeKey = `${storeId}|${itemKey}`;
    const newVal = !currentVal;
    const updated = { [field]: newVal, ...(field === 'posted' && newVal ? { posted_at: new Date().toISOString() } : {}) };
    // Update otimista na UI
    setMarketingStatus(prev => ({ ...prev, [compositeKey]: { ...prev[compositeKey], ...updated } }));
    flash('saving');
    // SELECT sem user_id — acha a linha independente de qual device criou
    const { data: existing } = await supabase
      .from('marketing_status')
      .select('*')
      .eq('store_id', String(storeId))
      .eq('item_key', itemKey)
      .maybeSingle();
    // ownerUserId: usa o user_id da linha existente para não criar duplicata entre devices
    const ownerUserId = existing?.user_id || userId;
    const merged = { ...(existing || {}), ...updated, user_id: ownerUserId, store_id: String(storeId), item_key: itemKey };
    const { error } = await supabase
      .from('marketing_status')
      .upsert(merged, { onConflict: 'user_id,store_id,item_key' });
    if (error) console.error('[toggleMarketing] upsert falhou:', error.code, error.message);
    flash('saved');
  }, [userId, flash]);

  // Seta campos específicos em vez de toggle — usado pela Fila de Postagens
  const upsertMarketingFields = useCallback(async (storeId, itemKey, fields) => {
    if (!userId) return;
    const compositeKey = `${storeId}|${itemKey}`;
    // Update otimista na UI
    setMarketingStatus(prev => ({ ...prev, [compositeKey]: { ...(prev[compositeKey] || {}), ...fields } }));
    flash('saving');
    // SELECT → MERGE → UPSERT (padrão blindado)
    const { data: existing } = await supabase
      .from('marketing_status')
      .select('*')
      .eq('store_id', String(storeId))
      .eq('item_key', itemKey)
      .maybeSingle();
    const ownerUserId = existing?.user_id || userId;
    const merged = { ...(existing || {}), ...fields, user_id: ownerUserId, store_id: String(storeId), item_key: itemKey };
    const { error } = await supabase
      .from('marketing_status')
      .upsert(merged, { onConflict: 'user_id,store_id,item_key' });
    if (error) console.error('[upsertMarketingFields] upsert falhou:', error.code, error.message);
    flash('saved');
  }, [userId, flash]);

  const setMarketingPhoto = useCallback(async (storeId, itemKey, photoUrl) => {
    if (!userId) return;
    const compositeKey = `${storeId}|${itemKey}`;
    // Update otimista — photo boolean e photo_url em sincronia
    setMarketingStatus(prev => ({
      ...prev,
      [compositeKey]: { ...(prev[compositeKey] || {}), photo: !!photoUrl, photo_url: photoUrl || null }
    }));
    flash('saving');
    // SELECT sem user_id — preserva flags existentes (catalog, posted, etc.)
    const { data: existing } = await supabase
      .from('marketing_status')
      .select('*')
      .eq('store_id', String(storeId))
      .eq('item_key', itemKey)
      .maybeSingle();
    const ownerUserId = existing?.user_id || userId;
    const merged = {
      ...(existing || {}),
      user_id: ownerUserId, store_id: String(storeId), item_key: itemKey,
      photo: !!photoUrl,        // flag boolean — usada pelo filtro "Sem Foto"
      photo_url: photoUrl || null, // URL para exibir miniatura
    };
    const { error } = await supabase
      .from('marketing_status')
      .upsert(merged, { onConflict: 'user_id,store_id,item_key' });
    if (error) console.error('[setMarketingPhoto] upsert falhou:', error.code, error.message);
    flash('saved');
  }, [userId, flash]);

  const toggleCompleted = useCallback(async (storeId, itemId) => {
    if (!userId) return;
    const key = `${storeId}|${itemId}`;
    const exists = completedIds.has(key);
    setCompletedIds(prev => { const n = new Set(prev); exists ? n.delete(key) : n.add(key); return n; });
    if (exists) await supabase.from('completed_ids').delete().eq('user_id', userId).eq('store_id', storeId).eq('item_id', itemId);
    else await supabase.from('completed_ids').upsert({ user_id: userId, store_id: storeId, item_id: itemId });
  }, [userId, completedIds]);

  const setSellerOverride = useCallback(async (key, status) => {
    if (!userId) return;
    setSellerOverrides(prev => ({ ...prev, [key]: status }));
    await supabase.from('user_config').upsert({ user_id: userId, config_key: `seller_${key}`, config_value: { status } }, { onConflict: 'user_id,config_key' });
  }, [userId]);

  const saveHrCandidate = useCallback(async (form, editId) => {
    if (!userId) return;
    flash('saving');
    // Helper: converte string vazia em null (Supabase rejeita "" em colunas date)
    const d = (v) => (v && String(v).trim() !== '') ? String(v).trim() : null;
    const t = (v) => (v && String(v).trim() !== '') ? String(v).trim() : null;
    const row = {
      user_id: userId,
      store_id: String(normalizeStoreCode(form.store_id || form.loja) || '10'),
      nome: form.nome,
      name: form.nome,               // coluna duplicada na tabela
      telefone: t(form.telefone),
      cargo: t(form.cargo),
      fonte: t(form.fonte),
      status: form.status || 'triagem',
      motivo: t(form.motivo),
      observacoes: t(form.observacoes),
      recebimento_curriculo: d(form.recebimento_curriculo),
      entrevista_data: d(form.entrevista_data),
      contratacao_data: d(form.contratacao_data),
      is_archived: false,
    };
    try {
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
        return `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(base.getDate()).padStart(2,'0')}`;
      };
      const cloneRow = {
        user_id:       userId,
        store_id:      task.store_id      || null,
        title:         task.title,
        status:        'To Do',           // sempre recomeça como "To Do"
        camada:        task.camada        || 'quick_task',
        weekday:       task.weekday       || null,
        frequency:     task.frequency,
        priority:      task.priority      || 'medium',
        due_date:      addDays(task.due_date, 7),
        description:   task.description  || '',
        subtasks_list: task.subtasks_list || [],
        sprint_id:     task.sprint_id     || null,
        project_id:    task.project_id    || null,
        is_archived:   false,
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
    const row = { user_id: userId, store_id: f.store_id !== 'all' ? normalizeStoreCode(f.store_id) : null, nome: f.nome, name: f.nome, telefone: f.telefone, produto_interesse: f.produto_interesse, estagio: f.estagio, valor_estimado: f.valor_estimado, origem: f.origem, data_contato: f.data_contato, data_ultimo_followup: f.data_ultimo_followup, observacoes: f.observacoes };
    if (editId) await supabase.from('crm_leads').update(row).eq('id', editId);
    else await supabase.from('crm_leads').insert(row);
    reloadAll(); flash('saved'); return true;
  }, [userId, flash, reloadAll]);

  const moveCrmLeadStage = useCallback(async (id, s, ex = {}) => { if (!userId) return; await supabase.from('crm_leads').update({ estagio: s, ...ex }).eq('id', id); reloadAll(); }, [userId, reloadAll]);
  const deleteCrmLead = useCallback(async (id) => { if (!userId) return; await supabase.from('crm_leads').delete().eq('id', id); reloadAll(); }, [userId, reloadAll]);
  const archiveCrmLead = useCallback(async (id) => { if (!userId) return; await supabase.from('crm_leads').update({ is_archived: true }).eq('id', id); reloadAll(); }, [userId, reloadAll]);

  const saveCrmWishlist = useCallback(async (f, editId) => {
    if (!userId) return;
    flash('saving');
    // Mapeamento EXATO das colunas de crm_wishlist — colunas extras causam erro 400
    const row = {
      user_id:     userId,
      store_id:    (f.store_id && f.store_id !== 'all') ? normalizeStoreCode(f.store_id) : null,
      client_name: (f.cliente  || f.client_name || '').trim() || null,
      product:     (f.produto  || f.product     || '').trim() || null,
      brand:       Array.isArray(f.marca) ? f.marca.join(', ') : (f.marca || f.brand || null) || null,
      model:       Array.isArray(f.modelo) ? f.modelo.join(', ') : (f.modelo  || f.model  || null),
      size:        Array.isArray(f.tamanho) ? f.tamanho.join(', ') : (f.tamanho || f.size   || null),
      contact_info: (f.wpp || f.contato || f.contact || f.contact_info || '').trim() || null,
      prioridade:  f.prioridade || 'media',
      status:      f.status || 'waiting',
      data:        f.data || new Date().toISOString().slice(0, 10),
    };
    try {
      const { error } = editId
        ? await supabase.from('crm_wishlist').update(row).eq('id', editId)
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

  return {
    loading, syncStatus, userRole, userStoreId, systemData, auditData, salesHistory, dreValues, projectionSellers, marketingStatus, completedIds, sellerOverrides, hrCandidates, tasks, crmLeads, hrCollaborators, hrAbsences, crmWishlist, crmCustomTags,
    setSystemData: setSystemDataForStore, setAuditData: seedAuditFromSystem, updateAuditItem, upsertSalesHistory, updateDreKey, deleteDreKey, toggleMarketing, upsertMarketingFields, setMarketingPhoto, toggleCompleted, setSellerOverride, saveHrCandidate, deleteHrCandidate, archiveHrCandidate, moveHrStatus, saveTask, deleteTask, archiveTask, moveTaskStatus, moveTaskCamada, updateProjectionSeller, saveCrmLead, moveCrmLeadStage, deleteCrmLead, archiveCrmLead, saveCrmWishlist, deleteCrmWishlist, updateCrmWishlistStatus, addCrmCustomTag, reloadAll
  };
}