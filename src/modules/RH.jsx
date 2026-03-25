import React, { useState, useMemo } from 'react';
import { UserCheck, Users, PlusCircle, Search, SlidersHorizontal, Calendar, Send, Trash2, X, Briefcase, AlertCircle, Activity, TrendingUp } from 'lucide-react';
import { normalizeStoreCode } from '../utils/formatters';
import { ProjectDashboard } from '../components/ui/project-management-dashboard';
import { StatsCard } from '../components/ui/stats-card';

const HR_STATUS = [
    { id: 'triagem', label: 'Triagem', bg: 'from-blue-500 to-blue-700', activeClass: 'bg-blue-600 text-white border-blue-600', emoji: '📋' },
    { id: 'contato_realizado', label: 'Contato Real.', bg: 'from-sky-400 to-sky-600', activeClass: 'bg-sky-500 text-white border-sky-500', emoji: '📞' },
    { id: 'entrevista_agendada', label: 'Ent. Agend.', bg: 'from-purple-400 to-purple-600', activeClass: 'bg-purple-500 text-white border-purple-500', emoji: '📅' },
    { id: 'entrevista_realizada', label: 'Entrevista Real.', bg: 'from-indigo-400 to-indigo-600', activeClass: 'bg-indigo-500 text-white border-indigo-500', emoji: '🗣️' },
    { id: 'teste_agendado', label: 'Teste Agend.', bg: 'from-orange-400 to-orange-600', activeClass: 'bg-orange-500 text-white border-orange-500', emoji: '📝' },
    { id: 'fase_teste', label: 'Fase de Teste', bg: 'from-amber-400 to-amber-600', activeClass: 'bg-amber-500 text-white border-amber-500', emoji: '⏳' },
    { id: 'contratado', label: 'Contratado', bg: 'from-green-500 to-emerald-700', activeClass: 'bg-green-600 text-white border-green-600', emoji: '✅' },
    { id: 'finalizado', label: 'Finalizado', bg: 'from-gray-500 to-gray-700', activeClass: 'bg-gray-600 text-white border-gray-600', emoji: '🏁' },
    { id: 'banco_talentos', label: 'Banco Talentos', bg: 'from-teal-500 to-teal-700', activeClass: 'bg-teal-600 text-white border-teal-600', emoji: '🌟' },
    { id: 'reprovado', label: 'Reprovado', bg: 'from-red-500 to-red-700', activeClass: 'bg-red-600 text-white border-red-600', emoji: '❌' },
];

const CARGO_OPTIONS = ['Vendedora', 'Gerente', 'Caixa', 'Estoquista', 'Auxiliar', 'Outro'];
const FONTE_OPTIONS = ['', 'Anúncio', 'Indicação', 'Entregue em Mãos', 'LinkedIn', 'Instagram', 'Outro'];
const MOTIVO_OPTIONS = ['', 'Não compareceu', 'Não atende ao perfil', 'Rejeitado', 'Já está trabalhando', 'Freelance', 'Menor de idade', 'Número inválido', 'Desligada da empresa', 'Indisponível', 'Pendente', 'Outro'];

export const RH = ({
    hrCandidates, hrCollaborators, hrAbsences, STORE_CONFIGS, selectedStore, userRole,
    saveHrCandidate, deleteHrCandidate, moveHrStatus,
    saveCollaborator, activateCollaboratorFromCandidate, updateCollaboratorStatus, deleteCollaborator,
    saveAbsence, deleteAbsence,
    salesHistory = [],
}) => {
    // ── NAVEGAÇÃO INTERNA ──────────────────────────────────────────
    const [view, setView] = useState('recrutamento'); // 'recrutamento' | 'equipe'
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'

    // ── ESTADOS RECRUTAMENTO ───────────────────────────────────────
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [filterStore, setFilterStore] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const [editId, setEditId] = useState(null);
    const [draggedCandId, setDraggedCandId] = useState(null);
    const [form, setForm] = useState({
        nome: '', telefone: '', cargo: 'Vendedora', store_id: 'all', status: 'triagem', fonte: '', motivo: '',
        recebimento_curriculo: new Date().toISOString().slice(0, 10),
        entrevista_data: '', contratacao_data: '', observacoes: ''
    });

    // ── ESTADOS EQUIPE ─────────────────────────────────────────────
    const [absenceShowForm, setAbsenceShowForm] = useState(false);
    const [absenceForm, setAbsenceForm] = useState({ collaborator_id: '', tipo: 'ferias', data_inicio: '', data_fim: '', observacoes: '' });
    const [hireModal, setHireModal] = useState(null);
    const [equipeFilterStore, setEquipeFilterStore] = useState('all');
    const [equipeFilterSeller, setEquipeFilterSeller] = useState('all');
    const [historicoDias, setHistoricoDias] = useState(90);

    // ── HELPERS ────────────────────────────────────────────────────
    const getYear = (raw) => {
        if (!raw) return 0;
        if (typeof raw === 'string' && raw.includes('/')) return parseInt(raw.split('/')[2]);
        if (typeof raw === 'string' && raw.includes('-')) return parseInt(raw.split('-')[0]);
        return new Date(raw).getFullYear();
    };

    const getWhatsAppLink = (phone) => {
        const clean = String(phone || '').replace(/\D/g, '');
        const num = clean.startsWith('55') ? clean : '55' + clean;
        return `https://api.whatsapp.com/send?phone=${num}`;
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
            setForm({ ...candidate });
        } else {
            setEditId(null);
            setForm({
                nome: '', telefone: '', cargo: 'Vendedora', store_id: selectedStore === 'all' ? '10' : (normalizeStoreCode(selectedStore) || '10'),
                status: 'triagem', fonte: '', motivo: '', recebimento_curriculo: new Date().toISOString().slice(0, 10),
                entrevista_data: '', contratacao_data: '', observacoes: ''
            });
        }
        setShowForm(true);
    };

    const handleSaveCandidate = async () => {
        if (!form.nome.trim()) return;

        // VERIFICAÇÃO DE DUPLICIDADE EM TODA A EQUIPE E CONTATOS
        const candidateName = form.nome.toLowerCase().trim();
        const duplicateTeam = hrCollaborators.some(c => c.nome.toLowerCase().trim() === candidateName);
        if (duplicateTeam) {
            alert(`Erro: A colaboradora "${form.nome}" já existe na equipe atual! O sistema bloqueou a duplicação.`);
            return;
        }

        const success = await saveHrCandidate(form, editId);
        if (success) setShowForm(false);
    };

    const handleMoveStatus = async (id, newStatus) => {
        const candidate = hrCandidates.find(c => c.id === id);
        if (!candidate) return;

        const extraFields = {};
        if (newStatus === 'entrevista' && !candidate.entrevista_data) extraFields.entrevista_data = new Date().toISOString().slice(0, 10);
        if (newStatus === 'contratado' && !candidate.contratacao_data) extraFields.contratacao_data = new Date().toISOString().slice(0, 10);

        await moveHrStatus(id, newStatus, extraFields);

        // INTEGRAÇÃO COM EQUIPE ATUAL
        if (newStatus === 'contratado') {
            const alreadyExists = hrCollaborators.some(c => c.nome.toLowerCase().trim() === candidate.nome.toLowerCase().trim());

            if (alreadyExists) {
                alert(`⚠️ Atenção: A colaboradora "${candidate.nome}" já consta na equipe ativa!\nO sistema bloqueou a duplicação. O lead foi movido para 'Contratado' no histórico, mas não será ativado para não poluir os dados.`);
                return;
            }

            setHireModal({
                candidate,
                data_admissao: extraFields.contratacao_data || new Date().toISOString().slice(0, 10),
                salario: ''
            });
        }
    };

    // ── LÓGICA EQUIPE ATUAL ────────────────────────────────────────
    const filteredCollaborators = hrCollaborators.filter(c => {
        if (equipeFilterStore !== 'all' && normalizeStoreCode(c.store_id) !== normalizeStoreCode(equipeFilterStore)) return false;
        
        const cName = (c.nome || c.name || '').toUpperCase();
        if (cName.includes('MEGA') || cName.includes('EXTRA')) return false;

        const hasSoldRecently = activeSellers.some(s => 
            s.name.toLowerCase() === (c.nome || c.name || '').toLowerCase().trim() &&
            s.stores.has(String(c.store_id || ''))
        );
        if (!hasSoldRecently) return false;

        return true;
    });

    // ── LÓGICA EQUIPE DE VENDAS (a partir de salesHistory) ────────
    // Filtra últimos N dias e remove registros de sistema (MEGA, EXTRA)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - historicoDias);
    const cutoffYYYYMM = cutoffDate.toISOString().slice(0, 7);

    const activeSellers = (() => {
        const map = {};
        salesHistory.forEach(h => {
            const name = (h.sellerName || '').trim();
            const storeCode = String(h.storeCode || '');
            if (!name) return;
            if (/MEGA|EXTRA/i.test(name)) return;

            // Filter 90 days window
            if ((h.period || '') < cutoffYYYYMM) return;

            const uniqueKey = `${storeCode}-${name}`;

            if (!map[uniqueKey]) map[uniqueKey] = { uniqueKey, name, stores: new Set(), totalSales: 0, daysWorked: 0, lastPeriod: '' };
            map[uniqueKey].stores.add(storeCode);
            map[uniqueKey].totalSales += h.totalSales || 0;
            map[uniqueKey].daysWorked += h.daysWorked || 0;
            if ((h.period || '') > map[uniqueKey].lastPeriod) map[uniqueKey].lastPeriod = h.period;
        });
        return Object.values(map).sort((a, b) => b.totalSales - a.totalSales);
    })();

    const sellerStoreOptions = [...new Set(activeSellers.flatMap(s => [...s.stores]))].sort();
    const filteredSellers = activeSellers.filter(s => {
        if (equipeFilterStore !== 'all' && !s.stores.has(equipeFilterStore)) return false;
        if (equipeFilterSeller !== 'all' && s.uniqueKey !== equipeFilterSeller) return false;
        return true;
    });

    const handleSaveAbsence = async () => {
        if (!absenceForm.collaborator_id || !absenceForm.data_inicio || !absenceForm.data_fim) return alert("Preencha colaborador e datas.");
        const success = await saveAbsence(absenceForm);
        if (success) { setAbsenceShowForm(false); setAbsenceForm({ collaborator_id: '', tipo: 'ferias', data_inicio: '', data_fim: '', observacoes: '' }); }
    };

    const hrDashboardProjects = useMemo(() => {
        return filteredCandidates.map(c => {
            const hrStatus = HR_STATUS.find(s => s.id === c.status) || HR_STATUS[0];
            return {
                id: c.id,
                name: c.nome,
                subtitle: c.cargo || 'Vendedora',
                date: new Date(c.recebimento_curriculo).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
                status: c.status,
                progress: c.status === 'triagem' ? 10 : c.status === 'contato_realizado' ? 30 : c.status === 'entrevista_realizada' ? 60 : c.status === 'fase_teste' ? 80 : c.status === 'contratado' ? 100 : 0,
                accentColor: c.status === 'reprovado' ? '#ef4444' : '#14b8a6', // teal se aprovado ou andamento
                bgColorClass: 'bg-white dark:bg-slate-800'
            };
        });
    }, [filteredCandidates]);

    const handleProjectAction = (id, action) => {
        if (action === "whatsapp") {
            const cand = filteredCandidates.find(c => c.id === id);
            if (cand && cand.telefone) {
                const phone = String(cand.telefone).replace(/\D/g, '');
                if (phone.length >= 8) window.open(`https://wa.me/55${phone}`, '_blank');
            }
        } else if (action === "edit") {
            const cand = filteredCandidates.find(c => c.id === id);
            if (cand) openCandidateForm(cand);
        } else if (action === "delete") {
            if (window.confirm("Deseja realmente excluir este candidato?")) {
                if (typeof deleteHrCandidate === 'function') deleteHrCandidate(id);
            }
        }
    };

    // ── RENDER ─────────────────────────────────────────────────────
    return (
        <div className="space-y-6 fade-in max-w-none w-full">
            {/* Toggle entre Recrutamento e Equipe */}
            <div className="flex gap-4 mb-4 bg-[#1a1a1a] p-1 rounded-xl w-fit border border-[#262626]">
                <button onClick={() => setView('recrutamento')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase transition-all ${view === 'recrutamento' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Recrutamento</button>
                <button onClick={() => setView('equipe')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase transition-all ${view === 'equipe' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Equipe Atual</button>
            </div>

            {/* ═══════════════════ VIEWS ═══════════════════ */}

            {view === 'recrutamento' && (
                <div className="space-y-6">
                    {/* Headers & Filters Recrutamento (Copiado de App.jsx com ajustes táticos) */}
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

                    {/* KPIs Recrutamento */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-blue-600 text-white p-4 rounded-xl shadow-sm"><p className="text-xs opacity-80 font-bold uppercase">Total Leads</p><p className="text-2xl font-black">{totalLeads}</p></div>
                        <div className="bg-red-500 text-white p-4 rounded-xl shadow-sm"><p className="text-xs opacity-80 font-bold uppercase">⚠️ Alertas Triagem</p><p className="text-2xl font-black">{slaAlerts}</p></div>
                        <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-sm"><p className="text-xs opacity-80 font-bold uppercase">✅ Contratados</p><p className="text-2xl font-black">{hired}</p></div>
                        <div className="bg-purple-600 text-white p-4 rounded-xl shadow-sm"><p className="text-xs opacity-80 font-bold uppercase">Taxa Conversão</p><p className="text-2xl font-black">{convRate}%</p></div>
                    </div>

                    {/* Funil visual (Simples) */}
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

                    {/* Kanban Board Recrutamento via ProjectDashboard */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[600px] flex flex-col">
                        <ProjectDashboard
                            title="Funil de Candidatos"
                            projects={hrDashboardProjects}
                            kanbanColumns={HR_STATUS.map(s => ({ id: s.id, label: `${s.emoji} ${s.label}` }))}
                            view="kanban"
                            onProjectAction={handleProjectAction}
                            onProjectUpdate={(p) => handleMoveStatus(p.id, p.status)}
                            onProjectClick={(id) => {
                                const cand = filteredCandidates.find(x => x.id === id || x.id === Number(id));
                                if (cand) openCandidateForm(cand);
                            }}
                            onProjectCreate={() => openCandidateForm()}
                            className="h-full border-none"
                        />
                    </div>
                </div>
            )}

            {view === 'equipe' && (
                <div className="space-y-6">
                    {/* Header Equipe Atual */}
                    <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-2xl border border-indigo-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-indigo-900 flex items-center gap-2"><Users className="w-6 h-6" /> Equipe Atual</h2>
                            <p className="text-sm text-indigo-700/70 font-medium mt-1">Gestão de Colaboradores e Ausências</p>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            <select value={historicoDias} onChange={e => setHistoricoDias(Number(e.target.value))} className="bg-white border text-sm font-bold text-indigo-900 px-3 py-2 rounded-xl outline-none border-indigo-200">
                                <option value={30}>Últimos 30 Dias</option>
                                <option value={60}>Últimos 60 Dias</option>
                                <option value={90}>Últimos 90 Dias</option>
                            </select>
                            <select value={equipeFilterStore} onChange={e => setEquipeFilterStore(e.target.value)} className="bg-white border text-sm font-bold text-indigo-900 px-3 py-2 rounded-xl outline-none border-indigo-200">
                                <option value="all">Todas as Lojas</option>
                                {Object.entries(STORE_CONFIGS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                            </select>
                            <select value={equipeFilterSeller} onChange={e => setEquipeFilterSeller(e.target.value)} className="bg-white border text-sm font-bold text-indigo-900 px-3 py-2 rounded-xl outline-none border-indigo-200">
                                <option value="all">Todas as Vendedoras</option>
                                {activeSellers.map(s => <option key={s.uniqueKey} value={s.uniqueKey}>{s.name} (L{[...s.stores].join(', ')})</option>)}
                            </select>
                            <button onClick={() => setAbsenceShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold shadow-md transition-all">
                                <Calendar className="w-4 h-4" /> Registrar Ausência
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards Dashboard */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <StatsCard
                            title="Vendedoras Ativas"
                            value={filteredSellers.length.toString()}
                            icon={<Users className="w-5 h-5 text-indigo-500" />}
                            change={`Nos últimos ${historicoDias} dias`}
                            changeType="positive"
                        />
                        <StatsCard
                            title="Média de Constância"
                            value={filteredSellers.length ? `${Math.round(filteredSellers.reduce((acc, s) => acc + (s.daysWorked / historicoDias * 100), 0) / filteredSellers.length)}%` : '0%'}
                            icon={<Activity className="w-5 h-5 text-emerald-500" />}
                            change="Presença de vendas ativas"
                            changeType="positive"
                        />
                        <StatsCard
                            title="Loja Destaque"
                            value={
                                (() => {
                                    if (filteredSellers.length === 0) return '—';
                                    const storeCounts = {};
                                    filteredSellers.forEach(s => s.stores.forEach(st => storeCounts[st] = (storeCounts[st] || 0) + s.totalSales));
                                    const topStore = Object.keys(storeCounts).reduce((a, b) => storeCounts[a] > storeCounts[b] ? a : b, Object.keys(storeCounts)[0]);
                                    return `Loja ${topStore}`;
                                })()
                            }
                            icon={<TrendingUp className="w-5 h-5 text-amber-500" />}
                            change="Maior volume de peças"
                            changeType="positive"
                        />
                    </div>

                    {/* Equipe de Vendas (fonte: sales_history) */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                                    <Briefcase className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-sm">Painel de Constância</h3>
                                    <p className="text-xs text-gray-400">Desempenho da equipe comercial nos últimos {historicoDias} dias</p>
                                </div>
                            </div>
                            {equipeFilterStore === 'all' && (
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                    <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow text-teal-700' : 'text-gray-500 hover:text-gray-700'}`}>Lista</button>
                                    <button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white shadow text-teal-700' : 'text-gray-500 hover:text-gray-700'}`}>Kanban</button>
                                </div>
                            )}
                        </div>

                        {viewMode === 'list' || equipeFilterStore !== 'all' ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[500px]">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-gray-400">Vendedora</th>
                                            <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-gray-400">Loja(s)</th>
                                            <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-gray-400">Constância (90 Dias)</th>
                                            <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-gray-400">Últ. Venda</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredSellers.length === 0 && (
                                            <tr><td colSpan={4} className="py-10 text-center text-gray-300 text-sm">Nenhuma vendedora ativa nos últimos 90 dias</td></tr>
                                        )}
                                        {filteredSellers.map((s, i) => {
                                                                    const pct = Math.min(100, Math.round((s.daysWorked / historicoDias) * 100));
                                            return (
                                                <tr key={s.uniqueKey} className="hover:bg-teal-50/30 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                                                <span className="text-[10px] font-black text-teal-700">{i + 1}</span>
                                                            </div>
                                                            <span className="font-semibold text-gray-800 text-sm">{s.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex flex-wrap justify-center gap-1">
                                                            {[...s.stores].sort().map(st => (
                                                                <span key={st} className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">L{st}</span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 align-middle w-48">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                                <div className={`h-full transition-all ${pct >= 60 ? 'bg-teal-500' : pct >= 30 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                                                            </div>
                                                            <span className="text-xs font-bold text-gray-500 w-8">{pct}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-xs text-gray-400 font-medium">{s.lastPeriod ? s.lastPeriod.slice(0, 7) : '—'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex gap-4 p-5 overflow-x-auto bg-gray-50/50 min-h-[300px]">
                                {Object.entries(STORE_CONFIGS).map(([storeId, config]) => {
                                    const storeSellers = filteredSellers.filter(s => s.stores.has(storeId));
                                    if (storeSellers.length === 0) return null;
                                    return (
                                        <div key={storeId} className="w-72 shrink-0 flex flex-col gap-3">
                                            <div className="bg-white border text-center font-black text-xs text-gray-600 px-3 py-2 rounded-xl shadow-sm tracking-widest uppercase">
                                                {config.name}
                                                <span className="ml-2 bg-gray-100 px-2 py-0.5 rounded-full text-[10px]">{storeSellers.length}</span>
                                            </div>
                                            <div className="space-y-3">
                                                {storeSellers.map(s => {
                                                                            const pct = Math.min(100, Math.round((s.daysWorked / historicoDias) * 100));
                                                    return (
                                                        <div key={s.uniqueKey} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-teal-200 transition-colors">
                                                            <div className="font-bold text-sm text-gray-800 mb-2 truncate">{s.name}</div>
                                                            <div>
                                                                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                                                    <span>Constância</span>
                                                                    <span>{pct}%</span>
                                                                </div>
                                                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                    <div className={`h-full transition-all ${pct >= 60 ? 'bg-teal-500' : pct >= 30 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Grid de Colaboradores (hrCollaborators) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {filteredCollaborators.length === 0 && <div className="col-span-full text-center py-10 text-gray-500">Nenhum colaborador encontrado. Ative candidatos na aba Recrutamento.</div>}
                        {filteredCollaborators.map(c => (
                            <div key={c.id} className="bg-[#141414] p-5 rounded-2xl border border-[#262626] flex items-center justify-between shadow-sm hover:border-[#404040] transition-colors cursor-pointer" onClick={() => {/* Para o futuro: abrir detalhe de faltas */ }}>
                                <div>
                                    <h3 className="font-bold text-gray-100 mb-1">{c.nome}</h3>
                                    <p className="text-[10px] text-teal-500 font-black uppercase tracking-widest">{c.cargo || 'Não definido'} · Loja {normalizeStoreCode(c.store_id)}</p>
                                </div>
                                <div className={`w-3 h-3 rounded-full ${c.status === 'ativo' ? 'bg-green-500 animate-pulse' : (c.status === 'ferias' ? 'bg-amber-500/80' : 'bg-orange-500/80')}`} title={`Status: ${c.status}`} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODALS GLOBAIS DA ABA */}
            {/* Modal Novo/Edit Recrutamento */}
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
                            <textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 resize-none h-20" placeholder="Observações" />
                            <button onClick={handleSaveCandidate} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-lg mt-2 transition-colors">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Registrar Ausência */}
            {absenceShowForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setAbsenceShowForm(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                        <div className="bg-indigo-600 text-white px-5 py-4 rounded-t-2xl flex items-center justify-between">
                            <h3 className="font-bold flex items-center gap-2"><Calendar className="w-4 h-4" /> Registrar Ausência</h3>
                            <button onClick={() => setAbsenceShowForm(false)}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 flex flex-col gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Colaborador</label>
                                <select value={absenceForm.collaborator_id} onChange={e => setAbsenceForm(p => ({ ...p, collaborator_id: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500">
                                    <option value="">Selecione...</option>
                                    {filteredCollaborators.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Tipo de Ausência</label>
                                <select value={absenceForm.tipo} onChange={e => setAbsenceForm(p => ({ ...p, tipo: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500">
                                    <option value="ferias">Férias</option>
                                    <option value="atestado">Atestado / Licença</option>
                                    <option value="falta">Falta</option>
                                    <option value="outro">Outro</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Data Fim</label>
                                    <input type="date" value={absenceForm.data_fim} min={absenceForm.data_inicio} onChange={e => setAbsenceForm(p => ({ ...p, data_fim: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Data Início</label>
                                    <input type="date" value={absenceForm.data_inicio} onChange={e => setAbsenceForm(p => ({ ...p, data_inicio: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                                </div>
                            </div>
                            <button onClick={handleSaveAbsence} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg mt-2 transition-colors">Confirmar Ausência</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Avançado de Contratação */}
            {hireModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setHireModal(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in fade-in">
                        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-6 py-5 flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-lg">Efetivar Contratação</h3>
                                <p className="text-xs text-teal-100 font-medium opacity-90">Ativar {hireModal.candidate.nome} na Equipe</p>
                            </div>
                            <button onClick={() => setHireModal(null)} className="opacity-70 hover:opacity-100 transition-opacity"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Salário Base (R$)</label>
                                <input type="number" value={hireModal.salario} onChange={e => setHireModal(p => ({ ...p, salario: e.target.value }))} className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 outline-none focus:border-teal-500 transition-colors" placeholder="Ex: 1500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Data de Admissão</label>
                                <input type="date" value={hireModal.data_admissao} onChange={e => setHireModal(p => ({ ...p, data_admissao: e.target.value }))} className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 outline-none focus:border-teal-500 transition-colors" />
                            </div>

                            <div className="mt-4 flex gap-3">
                                <button onClick={() => setHireModal(null)} className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors text-sm">Apenas Salvar</button>
                                <button onClick={async () => {
                                    await activateCollaboratorFromCandidate(hireModal.candidate, {
                                        data_admissao: hireModal.data_admissao,
                                        salario: hireModal.salario ? Number(hireModal.salario) : null
                                    });
                                    setHireModal(null);
                                    setView('equipe');
                                }} className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-black py-2.5 rounded-xl shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 hover:-translate-y-0.5 transition-all text-sm">Ativar Agora</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
