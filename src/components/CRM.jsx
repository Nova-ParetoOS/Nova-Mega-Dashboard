import React, { useState, useMemo, useEffect, useRef } from 'react';
// framer-motion removed — CSS transitions used instead
import { Send, Clock, X, Plus, List, LayoutGrid, Search, Archive, ChevronRight, Calendar, Smartphone, Code2, Eye, ShoppingBag, Trash2, ChevronDown, Tag, MessageCircle, ArrowRight, Copy, Check, BookOpen, Bell } from 'lucide-react';
const TIPO_CLIENTE_PILLS = {
    cliente: { label: '👤 Cliente', cls: 'bg-blue-50 text-blue-700 border-blue-100' },
    vip: { label: '✅ VIP', cls: 'bg-amber-50 text-amber-700 border-amber-100' },
    b2b: { label: '🏢 Empresa B2B', cls: 'bg-purple-50 text-purple-700 border-purple-100' },
};

const STAGES = [
    { id: 'triagem', label: 'Novo Contato (Triagem)', emoji: '📥', pill: 'bg-blue-100 text-blue-700 border border-blue-200', col: 'bg-blue-50 border-blue-100' },
    { id: 'atendimento', label: 'Em Atendimento (Enviando fotos)', emoji: '💬', pill: 'bg-amber-100 text-amber-700 border border-amber-200', col: 'bg-amber-50 border-amber-100' },
    { id: 'pagamento', label: 'Aguardando Pagamento (Link/Pix)', emoji: '⏳', pill: 'bg-purple-100 text-purple-700 border border-purple-200', col: 'bg-purple-50 border-purple-100' },
    { id: 'fechada', label: 'Venda Fechada (Pago/Separado)', emoji: '✅', pill: 'bg-green-100 text-green-700 border border-green-200', col: 'bg-green-50 border-green-100' },
    { id: 'perdido', label: 'Perdido / Sem Resposta', emoji: '❌', pill: 'bg-gray-100 text-gray-700 border border-gray-200', col: 'bg-gray-50 border-gray-100' },
];

const ATALHOS_WHATSAPP = {
    Triagem: [
        { comando: '/Oi', texto: 'Oi! Seja bem-vinda a Mega Jeans! Para eu te atender melhor, como podemos te chamar por aqui?\n\nMe conta:\n1. Qual numeração você busca hoje?\n2. Algum modelo que já usa e gosta (Skinny, Wide Leg, Mom...)?' },
        { comando: '/TriagemPost', texto: 'Oi! Vi que gostou das novidades. Essas peças saem muito rápido. Qual tamanho você costuma usar? Assim já confiro o estoque agora mesmo e te mando fotos delas no balcão!' },
        { comando: '/FotoChega', texto: 'Oi, [Nome]! Recebi sua mensagem sim. Tô com a loja cheia nesse momento, mas não vou te deixar esperando!\n\nVou te mandar as fotos do [modelo] em até [X horas] — pode ser?\nSe quiser, já anoto seu tamanho e deixo separado para garantir.' },
        { comando: '/Estoquebalcao', texto: '[Nome], vou ali no nosso balcão agora mesmo conferir o que temos de mais lindo no seu tamanho.\n\nMe dá só uns minutinhos? Já volto com fotos reais para você ver o caimento.' }
    ],
    Apresentacao: [
        { comando: '/Apresentacaofoto', texto: '[Nome do Modelo]\nEste modelo tem cintura alta e modelagem que valoriza o corpo com conforto.\n- Diferencial: [ex: estica / não laceia]\n- Elastano: x% (estica bem)\n- Tamanhos: [36 a 44]\n\nR$ [Preço] — 3x sem juros.\nQuer que eu separe para você provar?' },
        { comando: '/DuvidaTamanho', texto: 'Entendo, [Nome]! Cada corpo é diferente. Você prefere mais justo no quadril ou um pouquinho mais folgado?\n\nEsse modelo tem [X]% de elastano, então ele vai adaptar bem. Dica: quadril mais cheio que a cintura? Pega um número acima — fica ótimo!\nSeparo os dois tamanhos para provar?' },
        { comando: '/Plus', texto: '[Nome], temos modelos Plus Size que são um verdadeiro abraço no corpo! Peças com muito conforto que vestem do 48 ao 54 com muito estilo.\n\nQual numeração você costuma usar? Te mando fotos do caimento real!' }
    ],
    Fechamento: [
        { comando: '/QualificacaoEntrega', texto: 'Perfeito, [Nome]! Para organizar sua entrega, preciso de 4 infos rapidinho:\n\n1. TAMANHO [TAM] confirmado?\n2. ENDEREÇO: rua, número, bairro + ponto de referência\n3. RESPONSÁVEL pelo recebimento: seu nome ou quem estará em casa\n4. PAGAMENTO: Pix ou Cartão?\n\nSobre troca: você tem 15 dias com etiqueta para trocar presencialmente. O motoboy só entrega. Combinado?' },
        { comando: '/Fechamentototal', texto: 'Tudo pronto, [Nome]!\n\nChave Pix: 17.442.843/0001-40\nCartão: maquineta ou link de pagamento\n\nEntrega: Taxa R$ [Valor]\nRetirada: Grátis — Rua Coronel Teófilo Leme, 1227 - Centro\n\nFico no aguardo do comprovante.' },
        { comando: '/CodigoEntrega', texto: 'Prontinho, [Nome]! O motoboy já tá a caminho. O código de segurança é: [XXXX]\n\nPassa pra quem for receber, tá? É só para garantir que chegou no lugar certo.\n\nAvisa quando chegar!' }
    ],
    Recuperacao: [
        { comando: '/Ghosting', texto: 'Oi, [Nome]! Tudo certinho? Passando para saber se as fotos do balcão ajudaram ou se ficou alguma dúvida?\n\nComo a procura está grande hoje, queria saber se quer que eu reserve algo ou se libero a peça no estoque?\nFico no seu aguardo.' },
        { comando: '/CarneAviso', texto: 'Oi, [Nome]! Tudo bem?\nPassando só pra lembrar que a sua parcela de [MÊS] vence dia [DIA].\n\nChave Pix: 17.442.843/0001-40\nValor: R$ [valor]\n\nManda o comprovante aqui! Qualquer dúvida é só chamar.' },
        { comando: '/VIPAviso', texto: 'Oi, [Nome]! Estamos avisando para você em primeira mão. Acabou de chegar na loja e ainda não postamos nas redes: [foto(s)]\n\nQuer garantir o seu antes que a gente poste? Se quiser me fala que já separo.' }
    ]
};

// Roteador Stage -> Categorias de Scripts (CTO v2.2)
const STAGE_TO_SCRIPTS = {
    triagem: ['Triagem'],
    atendimento: ['Apresentacao'],
    pagamento: ['Fechamento'],
    fechada: [],
    perdido: ['Recuperacao'],
};

const ORIGENS = ['', 'Instagram', 'WhatsApp', 'Indicação', 'Loja Física', 'Outro'];

const formatDate = (d) => {
    if (!d) return '—';
    // ISO string with timezone: strip time part for display
    const s = typeof d === 'string' ? d : new Date(d).toISOString();
    // Parse first 10 chars as YYYY-MM-DD safely with local time
    const [y, m, day] = s.slice(0, 10).split('-').map(Number);
    if (!y || !m || !day) return '—';
    return new Date(y, m - 1, day).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateShort = (d) => {
    if (!d) return '';
    const s = typeof d === 'string' ? d : new Date(d).toISOString();
    const [, m, day] = s.slice(0, 10).split('-').map(Number);
    if (!m || !day) return '';
    return `${String(day).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
};

// Parse seguro de datas ISO ou DD/MM/YYYY para exibição
const parseDateSafe = (d) => {
    if (!d) return '—';
    // Formato DD/MM/YYYY
    if (typeof d === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(d.trim())) {
        const [dd, mm, yyyy] = d.trim().split('/').map(Number);
        return new Date(yyyy, mm - 1, dd).toLocaleDateString('pt-BR');
    }
    // Formato ISO YYYY-MM-DD (evita diff de fuso)
    const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('pt-BR');
    return '—';
};

const daysSince = (d) => {
    if (!d) return null;
    return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
};

export const getIdleHours = (lead) => {
    const refDate = lead.updated_at || lead.created_at;
    if (!refDate) return 0;
    const diffMs = Date.now() - new Date(refDate).getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60));
};

const AlertBell = ({ leads }) => {
    const criticalLeads = leads.filter(l => {
        const h = getIdleHours(l);
        return h >= 2 && l.estagio !== 'perdido' && l.estagio !== 'fechada' && l.status !== 'fechada' && l.status !== 'perdido';
    });
    const count = criticalLeads.length;

    if (count === 0) return null;

    return (
        <button
            className="relative p-2.5 rounded-full bg-white border border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm ring-1 ring-red-500/20"
            title={`${count} leads aguardando há mais de 2 horas!`}
        >
            <Bell className="w-4 h-4 animate-bounce" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow ring-2 ring-white">
                {count}
            </span>
        </button>
    );
};

// ─── Playbook Tab (Subcomponente Interno) ─────────────────────────
const PlaybookTab = ({ readOnly = false }) => {
    const [pNome, setPNome] = useState('');
    const [pModelo, setPModelo] = useState('');
    const [pTamanho, setPTamanho] = useState('');
    const [copiedAtalho, setCopiedAtalho] = useState(null);
    const [openCategoria, setOpenCategoria] = useState('Triagem');

    const handleCopy = (texto, comando) => {
        const msg = texto
            .replace(/\[Nome\]/gi, pNome.trim() || 'Cliente')
            .replace(/\[modelo\]|\[Modelo\]/g, pModelo.trim() || 'modelo')
            .replace(/\[Tamanho\]/gi, pTamanho.trim() || 'tamanho');
        navigator.clipboard.writeText(msg);
        setCopiedAtalho(comando);
        setTimeout(() => setCopiedAtalho(null), 2000);
    };

    return (
        <div className={`flex h-full w-full overflow-y-auto bg-gray-50/50 ${readOnly ? 'flex-col p-4 gap-4' : 'flex-col md:flex-row p-6 gap-6'}`}>
            {/* Esquerda: Regras e Fluxos */}
            <div className={`w-full flex-col gap-4 ${readOnly ? 'flex' : 'md:w-1/3 flex'}`}>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3"><BookOpen className="w-5 h-5 text-indigo-500" /> Regras de Ouro</h3>
                    <ul className="text-sm text-gray-600 space-y-2">
                        <li className="flex items-start gap-2"><b>1.</b> <span className="pt-0.5">Sempre chame a cliente pelo nome (cria conexão).</span></li>
                        <li className="flex items-start gap-2"><b>2.</b> <span className="pt-0.5">Envie fotos reais (corpo/manequim), fuja só da foto de cabide.</span></li>
                        <li className="flex items-start gap-2"><b>3.</b> <span className="pt-0.5">Termine a frase com uma pergunta para não matar o assunto.</span></li>
                    </ul>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3"><X className="w-5 h-5 text-red-500" /> Os 3 Erros Mortais</h3>
                    <ul className="text-sm text-red-700/80 space-y-2">
                        <li className="flex items-start gap-2"><b>1.</b> <span className="pt-0.5">Demorar mais de 30 min sem avisar (gera frustração).</span></li>
                        <li className="flex items-start gap-2"><b>2.</b> <span className="pt-0.5">Mandar foto de peça sem informar o preço logo de cara.</span></li>
                        <li className="flex items-start gap-2"><b>3.</b> <span className="pt-0.5">Ignorar o cliente caso diga que "só estava olhando".</span></li>
                    </ul>
                </div>
                {readOnly && (
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm mt-2">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3"><BookOpen className="w-5 h-5 text-indigo-500" /> Os 7 Fluxos de Atendimento</h3>
                        <ul className="text-sm text-gray-600 space-y-3">
                            <li className="flex flex-col"><b>Fluxo 1 (Nova Lead)</b><span className="text-xs text-gray-400">Insta/Cakebot → Resp. 2h → Tag: Novo Lead</span></li>
                            <li className="flex flex-col"><b>Fluxo 2 (Pedido Direto)</b><span className="text-xs text-gray-400">Sabe o que quer → Tag: Em Atendimento → Módulo Core</span></li>
                            <li className="flex flex-col"><b>Fluxo 3 (Foto Pendente)</b><span className="text-xs text-gray-400">Causa abandono → /FotoChega em 30min</span></li>
                            <li className="flex flex-col"><b>Fluxo 4 (Delivery)</b><span className="text-xs text-gray-400">Quer entrega em casa → Enviar /QualificacaoEntrega</span></li>
                            <li className="flex flex-col"><b>Fluxo 5 (Plus Size)</b><span className="text-xs text-gray-400">Tamanho 46+ → Tom acolhedor → Tag: Plus Size</span></li>
                            <li className="flex flex-col"><b>Fluxo 6 (Carnê / VIP)</b><span className="text-xs text-gray-400">Lembrete amigável 3 dias antes ou Aviso 3ª compra</span></li>
                            <li className="flex flex-col"><b>Fluxo 7 (Outra Cidade)</b><span className="text-xs text-gray-400">Nunca dizer "não podemos" → Enviar endereços</span></li>
                        </ul>
                    </div>
                )}
            </div>

            {/* Direita: Gerador Interativo */}
            <div className={`w-full flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1 ${readOnly ? 'min-h-[300px]' : 'md:w-2/3 max-h-[85vh]'}`}>
                {!readOnly && (
                    <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-transparent">
                        <h2 className="text-lg font-bold text-blue-900 mb-1">⚡ Gerador de Mensagens Rápidas</h2>
                        <p className="text-sm text-gray-500 mb-4">Preencha os campos abaixo para substituir as tags automaticamente nos textos.</p>

                        <div className="grid grid-cols-3 gap-3">
                            <input type="text" placeholder="Nome (ex: Maria)" value={pNome} onChange={(e) => setPNome(e.target.value)} className="w-full text-sm font-medium border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 bg-white" />
                            <input type="text" placeholder="Modelo (ex: Wide Leg)" value={pModelo} onChange={(e) => setPModelo(e.target.value)} className="w-full text-sm font-medium border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 bg-white" />
                            <input type="text" placeholder="Tamanho (ex: 42)" value={pTamanho} onChange={(e) => setPTamanho(e.target.value)} className="w-full text-sm font-medium border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 bg-white" />
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
                    {Object.entries(ATALHOS_WHATSAPP).map(([categoria, atalhos]) => (
                        <div key={categoria} className="bg-white border text-gray-800 rounded-xl overflow-hidden shadow-sm">
                            <button
                                onClick={() => setOpenCategoria(openCategoria === categoria ? null : categoria)}
                                className="w-full p-4 flex justify-between items-center text-left font-bold text-sm bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                                <span>{categoria} ({atalhos.length} atalhos)</span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openCategoria === categoria ? 'rotate-180' : ''}`} />
                            </button>
                            {openCategoria === categoria && (
                                <div className="p-4 space-y-3">
                                    {atalhos.map((a) => (
                                        <div key={a.comando} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100 relative group pr-16 bg-blue-50/20">
                                            <span className="text-xs font-bold text-blue-600 bg-blue-100 w-fit px-2 py-0.5 rounded-full">{a.comando}</span>
                                            <p className="text-[13px] text-gray-700 italic border-l-2 border-blue-200 pl-2">
                                                "{a.texto}"
                                            </p>
                                            {!readOnly && (
                                                <button
                                                    onClick={() => handleCopy(a.texto, a.comando)}
                                                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl border shadow-sm transition-all flex flex-col items-center justify-center gap-1 min-w-[70px] ${copiedAtalho === a.comando
                                                        ? 'bg-emerald-50 tex-emerald-700 border-emerald-200'
                                                        : 'bg-white text-gray-500 border-gray-200 hover:text-blue-600 hover:border-blue-300 hover:shadow'
                                                        }`}
                                                >
                                                    {copiedAtalho === a.comando ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                                    <span className={`text-[9px] font-bold ${copiedAtalho === a.comando ? 'text-emerald-700' : ''}`}>
                                                        {copiedAtalho === a.comando ? 'Copiado!' : 'Copiar'}
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── Lead Card (Kanban) ──────────────────────────────────────────
const LeadCard = ({ lead, stages, onMove, onArchive, onEdit, onDragStart, onDragEnd, isDragging, onScriptOpen }) => {
    const phone = String(lead.telefone || '').replace(/\D/g, '');
    const stageId = lead.status || lead.estagio;
    const stage = stages.find(s => s.id === stageId) || stages[0];
    const currentIndex = stages.findIndex(s => s.id === stage.id);
    const prevStage = currentIndex > 0 ? stages[currentIndex - 1] : null;
    const nextStage = currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;

    const tipoKey = lead.tipo_cliente || '';
    const pill = TIPO_CLIENTE_PILLS[tipoKey];

    const idleHours = getIdleHours(lead);
    let idleClasses = 'border-gray-200 hover:border-indigo-300';
    let zumbiMode = false;
    if (idleHours >= 48) {
        zumbiMode = true;
        idleClasses = 'border-gray-400 bg-gray-100 opacity-75 grayscale';
    } else if (idleHours >= 24) {
        idleClasses = 'border-red-500 animate-[pulse_2s_ease-in-out_infinite] bg-red-50/20 border-2';
    } else if (idleHours >= 2) {
        idleClasses = 'border-orange-400 bg-orange-50/10 border-2';
    }

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={`bg-white rounded-xl border shadow-sm transition-all duration-200 group cursor-grab active:cursor-grabbing relative overflow-hidden flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg ${idleClasses} ${isDragging ? 'opacity-50 scale-95 ring-2 ring-indigo-400' : ''}`}
        >
            {zumbiMode && (
                <div className="bg-gray-800 text-white text-[10px] font-bold text-center py-1 flex items-center justify-center gap-1">
                    🚨 48H+ (ARQUIVE O CARD)
                </div>
            )}
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                    onClick={(e) => { e.stopPropagation(); onScriptOpen && onScriptOpen(lead); }}
                    className="text-amber-400 hover:text-amber-600 p-1.5 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-transparent hover:border-amber-200"
                    title="Ver scripts para este lead"
                >
                    <span className="text-xs font-black leading-none">⚡</span>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
                    className="text-gray-400 hover:text-indigo-600 p-1.5 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                    title="Editar"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                {onArchive && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onArchive(lead.id); }}
                        className="text-gray-400 hover:text-red-500 p-1.5 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        title="Deletar/Arquivar"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            <div className="p-3 flex flex-col h-full items-start">
                <div className="font-bold text-sm text-gray-900 leading-tight mb-1 pr-12 w-full truncate" title={lead.nome || lead.name}>{lead.nome || lead.name}</div>

                {(lead.produto || lead.marca || lead.modelo) && (
                    <div className="text-[11px] font-semibold text-gray-600 mb-2 line-clamp-2 leading-tight">
                        🛒 {[lead.produto, lead.marca, lead.modelo, lead.tamanho].filter(Boolean).join(' · ')}
                    </div>
                )}

                {pill && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border mb-1 inline-block ${pill.cls}`}>
                        {pill.label}
                    </span>
                )}

                <div className="flex items-center gap-1.5 text-[10px] items-baseline font-mono text-gray-400 mb-2 mt-auto pt-2 w-full">
                    {phone.length >= 8 ? (
                        <a href={`https://wa.me/55${phone}`} target="_blank" rel="noreferrer" className="hover:text-green-500 transition-colors flex items-center gap-1 font-bold w-full">
                            <MessageCircle className="w-3 h-3 text-green-500" /> {lead.telefone || phone}
                        </a>
                    ) : <span>Sem contato</span>}
                </div>
            </div>

            <div className="bg-gray-50 border-t border-gray-100/60 p-2 pt-1 flex flex-col gap-1">
                <div className="flex gap-1.5 w-full">
                    <button
                        onClick={(e) => { e.stopPropagation(); if (prevStage) onMove(lead.id, prevStage.id); }}
                        disabled={!prevStage}
                        className={`flex-1 text-[9px] font-bold py-1.5 rounded-lg border transition-all flex items-center justify-center ${prevStage ? 'border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-700 bg-white shadow-sm' : 'border-transparent text-gray-300 bg-transparent cursor-not-allowed opacity-50'}`}>
                        <ChevronRight className="w-3 h-3 rotate-180" /> Anterior
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); if (nextStage) onMove(lead.id, nextStage.id); }}
                        disabled={!nextStage}
                        className={`flex-1 text-[9px] font-bold py-1.5 rounded-lg border transition-all flex items-center justify-center gap-0.5 ${nextStage ? 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-700 bg-white shadow-sm' : 'border-transparent text-gray-300 bg-transparent cursor-not-allowed opacity-50'}`}>
                        Próximo <ChevronRight className="w-3 h-3" />
                    </button>
                </div>
                {lead.created_at && (
                    <div className="w-full text-center group-hover:opacity-100 opacity-60 transition-opacity">
                        <span className="text-[9px] text-gray-400 font-medium">Criado em: <span className="font-bold">{formatDateShort(lead.created_at)}</span></span>
                    </div>
                )}
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
    waiting: { label: 'Aguardando', cls: 'bg-amber-50 text-amber-700 border-transparent shadow-none' },
    available: { label: 'Disponível ✓', cls: 'bg-emerald-50 text-emerald-700 border-transparent shadow-none' },
};

// Constants removidas porque TIPO_CLIENTE_PILLS já subiu para o topo.
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

const EncomendasSection = ({ selectedStore, crmWishlist, saveCrmWishlist, deleteCrmWishlist, updateCrmWishlistStatus, crmCustomTags, addCrmCustomTag, saveCrmLead, userRole, STORE_CONFIGS }) => {
    const [form, setForm] = useState({ cliente: '', produto: [], modelo: [], tamanho: [], marca: [], wpp: '', observacao: '', data: '1 mês', status: 'waiting', tipo_cliente: 'cliente', store_id: selectedStore });
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [sortWishlist, setSortWishlist] = useState('desc');

    const storeOrders = useMemo(() => {
        const isGlobal = selectedStore === 'Todas' || selectedStore === 'all' || !selectedStore;
        const orders = (crmWishlist || []).filter(o => isGlobal || String(o.store_id) === String(selectedStore));
        return orders.sort((a, b) => {
            const d1 = new Date(a.created_at || Date.now()).getTime();
            const d2 = new Date(b.created_at || Date.now()).getTime();
            return sortWishlist === 'desc' ? d2 - d1 : d1 - d2;
        });
    }, [crmWishlist, selectedStore, sortWishlist]);

    // Merge listas estáticas + tags salvas no banco para esta loja
    const tagsForCategory = (category, staticOpts) => {
        const dynamic = (crmCustomTags || [])
            .filter(t => t.category === category)
            .map(t => t.value);
        return [...new Set([...staticOpts, ...dynamic])];
    };
    const produtosOpts = tagsForCategory('produto', PRODUTOS_OPTS);
    const marcasOpts = tagsForCategory('marca', MARCAS_OPTS);
    const modelosOpts = tagsForCategory('modelo', MODELOS_OPTS);
    const tamanhosOpts = tagsForCategory('tamanho', TAMANHOS_OPTS);

    // Chamado pelo BadgeSelector ao criar uma tag nova (não existente nas opções)
    const handleNewTag = (category, value) => {
        if (addCrmCustomTag) addCrmCustomTag(selectedStore, category, value);
    };

    const addOrder = async () => {
        if (!form.cliente.trim() || form.produto.length === 0) return;
        // store_id: usa o selecionado no form (Owner pode trocar); Gerente herda selectedStore
        const targetStore = form.store_id || selectedStore;
        const savePayload = {
            ...form,
            produto: form.produto.join(', '),
            modelo: form.modelo.join(', '),
            tamanho: form.tamanho.join(', '),
            marca: form.marca.join(', '),
            store_id: targetStore,
            tipo_cliente: form.tipo_cliente || 'cliente'
        };
        const success = await saveCrmWishlist(savePayload, editId);
        if (success) {
            setForm({ cliente: '', produto: [], modelo: [], tamanho: [], marca: [], wpp: '', observacao: '', data: '1 mês', status: 'waiting', tipo_cliente: 'cliente', store_id: selectedStore });
            setShowForm(false);
            setEditId(null);
        }
    };

    const handleEditOrder = (o) => {
        setEditId(o.id);
        setShowForm(true);
        setForm({
            cliente: o.cliente || o.client_name || '',
            wpp: o.wpp || o.contato || o.contact_info || '',
            status: o.status || 'waiting',
            produto: o.produto ? o.produto.split(', ').filter(Boolean) : [],
            modelo: o.modelo ? o.modelo.split(', ').filter(Boolean) : [],
            tamanho: o.tamanho ? o.tamanho.split(', ').filter(Boolean) : [],
            marca: o.marca ? o.marca.split(', ').filter(Boolean) : [],
            observacao: o.observacao || o.notes || '',
            data: o.data || o.prazo || o.target_date || o.data_pedido || '1 mês',
            tipo_cliente: o.tipo_cliente || 'cliente'
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-sm">Lista de Desejos — Pedidos Pendentes</h3>
                        <p className="text-xs text-gray-400">{storeOrders.length} encomenda{storeOrders.length !== 1 ? 's' : ''} · Loja {selectedStore}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <select value={sortWishlist} onChange={e => setSortWishlist(e.target.value)} className="text-xs font-bold bg-gray-50 border border-gray-200 text-gray-600 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer">
                        <option value="desc">Mais Recentes ⬇</option>
                        <option value="asc">Mais Antigos ⬆</option>
                    </select>
                    <button onClick={() => { setEditId(null); setForm({ cliente: '', produto: [], modelo: [], tamanho: [], marca: [], wpp: '', observacao: '', data: '1 mês', status: 'waiting', tipo_cliente: 'cliente', store_id: selectedStore }); setShowForm(s => !s); }}
                        className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm">
                        <Plus className="w-3.5 h-3.5" /> Novo Pedido
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="p-6 bg-white border border-gray-100/50 rounded-xl mx-5 mb-5 shadow-sm mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">1. WhatsApp / Contato</label>
                            <input value={form.wpp} onChange={e => setForm(f => ({ ...f, wpp: e.target.value }))}
                                placeholder="(XX) 9XXXX-XXXX" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder-gray-300 bg-gray-50/50" />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">2. Nome do Cliente *</label>
                            <input value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))}
                                placeholder="Ex: Maria Eduarda" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder-gray-300 bg-gray-50/50" />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">3. Status</label>
                            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-gray-50/50">
                                <option value="waiting">Aguardando</option>
                                <option value="verificar">Verificar</option>
                                <option value="pendente">Pendente de envio</option>
                                <option value="respondido">Respondido</option>
                            </select>
                        </div>

                        {/* Seletor de Loja — apenas para o Owner */}
                        {userRole === 'owner' && STORE_CONFIGS && (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">🏪 Loja de Destino</label>
                                <select
                                    value={form.store_id || selectedStore}
                                    onChange={e => setForm(f => ({ ...f, store_id: e.target.value }))}
                                    className="border border-amber-300 bg-amber-50 rounded-lg px-3 py-2.5 text-sm font-bold text-amber-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-400 focus:outline-none transition-all"
                                >
                                    {Object.entries(STORE_CONFIGS).map(([k, v]) => (
                                        <option key={k} value={k}>{v.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">4. Produto Solicitado *</label>
                            <BadgeSelector value={form.produto} onChange={v => setForm(f => ({ ...f, produto: v }))} placeholder="Ex: Vestido, Blusa..." options={produtosOpts} colorClass="bg-blue-100 text-blue-700" onNewTag={v => handleNewTag('produto', v)} />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">5. Tamanho</label>
                            <BadgeSelector value={form.tamanho} onChange={v => setForm(f => ({ ...f, tamanho: v }))} placeholder="Ex: P, 38..." options={tamanhosOpts} colorClass="bg-pink-100 text-pink-700" onNewTag={v => handleNewTag('tamanho', v)} />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">6. Marca (Opcional)</label>
                            <BadgeSelector value={form.marca} onChange={v => setForm(f => ({ ...f, marca: v }))} placeholder="Ex: Farm, Animale..." options={marcasOpts} colorClass="bg-indigo-100 text-indigo-700" onNewTag={v => handleNewTag('marca', v)} />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">7. Modelo / Referência</label>
                            <BadgeSelector value={form.modelo} onChange={v => setForm(f => ({ ...f, modelo: v }))} placeholder="Ex: Estampa floral..." options={modelosOpts} colorClass="bg-purple-100 text-purple-700" onNewTag={v => handleNewTag('modelo', v)} />
                        </div>

                        <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-2">
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">8. Observação</label>
                            <textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} rows={1}
                                placeholder="Detalhes adicionais..." className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder-gray-300 bg-gray-50/50" />
                        </div>

                        <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-3">
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Tipo de Cliente</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { key: 'cliente', label: '👤 Cliente', desc: 'Padrão' },
                                    { key: 'vip', label: '✅ VIP', desc: 'Fiel' },
                                    { key: 'b2b', label: '🏢 B2B', desc: 'Atacado' },
                                ].map(({ key, label, desc }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setForm(p => ({ ...p, tipo_cliente: key }))}
                                        className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border-2 text-xs font-bold transition-all ${form.tipo_cliente === key
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                            }`}
                                    >
                                        <span className="text-sm">{label.split(' ')[0]} {label.split(' ').slice(1).join(' ')}</span>
                                        <span className="text-[9px] font-normal text-gray-400">{desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="pt-5 border-t border-gray-100 flex items-end justify-between gap-4">
                        <div className="flex flex-col gap-1.5 flex-1 max-w-[340px]">
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">9. Prazo / Expectativa</label>
                            <div className="flex flex-wrap gap-2">
                                {['1 mês', '2 meses', '3 meses', 'Indefinido'].map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, data: opt }))}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${form.data === opt
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-700'
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={addOrder} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-lg text-sm transition-all shadow-sm shadow-indigo-200 flex items-center justify-center gap-2">
                            {editId ? 'Salvar Alterações' : 'Salvar Pedido'} <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {storeOrders.length === 0 && (
                    <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-gray-100 border-dashed">
                        <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <h4 className="text-gray-500 font-bold text-sm">Nenhum pedido pendente</h4>
                        <p className="text-gray-400 text-xs mt-1">Crie um pedido para acompanhar as necessidades dos clientes.</p>
                    </div>
                )}
                {storeOrders.map(o => {
                    const clientName = o.cliente || o.client_name;
                    const wppNumber = o.wpp || o.contato || o.contact || o.contact_info || '';
                    const rawPhone = String(wppNumber).replace(/\D/g, '');
                    const phone = rawPhone.startsWith('55') ? rawPhone : rawPhone ? `55${rawPhone}` : '';
                    const productName = o.produto || o.product || o.product_name;

                    const detalhes = [productName, o.brand, o.modelo || o.model].filter(Boolean).join(' ');
                    const tamanho = o.tamanho || o.size || '';
                    const partes = [detalhes, tamanho ? `no tamanho ${tamanho}` : ''].filter(Boolean).join(' ');
                    const unescapedMsg = `Oi, ${clientName}! ✨\n\nTudo bem? Lembrei de você 💬\n\nChegou reposição daquele(a) *${partes || 'item'}* que você pediu! 😍👗\n\nCorre pra garantir o seu! 🏃‍♀️`;
                    const wppMsg = encodeURIComponent(unescapedMsg);
                    const wppLink = phone ? `https://wa.me/${phone}?text=${wppMsg}` : null;

                    const tipoKey = o.tipo_cliente || o.priority || o.prioridade;
                    const pPill = TIPO_CLIENTE_PILLS?.[tipoKey] || TIPO_CLIENTE_PILLS.cliente;

                    const handleMoveToKanban = async () => {
                        if (!saveCrmLead) return;
                        const prodArr = (productName || '').split(',').map(s => s.trim()).filter(Boolean);
                        const modArr = (o.modelo || o.model || '').split(',').map(s => s.trim()).filter(Boolean);
                        const tamArr = (o.tamanho || o.size || '').split(',').map(s => s.trim()).filter(Boolean);
                        const brandArr = (o.marca || o.brand || '').split(',').map(s => s.trim()).filter(Boolean);

                        const newLead = {
                            nome: clientName || 'Desconhecido',
                            telefone: wppNumber,
                            origem: 'Wishlist (Reposição)',
                            estagio: 'Triagem',
                            status: 'Triagem',
                            store_id: selectedStore,
                            produto: prodArr.join(', '),
                            marca: brandArr.join(', '),
                            modelo: modArr.join(', '),
                            tamanho: tamArr.join(', ')
                        };
                        try {
                            await saveCrmLead(newLead);
                            await deleteCrmWishlist(o.id);
                            alert('🎉 Lead encaminhado para o Funil de Vendas com sucesso!');
                        } catch (err) { console.error(err); }
                    };

                    return (
                        <div key={o.id} className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)] transition-all flex flex-col justify-between group relative">
                            {/* Ações Hover */}
                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button onClick={() => handleEditOrder(o)}
                                    className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-indigo-100" title="Editar">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={() => deleteCrmWishlist(o.id)}
                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-red-100" title="Excluir">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2.5 w-full pr-12">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center font-bold text-indigo-600 text-sm shadow-inner border border-indigo-100/50 shrink-0">
                                            {clientName ? clientName.charAt(0).toUpperCase() : '?'}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-gray-900 text-sm truncate leading-tight" title={clientName}>
                                                {clientName || 'Sem Nome'}
                                            </h4>
                                            <div className="flex items-center gap-1.5 text-[10px] items-baseline font-mono text-gray-400 mt-0.5">
                                                {wppLink ? (
                                                    <a href={wppLink} target="_blank" rel="noopener noreferrer" className="hover:text-green-500 transition-colors flex items-center gap-1 font-bold">
                                                        <MessageCircle className="w-2.5 h-2.5" /> {wppNumber || 'Conectar'}
                                                    </a>
                                                ) : <span>{wppNumber || 'Sem contato'}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50/80 rounded-xl p-2.5 mb-1.5 border border-gray-100/50 mt-2">
                                    <p className="text-[13px] font-bold text-gray-800 break-words line-clamp-2 leading-tight" title={productName}>
                                        🛒 {productName}
                                    </p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {o.brand && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100">{o.brand}</span>}
                                        {(o.tamanho || o.size) && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-pink-50 text-pink-600 border border-pink-100">{o.tamanho || o.size}</span>}
                                        {(o.modelo || o.model) && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-600 border border-purple-100">{o.modelo || o.model}</span>}
                                    </div>
                                    {o.observacao && <p className="text-[10px] text-gray-500 mt-2 bg-white px-2 py-1.5 border border-gray-200 border-dashed rounded italic leading-tight">{o.observacao}</p>}
                                    {o.notes && <p className="text-[10px] text-gray-500 mt-2 bg-white px-2 py-1.5 border border-gray-200 border-dashed rounded italic leading-tight">{o.notes}</p>}
                                </div>
                            </div>

                            <div className="pt-2 mt-2 border-t border-gray-100/60 flex flex-col justify-between h-auto">
                                <div className="flex items-end justify-between w-full h-full pb-1">
                                    <div className="flex flex-col gap-1.5">
                                        {(() => {
                                            const tipoKey = o.tipo_cliente || 'cliente';
                                            const pill = TIPO_CLIENTE_PILLS?.[tipoKey] || { cls: 'bg-blue-50 text-blue-700 border-blue-100', label: '👤 Cliente' };
                                            return (
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${pill.cls} w-fit`}>
                                                    {pill.label}
                                                </span>
                                            );
                                        })()}
                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                            Prazo: {o.data || o.prazo || o.target_date || o.data_pedido || '—'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <select
                                            value={o.status || 'waiting'}
                                            onChange={async (e) => {
                                                const novoStatus = e.target.value;
                                                await updateCrmWishlistStatus(o.id, novoStatus);
                                            }}
                                            className={`text-[9px] uppercase font-bold px-1.5 py-1 rounded-lg border appearance-none cursor-pointer outline-none transition-colors ${o.status === 'available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 shadow-sm'}`}
                                        >
                                            <option value="waiting">⏳ Aguardando</option>
                                            <option value="available">✅ Disponível</option>
                                        </select>

                                        {o.status === 'available' && (
                                            <button onClick={handleMoveToKanban} className="text-[9px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-2 py-1.5 rounded-lg shadow-sm shadow-emerald-200 transition-all flex items-center animate-pulse">
                                                Kanban <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {o.created_at && (
                                    <div className="w-full text-center mt-2 group-hover:opacity-100 opacity-60 transition-opacity">
                                        <span className="text-[9px] text-gray-400 font-medium">Criado em: <span className="font-bold">{formatDateShort(o.created_at)}</span></span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

            </div>
        </div>
    );
};

// ─── Main CRM ───────────────────────────────────────────────────
const CRM = ({ crmLeads, saveCrmLead, moveCrmLeadStage, deleteCrmLead, archiveCrmLead, crmWishlist, saveCrmWishlist, deleteCrmWishlist, updateCrmWishlistStatus, crmCustomTags, addCrmCustomTag, selectedStore, systemData, userRole, STORE_CONFIGS }) => {
    // Optimistic UI State for Drag & Drop
    const [optimisticLeads, setOptimisticLeads] = useState(crmLeads || []);
    useEffect(() => {
        setOptimisticLeads(crmLeads || []);
    }, [crmLeads]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMermaidDrawerOpen, setIsMermaidDrawerOpen] = useState(false);
    // ⚡ Scripts Drawer
    const [isScriptsDrawerOpen, setIsScriptsDrawerOpen] = useState(false);
    const [focusedStage, setFocusedStage] = useState(null);
    const [focusedLead, setFocusedLead] = useState(null);
    const [copiedScript, setCopiedScript] = useState(null);
    const containerRef = useRef(null);
    const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline' | 'wishlist' | 'radar' | 'playbook'
    const [editLead, setEditLead] = useState(null);
    const [search, setSearch] = useState('');
    const [filterStage, setFilterStage] = useState('all');
    const [expandedCols, setExpandedCols] = useState({});
    const [form, setForm] = useState({ nome: '', telefone: '', origem: '', estagio: 'Triagem', produto: [], marca: [], modelo: [], tamanho: [], tipo_cliente: 'cliente', store_id: selectedStore });
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
    const marcasOpts = tagsForCategory('marca', MARCAS_OPTS);
    const modelosOpts = tagsForCategory('modelo', MODELOS_OPTS);
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

    const openModal = (lead = null, defaultStage = STAGES[0].id) => {
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
                tipo_cliente: lead.tipo_cliente || 'cliente',
                // Preserva a loja original do lead na edição
                store_id: lead.store_id || (selectedStore === 'all' ? '10' : String(selectedStore)),
            });
        } else {
            setEditLead(null);
            setForm({ nome: '', telefone: '', origem: '', estagio: defaultStage, produto: [], marca: [], modelo: [], tamanho: [], tipo_cliente: 'cliente', store_id: selectedStore === 'all' ? '10' : String(selectedStore) });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.nome?.trim()) return;
        // store_id: usa o selecionado no modal (Owner pode trocar); Gerente herda selectedStore
        const fallbackStore = selectedStore === 'all' ? '10' : String(selectedStore);
        const targetStore = form.store_id || fallbackStore;
        const savePayload = {
            ...(editLead || {}),
            ...form,
            status: form.estagio,
            store_id: targetStore,
            produto: form.produto.join(', '),
            marca: form.marca.join(', '),
            modelo: form.modelo.join(', '),
            tamanho: form.tamanho.join(', '),
            tipo_cliente: form.tipo_cliente || 'cliente',
        };
        const success = await saveCrmLead(savePayload, editLead?.id || null);
        if (success) {
            setIsModalOpen(false);
            setEditLead(null);
        }
    };

    const leads = useMemo(() => {
        const isGlobal = selectedStore === 'Todas' || selectedStore === 'all' || !selectedStore;
        return optimisticLeads.filter(l => {
            if (!isGlobal && String(l.store_id) !== String(selectedStore)) return false;
            const stage = l.status || l.estagio;
            if (!STAGES.find(s => s.id === stage)) return false;
            if (filterStage !== 'all' && stage !== filterStage) return false;
            if (search) {
                const q = search.toLowerCase();
                return (l.nome || l.name || '').toLowerCase().includes(q) ||
                    (l.telefone || '').includes(q) ||
                    (l.produto || '').toLowerCase().includes(q) ||
                    (l.origem || '').toLowerCase().includes(q);
            }
            return true;
        });
    }, [optimisticLeads, filterStage, search, selectedStore]);

    // ── Motor de Matchmaking CRM × Estoque ──────────────────────────────────
    const radarMatches = useMemo(() => {
        const stock = systemData || [];
        const allLeads = optimisticLeads.filter(l => {
            const stage = l.status || l.estagio;
            return !!STAGES.find(s => s.id === stage);
        });
        const results = [];
        for (const lead of allLeads) {
            const leadCreated = lead.created_at ? new Date(lead.created_at).getTime() : 0;
            // Normaliza produtos/tamanhos do lead como arrays lowercase
            const leadProdutos = (lead.produto || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            const leadTamanhos = (lead.tamanho || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            const leadMarcas = (lead.marca || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            const leadModelos = (lead.modelo || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            if (leadProdutos.length === 0 || leadTamanhos.length === 0) continue;

            const matchingItems = [];
            for (const item of stock) {
                // Condição 1: item entrou no estoque APÓS o lead ser criado
                const itemDate = item.DATAENTRADA ? new Date(item.DATAENTRADA).getTime() : 0;
                if (itemDate <= leadCreated) continue;

                const itemTipo = (item.TIPODESC || item.MARCADESC || '').toLowerCase();
                const itemMarca = (item.MARCA || '').toLowerCase();
                const itemRef = (item.REFERENCIA || '').toLowerCase();
                const itemSizes = item.sizes || {};

                // Condição 2: produto coincide (verifica TIPODESC ou MARCADESC)
                const prodMatch = leadProdutos.some(p =>
                    itemTipo.includes(p) || p.includes(itemTipo)
                );
                if (!prodMatch) continue;

                // Condição 2: tamanho com estoque > 0
                const sizeMatch = leadTamanhos.some(t => {
                    const sizeKey = Object.keys(itemSizes).find(k => k.toLowerCase() === t);
                    return sizeKey && (itemSizes[sizeKey] > 0);
                });
                if (!sizeMatch) continue;

                // Condição 3 (opcional): marca
                if (leadMarcas.length > 0) {
                    const marcaOk = leadMarcas.some(m => itemMarca.includes(m) || m.includes(itemMarca));
                    if (!marcaOk) continue;
                }

                // Condição 3 (opcional): modelo
                if (leadModelos.length > 0) {
                    const modeloOk = leadModelos.some(m => itemRef.includes(m) || m.includes(itemRef));
                    if (!modeloOk) continue;
                }

                matchingItems.push(item);
            }

            if (matchingItems.length > 0) {
                results.push({ lead, matchingItems });
            }
        }
        return results;
    }, [optimisticLeads, systemData]);

    const totalLeads = leads.length;
    const byStage = STAGES.map(s => ({ ...s, count: leads.filter(l => (l.status || l.estagio) === s.id).length }));


    return (
        <div className="flex flex-col h-full w-full bg-gray-50 overflow-hidden fade-in">

            {/* ── Tab Navigation ── */}
            <div className="flex items-center gap-1 px-5 pt-4 pb-0 shrink-0 border-b border-gray-200 bg-white">
                <button
                    onClick={() => setActiveTab('pipeline')}
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-t-xl border border-b-0 transition-all ${activeTab === 'pipeline'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                >
                    📥 Pipeline de Vendas
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === 'pipeline' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>{leads.length}</span>
                </button>
                <button
                    onClick={() => setActiveTab('wishlist')}
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-t-xl border border-b-0 transition-all ${activeTab === 'wishlist'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                >
                    🛒 Lista de Desejos
                </button>
                <button
                    onClick={() => setActiveTab('radar')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl border border-b-0 transition-all ${activeTab === 'radar'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                >
                    🎯 Radar
                    {radarMatches.length > 0 && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === 'radar' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700 animate-pulse'
                            }`}>{radarMatches.length}</span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('playbook')}
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-t-xl border border-b-0 transition-all ${activeTab === 'playbook'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                >
                    <BookOpen className="w-4 h-4" /> Playbook
                </button>
                <div className="ml-auto flex items-center gap-2 pb-1">
                    <button onClick={() => setIsMermaidDrawerOpen(true)} className="lg:hidden text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100">
                        <Code2 className="w-3.5 h-3.5" /> Scripts
                    </button>
                </div>
            </div>

            {/* ── Tab Content ── */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'pipeline' ? (
                    <div className="h-full flex flex-col pt-3 pb-4 md:px-5">
                        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                            {/* Pipeline Header */}
                            <div className="flex flex-wrap items-center justify-between px-5 py-4 border-b border-gray-100 gap-3">
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:flex-none">
                                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-full sm:w-[280px] bg-gray-50/50 placeholder-gray-400"
                                            placeholder="Pesquisar nome, contato, produto..."
                                        />
                                        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <AlertBell leads={leads} />
                                    <button onClick={() => openModal(null, STAGES[0].id)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm shadow-indigo-200 flex items-center gap-2 justify-center w-full sm:w-auto">
                                        <Plus className="w-4 h-4" /> Cadastrar Venda
                                    </button>
                                </div>
                            </div>

                            {/* Kanban Board Area */}
                            <div className="flex-1 overflow-hidden flex">
                                <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 bg-gray-50/30 custom-scrollbar">
                                    <div className="flex gap-4 h-full min-w-max pb-3">
                                        {STAGES.map(stage => {
                                            const stageLeads = leads.filter(l => (l.status || l.estagio) === stage.id);
                                            const isOver = dragOverStage === stage.id;
                                            return (
                                                <div key={stage.id}
                                                    className={`w-72 flex flex-col rounded-2xl border-2 transition-colors ${isOver ? 'border-indigo-400 bg-indigo-50/50' : 'border-transparent bg-gray-100/60'} shadow-sm overflow-hidden h-full shrink-0`}
                                                    onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.id); }}
                                                    onDragLeave={() => setDragOverStage(null)}
                                                    onDrop={() => {
                                                        if (dragLeadId !== null && dragOverStage === stage.id) {
                                                            moveCrmLeadStage(dragLeadId, stage.id);
                                                            setOptimisticLeads(prev => prev.map(l => l.id === dragLeadId ? { ...l, estagio: stage.id, status: stage.id } : l));
                                                        }
                                                        setDragLeadId(null);
                                                        setDragOverStage(null);
                                                    }}
                                                >
                                                    {/* Column Header */}
                                                    <div className={`px-4 py-3 border-b flex items-center justify-between bg-white rounded-t-xl`}>
                                                        <div className="font-bold text-[13px] text-gray-800 flex items-center gap-2">
                                                            <span>{stage.emoji}</span> {stage.label}
                                                        </div>
                                                        <span className={`text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg ${stage.col}`}>{stageLeads.length}</span>
                                                    </div>

                                                    {/* Leads Container */}
                                                    <div className="p-3 flex-1 overflow-y-auto space-y-3 thin-scrollbar">
                                                        {stageLeads.map(lead => (
                                                            <LeadCard
                                                                key={lead.id}
                                                                lead={lead}
                                                                stages={STAGES}
                                                                onMove={(id, novaStage) => {
                                                                    moveCrmLeadStage(id, novaStage);
                                                                    setOptimisticLeads(prev => prev.map(l => l.id === id ? { ...l, estagio: novaStage, status: novaStage } : l));
                                                                }}
                                                                onArchive={archiveCrmLead}
                                                                onEdit={(l) => openModal(l)}
                                                                onDragStart={() => setDragLeadId(lead.id)}
                                                                onDragEnd={() => setDragLeadId(null)}
                                                                isDragging={dragLeadId === lead.id}
                                                                onScriptOpen={(l) => {
                                                                    setFocusedLead(l);
                                                                    setFocusedStage(stage.id);
                                                                    setIsScriptsDrawerOpen(true);
                                                                }}
                                                            />
                                                        ))}
                                                        {stageLeads.length === 0 && (
                                                            <div className="text-center text-xs text-gray-400 py-8 border-2 border-dashed border-gray-200/60 rounded-xl my-2 mx-1">Coluna Vazia</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                                {/* Sidebar Right (Playbook) */}
                                <div className="hidden xl:flex w-[340px] border-l border-gray-100 bg-white shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10 flex-col relative">
                                    <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/40 to-transparent shrink-0">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><BookOpen className="w-4 h-4 text-indigo-500" /> Guia Rápido</h3>
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <PlaybookTab readOnly={true} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'radar' ? (
                    <div className="h-full overflow-y-auto p-4 md:p-5">
                        {/* ── Radar Header ── */}
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">🎯 Radar de Matches</h2>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {radarMatches.length === 0
                                        ? 'Nenhum match encontrado no momento. O sistema compara produto, tamanho, marca e modelo dos Leads com o Estoque.'
                                        : `${radarMatches.length} lead${radarMatches.length !== 1 ? 's' : ''} com produtos disponíveis no estoque — oportunidade de venda imediata!`}
                                </p>
                            </div>
                        </div>

                        {radarMatches.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-gray-300">
                                <span className="text-6xl mb-4">🎯</span>
                                <p className="text-sm font-bold">Radar silencioso</p>
                                <p className="text-xs mt-1 text-gray-400">Novos itens no estoque serão cruzados automaticamente</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {radarMatches.map(({ lead, matchingItems }) => {
                                    const phone = String(lead.telefone || '').replace(/\D/g, '');
                                    const produto = lead.produto || '';
                                    const marca = lead.marca ? ` ${lead.marca}` : '';
                                    const modelo = lead.modelo ? ` ${lead.modelo}` : '';
                                    const tamanho = lead.tamanho || '';
                                    const wppMsg = encodeURIComponent(
                                        `Oi, ${lead.nome || lead.name}
Novidade boa 🎉
Lembra que você pediu pra eu te avisar quando chegasse *${produto}${marca}${modelo} tamanho ${tamanho}* ?
Acabou de chegar aqui na nossa loja 😉
 
Vamos te enviar as fotos ✅`
                                    );
                                    const wppLink = phone.length >= 8 ? `https://wa.me/55${phone}?text=${wppMsg}` : null;
                                    const stage = STAGES.find(s => s.id === (lead.status || lead.estagio)) || STAGES[0];

                                    return (
                                        <div key={lead.id} className="bg-white border-2 border-emerald-300 rounded-2xl shadow-md overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all">
                                            {/* Barra verde de sucesso */}
                                            <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-green-500 w-full" />
                                            <div className="p-4">
                                                {/* Header do card */}
                                                <div className="flex items-start justify-between gap-2 mb-3">
                                                    <div>
                                                        <div className="font-black text-gray-900 text-sm leading-tight">{lead.nome || lead.name}</div>
                                                        <div className="text-[10px] text-indigo-600 font-bold mt-0.5 uppercase tracking-wide">{lead.origem || 'Lead'}</div>
                                                    </div>
                                                    <span className={`text-[9px] font-black px-2 py-1 rounded-full ${stage.pill}`}>{stage.emoji} {stage.label}</span>
                                                </div>

                                                {/* Interesse do Lead */}
                                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-3">
                                                    <div className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1.5">Interesse do Lead</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {produto && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">{produto}</span>}
                                                        {lead.marca && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded">{lead.marca}</span>}
                                                        {lead.modelo && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded">{lead.modelo}</span>}
                                                        {tamanho && <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-[10px] font-bold rounded">Tam. {tamanho}</span>}
                                                    </div>
                                                </div>

                                                {/* Items com match */}
                                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                                                    {matchingItems.length} item{matchingItems.length !== 1 ? 's' : ''} no estoque
                                                </div>
                                                <div className="space-y-1 max-h-24 overflow-y-auto mb-3">
                                                    {matchingItems.slice(0, 4).map((item, i) => (
                                                        <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
                                                            <span className="text-[10px] font-bold text-gray-700 truncate flex-1">{item.TIPODESC || item.MARCADESC || item.REFERENCIA}</span>
                                                            <span className="text-[9px] text-gray-400 font-mono shrink-0">{item.REFERENCIA}</span>
                                                        </div>
                                                    ))}
                                                    {matchingItems.length > 4 && <div className="text-[9px] text-gray-400 text-center">+{matchingItems.length - 4} mais</div>}
                                                </div>

                                                {/* Gatilho de Venda */}
                                                {wppLink ? (
                                                    <a href={wppLink} target="_blank" rel="noreferrer"
                                                        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-black w-full justify-center transition-all shadow-sm shadow-emerald-200">
                                                        <Send className="w-3.5 h-3.5" /> Avisar via WhatsApp
                                                    </a>
                                                ) : (
                                                    <div className="text-[10px] text-gray-400 text-center py-2">Sem telefone cadastrado</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : activeTab === 'wishlist' ? (
                    <div className="h-full overflow-y-auto p-4 md:p-5">
                        <EncomendasSection
                            selectedStore={selectedStore}
                            crmWishlist={crmWishlist}
                            saveCrmWishlist={saveCrmWishlist}
                            deleteCrmWishlist={deleteCrmWishlist}
                            updateCrmWishlistStatus={updateCrmWishlistStatus}
                            crmCustomTags={crmCustomTags || []}
                            addCrmCustomTag={addCrmCustomTag}
                            saveCrmLead={saveCrmLead}
                            userRole={userRole}
                            STORE_CONFIGS={STORE_CONFIGS}
                        />
                    </div>
                ) : activeTab === 'playbook' ? (
                    <PlaybookTab />
                ) : null}
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


            {/* ══════════════════════════════════════════════════════
                ⚡ SCRIPTS DRAWER — Playbook Contextual
            ══════════════════════════════════════════════════════ */}

            {/* Backdrop */}
            {isScriptsDrawerOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-[55] backdrop-blur-sm"
                    onClick={() => setIsScriptsDrawerOpen(false)}
                />
            )}

            {/* Drawer Panel */}
            <div className={`fixed top-0 right-0 h-full w-full max-w-[380px] bg-white z-[60] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isScriptsDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-4 flex items-center justify-between shrink-0">
                    <div>
                        <div className="flex items-center gap-2 font-black text-base">
                            <span>⚡</span> Scripts do Playbook
                        </div>
                        {focusedLead && (
                            <p className="text-xs text-amber-100 mt-0.5 font-medium">
                                Lead: <span className="font-black text-white">{focusedLead.nome || focusedLead.name}</span>
                            </p>
                        )}
                    </div>
                    <button onClick={() => setIsScriptsDrawerOpen(false)} className="text-white/70 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Lead context chips */}
                {focusedLead && (
                    <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 flex flex-wrap gap-1.5 shrink-0">
                        {[
                            { icon: '👤', val: focusedLead.nome || focusedLead.name },
                            { icon: '👗', val: focusedLead.produto },
                            { icon: '🏷️', val: focusedLead.modelo },
                            { icon: '📐', val: focusedLead.tamanho },
                        ].filter(c => c.val).map((c, i) => (
                            <span key={i} className="text-[10px] font-bold bg-white border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                                {c.icon} {c.val}
                            </span>
                        ))}
                    </div>
                )}

                {/* Scripts list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {(() => {
                        // ── Motor de Replace ────────────────────────────────
                        const handleCopyScript = (textoOriginal, comando) => {
                            const nome = (focusedLead?.nome || focusedLead?.name || '').trim() || '___';
                            const modelo = (focusedLead?.modelo || '').trim() || '___';
                            const tamanho = (focusedLead?.tamanho || '').trim() || '___';
                            const mensagem = textoOriginal
                                .replace(/\[Nome\]/gi, nome)
                                .replace(/\[Modelo\]/gi, modelo)
                                .replace(/\[Tamanho\]/gi, tamanho);
                            navigator.clipboard.writeText(mensagem).catch(() => { });
                            setCopiedScript(comando);
                            setTimeout(() => setCopiedScript(null), 2000);
                        };

                        // ── Filtra categorias pelo estágio ──────────────────
                        const categorias = STAGE_TO_SCRIPTS[focusedStage] || [];
                        if (categorias.length === 0) {
                            return (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-300 text-center">
                                    <span className="text-5xl mb-3">📭</span>
                                    <p className="text-sm font-bold text-gray-400">Nenhum script para esta etapa.</p>
                                    <p className="text-xs text-gray-300 mt-1">Esta coluna não tem atalhos configurados.</p>
                                </div>
                            );
                        }

                        return categorias.map(cat => {
                            const atalhos = ATALHOS_WHATSAPP[cat] || [];
                            return (
                                <div key={cat} className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                                    {/* Categoria header */}
                                    <div className="px-4 py-2.5 bg-white border-b border-gray-100 flex items-center gap-2">
                                        <span className="text-xs font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                            {cat}
                                        </span>
                                        <span className="text-[10px] text-gray-400">{atalhos.length} atalho{atalhos.length !== 1 ? 's' : ''}</span>
                                    </div>

                                    {/* Scripts */}
                                    <div className="p-3 space-y-3">
                                        {atalhos.map(a => {
                                            const isCopied = copiedScript === a.comando;
                                            // Preview com substituição
                                            const nomePrev = (focusedLead?.nome || focusedLead?.name || '___');
                                            const modeloPrev = focusedLead?.modelo || '___';
                                            const tamanhoPrev = focusedLead?.tamanho || '___';
                                            const preview = a.texto
                                                .replace(/\[Nome\]/gi, `**${nomePrev}**`)
                                                .replace(/\[Modelo\]/gi, `**${modeloPrev}**`)
                                                .replace(/\[Tamanho\]/gi, `**${tamanhoPrev}**`);

                                            return (
                                                <div key={a.comando} className="bg-white rounded-xl border border-gray-100 p-3 relative shadow-sm">
                                                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 mb-2 inline-block">
                                                        {a.comando}
                                                    </span>
                                                    <p className="text-[12px] text-gray-600 italic leading-relaxed border-l-2 border-amber-200 pl-2 mt-1 mb-3 whitespace-pre-line">
                                                        "{a.texto}"
                                                    </p>
                                                    <button
                                                        onClick={() => handleCopyScript(a.texto, a.comando)}
                                                        className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all ${isCopied
                                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                                            : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 hover:border-amber-400'
                                                            }`}
                                                    >
                                                        {isCopied ? (
                                                            <><Check className="w-3.5 h-3.5" /> ✅ Copiado com dados do lead!</>
                                                        ) : (
                                                            <><Copy className="w-3.5 h-3.5" /> Copiar com nome de {focusedLead?.nome?.split(' ')[0] || 'cliente'}</>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 shrink-0">
                    <p className="text-[10px] text-gray-400 text-center">
                        ⚡ Clique em <span className="font-bold text-amber-600">outro card ⚡</span> para trocar o contexto do lead
                    </p>
                </div>
            </div>

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

                            {/* Seletor de Loja — apenas para o Owner */}
                            {userRole === 'owner' && STORE_CONFIGS && (
                                <div>
                                    <label className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1.5 block">🏪 Loja de Destino</label>
                                    <select
                                        value={form.store_id || selectedStore}
                                        onChange={e => setForm(p => ({ ...p, store_id: e.target.value }))}
                                        className="w-full border border-amber-300 bg-amber-50 rounded-xl px-3 py-2.5 text-sm font-bold text-amber-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                                    >
                                        {Object.entries(STORE_CONFIGS).map(([k, v]) => (
                                            <option key={k} value={k}>{v.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Tipo de Cliente</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { key: 'cliente', label: '👤 Cliente', desc: 'Padrão' },
                                        { key: 'vip', label: '✅ VIP', desc: 'Fiel' },
                                        { key: 'b2b', label: '🏢 B2B', desc: 'Empresa' },
                                    ].map(({ key, label, desc }) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setForm(p => ({ ...p, tipo_cliente: key }))}
                                            className={`flex flex-col items-center gap-0.5 p-2.5 rounded-xl border-2 text-xs font-bold transition-all ${form.tipo_cliente === key
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                                                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                                }`}
                                        >
                                            <span className="text-base">{label.split(' ')[0]}</span>
                                            <span>{label.split(' ').slice(1).join(' ')}</span>
                                            <span className="text-[9px] font-normal text-gray-400">{desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button onClick={handleSave} disabled={!form.nome?.trim()}
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