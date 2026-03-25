import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } }
);
// ... (mantenha os imports e o início da função useSupabaseData)

// ── NOVOS ESTADOS ──────────────────────────────────────────
const [crmLeads, setCrmLeads] = useState([]);
const [employees, setEmployees] = useState([]);
const [absences, setAbsences] = useState([]);

// ── RELOAD ALL (ADICIONE ESTAS CHAMADAS NO Promise.all) ────
// No reloadAll, adicione:
// supabase.from('crm_leads').select('*').eq('user_id', userId).order('last_contact', { ascending: false }),
// supabase.from('employees').select('*').eq('user_id', userId).order('name'),
// supabase.from('hr_absences').select('*').eq('user_id', userId),

// ── CRM: FUNIL DE VENDAS ────────────────────────────────────
const saveCrmLead = useCallback(async (lead) => {
  if (!userId) return;
  flash('saving');
  const { error } = await supabase.from('crm_leads').upsert({
    ...lead,
    user_id: userId,
    store_id: normalizeStoreCode(lead.store_id)
  });
  if (!error) { reloadAll(); flash('saved'); }
}, [userId, flash, reloadAll]);

// ── RH: ATIVAÇÃO DE COLABORADOR ─────────────────────────────
const activateCollaboratorFromCandidate = useCallback(async (candidate) => {
  if (!userId) return;
  flash('saving');
  // 1. Cria o colaborador na tabela employees
  const { error: empError } = await supabase.from('employees').insert({
    user_id: userId,
    candidate_id: candidate.id,
    name: candidate.nome,
    store_id: candidate.loja,
    role: candidate.cargo || 'Vendedora',
    status: 'Ativo'
  });
  // 2. Atualiza o status no RH para 'Contratado'
  if (!empError) {
    await supabase.from('hr_candidates').update({ status: 'contratado' }).eq('id', candidate.id);
    reloadAll();
    flash('saved');
  }
}, [userId, flash, reloadAll]);

// ── GTD: TRANSIÇÃO DE CAMADAS (BrainDump -> PlanoAcao) ──────
const moveTaskCamada = useCallback(async (taskId, newCamada) => {
  if (!userId) return;
  const { error } = await supabase.from('tasks')
    .update({ gtd_type: newCamada })
    .eq('id', taskId);
  if (!error) reloadAll();
}, [userId, reloadAll]);

// Adicione as novas funções e estados no return do hook...