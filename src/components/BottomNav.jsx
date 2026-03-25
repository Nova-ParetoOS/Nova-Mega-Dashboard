import React, { useState } from 'react';
import { BarChart3, Package, Target, Users, Share2 } from 'lucide-react';

const TABS = [
    { id: 'dashboard', label: 'Painel', Icon: BarChart3, color: 'text-purple-500' },
    { id: 'audit', label: 'Estoque', Icon: Package, color: 'text-green-500' },
    { id: 'goals', label: 'Metas', Icon: Target, color: 'text-indigo-500' },
    { id: 'marketing', label: 'Divulgação', Icon: Share2, color: 'text-pink-500' },
    { id: 'crm', label: 'CRM', Icon: Users, color: 'text-blue-500' },
];

export const BottomNav = ({ activeTab, changeTab }) => (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white/95 backdrop-blur border-t border-gray-200 shadow-lg">
        <div className="flex items-stretch">
            {TABS.map(({ id, label, Icon, color }) => {
                const active = activeTab === id || (id === 'audit' && ['audit', 'system', 'diff'].includes(activeTab));
                return (
                    <button
                        key={id}
                        onClick={() => changeTab(id)}
                        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 transition-all relative
              ${active ? color : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        {active && (
                            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-current" />
                        )}
                        <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`} strokeWidth={active ? 2.5 : 1.8} />
                        <span className={`text-[9px] font-bold uppercase tracking-wider transition-all ${active ? 'opacity-100' : 'opacity-60'}`}>
                            {label}
                        </span>
                    </button>
                );
            })}
        </div>
        {/* Safe area spacer for mobile notch */}
        <div className="h-safe-bottom" />
    </nav>
);

export default BottomNav;
