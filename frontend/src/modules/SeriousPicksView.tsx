import React, { useState } from 'react';
import type { UnifiedPickItem } from '../utils/picksEngine';
import type { OddsFormat } from '../utils/oddsFormat';
import { SeriousPickCard } from '../components/SeriousPickCard';

interface SeriousPicksViewProps {
  picks: UnifiedPickItem[];
  oddsFormat: OddsFormat;
  selectedLeague: string;
  onLeagueChange: (league: string) => void;
  followedIds: string[];
  parlayPickIds: Set<string>;
  onToggleFollow: (pickId: string, e?: React.MouseEvent) => void;
  onToggleParlay: (pick: UnifiedPickItem, e?: React.MouseEvent) => void;
  onOpenAnalysis: (pick: UnifiedPickItem) => void;
}

const LEAGUE_SELECTOR_ITEMS = [
  { code: 'ALL', label: 'Todas las Ligas', flag: '⚽' },
  { code: 'LIGA_MX', label: 'Liga MX', flag: '🇲🇽' },
  { code: 'LA_LIGA', label: 'LaLiga EA Sports', flag: '🇪🇸' },
  { code: 'EPL', label: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code: 'UCL', label: 'Champions League', flag: '⭐' },
  { code: 'MLS', label: 'MLS', flag: '🇺🇸' },
];

export const SeriousPicksView: React.FC<SeriousPicksViewProps> = ({
  picks,
  oddsFormat,
  selectedLeague,
  onLeagueChange,
  followedIds,
  parlayPickIds,
  onToggleFollow,
  onToggleParlay,
  onOpenAnalysis,
}) => {
  const [filterKind, setFilterKind] = useState<'ALL' | 'PLAYER' | 'TEAM'>('ALL');
  const [showLeagueMenu, setShowLeagueMenu] = useState(false);

  // Mostrar primero los activos y luego los liquidados
  const activePool = picks.filter((p) => p.match.status !== 'FINISHED');
  const basePool = activePool.length > 0 ? activePool : picks;

  const filteredPicks = basePool.filter((p) => {
    if (filterKind === 'PLAYER') return p.kind === 'PLAYER';
    if (filterKind === 'TEAM') return p.kind === 'TEAM';
    return true;
  });

  const todayFormatted = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const currentLeagueMeta =
    LEAGUE_SELECTOR_ITEMS.find((l) => l.code === selectedLeague) ||
    LEAGUE_SELECTOR_ITEMS[0];

  return (
    <div className="space-y-5 pb-28">
      {/* 1. ENCABEZADO PREDICCIONES (Captura 2) */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Predicciones
        </h1>
        <div className="mt-1.5 flex items-center gap-2 text-xs sm:text-sm text-zinc-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          <span>
            {filteredPicks.length} picks · {todayFormatted}
          </span>
        </div>
      </div>

      {/* 2. CONTROL SEGMENTADO (Todos | Jugadores | Equipos) + BOTÓN SELECTOR DE DEPORTE/LIGA (⚽) */}
      <div className="relative flex items-center gap-2.5">
        <div className="flex-1 grid grid-cols-3 p-1 rounded-full bg-[#161a20] border border-white/[0.07]">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'PLAYER', label: 'Jugadores' },
            { id: 'TEAM', label: 'Equipos' },
          ].map((tab) => {
            const active = filterKind === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterKind(tab.id as 'ALL' | 'PLAYER' | 'TEAM')}
                className={`py-2 px-3 rounded-full text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                  active
                    ? 'bg-white text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Botón Selector de Liga con balón ⚽ estilo Captura 2 */}
        <button
          type="button"
          onClick={() => setShowLeagueMenu((prev) => !prev)}
          title={`Filtrar Liga (${currentLeagueMeta.label})`}
          className={`w-12 h-11 rounded-2xl border flex items-center justify-center text-lg transition cursor-pointer shrink-0 ${
            selectedLeague !== 'ALL' || showLeagueMenu
              ? 'bg-emerald-500/20 border-emerald-500/50'
              : 'bg-[#161a20] border-white/[0.07] hover:border-white/20'
          }`}
        >
          <span>{currentLeagueMeta.flag}</span>
        </button>

        {/* Menú desplegable de Ligas de Fútbol */}
        {showLeagueMenu && (
          <div className="absolute right-0 top-14 z-30 w-56 rounded-2xl bg-[#11151b] border border-white/15 shadow-2xl p-1.5 space-y-1">
            {LEAGUE_SELECTOR_ITEMS.map((lg) => {
              const active = selectedLeague === lg.code;
              return (
                <button
                  key={lg.code}
                  type="button"
                  onClick={() => {
                    onLeagueChange(lg.code);
                    setShowLeagueMenu(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                    active
                      ? 'bg-emerald-500 text-zinc-950 font-black'
                      : 'text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{lg.flag}</span>
                    <span>{lg.label}</span>
                  </span>
                  {active && <span>✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. LISTA DE TARJETAS DE PREDICCIÓN CON ESCUDOS Y JUGADORES VISIBLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {filteredPicks.map((pick) => (
          <SeriousPickCard
            key={pick.id}
            pick={pick}
            oddsFormat={oddsFormat}
            isFollowed={followedIds.includes(pick.id)}
            isInParlay={parlayPickIds.has(pick.id)}
            onToggleFollow={(id, e) => {
              e.stopPropagation();
              onToggleFollow(id, e);
            }}
            onToggleParlay={(p, e) => {
              e.stopPropagation();
              onToggleParlay(p, e);
            }}
            onOpenAnalysis={onOpenAnalysis}
          />
        ))}
      </div>
    </div>
  );
};
