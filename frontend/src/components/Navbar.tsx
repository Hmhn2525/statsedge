import React from 'react';
import { motion } from 'motion/react';
import { RefreshCw, ArrowLeftRight, TrendingUp } from 'lucide-react';
import type { OddsFormat } from '../utils/oddsFormat';

interface NavbarProps {
  selectedLeague: string;
  onLeagueChange: (league: string) => void;
  oddsFormat: OddsFormat;
  onToggleOddsFormat: () => void;
  onSyncData: () => void;
  isSyncing: boolean;
  parlayCount: number;
  onOpenParlays: () => void;
}

const LEAGUES = [
  { code: 'ALL', label: 'Todas', badge: '🌍' },
  { code: 'LIGA_MX', label: 'Liga MX', badge: '🇲🇽' },
  { code: 'UCL', label: 'Champions', badge: '⭐' },
  { code: 'LA_LIGA', label: 'LaLiga', badge: '🇪🇸' },
  { code: 'EPL', label: 'Premier', badge: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code: 'MLS', label: 'MLS', badge: '🇺🇸' },
];

export const Navbar: React.FC<NavbarProps> = ({
  selectedLeague,
  onLeagueChange,
  oddsFormat,
  onToggleOddsFormat,
  onSyncData,
  isSyncing,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#0b0f14]/95 backdrop-blur-md border-b border-[#1f2a37]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-3 pb-2.5">
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* Identidad StatsEdge AI */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <TrendingUp className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white">
                  STATS<span className="text-emerald-400">EDGE</span>
                </h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-extrabold uppercase tracking-wider">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Análisis Predictivo Deportivo · Ventaja Estadística (+EV) · Paper Trading
              </p>
            </div>
          </div>

          {/* Controles rápidos: Formato de Momios + Sincronizar */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleOddsFormat}
              title="Cambiar entre formato Decimal (1.95) y Americano (-105)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121820] hover:bg-[#18222d] border border-[#1f2a37] text-xs font-medium text-slate-200 transition cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Momios:{' '}
                <strong className="text-emerald-400 font-mono">
                  {oddsFormat === 'DECIMAL' ? 'Decimal' : 'Americano'}
                </strong>
              </span>
            </button>

            <button
              onClick={onSyncData}
              disabled={isSyncing}
              title="Sincronizar escudos oficiales, jornadas y estadísticas"
              className="p-2 rounded-xl bg-[#121820] hover:bg-emerald-500/15 border border-[#1f2a37] hover:border-emerald-500/40 text-slate-300 hover:text-emerald-400 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Carrusel de Ligas con Píldora Animada (Framer Motion layoutId) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {LEAGUES.map((lg) => {
            const active = selectedLeague === lg.code;
            return (
              <button
                key={lg.code}
                onClick={() => onLeagueChange(lg.code)}
                className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors z-10 cursor-pointer ${
                  active
                    ? 'text-slate-950'
                    : 'bg-[#121820] text-slate-400 border border-[#1f2a37] hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="active-league-pill"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    className="absolute inset-0 bg-emerald-500 rounded-full -z-10 shadow-md shadow-emerald-500/25"
                  />
                )}
                <span>{lg.badge}</span>
                <span>{lg.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
