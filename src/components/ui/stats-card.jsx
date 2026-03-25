import React from 'react';

export function StatsCard({ title, value, icon, change, changeType = 'neutral', className = '' }) {
  const changeColor =
    changeType === 'positive' ? 'text-emerald-600' :
    changeType === 'negative' ? 'text-red-500' :
    'text-gray-400';

  return (
    <div className={`rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</span>
        {icon && <div className="p-2 bg-gray-50 rounded-xl">{icon}</div>}
      </div>
      <div className="text-2xl font-black text-gray-900 leading-tight">{value}</div>
      {change && (
        <div className={`text-xs font-medium ${changeColor}`}>{change}</div>
      )}
    </div>
  );
}

export default StatsCard;
