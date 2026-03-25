import React, { useState, useMemo, useEffect, useRef } from 'react';
// framer-motion removed — CSS transitions used instead
import { Send, Clock, X, Plus, List, LayoutGrid, Search, Archive, ChevronRight, Calendar, Smartphone, Code2, Eye, ShoppingBag, Trash2, ChevronDown, Tag } from 'lucide-react';
import { ProjectDashboard } from './ui/project-management-dashboard';

// ─── Pipeline stages ────────────────────────────────────────────
const STAGES = [
    { id: 'Triagem', label: 'Triagem', emoji: '📥', pill: 'bg-blue-100 text-blue-700 border border-blue-200', col: 'bg-blue-50 border-blue-100' },
    { id: 'Sondagem', label: 'Sondagem', emoji: '🔍', pill: 'bg-purple-100 text-purple-700 border border-purple-200', col: 'bg-purple-50 border-purple-100' },
    { id: 'Visita', label: 'Visita', emoji: '📅', pill: 'bg-indigo-100 text-indigo-700 border border-indigo-200', col: 'bg-indigo-50 border-indigo-100' },
    { id: 'Fechamento', label: 'Fechamento', emoji: '💰', pill: 'bg-green-100 text-green-700 border border-green-200', col: 'bg-green-50 border-green-100' },
    { id: 'Ghosting', label: 'Ghosting', emoji: '👻', pill: 'bg-red-100 text-red-700 border border-red-200', col: 'bg-red-50 border-red-100' },
];

const ORIGENS = ['', 'Instagram', 'WhatsApp', 'Indicação', 'Loja Física', 'Outro'];

const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const daysSince = (d) => {
    if (!d) return null;
    return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
};

// ─── Lead Card (Kanban) ──────────────────────────────────────────
const LeadCard = ({ lead, stages, onMove, onArchive, onEdit, onDragStart, onDragEnd, isDragging }) => {
    const dias = daysSince(lead.created_at);
    const phone = String(lead.telefone || '').replace(/\D/g, '');
    const stage = stages.find(s => s.id === (lead.status || lead.estagio)) || stages[0];
    const isTerminal = ['Fechamento', 'Ghosting'].includes(stage.id);

    const tags = [];
    if (lead.produto) tags.push({ label: lead.produto, color: 'bg-blue-100 text-blue-700 border-blue-200' });
    if (lead.marca) tags.push({ label: lead.marca, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' });
    if (lead.modelo) tags.push({ label: lead.modelo, color: 'bg-purple-100 text-purple-700 border-purple-200' });
    if (lead.tamanho) tags.push({ label: lead.tamanho, color: 'bg-pink-100 text-pink-700 border-pink-200' });

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={`bg-white rounded-xl border shadow-sm transition-all duration-200 group cursor-grab active:cursor-grabbing relative overflow-hidden
              hover:-translate-y-1 hover:shadow-lg hover:border-indigo-300 hover:ring-2 hover:ring-indigo-100
              ${isDragging ? 'opacity-50 scale-95 ring-2 ring-indigo-400' : 'border-gray-100'}`}
        >
            {/* Stage color accent bar */}
            <div className={`h-0.5 w-full ${stage.id === 'Ghosting' ? 'bg-red-400' : stage.id === 'Fechamento' ? 'bg-green-400' : stage.id === 'Visita' ? 'bg-indigo-400' : stage.id === 'Sondagem' ? 'bg-purple-400' : 'bg-blue-400'}`} />
            {/* Info principal — sempre visível */}
            <div className="p-3">
                <div className="flex items-start justify-between gap-1 mb-2">
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-gray-900 leading-tight">{lead.nome || lead.name}</div>
                        {lead.origem && (
                            <div className="text-[10px] text-indigo-600 font-bold mt-0.5 tracking-wide uppercase">{lead.origem}</div>
                        )}
                    </div>
                    <button onClick={() => onEdit(lead)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-gray-600 p-0.5 bg-gray-50 rounded-md">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                </div>

                {/* Tags Notion Style */}
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2.5">
                        {tags.map((t, idx) => (
                            <span key={idx} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${t.color}`}>
                                {t.label}
                            </span>
                        ))}
                    </div>
                )}

                {/* Badge de tempo */}
                {dias !== null && (
                    <div className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 mb-2">
                        <Clock className="w-2.5 h-2.5" /> {dias}d
                    </div>
                )}

                {/* WhatsApp — sempre visível */}
                {phone.length >= 8 && (
                    <a href={`https://wa.me/55${phone}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold w-full justify-center transition-all shadow-sm">
                        <Send className="w-3 h-3" /> WhatsApp
                    </a>
                )}
            </div>

            {/* Ações — apenas no hover */}
            <div className="overflow-hidden max-h-0 group-hover:max-h-64 transition-all duration-200 ease-in-out border-t border-gray-50 group-hover:border-gray-100">
                <div className="p-2.5 pt-2 space-y-2">
                    {/* Mover stage */}
                    <div className="flex flex-wrap gap-1">
                        {stages.filter(s => s.id !== stage.id).map(s => (
                            <button key={s.id} onClick={() => onMove(lead.id, s.id)}
                                className="text-[10px] px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 transition-all">
                                → {s.emoji} {s.label}
                            </button>
                        ))}
                    </div>
                    {isTerminal && onArchive && (
                        <button onClick={() => onArchive(lead.id)}
                            className="w-full text-[10px] uppercase font-bold px-2 py-1 rounded-lg border border-amber-200 text-amber-600 bg-amber-50 hover:bg-amber-100 transition-all flex items-center justify-center gap-1.5">
                            <Archive className="w-3 h-3" /> Arquivar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Mermaid Accordion ────────────────────────────────────────────
const DEFAULT_SCRIPTS = [
    { title: '1. Primeiro Contato (Frio)', code: `flowchart TD\n  A([👋 Cliente entra em contato]) --> B{Canal?}\n  B -->|Instagram DM| C[Responder com saudação + perguntar o que procura]\n  B -->|WhatsApp| D[Enviar mensagem de boas-vindas]\n  C & D --> E[Identificar interesse]\n  E --> F([✅ Mover para Sondagem])` },
    { title: '2. Sondagem de Necessidade', code: `flowchart TD\n  A([🔍 Iniciar Sondagem]) --> B[Perguntar: O que vai usar?]\n  B --> C[Perguntar: Tem alguma referência?]\n  C --> D[Perguntar: Qual o orçamento?]\n  D --> E{Cliente engajou?}\n  E -->|Sim| F([✅ Mover para Persona])\n  E -->|Não respondeu| G([⏰ Aguardar 24h e seguir up])` },
    { title: '3. Montagem de Looks (Persona)', code: `flowchart TD\n  A([👤 Definir Persona]) --> B[Coletar estilo / ocasião / tamanho]\n  B --> C[Separar 3 opções de look]\n  C --> D[Enviar fotos com preços]\n  D --> E{Resposta?}\n  E -->|Gostou| F([✅ Mover para Oferta])\n  E -->|Quero ver mais| G[Apresentar variações]\n  E -->|Sumiu| H([👻 Mover para Ghosting])` },
    { title: '4. Oferta e Fechamento', code: `flowchart TD\n  A([💰 Apresentar Oferta]) --> B[Mostrar valor: look completo + benefícios]\n  B --> C{Objeção?}\n  C -->|Preço| D[Parcelamento ou desconto pontual]\n  C -->|Tamanho| E[Verificar estoque de outras lojas]\n  C -->|Vai pensar| F[Enviar foto inspiracional + urgência]\n  D & E & F --> G{Fechou?}\n  G -->|Sim| H([🎉 VENDA REALIZADA])\n  G -->|Não| I([👻 Mover para Ghosting])` },
    { title: '5. Follow-up Ghosting', code: `flowchart TD\n  A([👻 Lead em Ghosting]) --> B[Enviar mensagem leve após 3 dias]\n  B --> C{Respondeu?}\n  C -->|Sim| D([🔄 Retornar para Sondagem])\n  C -->|Não| E[Aguardar mais 7 dias]\n  E --> F[Enviar conteúdo de valor: nova coleção]\n  F --> G{Respondeu?}\n  G -->|Sim| D\n  G -->|Não| H([🗂️ Arquivar lead])` },
    { title: '6. Pós-venda e Fidelização', code: `flowchart TD\n  A([🎉 Venda Realizada]) --> B[Enviar mensagem de acompanhamento 3 dias depois]\n  B --> C[Pedir feedback do produto]\n  C --> D{Satisfeito?}\n  D -->|Sim| E[Pedir indicação / marcar nas redes]\n  D -->|Não| F[Resolver problema imediatamente]\n  E --> G([⭐ Cliente fidelizado])\n  F --> H([🔄 Recuperação de relacionamento])` },
    { title: '7. Reativação de Clientes Inativos', code: `flowchart TD\n  A([😴 Cliente inativo há +60 dias]) --> B[Personalizar mensagem com histórico de compras]\n  B --> C[Oferecer: novidade ou look baseado no gosto dele]\n  C --> D{Respondeu?}\n  D -->|Sim| E([🔄 Reiniciar pipeline a partir de Sondagem])\n  D -->|Não| F[Último contato com oferta exclusiva]\n  F --> G{Respondeu?}\n  G -->|Sim| E\n  G -->|Não| H([🗂️ Arquivar])` },
];

const MermaidCard = ({ script, idx }) => {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState('viz'); // 'code' | 'viz'
    const [code, setCode] = useState(script.code);
    const renderRef = useRef(null);
    const renderedOnce = useRef(false);

    useEffect(() => {
        if (!open || tab !== 'viz' || !renderRef.current) return;
        const el = renderRef.current;
        el.innerHTML = '';
        const id = `mmaid-${idx}-${Date.now()}`;
        if (window.mermaid) {
            try {
                window.mermaid.render(id, code).then(({ svg }) => {
                    if (el) el.innerHTML = svg;
                }).catch(() => {
                    el.innerHTML = '<p class="text-xs text-red-500 p-2">Erro ao renderizar diagrama</p>';
                });
            } catch (e) {
                el.innerHTML = '<p class="text-xs text-red-500 p-2">Erro ao renderizar diagrama</p>';
            }
        }
    }, [open, tab, code, idx]);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black">{idx + 1}</div>
                    <span className="text-sm font-semibold text-gray-800">{script.title}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="border-t border-gray-100">
                    <div className="flex border-b border-gray-100">
                        <button onClick={() => setTab('viz')} className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors ${tab === 'viz' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                            <Eye className="w-3.5 h-3.5" /> Visualização
                        </button>
                        <button onClick={() => setTab('code')} className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors ${tab === 'code' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                            <Code2 className="w-3.5 h-3.5" /> Código
                        </button>
                    </div>
                    {tab === 'viz' ? (
                        <div ref={renderRef} className="p-4 min-h-[120px] flex items-center justify-center bg-gray-50 text-gray-400 text-xs">
                            Carregando diagrama...
                        </div>
                    ) : (
                        <textarea
                            className="w-full p-4 bg-gray-900 text-green-300 font-mono text-xs resize-y min-h-[140px] focus:outline-none"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            spellCheck={false}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

const MermaidSection = () => {
    useEffect(() => {
        if (document.getElementById('mermaid-cdn')) return;
        const script = document.createElement('script');
        script.id = 'mermaid-cdn';
        script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
        script.onload = () => { if (window.mermaid) window.mermaid.initialize({ startOnLoad: false, theme: 'neutral' }); };
        document.head.appendChild(script);
    }, []);

    return (
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Code2 className="w-4 h-4 text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-800 text-sm">Scripts de Atendimento</h3>
                    <p className="text-xs text-gray-400">Fluxos de atendimento — clique para expandir e editar</p>
                </div>
            </div>
            <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
                {DEFAULT_SCRIPTS.map((s, i) => <MermaidCard key={i} script={s} idx={i} />)}
            </div>
        </div>
    );
};

// ─── Encomendas ────────────────────────────────────────────────────
const STATUS_PILLS = {
    waiting: { label: 'Aguardando Chegada', cls: 'bg-amber-100 text-amber-700 border border-amber-200' },
    available: { label: 'Disponível ✓', cls: 'bg-green-100 text-green-700 border border-green-200' },
};
const PRIO_PILLS = {
    alta: { label: '🔴 Alta', cls: 'bg-red-100 text-red-700 border border-red-200' },
    media: { label: '🟡 Média', cls: 'bg-amber-100 text-amber-700 border border-amber-200' },
    baixa: { label: '⚪ Baixa', cls: 'bg-gray-100 text-gray-500 border border-gray-200' },
};

const PRODUTOS_OPTS = ['Calça', 'Shorts', 'Jaqueta', 'Saia', 'Vestido', 'Blusa', 'Conjunto', 'T-Shirt', 'Cropped', 'Macacão'];
const MODELOS_OPTS = ['Skinny', 'Wide Leg', 'Mom', 'Flare', 'Reta', 'Cargo', 'Fit', 'Tradicional'];
const TAMANHOS_OPTS = ['01', '02', '03', '04', '06', '08', '10', '12', '14', '16', '18', '34', '36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58', 'P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4'];
const MARCAS_OPTS = [];

const BadgeSelector = ({ value = [], onChange, placeholder, options = [], colorClass = "bg-indigo-100 text-indigo-700", onNewTag }) => {
    const [input, setInput] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const addBadge = (val, isNew = false) => {
        const t = val.trim();
        if (!t) return;
        if (!value.includes(t)) onChange([...value, t]);
        // Persiste no banco apenas se for uma tag nova (não existia nas opções)
        if (isNew && onNewTag) onNewTag(t);
        setInput('');
        setIsOpen(false);
    };

    const removeBadge = (val) => {
        onChange(value.filter(v => v !== val));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const isNew = input.trim() && !options.includes(input.trim());
            addBadge(input, isNew);
        } else if (e.key === 'Backspace' && !input && value.length > 0) {
            removeBadge(value[value.length - 1]);
        }
    };

    const filteredOptions = options.filter(o => o.toLowerCase().includes(input.toLowerCase()) && !value.includes(o));

    return (
        <div ref={wrapperRef} className="relative flex-1 min-w-[120px]">
            <div className="flex flex-wrap gap-1.5 p-1.5 border border-gray-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-amber-300 focus-within:border-transparent min-h-[38px] items-center">
                {value.map(v => (
                    <span key={v} className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${colorClass}`}>
                        {v}
                        <button type="button" onClick={() => removeBadge(v)} className="hover:text-black opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
                    </span>
                ))}
                <input
                    className="flex-1 outline-none min-w-[60px] text-sm px-1 bg-transparent"
                    placeholder={value.length === 0 ? placeholder : ''}
                    value={input}
                    onChange={e => { setInput(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                />
            </div>
            {isOpen && (filteredOptions.length > 0 || input) && (
                <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto p-1">
                    {filteredOptions.length > 0 ? filteredOptions.map(o => (
                        <div key={o} onClick={() => addBadge(o, false)} className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${colorClass.split(' ')[0]}`} /> {o}
                        </div>
                    )) : input ? (
                        <div onClick={() => addBadge(input, true)} className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer flex items-center gap-2">
                            <Plus className="w-3.5 h-3.5 text-gray-400" /> Criar "{input}"
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};

const EncomendasSection = ({ selectedStore, crmWishlist, saveCrmWishlist, deleteCrmWishlist, updateCrmWishlistStatus, crmCustomTags, addCrmCustomTag }) => {
    const [form, setForm] = useState({ cliente: '', produto: [], modelo: [], tamanho: [], marca: [], wpp: '', prioridade: 'media', data: new Date().toISOString().slice(0, 10), status: 'waiting' });
    const [showForm, setShowForm] = useState(false);

    const storeOrders = (crmWishlist || []).filter(o => String(o.store_id) === String(selectedStore) || selectedStore === 'all');

    // Merge listas estáticas + tags salvas no banco para esta loja
    const tagsForCategory = (category, staticOpts) => {
        const dynamic = (crmCustomTags || [])
            .filter(t => t.category === category)
            .map(t => t.value);
        return [...new Set([...staticOpts, ...dynamic])];
    };
    const produtosOpts = tagsForCategory('produto', PRODUTOS_OPTS);
    const marcasOpts   = tagsForCategory('marca',   MARCAS_OPTS);
    const modelosOpts  = tagsForCategory('modelo',  MODELOS_OPTS);
    const tamanhosOpts = tagsForCategory('tamanho', TAMANHOS_OPTS);

    // Chamado pelo BadgeSelector ao criar uma tag nova (não existente nas opções)
    const handleNewTag = (category, value) => {
        if (addCrmCustomTag) addCrmCustomTag(selectedStore, category, value);
    };

    const addOrder = async () => {
        if (!form.cliente.trim() || form.produto.length === 0) return;
        const savePayload = {
            ...form,
            produto: form.produto.join(', '),
            modelo: form.modelo.join(', '),
            tamanho: form.tamanho.join(', '),
            marca: form.marca.join(', '),
            store_id: selectedStore
        };
        await saveCrmWishlist(savePayload, null);
        setForm(f => ({ ...f, cliente: '', produto: [], modelo: [], tamanho: [], marca: [], wpp: '' }));
        setShowForm(false);
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-sm">Lista de Desejos — Pedidos Pendentes</h3>
                        <p className="text-xs text-gray-400">{storeOrders.length} encomenda{storeOrders.length !== 1 ? 's' : ''} · Loja {selectedStore}</p>
                    </div>
                </div>
                <button onClick={() => setShowForm(s => !s)}
                    className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all">
                    <Plus className="w-3.5 h-3.5" /> Novo Pedido
                </button>
            </div>

            {showForm && (
                <div className="p-4 border-b border-gray-100 bg-amber-50">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3">
                        <input value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))}
                            placeholder="Nome do cliente *" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-300 focus:outline-none col-span-1" />

                        <BadgeSelector value={form.produto} onChange={v => setForm(f => ({ ...f, produto: v }))} placeholder="Produto *" options={produtosOpts} colorClass="bg-blue-100 text-blue-700" onNewTag={v => handleNewTag('produto', v)} />
                        <BadgeSelector value={form.marca} onChange={v => setForm(f => ({ ...f, marca: v }))} placeholder="Marca" options={marcasOpts} colorClass="bg-indigo-100 text-indigo-700" onNewTag={v => handleNewTag('marca', v)} />
                        <BadgeSelector value={form.modelo} onChange={v => setForm(f => ({ ...f, modelo: v }))} placeholder="Modelo" options={modelosOpts} colorClass="bg-purple-100 text-purple-700" onNewTag={v => handleNewTag('modelo', v)} />
                        <BadgeSelector value={form.tamanho} onChange={v => setForm(f => ({ ...f, tamanho: v }))} placeholder="Tamanho" options={tamanhosOpts} colorClass="bg-pink-100 text-pink-700" onNewTag={v => handleNewTag('tamanho', v)} />

                        <input value={form.wpp} onChange={e => setForm(f => ({ ...f, wpp: e.target.value }))}
                            placeholder="WhatsApp / Contato" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-300 focus:outline-none col-span-1" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-300 focus:outline-none" />
                        <select value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))}
                            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-300 focus:outline-none">
                            <option value="alta">🔴 Alta</option>
                            <option value="media">🟡 Média</option>
                            <option value="baixa">⚪ Baixa</option>
                        </select>
                        <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-300 focus:outline-none">
                            <option value="waiting">Aguardando</option>
                            <option value="available">Disponível</option>
                        </select>
                        <button onClick={addOrder} className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all">
                            Salvar
                        </button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 tracking-wide">Cliente</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 tracking-wide">Item</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 tracking-wide">Contato</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 tracking-wide">Prazo</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 tracking-wide">Data</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 tracking-wide">Status</th>
                            <th className="px-4 py-3 w-8"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {storeOrders.length === 0 && (
                            <tr><td colSpan={7} className="py-10 text-center text-gray-400 text-sm">Nenhum pedido pendente</td></tr>
                        )}
                        {storeOrders.map(o => {
                            const wppNumber = o.wpp || o.contato || o.contact || o.contact_info || '';
                            const rawPhone = String(wppNumber).replace(/\D/g, '');
                            const phone = rawPhone.startsWith('55') ? rawPhone : rawPhone ? `55${rawPhone}` : '';
                            const detalhes = [o.produto || o.product, o.brand, o.modelo || o.model]
                                .filter(Boolean).join(' ');
                            const tamanho = o.tamanho || o.size || '';
                            const partes = [detalhes, tamanho ? `no tamanho ${tamanho}` : '']
                                .filter(Boolean).join(' ');
                            const wppMsg = encodeURIComponent(
                                `Oi ${o.cliente || o.client_name} ✨, tudo bem? Chegou reposição daquele(a) ${partes || 'item'} que você pediu! 😍👗`
                            );
                            const wppLink = phone ? `https://wa.me/${phone}?text=${wppMsg}` : null;
                            const fullItemTitle = `${o.produto || o.product} ${o.modelo || o.model || ''} (${o.brand || 'Sem marca'})`;
                            
                            return (
                                <tr key={o.id} className="hover:bg-gray-50/80 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-800 text-sm truncate max-w-[150px]" title={o.cliente || o.client_name}>
                                                {o.cliente || o.client_name}
                                            </span>
                                            {wppLink && (
                                                <a href={wppLink} target="_blank" rel="noopener noreferrer" 
                                                    className="text-gray-300 hover:text-green-500 transition-colors flex shrink-0" 
                                                    title="Chamar no WhatsApp">
                                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                    
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col max-w-[200px]">
                                            <span className="text-gray-800 text-sm font-medium truncate" title={fullItemTitle}>
                                                {o.produto || o.product} {o.modelo || o.model || ''} <span className="text-indigo-500 font-normal">{(o.brand) ? `(${o.brand})` : ''}</span>
                                            </span>
                                            <span className="text-gray-400 text-[11px] font-medium truncate">
                                                Tam: {o.tamanho || o.size || 'Único'}
                                            </span>
                                            {o.observacao && (
                                                <span className="text-amber-600 text-[10px] mt-0.5 truncate max-w-full" title={o.observacao}>
                                                    Obs: {o.observacao}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                                        {wppNumber || <span className="text-gray-300">—</span>}
                                    </td>

                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5 font-medium">
                                            <span className={`text-[11px] px-2.5 py-0.5 rounded-full border ${(PRIO_PILLS[o.prioridade] || PRIO_PILLS.baixa).cls}`}>
                                                {(PRIO_PILLS[o.prioridade] || PRIO_PILLS.baixa).label}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="px-4 py-3 text-xs text-gray-500 font-medium">
                                        {new Date(o.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                                    </td>

                                    <td className="px-4 py-3">
                                        <button onClick={() => updateCrmWishlistStatus(o.id, o.status === 'waiting' ? 'available' : 'waiting')}
                                            className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border shadow-sm transition-all hover:scale-105 active:scale-95 ${STATUS_PILLS[o.status]?.cls || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                            {STATUS_PILLS[o.status] ? STATUS_PILLS[o.status].label : o.status}
                                        </button>
                                    </td>

                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => deleteCrmWishlist(o.id)}
                                            className="text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 p-1.5 rounded-lg">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ─── Main CRM ───────────────────────────────────────────────────
const CRM = ({ crmLeads, saveCrmLead, moveCrmLeadStage, archiveCrmLead, crmWishlist, saveCrmWishlist, deleteCrmWishlist, updateCrmWishlistStatus, crmCustomTags, addCrmCustomTag, selectedStore }) => {
    // Optimistic UI State for Drag & Drop
    const [optimisticLeads, setOptimisticLeads] = useState(crmLeads || []);
    useEffect(() => {
        setOptimisticLeads(crmLeads || []);
    }, [crmLeads]);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMermaidDrawerOpen, setIsMermaidDrawerOpen] = useState(false);
    const [editLead, setEditLead] = useState(null);
    const [search, setSearch] = useState('');
    const [filterStage, setFilterStage] = useState('all');
    const [expandedCols, setExpandedCols] = useState({});
    const [form, setForm] = useState({ nome: '', telefone: '', origem: '', estagio: 'Triagem', produto: [], marca: [], modelo: [], tamanho: [] });
    // 🎯 Drag & Drop
    const [dragLeadId, setDragLeadId] = useState(null);
    const [dragOverStage, setDragOverStage] = useState(null);

    // Tags Setup for Leads
    const tagsForCategory = (category, staticOpts) => {
        const dynamic = (crmCustomTags || [])
            .filter(t => t.category === category)
            .map(t => t.value);
        return [...new Set([...staticOpts, ...dynamic])];
    };
    const produtosOpts = tagsForCategory('produto', PRODUTOS_OPTS);
    const marcasOpts   = tagsForCategory('marca',   MARCAS_OPTS);
    const modelosOpts  = tagsForCategory('modelo',  MODELOS_OPTS);
    const tamanhosOpts = tagsForCategory('tamanho', TAMANHOS_OPTS);

    const handleNewTag = (category, value) => {
        if (addCrmCustomTag) addCrmCustomTag(selectedStore, category, value);
    };

    // 🎯 Drag handlers
    const handleDragStart = (e, leadId) => {
        setDragLeadId(leadId);
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragOver = (e, stageId) => {
        e.preventDefault();
        setDragOverStage(stageId);
    };
    const handleDrop = async (e, stageId) => {
        e.preventDefault();
        if (dragLeadId && stageId) {
            // Backup do estado anterior para fallback
            const previousState = [...optimisticLeads];
            
            // Atualização Otimista OBRIGATÓRIA (Micro-Sprint 10.2)
            setOptimisticLeads(prev => 
                prev.map(lead => lead.id === dragLeadId ? { ...lead, estagio: stageId, status: stageId } : lead)
            );
            
            // Disparo Assíncrono para o Backend
            try {
                await moveCrmLeadStage(dragLeadId, stageId);
            } catch (error) {
                // Fallback de Segurança caso falhe
                console.error("Falha ao atualizar coluna do card. Revertendo...", error);
                setOptimisticLeads(previousState);
            }
        }
        setDragLeadId(null);
        setDragOverStage(null);
    };
    const handleDragEnd = () => {
        setDragLeadId(null);
        setDragOverStage(null);
    };

    const openModal = (lead = null, defaultStage = 'Triagem') => {
        if (lead) {
            setEditLead(lead);
            setForm({ 
                nome: lead.nome || lead.name || '', 
                telefone: lead.telefone || '', 
                origem: lead.origem || '', 
                estagio: lead.status || lead.estagio || 'Triagem',
                produto: lead.produto ? lead.produto.split(', ').filter(Boolean) : [],
                marca: lead.marca ? lead.marca.split(', ').filter(Boolean) : [],
                modelo: lead.modelo ? lead.modelo.split(', ').filter(Boolean) : [],
                tamanho: lead.tamanho ? lead.tamanho.split(', ').filter(Boolean) : [],
            });
        } else {
            setEditLead(null);
            setForm({ nome: '', telefone: '', origem: '', estagio: defaultStage, produto: [], marca: [], modelo: [], tamanho: [] });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.nome.trim()) return;
        const savePayload = {
            ...(editLead || {}),
            ...form,
            status: form.estagio,
            store_id: selectedStore,
            produto: form.produto.join(', '),
            marca: form.marca.join(', '),
            modelo: form.modelo.join(', '),
            tamanho: form.tamanho.join(', '),
        };
        await saveCrmLead(savePayload);
        setIsModalOpen(false);
        setEditLead(null);
    };

    const leads = useMemo(() => {
        return optimisticLeads.filter(l => {
            const stage = l.status || l.estagio;
            if (filterStage !== 'all' && stage !== filterStage) return false;
            if (search) {
                const q = search.toLowerCase();
                return (l.nome || l.name || '').toLowerCase().includes(q) ||
                    (l.telefone || '').includes(q) ||
                    (l.origem || '').toLowerCase().includes(q);
            }
            return true;
        });
    }, [optimisticLeads, filterStage, search]);

    const totalLeads = leads.length;
    const byStage = STAGES.map(s => ({ ...s, count: leads.filter(l => (l.status || l.estagio) === s.id).length }));

    const dashboardProjects = useMemo(() => {
        return leads.map(lead => {
            const stage = STAGES.find(s => s.id === (lead.status || lead.estagio)) || STAGES[0];
            return {
                id: lead.id,
                name: lead.nome || lead.name || 'Sem Nome',
                subtitle: lead.origem || 'Website',
                date: formatDate(lead.created_at),
                progress: stage.id === 'Triagem' ? 10 : stage.id === 'Sondagem' ? 30 : stage.id === 'Visita' ? 60 : stage.id === 'Fechamento' ? 100 : 0,
                status: stage.id,
                accentColor: stage.id === 'Ghosting' ? '#ef4444' : stage.id === 'Fechamento' ? '#22c55e' : stage.id === 'Visita' ? '#6366f1' : stage.id === 'Sondagem' ? '#a855f7' : '#3b82f6',
                bgColorClass: 'bg-white dark:bg-slate-800',
            };
        });
    }, [leads]);

    const handleProjectAction = (id, action) => {
        if (action === "whatsapp") {
            const lead = leads.find(l => l.id === id);
            if (lead && lead.telefone) {
                const phone = String(lead.telefone).replace(/\D/g, '');
                if (phone.length >= 8) window.open(`https://wa.me/55${phone}`, '_blank');
            }
        } else if (action === "edit") {
            const lead = leads.find(l => l.id === id);
            if (lead) openModal(lead);
        } else if (action === "delete") {
            if (window.confirm("Deseja realmente excluir este cliente?")) {
                // Priority fallback if user meant wishlist vs lead archive
                if (typeof deleteCrmWishlist === 'function') deleteCrmWishlist(id);
                else if (typeof archiveCrmLead === 'function') archiveCrmLead(id);
            }
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-gray-50 overflow-hidden fade-in">
            <div className="flex-1 overflow-hidden">
                <div className="h-full flex flex-col pt-0 p-4 md:p-5 gap-4">
                    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-0">
                        <ProjectDashboard
                            title="Pipeline de Vendas"
                            projects={dashboardProjects}
                            view="kanban"
                            onProjectAction={handleProjectAction}
                            onProjectUpdate={(p) => {
                                // Optimistic update
                                setOptimisticLeads(prev => prev.map(l => l.id === p.id ? { ...l, estagio: p.status, status: p.status } : l));
                                // API update
                                moveCrmLeadStage(p.id, p.status);
                            }}
                            onProjectClick={(id) => {
                                const l = leads.find(x => x.id === id || x.id === Number(id));
                                if (l) openModal(l);
                            }}
                            onProjectCreate={() => openModal(null, 'Triagem')}
                            className="h-full border-none rounded-t-2xl"
                        />
                        
                        {/* Encomendas — mesma coluna, na base */}
                        <div className="shrink-0 bg-white border-t border-gray-100 overflow-y-auto max-h-[35vh]">
                            <EncomendasSection
                                selectedStore={selectedStore}
                                crmWishlist={crmWishlist}
                                saveCrmWishlist={saveCrmWishlist}
                                deleteCrmWishlist={deleteCrmWishlist}
                                updateCrmWishlistStatus={updateCrmWishlistStatus}
                                crmCustomTags={crmCustomTags || []}
                                addCrmCustomTag={addCrmCustomTag}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Mermaid Drawer */}
            <div className={`lg:hidden fixed inset-x-0 bottom-0 z-[60] transform transition-transform duration-300 ease-in-out ${isMermaidDrawerOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="bg-gray-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] max-h-[85vh] flex flex-col border border-gray-200">
                    <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl z-10 shrink-0">
                        <div className="w-10 h-1.5 bg-gray-300 rounded-full mx-auto my-1 absolute left-1/2 -translate-x-1/2 top-2" />
                        <h3 className="font-bold text-gray-800 text-sm mt-4 ml-1">Scripts de Atendimento</h3>
                        <button onClick={() => setIsMermaidDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 mt-4">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 [&>div]:mt-0">
                        <MermaidSection />
                    </div>
                </div>
            </div>
            {/* Backdrop for Drawer */}
            {isMermaidDrawerOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/40 z-[50] backdrop-blur-sm transition-opacity"
                    onClick={() => setIsMermaidDrawerOpen(false)}
                />
            )}

            {/* Mobile Floating Action Button for Scripts */}
            <button
                onClick={() => setIsMermaidDrawerOpen(true)}
                className={`lg:hidden fixed right-4 z-[40] bg-indigo-600 text-white rounded-full shadow-[0_8px_30px_rgba(79,70,229,0.3)] flex items-center gap-2 font-bold transition-all px-4 py-3 ${isMermaidDrawerOpen ? 'opacity-0 pointer-events-none' : 'bottom-20 opacity-100'}`}>
                <Code2 className="w-5 h-5" />
                <span className="text-sm shadow-sm">Ver Scripts</span>
            </button>


            {/* ── Modal Novo / Editar Lead ── */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={e => e.target === e.currentTarget && setIsModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4 flex items-center justify-between">
                            <h3 className="font-bold text-base">{editLead ? 'Editar Lead' : 'Novo Lead'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-white/60 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Nome do Cliente *</label>
                                <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                                    placeholder="Nome completo"
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                                    autoFocus />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">WhatsApp</label>
                                    <input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))}
                                        placeholder="(11) 9xxxx-xxxx"
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Origem</label>
                                    <select value={form.origem} onChange={e => setForm(p => ({ ...p, origem: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none">
                                        {ORIGENS.map(o => <option key={o} value={o}>{o || 'Selecione...'}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 py-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Interesse (Tags)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <BadgeSelector value={form.produto} onChange={v => setForm(f => ({ ...f, produto: v }))} placeholder="Produto" options={produtosOpts} colorClass="bg-blue-100 text-blue-700" onNewTag={v => handleNewTag('produto', v)} />
                                    <BadgeSelector value={form.marca} onChange={v => setForm(f => ({ ...f, marca: v }))} placeholder="Marca" options={marcasOpts} colorClass="bg-indigo-100 text-indigo-700" onNewTag={v => handleNewTag('marca', v)} />
                                    <BadgeSelector value={form.modelo} onChange={v => setForm(f => ({ ...f, modelo: v }))} placeholder="Modelo" options={modelosOpts} colorClass="bg-purple-100 text-purple-700" onNewTag={v => handleNewTag('modelo', v)} />
                                    <BadgeSelector value={form.tamanho} onChange={v => setForm(f => ({ ...f, tamanho: v }))} placeholder="Tamanho" options={tamanhosOpts} colorClass="bg-pink-100 text-pink-700" onNewTag={v => handleNewTag('tamanho', v)} />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Estágio no Funil</label>
                                <select value={form.estagio} onChange={e => setForm(p => ({ ...p, estagio: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none">
                                    {STAGES.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
                                </select>
                            </div>
                            
                            <button onClick={handleSave} disabled={!form.nome.trim()}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl transition-all mt-2 shadow-sm">
                                {editLead ? 'Salvar Alterações' : 'Adicionar Lead'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CRM;
