import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { MatchSummary, ParlayLeg } from '../types';
import type { OddsFormat } from '../utils/oddsFormat';
import { formatOdds, formatPercent, getShortTeamName, getRelativeDayInfo } from '../utils/oddsFormat';
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
  Flame,
  Trophy,
} from 'lucide-react';

interface MainDashboardProps {
  matches: MatchSummary[];
  loading: boolean;
  oddsFormat: OddsFormat;
  onAddLeg: (leg: ParlayLeg) => void;
  onRefreshMatches: () => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  matches,
  loading,
  oddsFormat,
  onAddLeg,
  onRefreshMatches,
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
    if (window.innerWidth < 1024) {
      setMobileDrawerOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400 text-sm animate-pulse">
        Sincronizando calendario Sofascore, escudos oficiales y modelo Dixon-Coles...
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* BARRA DE FILTROS DE ESTADO Y SELECTOR DE DÍA ESTILO SOFASCORE */}
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

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Scrapling v0.5.1 Live · Jornada Real Verificada</span>
          </div>
        </div>

        {/* Selector Horizontal de Día estilo Sofascore con etiquetas relativas ("Hoy", "Ayer", "Mañana") */}
        {availableDateTabs.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedDateFilter('ALL_DATES')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                selectedDateFilter === 'ALL_DATES'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'bg-[#121820] text-slate-400 border border-[#1f2a37] hover:text-slate-200'
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
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    active
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                      : isToday
                      ? 'bg-[#142324] text-emerald-300 border border-emerald-700/60 hover:bg-[#1a2f30]'
                      : isYesterday
                      ? 'bg-[#1a1c22] text-amber-300/90 border border-amber-800/40 hover:text-amber-200'
                      : 'bg-[#121820] text-slate-400 border border-[#1f2a37] hover:text-slate-200'
                  }`}
                >
                  {isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                  {isYesterday && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  <span>{tab.pillLabel}</span>
                  <span className="text-[10px] opacity-70 font-normal">({tab.count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {displayedMatches.length === 0 ? (
        <div className="p-12 text-center bg-[#121820] rounded-2xl border border-[#1f2a37] text-slate-400 text-sm">
          No hay partidos disponibles en esta categoría.
        </div>
      ) : (
        /* VISTA DIVIDIDA ESTILO SOFASCORE (7 COLUMNAS IZQUIERDA + 5 COLUMNAS CENTRO DE PARTIDO DERECHA) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* COLUMNA IZQUIERDA: LISTA COMPACTA POR LIGAS ESTILO SOFASCORE */}
          <div className="lg:col-span-7 space-y-4">
            {Object.entries(groupedByLeague).map(([leagueName, leagueMatches]) => {
              const sampleRound = leagueMatches[0]?.round_name || 'Temporada Regular';
              return (
                <motion.div
                  key={leagueName}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-[#121820] border border-[#1f2a37] rounded-2xl overflow-hidden shadow-lg"
                >
                  {/* Cabecera de Liga Sofascore */}
                  <div className="px-4 py-2.5 bg-[#161e27] border-b border-[#1f2a37] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-extrabold text-white tracking-wide">
                        {leagueName}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[11px] text-slate-400">{sampleRound}</span>
                    </div>
                    <Badge variant="outline">{leagueMatches.length} partidos</Badge>
                  </div>

                  {/* Filas de Partidos */}
                  <div className="divide-y divide-[#1b2430]">
                    {leagueMatches.map((match) => {
                      const isFinished = match.status === 'FINISHED';
                      const isSelected = activeMatch?.id === match.id;
                      const stats = match.google_stats || {};

                      const homeShort = getShortTeamName(match.home_team_name, match.home_short_name);
                      const awayShort = getShortTeamName(match.away_team_name, match.away_short_name);
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
                          className={`p-3.5 transition-all cursor-pointer relative ${
                            isSelected
                              ? 'bg-[#17232b] border-l-4 border-l-emerald-400'
                              : 'hover:bg-[#151d26]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            {/* Columna 1: Hora / Estado con Etiquetas Relativas ("Hoy", "Ayer", "Mañana") */}
                            <div className="w-18 shrink-0 text-center border-r border-[#1f2a37] pr-2.5">
                              {isFinished ? (
                                <div className="space-y-0.5">
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-extrabold text-slate-300">
                                    FIN
                                  </span>
                                  {dateInfo.tag === 'AYER' ? (
                                    <span className="block text-[10px] text-amber-400/90 font-bold">
                                      Ayer
                                    </span>
                                  ) : dateInfo.tag === 'HOY' ? (
                                    <span className="block text-[10px] text-emerald-400 font-bold">
                                      Hoy
                                    </span>
                                  ) : (
                                    <span className="block text-[10px] text-slate-500">
                                      {dateInfo.dayShort}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="block text-xs font-mono font-extrabold text-emerald-400">
                                    {dateInfo.formattedTime}
                                  </span>
                                  {dateInfo.tag === 'HOY' ? (
                                    <span className="inline-block px-1.5 py-0.2 rounded bg-emerald-500/20 text-[10px] text-emerald-400 font-black border border-emerald-500/30">
                                      Hoy
                                    </span>
                                  ) : dateInfo.tag === 'MANANA' ? (
                                    <span className="block text-[10px] text-teal-300 font-bold">
                                      Mañana
                                    </span>
                                  ) : (
                                    <span className="block text-[10px] text-slate-400">
                                      {dateInfo.dayShort}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Columna 2: Equipos con Escudos Verificados, Posición y Rating Sofascore */}
                            <div className="flex-1 min-w-0 space-y-2">
                              {/* Fila Equipo Local */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {match.home_team_logo ? (
                                    <img
                                      src={match.home_team_logo}
                                      alt={match.home_team_name}
                                      className="w-6 h-6 object-contain shrink-0"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-slate-800 shrink-0" />
                                  )}
                                  <span className="text-xs sm:text-sm font-bold text-white truncate">
                                    {match.home_team_name}
                                  </span>
                                  {match.home_rank && (
                                    <span className="text-[10px] text-slate-400 bg-[#1c2632] px-1.5 py-0.2 rounded font-semibold">
                                      {match.home_rank}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <SofascoreRatingBadge rating={homeRating} />
                                  {isFinished && (
                                    <span className="w-5 text-right text-sm font-black font-mono text-white">
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
                                      className="w-6 h-6 object-contain shrink-0"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-slate-800 shrink-0" />
                                  )}
                                  <span className="text-xs sm:text-sm font-bold text-slate-200 truncate">
                                    {match.away_team_name}
                                  </span>
                                  {match.away_rank && (
                                    <span className="text-[10px] text-slate-400 bg-[#1c2632] px-1.5 py-0.2 rounded font-semibold">
                                      {match.away_rank}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <SofascoreRatingBadge rating={awayRating} />
                                  {isFinished && (
                                    <span className="w-5 text-right text-sm font-black font-mono text-emerald-400">
                                      {match.away_score}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Barra Inferior Compacta: Insight + Botones 1X2 con Nombres Cortos Correctos */}
                          <div className="mt-3 pt-2.5 border-t border-[#1c2632] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            {/* Insight o Resumen xG */}
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-300 min-w-0">
                              {isFinished ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span className="truncate">
                                    xG Observado:{' '}
                                    <strong className="text-emerald-400">
                                      {match.home_xg?.toFixed(2)}
                                    </strong>{' '}
                                    -{' '}
                                    <strong className="text-teal-300">
                                      {match.away_xg?.toFixed(2)}
                                    </strong>
                                  </span>
                                </>
                              ) : match.friendly_insight ? (
                                <>
                                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span className="truncate">
                                    <strong className="text-emerald-400">
                                      {match.friendly_insight.recommended_pick}
                                    </strong>
                                  </span>
                                </>
                              ) : null}
                            </div>

                            {/* Botones de Cuotas 1X2 (Usando homeShort / awayShort sin truncar 'Club' o 'Deportivo') */}
                            {!isFinished && homeEval && drawEval && awayEval ? (
                              <div
                                className="grid grid-cols-3 gap-1.5 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {[
                                  { code: 'HOME', label: `1 (${homeShort})`, ev: homeEval },
                                  { code: 'DRAW', label: 'X', ev: drawEval },
                                  { code: 'AWAY', label: `2 (${awayShort})`, ev: awayEval },
                                ].map(({ code, label, ev }) => {
                                  const hasEdge = ev.expected_value_nominal > 0.02;
                                  return (
                                    <button
                                      key={code}
                                      onClick={() =>
                                        onAddLeg({
                                          match_id: match.id,
                                          market_type: '1X2',
                                          selection_code: code,
                                          decimal_odds: ev.decimal_odds,
                                        })
                                      }
                                      className={`px-2.5 py-1.5 rounded-lg border text-center transition cursor-pointer spring-scale active:scale-95 ${
                                        hasEdge
                                          ? 'bg-emerald-950/40 border-emerald-500/50 hover:border-emerald-400'
                                          : 'bg-[#11171f] border-[#222f3d] hover:border-emerald-500/40'
                                      }`}
                                    >
                                      <span className="block text-[9px] text-slate-400 font-semibold truncate max-w-[78px]">
                                        {label}
                                      </span>
                                      <span className="text-xs font-extrabold font-mono text-emerald-400">
                                        {formatOdds(ev.decimal_odds, oddsFormat)}
                                      </span>
                                      <span className="block text-[9px] text-slate-500 font-mono">
                                        {formatPercent(ev.model_prob)} IA
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 self-end sm:self-auto">
                                <Flame className="w-3.5 h-3.5" />
                                Ver Momentum & Estadísticas
                                <ChevronRight className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* COLUMNA DERECHA FIJA EN ESCRITORIO: CENTRO DE PARTIDO SOFASCORE */}
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
                    onAddLeg={onAddLeg}
                    onRefreshMatch={onRefreshMatches}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* DRAWER DESLIZABLE EN CELULAR (< lg) */}
      {mobileDrawerOpen && activeMatch && (
        <SofascoreMatchCenter
          match={activeMatch}
          oddsFormat={oddsFormat}
          isMobileDrawer
          onClose={() => setMobileDrawerOpen(false)}
          onAddLeg={onAddLeg}
          onRefreshMatch={onRefreshMatches}
        />
      )}
    </div>
  );
};
