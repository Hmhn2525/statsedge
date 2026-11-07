import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { MatchSummary, ParlayLeg } from '../types';
import type { OddsFormat } from '../utils/oddsFormat';
import {
  formatOdds,
  formatPercent,
  getShortTeamName,
  getRelativeDayInfo,
} from '../utils/oddsFormat';
import { SofascoreMatchCenter } from '../components/SofascoreMatchCenter';
import {
  Badge,
  SofascoreRatingBadge,
  AnimatedTabs,
} from '../components/ui/primitives';
import {
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Trophy,
  Check,
  BarChart3,
} from 'lucide-react';

interface MainDashboardProps {
  matches: MatchSummary[];
  loading: boolean;
  oddsFormat: OddsFormat;
  parlayLegs: ParlayLeg[];
  onToggleLeg: (leg: ParlayLeg) => void;
  onRefreshMatches: () => void;
  isMobileSim?: boolean;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  matches,
  loading,
  oddsFormat,
  parlayLegs,
  onToggleLeg,
  onRefreshMatches,
  isMobileSim = false,
}) => {
  const [statusTab, setStatusTab] = useState<'SCHEDULED' | 'FINISHED' | 'ALL'>('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('ALL_DATES');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  const scheduledMatches = matches.filter((m) => m.status === 'SCHEDULED');
  const finishedMatches = matches.filter((m) => m.status === 'FINISHED');

  const statusFiltered =
    statusTab === 'SCHEDULED'
      ? scheduledMatches
      : statusTab === 'FINISHED'
      ? finishedMatches
      : [...scheduledMatches, ...finishedMatches];

  // Construir mapa de días únicos con etiquetas relativas ("Hoy", "Ayer", "Mañana") ordenados cronológicamente
  interface DateTabItem {
    dateKey: string;
    timestamp: number;
    pillLabel: string;
    label: string;
    tag: 'AYER' | 'HOY' | 'MANANA' | 'OTRO';
    count: number;
  }

  const dateTabsMap = new Map<string, DateTabItem>();
  for (const m of statusFiltered) {
    const info = getRelativeDayInfo(m.kickoff_time);
    const existing = dateTabsMap.get(info.dateKey);
    if (existing) {
      existing.count += 1;
    } else {
      const d = new Date(m.kickoff_time);
      const dMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      dateTabsMap.set(info.dateKey, {
        dateKey: info.dateKey,
        timestamp: dMidnight,
        pillLabel: info.pillLabel,
        label: info.label,
        tag: info.tag,
        count: 1,
      });
    }
  }

  const availableDateTabs = Array.from(dateTabsMap.values()).sort(
    (a, b) => a.timestamp - b.timestamp
  );

  const displayedMatches =
    selectedDateFilter === 'ALL_DATES'
      ? statusFiltered
      : statusFiltered.filter(
          (m) => getRelativeDayInfo(m.kickoff_time).dateKey === selectedDateFilter
        );

  // Seleccionar automáticamente el primer partido en escritorio
  useEffect(() => {
    if (displayedMatches.length > 0) {
      const stillVisible = displayedMatches.some((m) => m.id === selectedMatchId);
      if (!stillVisible) {
        setSelectedMatchId(displayedMatches[0].id);
      }
    }
  }, [matches, statusTab]);

  const activeMatch =
    displayedMatches.find((m) => m.id === selectedMatchId) || displayedMatches[0] || null;

  // Agrupar partidos por Liga (estilo Sofascore)
  const groupedByLeague = displayedMatches.reduce<Record<string, MatchSummary[]>>((acc, match) => {
    const key = match.competition_name || 'Otras Ligas';
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {});

  const handleSelectMatchRow = (match: MatchSummary) => {
    setSelectedMatchId(match.id);
    if (isMobileSim || window.innerWidth < 1024) {
      setMobileDrawerOpen(true);
    }
  };

  const isLegInSlip = (matchId: string, marketType: string, selectionCode: string) =>
    parlayLegs.some(
      (l) =>
        l.match_id === matchId &&
        l.market_type === marketType &&
        l.selection_code === selectionCode
    );

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-300 text-sm animate-pulse glass-card rounded-2xl">
        Sincronizando calendario en vivo, escudos oficiales y probabilidades IA...
      </div>
    );
  }

  return (
    <div className="pb-28">
      {/* BARRA DE FILTROS DE ESTADO Y SELECTOR DE DÍA GLASSY */}
      <div className="space-y-3 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AnimatedTabs
            layoutGroupId="status-filter-tabs"
            activeTab={statusTab}
            onChange={(id) => {
              setStatusTab(id as 'SCHEDULED' | 'FINISHED' | 'ALL');
              setSelectedDateFilter('ALL_DATES');
            }}
            tabs={[
              { id: 'ALL', label: 'Todos', count: matches.length },
              { id: 'SCHEDULED', label: 'Próximos', count: scheduledMatches.length },
              { id: 'FINISHED', label: 'Finalizados', count: finishedMatches.length },
            ]}
          />

          {!isMobileSim && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300 glass-pill px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Toca cualquier cuota 1X2 para armar tu jugada en 1 clic</span>
            </div>
          )}
        </div>

        {/* Selector Horizontal de Día con etiquetas relativas ("Hoy", "Ayer", "Mañana") */}
        {availableDateTabs.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedDateFilter('ALL_DATES')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
                selectedDateFilter === 'ALL_DATES'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                  : 'glass-pill text-slate-300 hover:text-white'
              }`}
            >
              Todas las fechas ({statusFiltered.length})
            </button>
            {availableDateTabs.map((tab) => {
              const active = selectedDateFilter === tab.dateKey;
              const isToday = tab.tag === 'HOY';
              const isYesterday = tab.tag === 'AYER';

              return (
                <button
                  key={tab.dateKey}
                  onClick={() => setSelectedDateFilter(tab.dateKey)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    active
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                      : isToday
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/50'
                      : isYesterday
                      ? 'bg-amber-950/40 text-amber-300 border border-amber-500/30 hover:bg-amber-900/40'
                      : 'glass-pill text-slate-300 hover:text-white'
                  }`}
                >
                  {isToday && !active && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                  {isYesterday && !active && (
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  )}
                  <span>{tab.pillLabel}</span>
                  <span className="text-[10px] opacity-75 font-semibold">({tab.count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {displayedMatches.length === 0 ? (
        <div className="p-12 text-center glass-card rounded-2xl text-slate-300 text-sm">
          No hay partidos disponibles en esta fecha o categoría.
        </div>
      ) : (
        /* VISTA DIVIDIDA EN ESCRITORIO / 1 COLUMNA EN CELULAR O SIMULADOR MÓVIL */
        <div
          className={`grid grid-cols-1 ${
            isMobileSim ? '' : 'lg:grid-cols-12'
          } gap-5 items-start`}
        >
          {/* COLUMNA IZQUIERDA: TARJETAS GLASSY POR LIGA */}
          <div className={`${isMobileSim ? '' : 'lg:col-span-7'} space-y-4`}>
            {Object.entries(groupedByLeague).map(([leagueName, leagueMatches]) => {
              const sampleRound = leagueMatches[0]?.round_name || 'Temporada Regular';
              return (
                <motion.div
                  key={leagueName}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="glass-panel rounded-2xl overflow-hidden"
                >
                  {/* Cabecera de Liga */}
                  <div className="px-4 py-3 bg-white/[0.04] border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs sm:text-sm font-black text-white tracking-wide truncate">
                        {leagueName}
                      </span>
                      <span className="text-slate-600 hidden sm:inline">•</span>
                      <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                        {sampleRound}
                      </span>
                    </div>
                    <Badge variant="outline">{leagueMatches.length} juegos</Badge>
                  </div>

                  {/* Filas de Partidos */}
                  <div className="divide-y divide-white/[0.07]">
                    {leagueMatches.map((match) => {
                      const isFinished = match.status === 'FINISHED';
                      const isSelected = activeMatch?.id === match.id;
                      const stats = match.google_stats || {};

                      const homeShort = getShortTeamName(
                        match.home_team_name,
                        match.home_short_name
                      );
                      const awayShort = getShortTeamName(
                        match.away_team_name,
                        match.away_short_name
                      );
                      const homeRating: number = stats.sofascore_home_rating || 7.18;
                      const awayRating: number = stats.sofascore_away_rating || 7.05;
                      const dateInfo = getRelativeDayInfo(match.kickoff_time);

                      const getEval = (sel: string) =>
                        match.evaluations.find(
                          (e) =>
                            e.market_type === '1X2' &&
                            e.selection_code === sel &&
                            e.bookmaker_code === 'DRAFTEA'
                        ) ||
                        match.evaluations.find(
                          (e) => e.market_type === '1X2' && e.selection_code === sel
                        );

                      const homeEval = getEval('HOME');
                      const drawEval = getEval('DRAW');
                      const awayEval = getEval('AWAY');

                      return (
                        <div
                          key={match.id}
                          onClick={() => handleSelectMatchRow(match)}
                          className={`p-3.5 sm:p-4 transition-all cursor-pointer relative ${
                            isSelected && !isMobileSim
                              ? 'bg-emerald-950/25 border-l-4 border-l-emerald-400'
                              : 'hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            {/* Columna 1: Hora / Estado con Etiquetas Relativas */}
                            <div className="w-16 sm:w-18 shrink-0 text-center border-r border-white/10 pr-2.5">
                              {isFinished ? (
                                <div className="space-y-1">
                                  <span className="inline-block px-2 py-0.5 rounded-md bg-slate-800/90 border border-white/10 text-[10px] font-black text-slate-200">
                                    FIN
                                  </span>
                                  {dateInfo.tag === 'AYER' ? (
                                    <span className="block text-[11px] text-amber-400 font-extrabold">
                                      Ayer
                                    </span>
                                  ) : dateInfo.tag === 'HOY' ? (
                                    <span className="block text-[11px] text-emerald-400 font-extrabold">
                                      Hoy
                                    </span>
                                  ) : (
                                    <span className="block text-[10px] text-slate-400 font-medium">
                                      {dateInfo.dayShort}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <span className="block text-xs sm:text-sm font-mono font-black text-emerald-400">
                                    {dateInfo.formattedTime}
                                  </span>
                                  {dateInfo.tag === 'HOY' ? (
                                    <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-500/20 text-[10px] text-emerald-300 font-black border border-emerald-500/40">
                                      Hoy
                                    </span>
                                  ) : dateInfo.tag === 'MANANA' ? (
                                    <span className="block text-[11px] text-teal-300 font-extrabold">
                                      Mañana
                                    </span>
                                  ) : (
                                    <span className="block text-[10px] text-slate-400 font-medium">
                                      {dateInfo.dayShort}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Columna 2: Equipos con Escudos Más Grandes y Legibles en Celular */}
                            <div className="flex-1 min-w-0 space-y-2.5">
                              {/* Fila Equipo Local */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {match.home_team_logo ? (
                                    <img
                                      src={match.home_team_logo}
                                      alt={match.home_team_name}
                                      className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0 drop-shadow"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-slate-800 shrink-0" />
                                  )}
                                  <span className="text-sm sm:text-base font-extrabold text-white truncate">
                                    {match.home_team_name}
                                  </span>
                                  {match.home_rank && (
                                    <span className="text-[10px] text-slate-300 bg-white/10 px-1.5 py-0.5 rounded font-bold shrink-0">
                                      {match.home_rank}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <SofascoreRatingBadge rating={homeRating} />
                                  {isFinished && (
                                    <span className="w-6 text-right text-base sm:text-lg font-black font-mono text-white">
                                      {match.home_score}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Fila Equipo Visitante */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {match.away_team_logo ? (
                                    <img
                                      src={match.away_team_logo}
                                      alt={match.away_team_name}
                                      className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0 drop-shadow"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-slate-800 shrink-0" />
                                  )}
                                  <span className="text-sm sm:text-base font-extrabold text-slate-100 truncate">
                                    {match.away_team_name}
                                  </span>
                                  {match.away_rank && (
                                    <span className="text-[10px] text-slate-300 bg-white/10 px-1.5 py-0.5 rounded font-bold shrink-0">
                                      {match.away_rank}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <SofascoreRatingBadge rating={awayRating} />
                                  {isFinished && (
                                    <span className="w-6 text-right text-base sm:text-lg font-black font-mono text-emerald-400">
                                      {match.away_score}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Barra Inferior: Botones 1X2 Tocables en 1 Clic + Botón Ver Análisis IA */}
                          <div className="mt-3 pt-3 border-t border-white/[0.08] space-y-2.5">
                            {/* Botones 1X2 Tocables de Tamaño Cómodo para Pulgar */}
                            {!isFinished && homeEval && drawEval && awayEval && (
                              <div
                                className="grid grid-cols-3 gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {[
                                  { code: 'HOME', label: `1 · ${homeShort}`, ev: homeEval },
                                  { code: 'DRAW', label: 'Empate (X)', ev: drawEval },
                                  { code: 'AWAY', label: `2 · ${awayShort}`, ev: awayEval },
                                ].map(({ code, label, ev }) => {
                                  const selectedInSlip = isLegInSlip(match.id, '1X2', code);
                                  const isHighProb = ev.model_prob >= 0.52;

                                  return (
                                    <button
                                      key={code}
                                      onClick={() =>
                                        onToggleLeg({
                                          match_id: match.id,
                                          market_type: '1X2',
                                          selection_code: code,
                                          decimal_odds: ev.decimal_odds,
                                        })
                                      }
                                      className={`px-2.5 py-2 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-1 ${
                                        selectedInSlip
                                          ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/25 font-black'
                                          : isHighProb
                                          ? 'bg-emerald-950/40 border-emerald-500/40 hover:border-emerald-400 text-white'
                                          : 'bg-slate-950/60 border-white/10 hover:border-emerald-500/40 text-slate-200'
                                      }`}
                                    >
                                      <div className="min-w-0">
                                        <span
                                          className={`block text-[10px] font-bold truncate ${
                                            selectedInSlip ? 'text-slate-950' : 'text-slate-300'
                                          }`}
                                        >
                                          {selectedInSlip && (
                                            <Check className="w-3 h-3 inline mr-0.5 stroke-[3]" />
                                          )}
                                          {label}
                                        </span>
                                        <span
                                          className={`block text-[10px] font-mono ${
                                            selectedInSlip
                                              ? 'text-slate-900 font-bold'
                                              : 'text-emerald-400/90'
                                          }`}
                                        >
                                          {formatPercent(ev.model_prob)} prob.
                                        </span>
                                      </div>

                                      <span
                                        className={`text-xs sm:text-sm font-black font-mono shrink-0 ${
                                          selectedInSlip ? 'text-slate-950' : 'text-emerald-400'
                                        }`}
                                      >
                                        {formatOdds(ev.decimal_odds, oddsFormat)}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Fila de Insight + Botón explícito para abrir Análisis IA */}
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-1.5 min-w-0 text-slate-300">
                                {isFinished ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span className="truncate text-[11px]">
                                      Goles Esperados (xG):{' '}
                                      <strong className="text-emerald-400">
                                        {match.home_xg?.toFixed(2)}
                                      </strong>{' '}
                                      vs{' '}
                                      <strong className="text-teal-300">
                                        {match.away_xg?.toFixed(2)}
                                      </strong>
                                    </span>
                                  </>
                                ) : match.friendly_insight ? (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span className="truncate text-[11px]">
                                      Sugerencia IA:{' '}
                                      <strong className="text-emerald-300">
                                        {match.friendly_insight.recommended_pick}
                                      </strong>
                                    </span>
                                  </>
                                ) : null}
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMatchId(match.id);
                                  if (isMobileSim || window.innerWidth < 1024) {
                                    setMobileDrawerOpen(true);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-emerald-500/20 border border-white/10 text-[11px] font-extrabold text-emerald-300 flex items-center gap-1 shrink-0 cursor-pointer transition"
                              >
                                <BarChart3 className="w-3.5 h-3.5" />
                                <span>Ver Análisis IA</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* COLUMNA DERECHA FIJA EN ESCRITORIO (OCULTA EN SIMULADOR CELULAR) */}
          {!isMobileSim && (
            <div className="hidden lg:block lg:col-span-5 sticky top-28">
              <AnimatePresence mode="wait">
                {activeMatch && (
                  <motion.div
                    key={activeMatch.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SofascoreMatchCenter
                      match={activeMatch}
                      oddsFormat={oddsFormat}
                      onAddLeg={onToggleLeg}
                      onRefreshMatch={onRefreshMatches}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* BOTTOM SHEET DESLIZABLE EN CELULAR O EN MODO SIMULADOR CELULAR */}
      {mobileDrawerOpen && activeMatch && (
        <SofascoreMatchCenter
          match={activeMatch}
          oddsFormat={oddsFormat}
          isMobileDrawer
          onClose={() => setMobileDrawerOpen(false)}
          onAddLeg={onToggleLeg}
          onRefreshMatch={onRefreshMatches}
        />
      )}
    </div>
  );
};
