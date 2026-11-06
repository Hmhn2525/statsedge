import React from 'react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * shadcn/ui Badge primitive styled for Sofascore Emerald theme
 */
export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'emerald' | 'amber' | 'outline' | 'live';
  className?: string;
}> = ({ children, variant = 'default', className }) => {
  const variants = {
    default: 'bg-[#1f2a37] text-slate-200 border-slate-700/60',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    outline: 'bg-transparent text-slate-400 border-[#263342]',
    live: 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-tight transition-colors',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

/**
 * Sofascore Rating Pill (e.g. 7.38 in green/lime/amber square)
 */
export const SofascoreRatingBadge: React.FC<{ rating: number; size?: 'sm' | 'md' }> = ({
  rating,
  size = 'sm',
}) => {
  const bgClass =
    rating >= 7.3
      ? 'bg-emerald-500 text-slate-950'
      : rating >= 7.0
      ? 'bg-[#22c55e] text-slate-950'
      : 'bg-amber-400 text-slate-950';

  return (
    <span
      title="Sofascore Statistical Team Rating"
      className={cn(
        'inline-flex items-center justify-center font-mono font-extrabold rounded shadow-xs',
        bgClass,
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5 min-w-[28px]' : 'text-xs px-2 py-0.5 min-w-[34px]'
      )}
    >
      {rating.toFixed(2)}
    </span>
  );
};

/**
 * shadcn/ui Animated Dual Stat Comparison Bar (Sofascore signature widget)
 */
export const SofascoreStatBar: React.FC<{
  label: string;
  homeVal: number;
  awayVal: number;
  unit?: string;
  isDecimal?: boolean;
}> = ({ label, homeVal, awayVal, unit = '', isDecimal = false }) => {
  const total = homeVal + awayVal || 1;
  const homePct = Math.round((homeVal / total) * 100);
  const awayPct = 100 - homePct;
  const homeLeads = homeVal > awayVal;
  const awayLeads = awayVal > homeVal;

  const fmt = (v: number) => (isDecimal ? v.toFixed(2) : Math.round(v).toString()) + unit;

  return (
    <div className="space-y-1.5 py-1">
      <div className="flex items-center justify-between text-xs">
        <span
          className={cn(
            'font-mono font-bold px-2 py-0.5 rounded-md transition-colors',
            homeLeads
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-300'
          )}
        >
          {fmt(homeVal)}
        </span>
        <span className="text-[11px] font-semibold text-slate-400 tracking-wide">{label}</span>
        <span
          className={cn(
            'font-mono font-bold px-2 py-0.5 rounded-md transition-colors',
            awayLeads
              ? 'bg-teal-400/20 text-teal-300 border border-teal-400/30'
              : 'text-slate-300'
          )}
        >
          {fmt(awayVal)}
        </span>
      </div>

      {/* Dual bidirectional progress bar */}
      <div className="flex items-center gap-1.5 h-2">
        <div className="flex-1 bg-[#1b2430] rounded-l-full h-full overflow-hidden flex justify-end">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${homePct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className={cn(
              'h-full rounded-l-full',
              homeLeads ? 'bg-emerald-500' : 'bg-slate-600'
            )}
          />
        </div>
        <div className="flex-1 bg-[#1b2430] rounded-r-full h-full overflow-hidden flex justify-start">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${awayPct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className={cn(
              'h-full rounded-r-full',
              awayLeads ? 'bg-teal-400' : 'bg-slate-600'
            )}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Animated Tabs with Framer Motion layoutId pill indicator
 */
export const AnimatedTabs: React.FC<{
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onChange: (id: string) => void;
  layoutGroupId: string;
}> = ({ tabs, activeTab, onChange, layoutGroupId }) => {
  return (
    <div className="inline-flex items-center bg-[#121820] p-1 rounded-xl border border-[#1f2a37] w-full sm:w-auto overflow-x-auto">
      {tabs.map((t) => {
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              'relative flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap z-10 flex items-center justify-center gap-1.5',
              isActive ? 'text-slate-950' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            {isActive && (
              <motion.div
                layoutId={layoutGroupId}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute inset-0 bg-emerald-500 rounded-lg -z-10 shadow-sm shadow-emerald-500/20"
              />
            )}
            <span>{t.label}</span>
            {typeof t.count === 'number' && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                  isActive ? 'bg-slate-950/25 text-slate-950' : 'bg-[#1b2430] text-slate-400'
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
