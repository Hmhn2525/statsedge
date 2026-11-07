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
  Radio,
  Crosshair,
  Calendar,
  Clock,
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
  const [statusTab, setStatusTab] = useState<'ALL' | 'IN_PLAY' | 'SCHEDULED' | 'FINISHED'>('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('ALL_DATES');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  const liveMatches = matches.filter((m) => m.status === 'IN_PLAY');
  const scheduledMatches = matches.filter((m) => m.status === 'SCHEDULED');
  const finishedMatches = matches.filter((m) => m.status === 'FINISHED');

  // Ordenar: En Vivo primero, luego Próximos, luego Finalizados recientes
  const statusFiltered =
    statusTab === 'IN_PLAY'
      ? liveMatches
      : statusTab === 'SCHEDULED'
      ? scheduledMatches
      : statusTab === 'FINISHED'
      ? finishedMatches
      : [...liveMatches, ...scheduledMatches, ...finishedMatches];

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
      dateTabsMap.set(info.dateKey, {
        dateKey: info.dateKey,
        timestamp: new Date(m.kickoff_time).getTime(),
        pillLabel: info.pillLabel,
        label: info.label,
        tag: info.tag,
        count: 1,
      });
    }
  }

  const dateTabs = Array.from(dateTabsMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  const displayedMatches =
    selectedDateFilter === 'ALL_DATES'
      ? statusFiltered
      : statusFiltered.filter(
          (m) => getRelativeDayInfo(m.kickoff_time).dateKey === selectedDateFilter
        );

  useEffect(() => {
    if (displayedMatches.length > 0) {
      const exists = displayedMatches.some((m) => m.id === selectedMatchId);
      if (!exists) {
        setSelectedMatchId(displayedMatches[0].id);
      }
    }
  }, [statusTab, selectedDateFilter, matches]);

  const activeMatch =
    displayedMatches.find((m) => m.id === selectedMatchId) || displayedMatches[0] || null;

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
        Sincronizando marcadores en vivo, tarjetas, tiros de jugadores y probabilidades IA...
      </div>
    );
  }

  return (
    <div className="pb-28">
      {/* BARRA DE FILTROS DE ESTADO Y SELECTOR DE DÍA */}
      <div className="space-y-3 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AnimatedTabs
            layoutGroupId="status-filter"
            activeTab={statusTab}
            onChange={(id) => {
              setStatusTab(id as 'ALL' | 'IN_PLAY' | 'SCHEDULED' | 'FINISHED');
              setSelectedDateFilter('ALL_DATES');
            }}
            tabs={[
              { id: 'ALL', label: 'Todos', count: matches.length },
              ...(liveMatches.length > 0
                ? [{ id: 'IN_PLAY', label: 'En Vivo', count: liveMatches.length }]
                : []),
              { id: 'SCHEDULED', label: 'Próximos', count: scheduledMatches.length },
              { id: 'FINISHED', label: 'Finalizados', count: finishedMatches.length },
            ]}
          />

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300 glass-pill px-3 py-1.5 rounded-xl">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Auto-Sync Activo (60s) · Toca un momio para armar tu jugada</span>
          </div>
        </div>

        {/* Selector de Fecha con Etiquetas Relativas ("Hoy", "Ayer", "Mañana") */}
        {dateTabs.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedDateFilter('ALL_DATES')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                selectedDateFilter === 'ALL_DATES'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'glass-pill text-slate-300 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Todas las fechas ({statusFiltered.length})</span>
            </button>
            {dateTabs.map((tab) => {
              const active = selectedDateFilter === tab.dateKey;
              const isToday = tab.tag === 'HOY';
              const isYesterday = tab.tag === 'AYER';
              return (
                <button
                  key={tab.dateKey}
                  onClick={() => setSelectedDateFilter(tab.dateKey)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
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
          {/* COLUMNA IZQUIERDA: TARJETAS INDIVIDUALES SEPARADAS CON ESPACIO LIBRE */}
          <div className={`${isMobileSim ? '' : 'lg:col-span-7'} space-y-4`}>
            {displayedMatches.map((m, idx) => {
              const isSelected = activeMatch?.id === m.id;
              const isFinished = m.status === 'FINISHED';
              const isInPlay = m.status === 'IN_PLAY';
              const stats = m.google_stats || {};

              const homeShort = getShortTeamName(m.home_team_name, m.home_short_name);
              const awayShort = getShortTeamName(m.away_team_name, m.away_short_name);

              const homeRating = stats.sofascore_home_rating || 7.15;
              const awayRating = stats.sofascore_away_rating || 7.02;

              // Tiros de equipo y tarjetas
              const shotsH = stats.remates_home ?? 11;
              const shotsA = stats.remates_away ?? 9;
              const sotH = stats.remates_arco_home ?? 4;
              const sotA = stats.remates_arco_away ?? 3;
              const yellowH = stats.yellow_cards_home ?? 0;
              const yellowA = stats.yellow_cards_away ?? 0;
              const redH = stats.red_cards_home ?? 0;
              const redA = stats.red_cards_away ?? 0;
              const totalYellow = yellowH + yellowA;
              const totalRed = redH + redA;
              const liveMin = stats.live_minute || (isInPlay ? "En Juego" : "FT");

              // Evaluaciones 1X2
              const get1X2 = (sel: string) =>
                m.evaluations.find(
                  (e) =>
                    e.market_type === '1X2' &&
                    e.selection_code === sel &&
                    e.bookmaker_code === 'DRAFTEA'
                ) ||
                m.evaluations.find((e) => e.market_type === '1X2' && e.selection_code === sel);

              const evHome = get1X2('HOME');
              const evDraw = get1X2('DRAW');
              const evAway = get1X2('AWAY');

              const dateInfo = getRelativeDayInfo(m.kickoff_time);

              // Determinar resultado ganador si el partido ya terminó
              const winningCode =
                isFinished && m.home_score !== undefined && m.away_score !== undefined
                  ? m.home_score > m.away_score
                    ? 'HOME'
                    : m.away_score > m.home_score
                    ? 'AWAY'
                    : 'DRAW'
                  : null;

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.02, 0.25) }}
                  onClick={() => handleSelectMatchRow(m)}
                  className={`glass-card rounded-2xl p-4 sm:p-5 transition-all cursor-pointer border-2 ${
                    isSelected
                      ? 'border-emerald-500/70 bg-emerald-950/20 shadow-xl shadow-emerald-950/50'
                      : isInPlay
                      ? 'border-rose-500/45 hover:border-rose-400/70'
                      : 'border-white/10 hover:border-emerald-500/40'
                  }`}
                >
                  {/* 1. CABECERA DE LA TARJETA INDIVIDUAL (LIGA + ESTADO/HORA) */}
                  <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <span className="text-xs font-extrabold text-slate-200 truncate">
                        {m.competition_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isInPlay ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 text-[11px] font-black">
                          <Radio className="w-3 h-3 text-rose-400 animate-pulse" />
                          <span>EN VIVO · {liveMin}</span>
                        </span>
                      ) : isFinished ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 border border-white/10 text-slate-300 text-[11px] font-extrabold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>FINALIZADO · {dateInfo.label}</span>
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                            dateInfo.tag === 'HOY'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : dateInfo.tag === 'MANANA'
                              ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                              : 'bg-slate-800/80 text-slate-300 border-white/10'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>
                            {dateInfo.label} · {dateInfo.formattedTime}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2. EQUIPOS, ESCUDOS, TARJETAS ROJAS Y MARCADOR EN VIVO/FINAL */}
                  <div className="space-y-3">
                    {/* Fila Equipo Local */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-900/90 border border-white/10 p-1.5 flex items-center justify-center shrink-0 shadow-sm">
                          {m.home_team_logo ? (
                            <img
                              src={m.home_team_logo}
                              alt={m.home_team_name}
                              className="w-6 h-6 object-contain"
                            />
                          ) : (
                            <span className="text-[11px] font-bold text-slate-300">
                              {homeShort.slice(0, 3)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-sm sm:text-base font-extrabold truncate ${
                                isFinished && (m.home_score ?? 0) > (m.away_score ?? 0)
                                  ? 'text-emerald-400'
                                  : 'text-white'
                              }`}
                            >
                              {m.home_team_name}
                            </span>
                            {m.home_rank && (
                              <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded-md border border-white/5">
                                {m.home_rank}
                              </span>
                            )}
                            {/* Indicador visual de Tarjeta Roja en el equipo */}
                            {redH > 0 && (
                              <span
                                title={`${redH} Tarjeta(s) Roja(s)`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-[10px] font-black text-rose-300"
                              >
                                <span className="w-2 h-3 rounded-[2px] bg-rose-500 inline-block" />
                                {redH > 1 && <span>{redH}</span>}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <SofascoreRatingBadge rating={homeRating} />
                        {(isFinished || isInPlay) && (
                          <span
                            className={`w-7 text-right font-mono text-lg font-black ${
                              isInPlay
                                ? 'text-rose-300'
                                : (m.home_score ?? 0) > (m.away_score ?? 0)
                                ? 'text-emerald-400'
                                : 'text-white'
                            }`}
                          >
                            {m.home_score ?? 0}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fila Equipo Visitante */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-900/90 border border-white/10 p-1.5 flex items-center justify-center shrink-0 shadow-sm">
                          {m.away_team_logo ? (
                            <img
                              src={m.away_team_logo}
                              alt={m.away_team_name}
                              className="w-6 h-6 object-contain"
                            />
                          ) : (
                            <span className="text-[11px] font-bold text-slate-300">
                              {awayShort.slice(0, 3)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-sm sm:text-base font-extrabold truncate ${
                                isFinished && (m.away_score ?? 0) > (m.home_score ?? 0)
                                  ? 'text-emerald-400'
                                  : 'text-slate-100'
                              }`}
                            >
                              {m.away_team_name}
                            </span>
                            {m.away_rank && (
                              <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded-md border border-white/5">
                                {m.away_rank}
                              </span>
                            )}
                            {redA > 0 && (
                              <span
                                title={`${redA} Tarjeta(s) Roja(s)`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-[10px] font-black text-rose-300"
                              >
                                <span className="w-2 h-3 rounded-[2px] bg-rose-500 inline-block" />
                                {redA > 1 && <span>{redA}</span>}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <SofascoreRatingBadge rating={awayRating} />
                        {(isFinished || isInPlay) && (
                          <span
                            className={`w-7 text-right font-mono text-lg font-black ${
                              isInPlay
                                ? 'text-rose-300'
                                : (m.away_score ?? 0) > (m.home_score ?? 0)
                                ? 'text-emerald-400'
                                : 'text-white'
                            }`}
                          >
                            {m.away_score ?? 0}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. BARRA RÁPIDA DE TIROS (TOTALES Y A PUERTA) + TARJETAS DISCIPLINARIAS */}
                  <div className="mt-3.5 px-3 py-2 rounded-xl bg-slate-950/70 border border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Crosshair className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>
                        {isFinished || isInPlay ? 'Tiros:' : 'Proy. Tiros:'}{' '}
                        <strong className="text-white font-mono">
                          {shotsH} - {shotsA}
                        </strong>
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-400">
                        A puerta:{' '}
                        <strong className="text-emerald-400 font-mono">
                          {sotH} - {sotA}
                        </strong>
                      </span>
                    </div>

                    {/* Tarjetas Amarillas y Rojas con iconos vectoriales */}
                    {(totalRed > 0 || totalYellow > 0) && (
                      <div className="flex items-center gap-2.5">
                        {totalYellow > 0 && (
                          <span className="inline-flex items-center gap-1 text-amber-300 font-mono font-bold">
                            <span className="w-2.5 h-3.5 rounded-[2px] bg-amber-400 inline-block shadow-xs" />
                            <span>{totalYellow}</span>
                          </span>
                        )}
                        {totalRed > 0 && (
                          <span className="inline-flex items-center gap-1 text-rose-300 font-mono font-bold">
                            <span className="w-2.5 h-3.5 rounded-[2px] bg-rose-500 inline-block shadow-xs" />
                            <span>{totalRed} Roja{totalRed > 1 ? 's' : ''}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 4. BOTONES 1X2 INTERACTIVOS (O RESULTADO OFICIAL SI YA FINALIZÓ) */}
                  {evHome && evDraw && evAway && (
                    <div className="mt-3.5 grid grid-cols-3 gap-2">
                      {[
                        { code: 'HOME', label: `1 · ${homeShort}`, ev: evHome },
                        { code: 'DRAW', label: 'Empate (X)', ev: evDraw },
                        { code: 'AWAY', label: `2 · ${awayShort}`, ev: evAway },
                      ].map(({ code, label, ev }) => {
                        const inSlip = isLegInSlip(m.id, '1X2', code);
                        const isWinner = winningCode === code;
                        const hasEdge =
                          !isFinished &&
                          (ev.expected_value_nominal > 0.02 || ev.model_prob >= 0.55);

                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleLeg({
                                match_id: m.id,
                                market_type: '1X2',
                                selection_code: code,
                                decimal_odds: ev.decimal_odds,
                              });
                            }}
                            className={`px-2.5 py-2 rounded-xl border text-left transition-all flex items-center justify-between gap-1 cursor-pointer ${
                              inSlip
                                ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/25 font-black'
                                : isWinner
                                ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-sm'
                                : hasEdge
                                ? 'bg-emerald-950/45 border-emerald-500/45 hover:border-emerald-400 text-white'
                                : 'bg-slate-900/85 border-white/10 hover:border-white/25 text-slate-200'
                            }`}
                          >
                            <div className="min-w-0">
                              <span
                                className={`text-[10px] font-bold block truncate ${
                                  inSlip
                                    ? 'text-slate-950'
                                    : isWinner
                                    ? 'text-emerald-300 font-black'
                                    : 'text-slate-400'
                                }`}
                              >
                                {label}
                              </span>
                              <span
                                className={`text-[10px] font-mono block ${
                                  inSlip
                                    ? 'text-slate-900 font-extrabold'
                                    : isWinner
                                    ? 'text-emerald-400 font-black'
                                    : 'text-emerald-400/90'
                                }`}
                              >
                                {isWinner
                                  ? 'GANÓ'
                                  : isFinished
                                  ? 'Final'
                                  : `${formatPercent(ev.model_prob)} IA`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span
                                className={`text-xs sm:text-sm font-mono font-black ${
                                  inSlip ? 'text-slate-950' : 'text-emerald-300'
                                }`}
                              >
                                {formatOdds(ev.decimal_odds, oddsFormat)}
                              </span>
                              {inSlip && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 5. PIE DE TARJETA: RESUMEN DE IA + BOTÓN DE ANÁLISIS Y TIROS DE JUGADORES */}
                  <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold min-w-0">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {m.friendly_insight?.recommended_pick || 'Ver proyecciones de jugadores'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectMatchRow(m);
                      }}
                      className="px-3 py-1.5 rounded-xl glass-pill hover:border-emerald-500/50 text-[11px] font-extrabold text-slate-200 hover:text-emerald-300 flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tiros & Análisis IA</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* COLUMNA DERECHA STICKY: SOFASCORE MATCH CENTER (SOLO EN ESCRITORIO NORMAL) */}
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
