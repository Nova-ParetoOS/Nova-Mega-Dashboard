import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { TracingBeam } from './ui/tracing-beam';
import { TrendingUp, Users, Instagram, Facebook, LayoutTemplate } from 'lucide-react';

export default function MarketingAnalytics({ periodMarketingData = [], timeRange, followerGrowth, t1 }) {
    const [chartView, setChartView] = useState('alcance');
    const [chartSumMode, setChartSumMode] = useState('diario'); // diario | acumulado

    const formatNumber = (val) => new Intl.NumberFormat('pt-BR').format(val || 0);
    
    // Tratando as datas string (DD/MM/YYYY) para "01 abr" com parsing seguro
    let accInsta = 0, accFace = 0, accStories = 0, accAds = 0, accGlobal = 0;
    
    const chartData = periodMarketingData.map(row => {
        let shortDate = row.data_coleta;
        if (row.data_coleta && row.data_coleta.includes('/')) {
            const parts = row.data_coleta.split('/');
            if (parts.length === 3) {
                const dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
                shortDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
            }
        } else if (row.data_coleta && row.data_coleta.includes('-')) {
            const dateObj = new Date(row.data_coleta + 'T00:00:00');
            shortDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
        }

        if (chartSumMode === 'acumulado') {
            accInsta += (chartView === 'alcance' ? (row.alcance_instagram || 0) : (row.impressoes_instagram || 0));
            accFace += (chartView === 'alcance' ? (row.alcance_facebook || 0) : (row.impressoes_facebook || 0));
            accStories += (chartView === 'alcance' ? (row.alcance_stories || 0) : (row.impressoes_stories || 0));
            accAds += (chartView === 'alcance' ? (row.alcance_anuncios || 0) : (row.impressoes_anuncios || 0));
            accGlobal += (chartView === 'alcance' ? (row.alcance_global || 0) : (row.views_global || 0));

            return { 
                ...row, 
                shortDate,
                [chartView === 'alcance' ? 'alcance_instagram' : 'impressoes_instagram']: accInsta,
                [chartView === 'alcance' ? 'alcance_facebook' : 'impressoes_facebook']: accFace,
                [chartView === 'alcance' ? 'alcance_stories' : 'impressoes_stories']: accStories,
                [chartView === 'alcance' ? 'alcance_anuncios' : 'impressoes_anuncios']: accAds,
                [chartView === 'alcance' ? 'alcance_global' : 'views_global']: accGlobal,
            };
        }

        return { ...row, shortDate };
    });

    const CustomNeonTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700/50 p-4 rounded-xl shadow-2xl z-50">
                    <p className="text-xs font-bold text-slate-400 mb-3 border-b border-slate-700 pb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-4 text-sm font-bold mb-1.5" style={{ color: entry.stroke || entry.color }}>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke || entry.color }}></span>
                                {entry.name}:
                            </span>
                            <span>{formatNumber(entry.value)}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

 

    return (
        <TracingBeam className="w-full">
            <div className="w-full space-y-6">
                
                {/* SVG Definitions */}
                <svg style={{ width: 0, height: 0, position: 'absolute' }}>
                    <defs>
                        <filter id="neonPink" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                        <filter id="neonOrange" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                        <filter id="neonCyan" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                        <filter id="neonLime" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                        <filter id="neonYellow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                    </defs>
                </svg>

                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-2 bg-white rounded-2xl p-4 shadow-sm border border-indigo-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><LayoutTemplate className="w-5 h-5 shadow-sm" /></div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">Crescimento Omnichannel</h2>
                            <p className="text-xs text-slate-400 font-medium">As 5 frentes de distribuição competindo juntas</p>
                        </div>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                        <button 
                            onClick={() => setChartSumMode('diario')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${chartSumMode === 'diario' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Diário
                        </button>
                        <button 
                            onClick={() => setChartSumMode('acumulado')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${chartSumMode === 'acumulado' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Acumulado
                        </button>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                        <button 
                            onClick={() => setChartView('alcance')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${chartView === 'alcance' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Ver Alcance Absoluto
                        </button>
                        <button 
                            onClick={() => setChartView('views')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${chartView === 'views' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Ver Views (Impressões)
                        </button>
                    </div>
                </div>

                {/* MASTER CHART - HOTFIX 4 (Ordem e Cores Exatas) */}
                <div className="bg-slate-900 overflow-hidden relative rounded-2xl border border-slate-800 shadow-2xl p-6">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
                    <div style={{ width: '100%', minHeight: '400px' }} className="w-full min-h-[400px] h-[400px] relative z-10 flex-1">
                        {chartData.length === 0 ? (
                             <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">Sem histórico no período selecionado.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%" minHeight={400} aspect={2.5}>
                                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                                    <XAxis dataKey="shortDate" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={15} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} width={45} />
                                    <Tooltip content={<CustomNeonTooltip />} cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }} />
                                    
                                    {/* HOTFIX 4: Hierarquia exata (Renderizadas de baixo para cima) */}
                                    <Line type="monotone" name="Facebook" isAnimationActive={false}
                                          dataKey={chartView === 'alcance' ? 'alcance_facebook' : 'impressoes_facebook'} 
                                          stroke="#06b6d4" filter="url(#neonCyan)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                                          
                                    <Line type="monotone" name="Stories" isAnimationActive={false}
                                          dataKey={chartView === 'alcance' ? 'alcance_stories' : 'impressoes_stories'} 
                                          stroke="#f59e0b" filter="url(#neonOrange)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                                          
                                    <Line type="monotone" name="Instagram" isAnimationActive={false}
                                          dataKey={chartView === 'alcance' ? 'alcance_instagram' : 'impressoes_instagram'} 
                                          stroke="#ec4899" filter="url(#neonPink)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                                    
                                    <Line type="monotone" name="Anúncios" isAnimationActive={false}
                                          dataKey={chartView === 'alcance' ? 'alcance_anuncios' : 'impressoes_anuncios'} 
                                          stroke="#84cc16" filter="url(#neonLime)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                                    
                                    <Line type="monotone" name="Global" isAnimationActive={false}
                                          dataKey={chartView === 'alcance' ? 'alcance_global' : 'views_global'} 
                                          stroke="#fbbf24" filter="url(#neonYellow)" strokeWidth={3} dot={{ r: 2, fill: '#fbbf24' }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
                
            </div>
        </TracingBeam>
    );
}