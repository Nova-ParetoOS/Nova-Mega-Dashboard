import React, { useState, useMemo, useRef } from 'react';
import {
    Plus, Trash2, Check, ChevronDown, ChevronRight, ArrowRight,
    Flame, Inbox, Calendar, Clock, Target, Sparkles, X, Edit2, GripVertical, MoreHorizontal, Archive
} from 'lucide-react';
import { normalizeStoreCode } from './utils/formatters';
import { supabase } from './supabase';

// ──────────────────────────────────────────────────────────────────
//  CONSTANTS
// ──────────────────────────────────────────────────────────────────
const KANBAN_STATUS = [
    { id: 'Inbox', emoji: '📥', label: 'Inbox' },
    { id: 'To Do', emoji: '📝', label: 'Para Fazer' },
    { id: 'Doing', emoji: '🏗️', label: 'Em Curso' },
    { id: 'Done', emoji: '✅', label: 'Concluído' },
];

const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const PRIORITIES = {
    high: { label: '🔥 High', cls: 'bg-amber-100 text-amber-700 border border-amber-300' },
    medium: { label: '◦ Medium', cls: 'bg-blue-100 text-blue-700 border border-blue-300' },
    low: { label: '● Low', cls: 'bg-gray-100 text-gray-600 border border-gray-300' },
};

const FREQ_OPTIONS = [
    { v: 'nenhuma', l: 'Sem recorrência' },
    { v: 'diaria', l: 'Diária' },
    { v: 'semanal', l: 'Semanal' },
    { v: 'mensal', l: 'Mensal' },
];

const CAMADAS = {
    braindump: 'braindump',
    quick_task: 'quick_task',
    plano_acao: 'plano_acao',
};

// ──────────────────────────────────────────────────────────────────
//  SMALL UI HELPERS
// ──────────────────────────────────────────────────────────────────
const PriorityPill = ({ p }) => {
    const cfg = PRIORITIES[p] || PRIORITIES.medium;
    return <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>;
};

const TaskCard = ({ task, onDelete, onEdit, onMoveStatus, onMoveCamada, draggable, onDragStart, onUpdateTask, onArchive, onOpenPage }) => {
    const [open, setOpen] = useState(false);
    const subList = task.subtasks_list || [];
    const total = subList.length > 0 ? subList.length : Number(task.total_subtasks || 0);
    const done = subList.length > 0 ? subList.filter(s => s.completed).length : Number(task.completed_subtasks || 0);
    const pct = total > 0 ? Math.round((done / total) * 100) : -1;

    return (
        <div
            draggable={draggable}
            onDragStart={onDragStart}
            className="bg-white border border-gray-200 rounded-xl p-3.5 group hover:border-gray-400 shadow-sm hover:shadow-md transition-colors cursor-grab active:cursor-grabbing select-none"
        >
            {/* Title row */}
            <div className="flex items-start gap-2">
                <GripVertical className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-sm font-semibold text-gray-900 leading-tight flex-1">{task.title}</p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {/* 🚀 ROADMAP: botão "Abrir Página" — hook para sub-tarefas / Project Page */}
                    {onOpenPage && (
                        <button
                            onClick={() => onOpenPage(task)}
                            title="Abrir página da tarefa"
                            className="text-gray-400 hover:text-indigo-500 transition-colors"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </button>
                    )}
                    <button onClick={() => onEdit(task)} className="text-gray-600 hover:text-gray-300"><Edit2 className="w-3.5 h-3.5" /></button>
                    {onArchive && (
                        <button onClick={() => onArchive(task.id)} className="text-emerald-500 hover:text-emerald-400" title="Concluir / Arquivar">
                            <span className="text-[10px] uppercase font-black bg-emerald-500/10 border border-emerald-900/50 px-1 py-0.5 rounded flex items-center gap-0.5"><Check className="w-3 h-3" /> Arq</span>
                        </button>
                    )}
                    <button onClick={() => { if (window.confirm('Excluir tarefa?')) onDelete(task.id); }} className="text-gray-600 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-1.5 mt-2 ml-5">
                {task.priority && <PriorityPill p={task.priority} />}
                {task.due_date && (
                    <span className="text-[9px] text-gray-500 flex items-center gap-0.5 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-300">
                        <Calendar className="w-2.5 h-2.5" /> {task.due_date}
                    </span>
                )}
            </div>

            {/* Subtask bar and checklist */}
            {subList.length > 0 && (
                <div className="mt-3 ml-5">
                    <div className="flex justify-between text-[9px] text-gray-600 mb-2 font-bold">
                        <span>Subtarefas</span><span>{done}/{total}</span>
                    </div>

                    <div className="space-y-1.5 mb-2">
                        {subList.map((sub, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
                                <input
                                    type="checkbox"
                                    checked={sub.completed}
                                    onChange={(e) => {
                                        const newList = [...subList];
                                        newList[i] = { ...newList[i], completed: e.target.checked };
                                        onUpdateTask({ ...task, subtasks_list: newList });
                                    }}
                                    className="w-3 h-3 mt-0.5 shrink-0 rounded border-gray-300 bg-gray-100 text-indigo-500 cursor-pointer"
                                />
                                <span className={`leading-tight ${sub.completed ? 'line-through opacity-40' : 'opacity-90'}`}>{sub.title}</span>
                            </div>
                        ))}
                    </div>

                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                </div>
            )}

            {/* Subtask bar fallback (no list, just numbers) */}
            {subList.length === 0 && pct >= 0 && (
                <div className="mt-3 ml-5">
                    <div className="flex justify-between text-[9px] text-gray-600 mb-1 font-bold">
                        <span>Subtarefas</span><span>{done}/{total}</span>
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                </div>
            )}

            {/* Mover camada (compact) */}
            <div className="ml-5 mt-2.5 flex gap-1 flex-wrap opacity-0 group-hover:opacity-100 transition-opacity">
                {task.camada !== CAMADAS.braindump && (
                    <button onClick={() => onMoveCamada(task.id, CAMADAS.braindump)} className="text-[9px] uppercase font-bold px-1.5 py-1 bg-gray-100 rounded text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors border border-gray-300">→ Dump</button>
                )}
                {task.camada !== CAMADAS.quick_task && (
                    <button onClick={() => onMoveCamada(task.id, CAMADAS.quick_task)} className="text-[9px] uppercase font-bold px-1.5 py-1 bg-gray-100 rounded text-gray-500 hover:text-teal-400 hover:bg-teal-500/10 transition-colors border border-gray-300">→ Quick</button>
                )}
                {task.camada !== CAMADAS.plano_acao && (
                    <button onClick={() => onMoveCamada(task.id, CAMADAS.plano_acao)} className="text-[9px] uppercase font-bold px-1.5 py-1 bg-gray-100 rounded text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors border border-gray-300">→ Plano</button>
                )}
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────
//  TASK FORM MODAL
// ──────────────────────────────────────────────────────────────────
const BLANK_FORM = { title: '', priority: 'medium', due_date: '', description: '', frequency: 'nenhuma', subtasks_list: [], sprint_id: '', project_id: '', weekday: 'Segunda', status: 'Inbox', camada: 'plano_acao' };

const TaskModal = ({ initial, onSave, onClose }) => {
    const [form, setForm] = useState({ ...BLANK_FORM, ...initial });
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="bg-white border border-gray-300 rounded-2xl w-full max-w-lg shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-200">
                    <h3 className="font-bold text-gray-900">{initial?.id ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                    <button onClick={onClose} className="text-gray-600 hover:text-gray-300"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-5 flex flex-col gap-4">
                    <input
                        value={form.title}
                        onChange={e => set('title', e.target.value)}
                        placeholder="Título da tarefa *"
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        autoFocus
                    />
                    <textarea
                        value={form.description}
                        onChange={e => set('description', e.target.value)}
                        placeholder="Descrição (opcional)"
                        rows={2}
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-600 placeholder-gray-600 outline-none focus:border-gray-400 resize-none"
                    />

                    <div className="grid grid-cols-2 gap-3">
                        {/* Priority */}
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-500 mb-1.5 block tracking-widest">⚡ Prioridade</label>
                            <div className="flex gap-1">
                                {Object.entries(PRIORITIES).map(([k, v]) => (
                                    <button key={k} onClick={() => set('priority', k)} className={`flex-1 text-[9px] font-black uppercase py-1.5 rounded-lg border transition-all ${form.priority === k ? v.cls : 'bg-gray-100 border-gray-300 text-gray-600'}`}>{k}</button>
                                ))}
                            </div>
                        </div>

                        {/* Camada */}
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-500 mb-1.5 block tracking-widest">📁 Camada</label>
                            <select value={form.camada} onChange={e => set('camada', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none">
                                <option value="braindump">🧠 BrainDump</option>
                                <option value="quick_task">⚡ Quick Task</option>
                                <option value="plano_acao">🗂️ Plano de Ação</option>
                            </select>
                        </div>

                        {/* Due date */}
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-500 mb-1.5 block tracking-widest">📅 Entrega</label>
                            <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-300 outline-none" />
                        </div>

                        {/* Frequency */}
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-500 mb-1.5 block tracking-widest">🔁 Recorrência</label>
                            <select value={form.frequency} onChange={e => set('frequency', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none">
                                {FREQ_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                            </select>
                        </div>

                        {/* Weekday (only if quick_task) */}
                        {form.camada === 'quick_task' && (
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-500 mb-1.5 block tracking-widest">📆 Dia da Semana</label>
                                <select value={form.weekday} onChange={e => set('weekday', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none">
                                    {DIAS_SEMANA.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Subtasks */}
                        <div className="col-span-2 mt-2">
                            <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block tracking-widest">📋 Subtarefas (Checklist)</label>
                            <div className="space-y-2 mb-2">
                                {(form.subtasks_list || []).map((sub, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={sub.completed}
                                            onChange={e => {
                                                const newList = [...(form.subtasks_list || [])];
                                                newList[i].completed = e.target.checked;
                                                set('subtasks_list', newList);
                                            }}
                                            className="w-4 h-4 rounded border-gray-300 bg-gray-100 text-indigo-500"
                                        />
                                        <input
                                            value={sub.title}
                                            onChange={e => {
                                                const newList = [...(form.subtasks_list || [])];
                                                newList[i].title = e.target.value;
                                                set('subtasks_list', newList);
                                            }}
                                            placeholder="Descreva o passo..."
                                            className="flex-1 bg-transparent border-b border-gray-300 px-1 py-1 text-xs text-gray-300 outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            onClick={() => {
                                                const newList = (form.subtasks_list || []).filter((_, idx) => idx !== i);
                                                set('subtasks_list', newList);
                                            }}
                                            className="text-gray-600 hover:text-red-500 p-1"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => set('subtasks_list', [...(form.subtasks_list || []), { title: '', completed: false }])}
                                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md border border-gray-300"
                            >
                                + Adicionar Passo
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => { if (form.title.trim()) { onSave({ ...form, priority: form.priority.toLowerCase() }); } }}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition-colors mt-1"
                    >
                        Salvar Tarefa
                    </button>
                </div>
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────
export const KanbanBoard = ({ tasks, saveTask, moveTaskStatus, moveTaskCamada, deleteTask, archiveTask, selectedStore }) => {
    const allTasks = tasks || [];

    // ── State ─────────────────────────────────────────────────────
    const [braindumpInput, setBraindumpInput] = useState('');
    const [modal, setModal] = useState(null); // null | 'new' | task object
    const [newCamada, setNewCamada] = useState('plano_acao');
    const [dragTaskId, setDragTaskId] = useState(null);
    const [dragTarget, setDragTarget] = useState(null); // { type: 'status'|'camada', value }
    const [showArchived, setShowArchived] = useState(false);
    const [archivedTasks, setArchivedTasks] = useState([]);

    const toggleArchived = async () => {
        if (!showArchived) {
            const { data } = await supabase.from('tasks').select('*').eq('is_archived', true).order('created_at', { ascending: false });
            setArchivedTasks((data || []).filter(t => normalizeStoreCode(t.store_id) === normalizeStoreCode(selectedStore)));
        }
        setShowArchived(!showArchived);
    };

    const handleArchiveTask = async (id) => {
        const task = allTasks.find(t => t.id === id);
        if (task && (task.frequency || '').toLowerCase() === 'semanal') {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 7);
            const clone = {
                ...task,
                id: undefined,
                created_at: undefined,
                is_archived: false,
                status: 'todo',
                due_date: dueDate.toISOString().slice(0, 10),
                completed_subtasks: 0
            };
            if (clone.subtasks_list) {
                clone.subtasks_list = clone.subtasks_list.map(s => ({ ...s, completed: false }));
            }
            await saveTask(clone, null);
        }
        await archiveTask(id);
    };

    // ── Derived layers ────────────────────────────────────────────
    const brainTasks = useMemo(() => allTasks.filter(t => t.camada === 'braindump' || !t.camada), [allTasks]);
    const quickTasks = useMemo(() => allTasks.filter(t => t.camada === 'quick_task'), [allTasks]);
    const planoTasks = useMemo(() => allTasks.filter(t => t.camada === 'plano_acao'), [allTasks]);

    // ── BrainDump quick-add ───────────────────────────────────────
    const handleBraindump = async (e) => {
        if ((e.key === 'Enter' || e.type === 'click') && braindumpInput.trim()) {
            const form = {
                title: braindumpInput.trim(),
                camada: 'braindump',
                status: 'Inbox',
                priority: 'medium',
                frequency: 'nenhuma',
                store_id: selectedStore && selectedStore !== 'all' ? normalizeStoreCode(selectedStore) : null,
            };
            await saveTask(form, null);
            setBraindumpInput('');
        }
    };

    // ── Drag & Drop ───────────────────────────────────────────────
    const handleDrop_StatusColumn = async (e, statusId) => {
        e.preventDefault();
        const taskId = dragTaskId || e.dataTransfer.getData('taskId');
        if (!taskId) return;
        await moveTaskStatus(taskId, statusId);
        setDragTaskId(null);
    };

    const handleDrop_Camada = async (e, camada) => {
        e.preventDefault();
        const taskId = dragTaskId || e.dataTransfer.getData('taskId');
        if (!taskId) return;
        await moveTaskCamada(taskId, camada);
        setDragTaskId(null);
    };

    // ── Modal Save ────────────────────────────────────────────────
    const handleModalSave = async (form) => {
        const enriched = {
            ...form,
            store_id: selectedStore && selectedStore !== 'all' ? normalizeStoreCode(selectedStore) : null,
        };
        await saveTask(enriched, form.id || null);
        setModal(null);
    };

    const openNewModal = (camadaDefault = 'plano_acao') => {
        const todayIdx = new Date().getDay();
        const diaMap = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        setModal({ ...BLANK_FORM, camada: camadaDefault, weekday: diaMap[todayIdx] === 'Domingo' ? 'Segunda' : diaMap[todayIdx] });
    };

    // ── Render ────────────────────────────────────────────────────
    return (
        <div className="flex flex-col w-full min-h-screen bg-gray-50 text-gray-900 p-6 gap-8 fade-in">

            {/* ═══════════════════ CAMADA 1: BRAINDUMP ═══════════════════ */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                            🧠 <span>BrainDump</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-2 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-300">{brainTasks.length}</span>
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">Capture qualquer ideia agora. Processe depois.</p>
                    </div>
                    <button onClick={() => openNewModal('braindump')} className="text-gray-500 hover:text-gray-300 flex items-center gap-1 text-xs">
                        <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                </div>

                {/* Input de captura rápida */}
                <div className="flex gap-3 mb-4">
                    <input
                        value={braindumpInput}
                        onChange={e => setBraindumpInput(e.target.value)}
                        onKeyDown={handleBraindump}
                        placeholder="Digite uma ideia e pressione Enter..."
                        className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-[#444] outline-none focus:border-gray-400 transition-colors"
                    />
                    <button onClick={handleBraindump} className="bg-gray-100 border border-gray-300 px-4 rounded-xl text-gray-500 hover:text-gray-300 hover:border-gray-400 transition-colors">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                {/* Cards BrainDump */}
                <div
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleDrop_Camada(e, 'braindump')}
                >
                    {brainTasks.map(t => (
                        <TaskCard
                            key={t.id}
                            task={t}
                            draggable
                            onDragStart={(e) => { setDragTaskId(t.id); e.dataTransfer.setData('taskId', t.id); }}
                            onDelete={deleteTask}
                            onEdit={(t) => setModal(t)}
                            onMoveStatus={moveTaskStatus}
                            onMoveCamada={moveTaskCamada}
                            onUpdateTask={(updated) => saveTask(updated, updated.id)}
                            onArchive={handleArchiveTask}
                        />
                    ))}
                    {brainTasks.length === 0 && (
                        <div className="col-span-full flex items-center gap-2 py-6 text-gray-400 text-sm italic">
                            <Sparkles className="w-4 h-4" /> Mente limpa. Capture agora.
                        </div>
                    )}
                </div>
            </section>

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* ═══════════════════ CAMADA 2: QUICK TASKS ══════════════════ */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                            ⚡ <span>Quick Tasks</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-2 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-300">{quickTasks.length}</span>
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">Tarefas de rotina diária organizadas por dia da semana.</p>
                    </div>
                    <button onClick={() => openNewModal('quick_task')} className="text-gray-500 hover:text-gray-300 flex items-center gap-1 text-xs">
                        <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {DIAS_SEMANA.map(dia => {
                        const todayIdx = new Date().getDay();
                        const diaMap = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                        const todayName = diaMap[todayIdx] === 'Domingo' ? 'Segunda' : diaMap[todayIdx];

                        const diaTasks = quickTasks.filter(t => {
                            const matchWeekday = (t.weekday || '').toLowerCase() === dia.toLowerCase();
                            const isTodayCol = dia.toLowerCase() === todayName.toLowerCase();
                            const matchDiaria = isTodayCol && t.frequency === 'diaria';

                            // Mensal assume "aparece no mesmo dia do mês" ou fallback simila; mas para daily/monthly simple, deixaremos Mensal ser visível se hoje = t.created_at day
                            // Para simplificar a UX, 'diaria' aparece na coluna de hoje.
                            const matchMensal = isTodayCol && t.frequency === 'mensal' && new Date(t.created_at || Date.now()).getDate() === new Date().getDate();

                            return matchWeekday || matchDiaria || matchMensal;
                        });
                        return (
                            <div
                                key={dia}
                                className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm"
                                onDragOver={e => e.preventDefault()}
                                onDrop={async e => {
                                    e.preventDefault();
                                    const taskId = dragTaskId || e.dataTransfer.getData('taskId');
                                    if (!taskId) return;
                                    // Move to quick_task AND set weekday
                                    await moveTaskCamada(taskId, 'quick_task', { weekday: dia });
                                    setDragTaskId(null);
                                }}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{dia}</span>
                                    <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full font-bold border border-gray-200">{diaTasks.length}</span>
                                </div>
                                <div className="space-y-2">
                                    {diaTasks.map(t => (
                                        <TaskCard
                                            key={t.id}
                                            task={t}
                                            draggable
                                            onDragStart={(e) => { setDragTaskId(t.id); e.dataTransfer.setData('taskId', t.id); }}
                                            onDelete={deleteTask}
                                            onEdit={(t) => setModal(t)}
                                            onMoveStatus={moveTaskStatus}
                                            onMoveCamada={moveTaskCamada}
                                            onUpdateTask={(updated) => saveTask(updated, updated.id)}
                                            onArchive={handleArchiveTask}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* ═══════════════════ CAMADA 3: PLANO DE AÇÃO ════════════════ */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex items-center justify-between mb-4 shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                            🗂️ <span>Plano de Ação</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-2 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-300">{planoTasks.length}</span>
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">Projetos e sprints com barra de progresso.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={toggleArchived} className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors border ${showArchived ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'}`}>
                            <Archive className="w-3.5 h-3.5" /> Arquivados
                        </button>
                        <button onClick={() => openNewModal('plano_acao')} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                            <Plus className="w-3.5 h-3.5" /> Nova Tarefa
                        </button>
                    </div>
                </div>

                {showArchived ? (
                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 max-h-[400px] overflow-y-auto space-y-2">
                        {archivedTasks.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm">Nenhuma tarefa arquivada nesta loja.</div>
                        ) : (
                            archivedTasks.map(t => (
                                <div key={t.id} className="bg-white border border-gray-200 p-3 rounded-lg flex justify-between items-center bg-opacity-60 grayscale hover:grayscale-0 transition-all">
                                    <div>
                                        <div className="font-bold text-gray-700 text-sm line-through decoration-gray-400">{t.title}</div>
                                        <div className="text-[10px] text-gray-400 mt-1 uppercase font-black tracking-widest">{t.camada || 'indefinida'} · {new Date(t.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div className="text-[10px] uppercase font-bold text-gray-400 border border-gray-200 px-2 py-1 rounded bg-white">
                                        Arquivado
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="flex flex-1 w-full overflow-x-auto min-h-[70vh] items-start gap-4 pb-4">
                        {KANBAN_STATUS.map(col => {
                            const colTasks = planoTasks.filter(t => t.status === col.id);
                            return (
                                <div
                                    key={col.id}
                                    className="w-72 shrink-0 bg-white border border-gray-200 rounded-2xl flex flex-col shadow-sm"
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={async e => {
                                        e.preventDefault();
                                        const taskId = dragTaskId || e.dataTransfer.getData('taskId');
                                        if (!taskId) return;
                                        // Move to plano_acao AND set new status
                                        await moveTaskCamada(taskId, 'plano_acao', { status: col.id });
                                        await moveTaskStatus(taskId, col.id);
                                        setDragTaskId(null);
                                    }}
                                >
                                    {/* Column header */}
                                    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
                                        <span className="text-xs font-black text-gray-400">{col.emoji} {col.label}</span>
                                        <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold border border-gray-200">{colTasks.length}</span>
                                    </div>

                                    {/* Tasks */}
                                    <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[500px]">
                                        {colTasks.map(t => (
                                            <TaskCard
                                                key={t.id}
                                                task={t}
                                                draggable
                                                onDragStart={(e) => { setDragTaskId(t.id); e.dataTransfer.setData('taskId', t.id); }}
                                                onDelete={deleteTask}
                                                onEdit={(t) => setModal(t)}
                                                onMoveStatus={moveTaskStatus}
                                                onMoveCamada={moveTaskCamada}
                                                onUpdateTask={(updated) => saveTask(updated, updated.id)}
                                                onArchive={handleArchiveTask}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ══ MODAL ═══════════════════════════════════════════════════ */}
            {modal !== null && (
                <TaskModal
                    initial={typeof modal === 'object' ? modal : { ...BLANK_FORM, camada: newCamada }}
                    onSave={handleModalSave}
                    onClose={() => setModal(null)}
                />
            )}
        </div>
    );
};
