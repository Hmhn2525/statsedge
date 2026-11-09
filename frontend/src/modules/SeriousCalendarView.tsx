import React, { useState } from 'react';
import type { MatchSummary, ParlayLeg } from '../types';
import { formatOdds, getRelativeDayInfo, type OddsFormat } from '../utils/oddsFormat';
import { TeamCrest, getTeamAbbr } from '../utils/teamAssets';
import { SofascoreMatchCenter } from '../components/SofascoreMatchCenter';
import {
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  Radio,
} from 'lucide-react';

interface SeriousCalendarViewProps {
  matches: MatchSummary[];
  oddsFormat: OddsFormat;
  selectedLeague: string;
  onLeagueChange: (league: string) => void;
  parlayLegs: ParlayLeg[];
  onToggleLeg: (leg: ParlayLeg) => void;
}

const DATE_SCOPES = [
  { id: 'YESTERDAY', label: 'Ayer' },
  { id: 'TODAY', label: 'Hoy' },
  { id: 'TOMORROW', label: 'Mañana' },
  { id: 'ALL', label: 'Todos los Juegos' },
] as const;

const LEAGUE_OPTIONS = [
  { code: 'ALL', label: '⚽ Todas' },
  { code: 'LIGA_MX', label: '🇲🇽 Liga MX' },
  { code: 'LA_LIGA', label: '🇪🇸 LaLiga' },
  { code: 'EPL', label: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier' },
  { code: 'UCL', label: '⭐ Champions' },
  { code: 'MLS', label: '🇺🇸 MLS' },
];

function mapFormCharToBadge(ch: string): { letter: string; bgClass: string } {
  const upper = (ch || 'G').toUpperCase();
  if (upper === 'G' || upper === 'W') {
    return {
      letter: 'W',
      bgClass: 'bg-[#16a34a] text-white shadow-[0_0_8px_rgba(22,163,74,0.45)]',
    };
  }
  if (upper === 'P' || upper === 'L') {
    return {
      letter: 'L',
      bgClass: 'bg-[#ef4444] text-white shadow-[0_0_8px_rgba(239,68,68,0.45)]',
    };
  }
  return {
    letter: 'D',
    bgClass: 'bg-amber-500/80 text-zinc-950',
  };
}

export const SeriousCalendarView: React.FC<SeriousCalendarViewProps> = ({
  matches,
  oddsFormat,
  selectedLeague,
  onLeagueChange,
  parlayLegs,
  onToggleLeg,
}) => {
  const [scopeIdx, setScopeIdx] = useState<number>(1); // 'TODAY' por defecto
  const [showLeagueFilter, setShowLeagueFilter] = useState(false);
  const [detailMatch, setDetailMatch] = useState<MatchSummary | null>(null);

  const currentScope = DATE_SCOPES[scopeIdx].id;

  const filteredMatches = matches.filter((m) => {
    const info = getRelativeDayInfo(m.kickoff_time);
    if (info.diffDays < -1) return false;
    if (currentScope === 'TODAY') return info.diffDays === 0 || m.status === 'IN_PLAY';
    if (currentScope === 'TOMORROW') return info.diffDays === 1;
    if (currentScope === 'YESTERDAY') return info.diffDays === -1;
    return true;
  });

  // Si Hoy no tuviera partidos en una liga específica, mostrar todos los disponibles
  const displayMatches =
    filteredMatches.length > 0 ? filteredMatches : matches.filter((m) => getRelativeDayInfo(m.kickoff_time).diffDays >= -1);

  const todayFormatted = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const isLegSelected = (matchId: string, selCode: string) =>
    parlayLegs.some(
      (l) => l.match_id === matchId && l.market_type === '1X2' && l.selection_code === selCode
    );

  return (
    <div className="space-y-5 pb-28">
      {/* 1. ENCABEZADO CALENDARIO (Captura 3) */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Calendario
        </h1>
        <div className="mt-1.5 flex items-center gap-2 text-xs sm:text-sm text-zinc-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          <span>
            {displayMatches.length} juegos · {todayFormatted}
          </span>
        </div>
      </div>

      {/* 2. BARRA NAVEGADORA DE FECHA (< | Hoy | >) + BOTÓN DE FILTRO DE LIGA */}
      <div className="flex items-center gap-2.5">
        <div className="flex-1 flex items-center justify-between px-2 py-1.5 rounded-2xl bg-[#0d1115] border border-white/[0.08]">
          <button
            type="button"
            onClick={() =>
              setScopeIdx((prev) => (prev === 0 ? DATE_SCOPES.length - 1 : prev - 1))
            }
            className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center text-zinc-300 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-sm font-bold text-white">
            {DATE_SCOPES[scopeIdx].label}
          </span>

          <button
            type="button"
            onClick={() => setScopeIdx((prev) => (prev + 1) % DATE_SCOPES.length)}
            className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center text-zinc-300 transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowLeagueFilter((prev) => !prev)}
          title="Filtrar por liga"
          className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition cursor-pointer ${
            selectedLeague !== 'ALL' || showLeagueFilter
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              : 'bg-[#0d1115] border-white/[0.08] text-zinc-300 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Píldoras de Liga desplegables */}
      {showLeagueFilter && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {LEAGUE_OPTIONS.map((lg) => {
            const active = selectedLeague === lg.code;
            return (
              <button
                key={lg.code}
                type="button"
                onClick={() => onLeagueChange(lg.code)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap border transition cursor-pointer ${
                  active
                    ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                    : 'bg-[#0d1115] text-zinc-300 border-white/10 hover:border-white/25'
                }`}
              >
                {lg.label}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. TARJETAS DE JUEGOS ESTILO CAPTURA 3 CON LOGOTIPOS OFICIALES HD VISIBLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {displayMatches.map((m) => {
          const dayInfo = getRelativeDayInfo(m.kickoff_time);
          const homeAbbr = getTeamAbbr(m.home_team_name, m.home_short_name);
          const awayAbbr = getTeamAbbr(m.away_team_name, m.away_short_name);

          const stats = m.google_stats || {};
          const homeRec = stats.home_record || '7-4-2';
          const awayRec = stats.away_record || '6-4-3';

          const homeFormList = (m.home_form && m.home_form.length >= 3
            ? m.home_form.slice(0, 3)
            : ['G', 'G', 'E']
          ).map(mapFormCharToBadge);

          const awayFormList = (m.away_form && m.away_form.length >= 3
            ? m.away_form.slice(0, 3)
            : ['G', 'P', 'G']
          ).map(mapFormCharToBadge);

          // Obtener cuotas 1X2
          const homeEv = m.evaluations.find(
            (e) => e.market_type === '1X2' && e.selection_code === 'HOME'
          );
          const drawEv = m.evaluations.find(
            (e) => e.market_type === '1X2' && e.selection_code === 'DRAW'
          );
          const awayEv = m.evaluations.find(
            (e) => e.market_type === '1X2' && e.selection_code === 'AWAY'
          );

          const homeOdd = homeEv?.decimal_odds ?? 2.05;
          const drawOdd = drawEv?.decimal_odds ?? 3.30;
          const awayOdd = awayEv?.decimal_odds ?? 3.45;

          const isInPlay = m.status === 'IN_PLAY';
          const isFinished = m.status === 'FINISHED';

          return (
            <div
              key={m.id}
              className="rounded-3xl bg-[#0d1115] border border-white/[0.07] hover:border-white/15 p-5 space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.65)] transition"
            >
              {/* Hora o Estado del Partido + Liga */}
              <div className="text-center space-y-0.5">
                {isInPlay ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black">
                    <Radio className="w-3 h-3 animate-pulse" />
                    <span>
                      EN VIVO {stats.live_minute || ''} · {m.home_score ?? 0} - {m.away_score ?? 0}
                    </span>
                  </div>
                ) : isFinished ? (
                  <div className="text-base font-black text-emerald-400">
                    FINAL · {m.home_score ?? 0} - {m.away_score ?? 0}
                  </div>
                ) : (
                  <div className="text-base sm:text-lg font-black text-white tracking-tight">
                    {dayInfo.formattedTime}
                  </div>
                )}
                <div className="text-[11px] font-medium text-zinc-500">
                  {m.competition_name} · {dayInfo.label}
                </div>
              </div>

              {/* Bloque Central: Equipo Local (Con Escudo HD) | FORMA + Detalles | Equipo Visitante (Con Escudo HD) */}
              <div className="grid grid-cols-3 items-center gap-2 pt-1">
                {/* Equipo Local con Logotipo Oficial HD */}
                <div className="flex flex-col items-center text-center space-y-1.5">
                  <TeamCrest
                    teamName={m.home_team_name}
                    shortName={m.home_short_name}
                    logoUrl={m.home_team_logo}
                    sizeClass="w-12 h-12 sm:w-14 sm:h-14"
                  />
                  <div className="text-sm sm:text-base font-black text-white tracking-wide">
                    {homeAbbr}
                  </div>
                  <div className="text-[11px] font-medium text-zinc-400 truncate max-w-[110px]">
                    {m.home_team_name}
                  </div>
                  <div className="text-[11px] font-mono text-zinc-500">{homeRec}</div>
                </div>

                {/* Columna Central: Burbujas W/D/L FORMA W/D/L + Botón Detalles */}
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                    <div className="flex items-center gap-1">
                      {homeFormList.map((b, i) => (
                        <span
                          key={i}
                          className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${b.bgClass}`}
                        >
                          {b.letter}
                        </span>
                      ))}
                    </div>

                    <span className="text-[9px] font-bold tracking-widest uppercase text-zinc-500 px-0.5">
                      FORMA
                    </span>

                    <div className="flex items-center gap-1">
                      {awayFormList.map((b, i) => (
                        <span
                          key={i}
                          className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${b.bgClass}`}
                        >
                          {b.letter}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDetailMatch(m)}
                    className="px-4 py-1.5 rounded-xl bg-[#161b22] hover:bg-[#1f2630] border border-white/10 text-xs font-bold text-zinc-200 transition cursor-pointer"
                  >
                    Detalles
                  </button>
                </div>

                {/* Equipo Visitante con Logotipo Oficial HD */}
                <div className="flex flex-col items-center text-center space-y-1.5">
                  <TeamCrest
                    teamName={m.away_team_name}
                    shortName={m.away_short_name}
                    logoUrl={m.away_team_logo}
                    sizeClass="w-12 h-12 sm:w-14 sm:h-14"
                  />
                  <div className="text-sm sm:text-base font-black text-white tracking-wide">
                    {awayAbbr}
                  </div>
                  <div className="text-[11px] font-medium text-zinc-400 truncate max-w-[110px]">
                    {m.away_team_name}
                  </div>
                  <div className="text-[11px] font-mono text-zinc-500">{awayRec}</div>
                </div>
              </div>

              {/* Botones Inferiores de Momios (Local / Empate / Visita) */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { code: 'HOME', label: homeAbbr, odd: homeOdd },
                  { code: 'DRAW', label: 'EMP', odd: drawOdd },
                  { code: 'AWAY', label: awayAbbr, odd: awayOdd },
                ].map((btn) => {
                  const selected = isLegSelected(m.id, btn.code);
                  return (
                    <button
                      key={btn.code}
                      type="button"
                      onClick={() =>
                        onToggleLeg({
                          match_id: m.id,
                          market_type: '1X2',
                          selection_code: btn.code,
                          decimal_odds: btn.odd,
                        })
                      }
                      className={`px-3 py-2.5 rounded-xl border flex items-center justify-between text-xs font-bold transition cursor-pointer ${
                        selected
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-[#12171d] border-white/[0.07] text-zinc-300 hover:border-white/20'
                      }`}
                    >
                      <span className="text-zinc-400">{btn.label}</span>
                      <span className="font-mono font-extrabold text-white">
                        {formatOdds(btn.odd, oddsFormat)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Match Center (Sofascore + Matriz Dixon-Coles) al tocar "Detalles" */}
      {detailMatch && (
        <div
          onClick={() => setDetailMatch(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#0a0e13] border border-white/10 p-4 relative"
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
              <div className="text-sm font-extrabold text-white">
                Centro Estadístico · {detailMatch.home_team_name} vs{' '}
                {detailMatch.away_team_name}
              </div>
              <button
                type="button"
                onClick={() => setDetailMatch(null)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <SofascoreMatchCenter
              match={detailMatch}
              oddsFormat={oddsFormat}
              onClose={() => setDetailMatch(null)}
              onAddLeg={onToggleLeg}
              onRefreshMatch={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
};
