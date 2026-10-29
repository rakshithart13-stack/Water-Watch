import React from 'react';

interface PriorityBadgeProps {
  score: number;
  confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  showLabel?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ score, confidence, showLabel = true }) => {
  let color = 'bg-succ/15 text-succ border-succ/30';
  let label = 'Low Priority';

  if (score >= 75) {
    color = 'bg-crit/15 text-crit border-crit/40 shadow-sm shadow-crit/20 animate-pulse';
    label = 'Critical';
  } else if (score >= 50) {
    color = 'bg-warn/15 text-warn border-warn/40 shadow-sm shadow-warn/20';
    label = 'High';
  } else if (score >= 25) {
    color = 'bg-electric/15 text-electric border-electric/40 shadow-sm shadow-electric/20';
    label = 'Medium';
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${color} flex items-center gap-1.5`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
        {Math.round(score)}/100 {showLabel && `• ${label}`}
      </span>
      {confidence && (
        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-surfaceCard text-muted rounded-md border border-surfaceBorder" title="Assessment Confidence">
          {confidence} CONF
        </span>
      )}
    </div>
  );
};
