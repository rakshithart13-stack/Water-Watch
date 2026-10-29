import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let style = 'bg-slate-800 text-slate-300 border-slate-700';

  switch (status.toUpperCase()) {
    case 'NEW':
      style = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      break;
    case 'TRIAGED':
      style = 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      break;
    case 'ASSIGNED':
      style = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      break;
    case 'INVESTIGATING':
      style = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      break;
    case 'AWAITING_SAMPLE':
      style = 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      break;
    case 'AWAITING_REPAIR':
      style = 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      break;
    case 'RESOLVED':
      style = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      break;
    case 'CLOSED':
      style = 'bg-slate-700/30 text-slate-400 border-slate-600/30';
      break;
  }

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${style}`}>
      {status.replace('_', ' ')}
    </span>
  );
};
