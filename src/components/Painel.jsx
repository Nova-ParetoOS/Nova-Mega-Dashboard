import React from 'react';
import { StatsCard } from './ui/stats-card';
import { Package, Users, Bookmark, DollarSign, Activity } from 'lucide-react';

const formatCurrency = (value) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export default function Painel({
  dashboardStats,
  crmWishlist,
  activeTeamCount,
  realTotalSales,
  selectedStoreName
}) {
  const totalPecas = dashboardStats?.totalPieces || 0;
  const valorEstoque = dashboardStats?.totalInvestment || 0;
  
  // crmWishlist é a contagem de interesses. Se undefined, 0.
  const leadsAtivos = Array.isArray(crmWishlist) ? crmWishlist.length : 0;
  const teamAtivo = activeTeamCount || 0;

  return (
    <div className="space-y-6 fade-in max-w-none w-full">
      {/* Header Painel CEO */}
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 p-6 md:p-8 rounded-2xl border border-indigo-700 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black flex items-center gap-3 tracking-tight">
            <Activity className="w-8 h-8 text-indigo-300" />
            Visão Geral (Painel do Diretor)
          </h2>
          <p className="text-indigo-200/80 font-medium mt-2 text-sm max-w-xl">
            Acompanhamento centralizado de KPIs, volume financeiro e evolução operacional.
            <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full font-bold text-[10px] uppercase">{selectedStoreName || 'Global'}</span>
          </p>
        </div>
      </div>

      {/* Grid de Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatsCard
            title="Valor Físico (Estoque)"
            value={formatCurrency(valorEstoque)}
            icon={<DollarSign className="w-5 h-5 text-indigo-500" />}
            change={`${totalPecas} peças ativas no radar`}
            changeType="positive"
            className="bg-white"
        />
        
        <StatsCard
            title="Receita Realizada (Mes)"
            value={formatCurrency(realTotalSales || 0)}
            icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
            change="Baseado no histórico de vendas"
            changeType="positive"
            className="bg-white border-l-4 border-l-emerald-500"
        />

        <StatsCard
            title="Funil de Encomendas (CRM)"
            value={leadsAtivos.toString()}
            icon={<Bookmark className="w-5 h-5 text-purple-500" />}
            change="Desejos/Reservas sinalizadas"
            changeType="neutral"
            className="bg-white"
        />

        <StatsCard
            title="Força de Vendas (Ativa)"
            value={teamAtivo.toString()}
            icon={<Users className="w-5 h-5 text-blue-500" />}
            change="Avaliados nos últimos 90d"
            changeType="neutral"
            className="bg-white"
        />
      </div>
    </div>
  );
}
