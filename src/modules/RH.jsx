import React, { useState, useMemo } from 'react';
import { UserCheck, PlusCircle, Search, X, AlertCircle, ChevronDown } from 'lucide-react';
import { normalizeStoreCode } from '../utils/formatters';
import { ProjectDashboard } from '../components/ui/project-management-dashboard';
import { StatsCard } from '../components/ui/stats-card';

const HR_STATUS = [
    { id: 'triagem', label: 'Triagem (Currículo Recebido)', bg: 'from-blue-500 to-blue-700', activeClass: 'bg-blue-600 text-white border-blue-600', emoji: '📋' },
    { id: 'contato_realizado', label: 'Contato Realizado (Aguardando Retorno)', bg: 'from-sky-400 to-sky-600', activeClass: 'bg-sky-500 text-white border-sky-500', emoji: '📞' },
    { id: 'entrevista_agendada', label: 'Entrevista Agendada', bg: 'from-purple-400 to-purple-600', activeClass: 'bg-purple-500 text-white border-purple-500', emoji: '📅' },
    { id: 'entrevista_realizada', label: 'Entrevista realizada', bg: 'from-indigo-400 to-indigo-600', activeClass: 'bg-indigo-500 text-white border-indigo-500', emoji: '🗣️' },
    { id: 'teste_agendado', label: 'Teste Agendado', bg: 'from-orange-400 to-orange-600', activeClass: 'bg-orange-500 text-white border-orange-500', emoji: '📝' },
    { id: 'fase_teste', label: 'Fase de Teste', bg: 'from-amber-400 to-amber-600', activeClass: 'bg-amber-500 text-white border-amber-500', emoji: '⏳' },
    { id: 'contratado', label: 'Contratado', bg: 'from-green-500 to-emerald-700', activeClass: 'bg-green-600 text-white border-green-600', emoji: '✅' },
    { id: 'finalizado', label: 'Finalizado (Sem Contratação)', bg: 'from-gray-500 to-gray-700', activeClass: 'bg-gray-600 text-white border-gray-600', emoji: '🏁' },
    { id: 'banco_talentos', label: 'Banco de Talentos', bg: 'from-teal-500 to-teal-700', activeClass: 'bg-teal-600 text-white border-teal-600', emoji: '🌟' }
];

const CARGO_OPTIONS = ['Vendedora', 'Gerente', 'Caixa', 'Estoquista', 'Auxiliar', 'Outro'];
const FONTE_OPTIONS = ['', 'Entregue em mãos', 'Entrega digital por anúncios', 'Entrega digital por indicação'];
const MOTIVO_OPTIONS = ['', 'Pendente', 'Não compareceu', 'Não atende ao perfil', 'Rejeitado', 'Já está trabalhando', 'Freelance', 'Menor de idade', 'Número inválido', 'Desligada da empresa', 'Indisponível (Férias/Retorno)'];

export const RH = ({
    hrCandidates, STORE_CONFIGS, selectedStore,
    saveHrCandidate, deleteHrCandidate, moveHrStatus,
}) => {
    // ── ESTADOS ────────────────────────────────────────────────────
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [filterStore, setFilterStore] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({
        nome: '', telefone: '', cargo: 'Vendedora', store_id: 'all', status: 'triagem', fonte: '', motivo: '',
        recebimento_curriculo: new Date().toISOString().slice(0, 10),
        entrevista_data: '', contratacao_data: '', observacoes: ''
    });
    // Paginação das colunas RH (regra dos 07)
    const [expandedCols, setExpandedCols] = useState({});
    const [modalCol, setModalCol] = useState(null); // { statusId, label, candidates }
    const PAGE_SIZE = 7;


    // ── HELPERS ────────────────────────────────────────────────────
    const getYear = (raw) => {
        if (!raw) return 0;
        if (typeof raw === 'string' && raw.includes('/')) return parseInt(raw.split('/')[2]);
        if (typeof raw === 'string' && raw.includes('-')) return parseInt(raw.split('-')[0]);
        return new Date(raw).getFullYear();
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

    const daysSinceTwoDates = (start, end) => {
        const d1 = new Date(start + 'T00:00:00');
        const d2 = new Date(end + 'T00:00:00');
        return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    };
    const getDiasAteResposta = (c) => (!c.recebimento_curriculo || !c.data_resposta) ? null : daysSinceTwoDates(c.recebimento_curriculo, c.data_resposta);
    const getDiasAteEntrevista = (c) => (!c.data_resposta || !c.entrevista_data) ? null : daysSinceTwoDates(c.data_resposta, c.entrevista_data);
    const getSlaAlert = (c) => (c.status === 'triagem' && c.recebimento_curriculo && !c.data_resposta && daysSince(c.recebimento_curriculo) > 1) ? '⚠️ Atraso resposta' : null;
    const getGargalo = (dResp, dEntr) => {
        if (dResp > 3) return 'Triagem Demorada';
        if (dEntr > 7) return 'Espera Entrevista';
        return null;
    };

    const getLocalYMD = () => {
        const d = new Date();
        const tzOffset = d.getTimezoneOffset() * 60000;
        return (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);
    };

    // ── LÓGICA RECRUTAMENTO ────────────────────────────────────────
    const allYears = [...new Set(hrCandidates.map(c => getYear(c.recebimento_curriculo)).filter(y => y > 2000))].sort();
    const yearOptions = [...new Set([...allYears, new Date().getFullYear()])].sort((a, b) => b - a);

    const filteredCandidates = hrCandidates.filter(c => {
        const cYear = getYear(c.recebimento_curriculo);
        if (filterYear !== 'all' && cYear !== Number(filterYear)) return false;
        if (filterStore !== 'all' && normalizeStoreCode(c.store_id) !== normalizeStoreCode(filterStore)) return false;
        if (filterStatus !== 'all' && c.status !== filterStatus) return false;
        if (searchTerm && !c.nome.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !(c.cargo || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    const totalLeads = filteredCandidates.length;
    const hired = filteredCandidates.filter(c => c.status === 'contratado').length;
    const slaAlerts = filteredCandidates.filter(c => c.status === 'triagem' && daysSince(c.recebimento_curriculo) > 5).length;
    const convRate = totalLeads > 0 ? ((hired / totalLeads) * 100).toFixed(1) : '0.0';

    const openCandidateForm = (candidate = null) => {
        if (candidate) {
            setEditId(candidate.id);
            setForm({
                ...candidate,
                nome: candidate.nome || '',
                store_id: String(candidate.store_id || candidate.loja || selectedStore).replace(/\D/g, '').replace(/^0+/, '') || '10'
            });
        } else {
            setEditId(null);
            setForm({
                nome: '', telefone: '', cargo: 'Vendedora',
                // FIX: usar String() direto — normalizeStoreCode retorna '03' mas as chaves do STORE_CONFIGS são '3', '4', etc.
                store_id: selectedStore === 'all' ? '10' : String(selectedStore),
                status: 'triagem', fonte: '', motivo: '', recebimento_curriculo: new Date().toISOString().slice(0, 10),
                entrevista_data: '', contratacao_data: '', observacoes: ''
            });
        }
        setShowForm(true);
    };

    const handleSaveCandidate = async () => {
        if (!form.nome?.trim()) return;
        const payload = { ...form };
        if ((payload.status === 'entrevista_agendada' || payload.status === 'entrevista_realizada') && !payload.data_resposta) {
            payload.data_resposta = getLocalYMD();
        }
        if (payload.status === 'entrevista_agendada' && !payload.entrevista_data) {
            payload.entrevista_data = getLocalYMD();
        }
        payload.updated_at = new Date().toISOString();
        const success = await saveHrCandidate(payload, editId);
        if (success) setShowForm(false);
    };

    const handleMoveStatus = async (id, newStatus) => {
        const candidate = hrCandidates.find(c => c.id === id);
        if (!candidate) return;
        const extraFields = {};
        if ((newStatus === 'entrevista_agendada' || newStatus === 'entrevista_realizada') && !candidate.data_resposta) extraFields.data_resposta = getLocalYMD();
        if (newStatus === 'entrevista_agendada' && !candidate.entrevista_data) extraFields.entrevista_data = getLocalYMD();
        if (newStatus === 'contratado' && !candidate.contratacao_data) extraFields.contratacao_data = getLocalYMD();
        extraFields.updated_at = new Date().toISOString();
        await moveHrStatus(id, newStatus, extraFields);
    };

    // ── KANBAN PROJECTS ────────────────────────────────────────────
    const hrDashboardProjects = useMemo(() => {
        const statusGroups = {};
        filteredCandidates.forEach(c => {
            if (!statusGroups[c.status]) statusGroups[c.status] = [];
            statusGroups[c.status].push(c);
        });

        const result = [];

        for (const [status, candidates] of Object.entries(statusGroups)) {
            const isExpanded = expandedCols[status];
            const visibleCands = isExpanded ? candidates : candidates.slice(0, 7);

            const processed = visibleCands.map(c => {
                const hrStatus = HR_STATUS.find(s => s.id === c.status) || HR_STATUS[0];
                const dResp = getDiasAteResposta(c);
                const dEntr = getDiasAteEntrevista(c);
                const alertSLA = getSlaAlert(c);
                const gargalo = getGargalo(dResp, dEntr);

                const macroStatus = (() => {
                    if (c.status === 'contratado') return '✅ Contratado';
                    if (c.status === 'banco_talentos') return '⭐ Reserva VIP';
                    if (c.status === 'finalizado' || c.status === 'reprovado') {
                        if (c.motivo === 'Não compareceu') return '🚫 No-Show';
                        if (c.motivo === 'Não atende ao perfil') return '❌ Incompatível';
                        if (c.motivo === 'Já está trabalhando') return '💼 Empregado';
                        return '⛔ Finalizado';
                    }
                    return hrStatus ? `${hrStatus.emoji} ${hrStatus.label.split(' (')[0]}` : '⏳ Em Andamento';
                })();

                const etapaWeight = { triagem: 1, contato_realizado: 2, entrevista_agendada: 3, entrevista_realizada: 4, teste_agendado: 5, fase_teste: 5, contratado: 6 };
                const etapa = etapaWeight[c.status] ? `Etapa ${etapaWeight[c.status]}/6` : null;

                const statusEntrevista = (() => {
                    if (!c.entrevista_data) return null;
                    const eDate = new Date(c.entrevista_data + 'T00:00:00');
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const diffDays = Math.ceil((eDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffDays < 0) return { label: 'Entrevista já realizada', color: 'bg-gray-100 text-gray-600 border-gray-300' };
                    if (diffDays <= 7) return { label: 'Esta semana', color: 'bg-amber-100 text-amber-700 border-amber-300' };
                    return { label: 'Próximas semanas', color: 'bg-blue-100 text-blue-700 border-blue-300' };
                })();

                const currentIdx = HR_STATUS.findIndex(s => s.id === c.status);
                return {
                    id: c.id,
                    name: c.nome,
                    showFlowButtons: true,
                    disablePrevFlow: currentIdx <= 0,
                    disableNextFlow: currentIdx >= HR_STATUS.length - 1,
                    subtitle: (
                        <div className="flex flex-col w-full mt-1 relative">
                            <div className="flex flex-wrap gap-1 pr-14">
                                {macroStatus && <span className="bg-[#1a1a1a] text-white font-black px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider shadow-sm border border-gray-700">{macroStatus}</span>}
                                {etapa && <span className="bg-gray-100 text-gray-500 font-black px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider">{etapa}</span>}
                                {statusEntrevista && <span className={`font-bold px-2 py-0.5 rounded-md text-[9px] uppercase shadow-sm border ${statusEntrevista.color}`}>{statusEntrevista.label}</span>}
                                {alertSLA && <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-md text-[9px] uppercase shadow-sm border border-red-200 animate-pulse">{alertSLA}</span>}
                            </div>
                            <div className="absolute right-0 top-0 flex flex-col gap-1 items-end">
                                {gargalo && <span className="bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase border border-amber-200 shadow-sm leading-tight text-right w-min min-w-max">{gargalo}</span>}
                                {dResp !== null && dResp <= 3 && <span className="bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase border-emerald-200 leading-tight w-min min-w-max">Retorno Rápido</span>}
                            </div>
                            {c.updated_at && <div className="text-[9px] font-mono text-gray-400 mt-2 border-t border-gray-100 pt-1">Atualizado em: {new Date(c.updated_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</div>}
                        </div>
                    ),
                    date: new Date(c.recebimento_curriculo).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
                    status: c.status,
                    progress: c.status === 'triagem' ? 10 : c.status === 'contato_realizado' ? 30 : c.status === 'entrevista_realizada' ? 60 : c.status === 'fase_teste' ? 80 : c.status === 'contratado' ? 100 : 0,
                    accentColor: c.status === 'reprovado' ? '#ef4444' : '#14b8a6',
                    bgColorClass: 'bg-white dark:bg-slate-800'
                };
            });

            result.push(...processed);

            if (!isExpanded && candidates.length > 7) {
                const hiddenCount = candidates.length - 7;
                result.push({
                    id: `view_all_${status}`,
                    name: `Ver +${hiddenCount} Candidatos`,
                    showFlowButtons: false,
                    subtitle: `Clique para expandir a coluna`,
                    status: status,
                    progress: 100,
                    accentColor: '#3b82f6',
                    bgColorClass: 'bg-blue-50 border-blue-200 border-dashed opacity-80 hover:opacity-100 shadow-none'
                });
            }
        }
        return result;
    }, [filteredCandidates, expandedCols]);

    const handleProjectAction = async (id, action) => {
        if (action === 'whatsapp') {
            const cand = filteredCandidates.find(c => c.id === id);
            if (cand && cand.telefone) {
                const phone = String(cand.telefone).replace(/\D/g, '');
                if (phone.length >= 8) window.open(`https://wa.me/55${phone}`, '_blank');
            }
        } else if (action === 'edit') {
            const cand = filteredCandidates.find(c => c.id === id);
            if (cand) openCandidateForm(cand);
        } else if (action === 'delete') {
            if (window.confirm('Deseja realmente excluir este candidato?')) {
                if (typeof deleteHrCandidate === 'function') deleteHrCandidate(id);
            }
        } else if (action === 'prev' || action === 'next') {
            const cand = filteredCandidates.find(c => c.id === id);
            if (!cand) return;
            const currentIdx = HR_STATUS.findIndex(s => s.id === cand.status);
            if (currentIdx === -1) return;
            let nextIdx = currentIdx;
            if (action === 'prev' && currentIdx > 0) nextIdx = currentIdx - 1;
            if (action === 'next' && currentIdx < HR_STATUS.length - 1) nextIdx = currentIdx + 1;
            if (nextIdx !== currentIdx) {
                await saveHrCandidate({ ...cand, status: HR_STATUS[nextIdx].id }, cand.id);
            }
        }
    };

    // ── RENDER ─────────────────────────────────────────────────────
    return (
        <div className="space-y-6 fade-in max-w-none w-full">

            {/* Header & Filters */}
            <div className="bg-gradient-to-br from-white to-teal-50/30 p-6 rounded-2xl border border-teal-100 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <h2 className="text-2xl font-bold text-teal-800 flex items-center gap-2"><UserCheck className="w-6 h-6" /> Pipeline de Recrutamento</h2>
                    <button onClick={() => openCandidateForm()} className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-800 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm font-medium transition-all">
                        <PlusCircle className="w-4 h-4" /> Novo Candidato
                    </button>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                    <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="bg-white border border-gray-200 text-sm font-bold text-gray-700 px-3 py-1.5 rounded-lg outline-none focus:border-teal-500">
                        <option value="all">Histórico Completo</option>
                        {yearOptions.map(y => <option key={y} value={y}>Ano {y}</option>)}
                    </select>
                    <select value={filterStore} onChange={e => setFilterStore(e.target.value)} className="bg-white border border-gray-200 text-sm font-bold text-gray-700 px-3 py-1.5 rounded-lg outline-none focus:border-teal-500">
                        <option value="all">Todas as Lojas</option>
                        {Object.entries(STORE_CONFIGS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                    </select>
                    <div className="relative ml-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar nome..." className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-400 outline-none w-48" />
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-600 text-white p-4 rounded-xl shadow-sm"><p className="text-xs opacity-80 font-bold uppercase">Total Leads</p><p className="text-2xl font-black">{totalLeads}</p></div>
                <div className="bg-red-500 text-white p-4 rounded-xl shadow-sm"><p className="text-xs opacity-80 font-bold uppercase">⚠️ Alertas Triagem</p><p className="text-2xl font-black">{slaAlerts}</p></div>
                <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-sm"><p className="text-xs opacity-80 font-bold uppercase">✅ Contratados</p><p className="text-2xl font-black">{hired}</p></div>
                <div className="bg-purple-600 text-white p-4 rounded-xl shadow-sm"><p className="text-xs opacity-80 font-bold uppercase">Taxa Conversão</p><p className="text-2xl font-black">{convRate}%</p></div>
            </div>

            {/* Funil visual */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <div className="flex gap-1 min-w-[700px]">
                    {HR_STATUS.map(s => {
                        const count = filteredCandidates.filter(c => c.status === s.id).length;
                        const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
                        return (
                            <div key={s.id} className="flex-1 flex flex-col gap-1 items-center">
                                <div className="text-[10px] font-bold text-gray-500 truncate w-full text-center">{s.label} ({count})</div>
                                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div className="h-full bg-teal-500" style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Kanban com paginação dos 07 */}
            <div className="space-y-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[600px] flex flex-col">
                    <ProjectDashboard
                        title="Funil de Candidatos"
                        projects={hrDashboardProjects}
                        kanbanColumns={HR_STATUS.map(s => ({ id: s.id, label: `${s.emoji} ${s.label}` }))}
                        view="kanban"
                        onProjectAction={handleProjectAction}
                        onProjectUpdate={(p) => handleMoveStatus(p.id, p.status)}
                        onProjectClick={(id) => {
                            if (String(id).startsWith('view_all_')) {
                                const estagio = String(id).replace('view_all_', '');
                                setExpandedCols(prev => ({ ...prev, [estagio]: !prev[estagio] }));
                                return;
                            }
                            const cand = filteredCandidates.find(x => x.id === id || x.id === Number(id));
                            if (cand) openCandidateForm(cand);
                        }}
                        onProjectCreate={() => openCandidateForm()}
                        className="h-full border-none"
                    />
                </div>

                {/* Resumo por etapa com paginação dos 07 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {HR_STATUS.map(s => {
                        const colCandidates = filteredCandidates.filter(c => c.status === s.id);
                        const isExpanded = expandedCols[s.id];
                        const visible = isExpanded ? colCandidates : colCandidates.slice(0, PAGE_SIZE);
                        const extra = colCandidates.length - PAGE_SIZE;
                        if (colCandidates.length === 0) return null;
                        return (
                            <div key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className={`bg-gradient-to-r ${s.bg} text-white px-4 py-2.5 flex items-center justify-between`}>
                                    <span className="text-xs font-black flex items-center gap-1.5">{s.emoji} {s.label.split(' (')[0]}</span>
                                    <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-full">{colCandidates.length}</span>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {visible.map(c => (
                                        <div key={c.id} className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => openCandidateForm(c)}>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-sm text-gray-800 truncate">{c.nome}</div>
                                                <div className="text-[10px] text-gray-400 truncate">{c.cargo} · {STORE_CONFIGS[normalizeStoreCode(c.store_id)]?.name || `L${c.store_id}`}</div>
                                            </div>
                                            <div className="shrink-0 text-[9px] text-gray-400 font-mono">{c.recebimento_curriculo ? new Date(c.recebimento_curriculo + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}</div>
                                        </div>
                                    ))}
                                </div>
                                {extra > 0 && !isExpanded && (
                                    <button
                                        onClick={() => setModalCol({ statusId: s.id, label: `${s.emoji} ${s.label}`, candidates: colCandidates })}
                                        className="w-full py-2 text-[11px] font-bold text-center text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1.5 border-t border-gray-100"
                                    >
                                        <ChevronDown className="w-3.5 h-3.5" /> Ver mais (+{extra})
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Modal de expansão de coluna */}
                {modalCol && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setModalCol(null)}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
                            <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-5 py-4 rounded-t-2xl flex items-center justify-between">
                                <h3 className="font-bold">{modalCol.label}</h3>
                                <button onClick={() => setModalCol(null)}><X className="w-5 h-5" /></button>
                            </div>
                            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                                {[...modalCol.candidates].sort((a, b) => new Date(b.recebimento_curriculo || 0) - new Date(a.recebimento_curriculo || 0)).map(c => (
                                    <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => { openCandidateForm(c); setModalCol(null); }}>
                                        <div className="min-w-0">
                                            <div className="font-semibold text-sm text-gray-800 truncate">{c.nome}</div>
                                            <div className="text-[11px] text-gray-400 truncate">{c.cargo} · {STORE_CONFIGS[normalizeStoreCode(c.store_id)]?.name || `L${c.store_id}`}</div>
                                            {c.observacoes && <div className="text-[10px] text-gray-400 italic mt-0.5 truncate">{c.observacoes}</div>}
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <div className="text-[10px] text-gray-500 font-mono">{c.recebimento_curriculo ? new Date(c.recebimento_curriculo + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</div>
                                            <div className="text-[9px] text-gray-400">{c.motivo || ''}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Modal Novo/Editar Candidato */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="bg-teal-600 text-white px-5 py-4 rounded-t-2xl flex items-center justify-between">
                            <h3 className="font-bold">{editId ? 'Editar Candidato' : 'Novo Candidato'}</h3>
                            <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 flex flex-col gap-3">
                            <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500" placeholder="Nome *" />
                            <div className="grid grid-cols-2 gap-3">
                                <input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500" placeholder="Telefone" />
                                <select value={form.store_id} onChange={e => setForm(p => ({ ...p, store_id: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500">
                                    {Object.entries(STORE_CONFIGS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                                </select>
                                <select value={form.cargo} onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500">
                                    {CARGO_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500">
                                    {HR_STATUS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Motivo / Retorno</label>
                                    <select value={form.motivo || ''} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500">
                                        {MOTIVO_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Fonte Captação</label>
                                    <select value={form.fonte || ''} onChange={e => setForm(p => ({ ...p, fonte: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500">
                                        {FONTE_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Recebimento</label>
                                    <input type="date" value={form.recebimento_curriculo || ''} onChange={e => setForm(p => ({ ...p, recebimento_curriculo: e.target.value }))} className="w-full border rounded-lg px-2 py-2 text-[11px] outline-none focus:border-teal-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Resposta</label>
                                    <input type="date" value={form.data_resposta || ''} onChange={e => setForm(p => ({ ...p, data_resposta: e.target.value }))} className="w-full border rounded-lg px-2 py-2 text-[11px] outline-none focus:border-teal-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Entrevista</label>
                                    <input type="date" value={form.entrevista_data || ''} onChange={e => setForm(p => ({ ...p, entrevista_data: e.target.value }))} className="w-full border rounded-lg px-2 py-2 text-[11px] outline-none focus:border-teal-500" />
                                </div>
                            </div>
                            <textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 resize-none h-20" placeholder="Observações" />
                            <button onClick={handleSaveCandidate} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-lg mt-2 transition-colors">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
