import React from 'react';
import type { SignalClassification } from '../types';

export const ObservedBadge: React.FC<{ timestamp?: string }> = ({ timestamp }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
    HECHO OBSERVADO {timestamp && `· ${timestamp}`}
  </span>
);

export const ModelBadge: React.FC<{ ciText?: string }> = ({ ciText }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-sky-950/70 text-sky-300 border border-sky-800/80">
    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
    MODELO DIXON-COLES v1 {ciText && `(${ciText})`}
  </span>
);

export const SimulationBadge: React.FC<{ label?: string }> = ({ label = 'PAPER TRADING / SIN DINERO REAL' }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-950/40 text-amber-300 border border-dashed border-amber-600/60">
    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
    {label}
  </span>
);

export const SignalBadge: React.FC<{ signal: SignalClassification; evCons?: number }> = ({ signal, evCons }) => {
  if (signal === 'CANDIDATE_VALUE') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-700">
        DISCREPANCIA (+EV) {evCons !== undefined && `+${(evCons * 100).toFixed(1)}%`}
      </span>
    );
  }
  if (signal === 'HIGH_UNCERTAINTY') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-950/50 text-amber-300 border border-amber-800">
        ALTA INCERTIDUMBRE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-normal text-slate-400 bg-slate-900 border border-slate-800">
      SIN VENTAJA
    </span>
  );
};
