import React from 'react';
import { motion } from 'motion/react';
import {
  RefreshCw,
  ArrowLeftRight,
  TrendingUp,
  Smartphone,
  Monitor,
  Globe,
  Trophy,
  Star,
  Shield,
  Award,
  Radio,
} from 'lucide-react';
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
  liveCount?: number;
}

const LEAGUES = [
  { code: 'ALL', label: 'Todas', tag: 'ALL', icon: Globe },
  { code: 'LIGA_MX', label: 'Liga MX', tag: 'MX', icon: Shield },
  { code: 'UCL', label: 'Champions', tag: 'UCL', icon: Star },
  { code: 'LA_LIGA', label: 'LaLiga', tag: 'ESP', icon: Trophy },
  { code: 'EPL', label: 'Premier', tag: 'ENG', icon: Award },
  { code: 'MLS', label: 'MLS', tag: 'USA', icon: Shield },
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
  liveCount = 0,
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
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  STATS<span className="text-emerald-400">EDGE</span>
                </h1>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-extrabold">
                  AI
                </span>
                {liveCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    <Radio className="w-3 h-3 text-rose-400 animate-pulse" />
                    <span>{liveCount} EN VIVO</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Asistente Inteligente de Apuestas · Marcadores y Tiros en Vivo
              </p>
            </div>
          </div>

          {/* Controles Superiores */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onToggleMobileSim && (
              <button
                onClick={onToggleMobileSim}
                title="Abrir o cerrar simulador de vista celular"
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                  isMobileSim
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/25'
                    : 'glass-pill hover:border-emerald-500/50 text-emerald-300'
                }`}
              >
                {isMobileSim ? (
                  <>
                    <Monitor className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Salir Vista Celular</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Vista Celular</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onToggleOddsFormat}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl glass-pill hover:border-emerald-500/50 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline text-slate-400">Momios:</span>
              <span className="text-emerald-400 font-mono font-extrabold">
                {oddsFormat === 'DECIMAL' ? 'Decimal' : 'Americano'}
              </span>
            </button>

            <button
              onClick={onSyncData}
              disabled={isSyncing}
              title="Actualizar marcadores en vivo, tarjetas y tiros"
              className="px-2.5 py-1.5 rounded-xl glass-pill hover:border-emerald-500/50 text-slate-200 hover:text-emerald-400 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
              <span className="hidden lg:inline">{isSyncing ? 'Sincronizando...' : 'Actualizar Vivo'}</span>
            </button>
          </div>
        </div>

        {/* Carrusel de Ligas con Iconos Vectoriales Shadcn/Lucide */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {LEAGUES.map((lg) => {
            const active = selectedLeague === lg.code;
            const Icon = lg.icon;
            return (
              <button
                key={lg.code}
                onClick={() => onLeagueChange(lg.code)}
                className={`relative px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                  active ? 'text-slate-950' : 'glass-pill text-slate-300 hover:text-white'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="navbar-league-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 shadow-md shadow-emerald-500/25 z-0"
                  />
                )}
                <Icon className={`relative z-10 w-3.5 h-3.5 ${active ? 'text-slate-950' : 'text-emerald-400'}`} />
                <span
                  className={`relative z-10 text-[9px] font-mono px-1 py-0.2 rounded ${
                    active ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {lg.tag}
                </span>
                <span className="relative z-10">{lg.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
