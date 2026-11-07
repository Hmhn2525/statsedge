import React from 'react';
import { motion } from 'motion/react';
import { RefreshCw, ArrowLeftRight, TrendingUp, Smartphone, Monitor } from 'lucide-react';
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
  isMobileSim?: boolean;
  onToggleMobileSim?: () => void;
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
  isMobileSim = false,
  onToggleMobileSim,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#070b10]/95 backdrop-blur-xl border-b border-slate-800/90 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-3 pb-2.5">
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* Identidad StatsEdge AI */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0 border border-white/20">
              <TrendingUp className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  STATS<span className="text-emerald-400">EDGE</span>
                </h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-extrabold uppercase tracking-wider">
                  AI
                </span>
              </div>
              {!isMobileSim && (
                <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                  Asistente Inteligente de Apuestas · Probabilidad Real & Control de Riesgo
                </p>
              )}
            </div>
          </div>

          {/* Controles rápidos: Simulador Celular + Formato de Momios + Sincronizar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onToggleMobileSim && (
              <button
                onClick={onToggleMobileSim}
                title="Probar cómo se ve y funciona en pantalla de celular"
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  isMobileSim
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/25'
                    : 'glass-pill text-emerald-300 hover:bg-white/10 hover:border-emerald-500/40'
                }`}
              >
                {isMobileSim ? (
                  <>
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Salir Vista Celular</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>📱 Vista Celular</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onToggleOddsFormat}
              title="Cambiar entre formato Decimal (1.95) y Americano (-105)"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl glass-pill hover:bg-white/10 text-xs font-medium text-slate-200 transition cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] sm:text-xs">
                <strong className="text-emerald-400 font-mono">
                  {oddsFormat === 'DECIMAL' ? '1.95' : '-105'}
                </strong>
              </span>
            </button>

            <button
              onClick={onSyncData}
              disabled={isSyncing}
              title="Sincronizar partidos y marcadores en vivo"
              className="p-2 rounded-xl glass-pill hover:bg-emerald-500/20 hover:border-emerald-500/40 text-slate-200 hover:text-emerald-400 transition disabled:opacity-50 cursor-pointer"
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
                className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-colors z-10 cursor-pointer ${
                  active
                    ? 'text-slate-950'
                    : 'glass-pill text-slate-300 hover:text-white hover:border-white/20'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="active-league-pill"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full -z-10 shadow-md shadow-emerald-500/30"
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
