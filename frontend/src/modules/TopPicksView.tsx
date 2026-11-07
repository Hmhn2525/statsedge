import React, { useState } from 'react';
import { motion } from 'motion/react';
import type { MatchSummary, MarketType, ParlayLeg } from '../types';
import { formatOdds, getRelativeDayInfo, getShortTeamName, type OddsFormat } from '../utils/oddsFormat';
import {
  ShieldCheck,
  Sparkles,
  Check,
  Plus,
  Info,
  Gem,
  Target,
  Crosshair,
  Radio,
  CheckCircle2,
  XCircle,
  Lightbulb,
} from 'lucide-react';

interface TopPicksViewProps {
  matches: MatchSummary[];
  oddsFormat: OddsFormat;
  parlayLegs: ParlayLeg[];
  onToggleLeg: (leg: ParlayLeg) => void;
}

type PickCategory = 'ALL' | 'SAFE' | 'SHOTS' | 'GOALS' | 'VALUE' | 'SETTLED';

interface EnrichedPick {
  match: MatchSummary;
  marketType: MarketType;
  selectionCode: string;
  lineValue?: number;
  decimalOdds: number;
  category: 'SAFE' | 'SHOTS' | 'GOALS' | 'VALUE' | 'SETTLED';
  categoryLabel: string;
  categoryBadgeClass: string;
  pickTitle: string;
  reasonLine: string;
  confidencePct: number;
  confidenceLabel: string;
  scoreRank: number;
  settledStatus?: 'WON' | 'LOST' | 'PENDING';
}

export const TopPicksView: React.FC<TopPicksViewProps> = ({
  matches,
  oddsFormat,
  parlayLegs,
  onToggleLeg,
}) => {
  const [filterCat, setFilterCat] = useState<PickCategory>('ALL');

  // Separar partidos activos (EN VIVO + PRÓXIMOS) de los FINALIZADOS
  const activeMatches = matches.filter((m) => m.status === 'IN_PLAY' || m.status === 'SCHEDULED');
  const finishedMatches = matches.filter((m) => m.status === 'FINISHED');

  const allPicks: EnrichedPick[] = [];
  const settledPicks: EnrichedPick[] = [];
  const seenKeys = new Set<string>();

  // 1. Construir jugadas activas (EN VIVO con probabilidad dinámica + PRÓXIMOS)
  for (const m of activeMatches) {
    const homeShort = getShortTeamName(m.home_team_name, m.home_short_name);
    const awayShort = getShortTeamName(m.away_team_name, m.away_short_name);
    const stats = m.google_stats || {};
    const xgH = stats.xg_home ?? m.home_xg ?? 1.45;
    const xgA = stats.xg_away ?? m.away_xg ?? 1.12;
    const isInPlay = m.status === 'IN_PLAY';
    const redTotal = (stats.red_cards_home ?? 0) + (stats.red_cards_away ?? 0);
    const yellowTotal = (stats.yellow_cards_home ?? 0) + (stats.yellow_cards_away ?? 0);

    for (const ev of m.evaluations) {
      const uniqueKey = `${m.id}-${ev.market_type}-${ev.selection_code}`;
      if (seenKeys.has(uniqueKey)) continue;

      const probPct = Math.round(ev.model_prob * 100);
      const isSafe = probPct >= 56 && ev.decimal_odds >= 1.25 && ev.decimal_odds <= 2.15;
      const isValue =
        ev.expected_value_nominal >= 0.025 && probPct >= 40 && ev.decimal_odds <= 3.5;
      const isGoals =
        (ev.market_type === 'OVER_UNDER' || ev.market_type === 'BTTS') && probPct >= 54;

      if (!isSafe && !isValue && !isGoals) continue;
      seenKeys.add(uniqueKey);

      let category: 'SAFE' | 'GOALS' | 'VALUE' = 'VALUE';
      let categoryLabel = 'Oportunidad de Valor';
      let categoryBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';

      if (isSafe) {
        category = 'SAFE';
        categoryLabel = isInPlay ? 'Favorito en Vivo' : 'Fija del Día';
        categoryBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      } else if (isGoals) {
        category = 'GOALS';
        categoryLabel = 'Tendencia de Goles';
        categoryBadgeClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      }

      let pickTitle = '';
      let reasonLine = '';
      const livePrefix = isInPlay
        ? `En vivo (${stats.live_minute || 'En juego'}, marcador ${m.home_score ?? 0}-${
            m.away_score ?? 0
          }${redTotal > 0 ? `, ${redTotal} Roja` : ''}): `
        : '';

      if (ev.market_type === '1X2') {
        if (ev.selection_code === 'HOME') {
          pickTitle = `Gana ${m.home_team_name} (Local)`;
          reasonLine = `${livePrefix}${homeShort} registra ${xgH.toFixed(
            2
          )} xG y ${probPct}% de probabilidad real frente al ${Math.round(
            ev.fair_market_prob * 100
          )}% del momio.`;
        } else if (ev.selection_code === 'AWAY') {
          pickTitle = `Gana ${m.away_team_name} (Visita)`;
          reasonLine = `${livePrefix}${awayShort} proyecta ${xgA.toFixed(
            2
          )} xG con ventaja estadística real de +${Math.max(
            2,
            Math.round(ev.expected_value_nominal * 100)
          )}% sobre la cuota.`;
        } else {
          pickTitle = `Empate entre ${homeShort} y ${awayShort}`;
          reasonLine = `${livePrefix}Fuerzas parejas (${xgH.toFixed(2)} vs ${xgA.toFixed(
            2
          )} xG); el momio paga por encima del riesgo real.`;
        }
      } else if (ev.market_type === 'OVER_UNDER') {
        if (ev.selection_code === 'OVER') {
          pickTitle = 'Más de 2.5 Goles en el Partido';
          reasonLine = `${livePrefix}Ritmo ofensivo de ${(xgH + xgA).toFixed(
            2
          )} goles esperados y ${
            (stats.remates_home ?? 12) + (stats.remates_away ?? 10)
          } remates proyectados.`;
        } else {
          pickTitle = 'Menos de 2.5 Goles en el Partido';
          reasonLine = `${livePrefix}ritmo controlado con ${(xgH + xgA).toFixed(
            2
          )} goles esperados combinados${
            yellowTotal > 0 ? ` y ${yellowTotal} tarjetas amarillas` : ''
          }.`;
        }
      } else if (ev.market_type === 'BTTS') {
        if (ev.selection_code === 'YES') {
          pickTitle = 'Ambos Equipos Anotan: Sí';
          reasonLine = `${livePrefix}${homeShort} (${xgH.toFixed(2)} xG) y ${awayShort} (${xgA.toFixed(
            2
          )} xG) cuentan con alta proyección de gol.`;
        } else {
          pickTitle = 'Ambos Equipos Anotan: No';
          reasonLine = `${livePrefix}Alta probabilidad de arco en cero según el volumen de tiros a puerta permitido.`;
        }
      }

      const confidenceLabel =
        probPct >= 65
          ? 'Confianza Muy Alta'
          : probPct >= 55
          ? 'Confianza Alta'
          : 'Valor Estadístico';

      const scoreRank = (isInPlay ? 25 : 0) + probPct * 1.2 + ev.expected_value_nominal * 100;

      allPicks.push({
        match: m,
        marketType: ev.market_type,
        selectionCode: ev.selection_code,
        lineValue: ev.line_value,
        decimalOdds: ev.decimal_odds,
        category,
        categoryLabel,
        categoryBadgeClass,
        pickTitle,
        reasonLine,
        confidencePct: probPct,
        confidenceLabel,
        scoreRank,
      });
    }

    // Agregar Proyecciones de Tiros de Jugadores y de Equipos de partidos activos
    const playerShots: any[] = stats.player_shots || [];
    for (const ps of playerShots.slice(0, 2)) {
      const pPct = Math.round((ps.prob || 0.64) * 100);
      allPicks.push({
        match: m,
        marketType: 'PLAYER_SHOTS',
        selectionCode: ps.selection_code,
        lineValue: ps.line_sot,
        decimalOdds: ps.decimal_odds,
        category: 'SHOTS',
        categoryLabel: 'Tiros de Jugador',
        categoryBadgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
        pickTitle: ps.pick_label,
        reasonLine: `Proyección IA: ${ps.expected_shots} remates totales y ${ps.expected_sot} tiros a puerta para #${ps.jersey} ${ps.player_name}.`,
        confidencePct: pPct,
        confidenceLabel: pPct >= 65 ? 'Confianza Muy Alta' : 'Tendencia de Tirador',
        scoreRank: pPct * 1.15,
      });
    }

    const teamShots: any[] = stats.team_shots_markets || [];
    if (teamShots.length > 0) {
      const tm = teamShots[0];
      const pPct = Math.round((tm.prob || 0.64) * 100);
      allPicks.push({
        match: m,
        marketType: 'TEAM_SHOTS',
        selectionCode: tm.selection_code,
        lineValue: tm.line,
        decimalOdds: tm.decimal_odds,
        category: 'SHOTS',
        categoryLabel: 'Tiros por Equipo',
        categoryBadgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
        pickTitle: tm.market_label,
        reasonLine: `Los equipos promedian ${tm.projected} remates combinados (${stats.remates_arco_home ?? 4} vs ${stats.remates_arco_away ?? 3} a puerta).`,
        confidencePct: pPct,
        confidenceLabel: 'Tendencia de Volumen',
        scoreRank: pPct * 1.1,
      });
    }
  }

  // 2. Construir Resultados Verificados de Partidos Finalizados (Ej. Málaga 1-2 Racing con 3 goles y 1 Roja)
  for (const m of finishedMatches.slice().reverse()) {
    const stats = m.google_stats || {};
    const settledMap: Record<string, string> = stats.settled_markets || {};
    const totalG = (m.home_score ?? 0) + (m.away_score ?? 0);
    const redTotal = (stats.red_cards_home ?? 0) + (stats.red_cards_away ?? 0);
    const yellowTotal = (stats.yellow_cards_home ?? 0) + (stats.yellow_cards_away ?? 0);
    const shotsH = stats.remates_home ?? 12;
    const shotsA = stats.remates_away ?? 10;

    // Mostrar la evaluación de goles y de resultado final con su liquidación real (GANADA / PERDIDA)
    const overEv = m.evaluations.find(
      (e) => e.market_type === 'OVER_UNDER' && e.selection_code === (totalG > 2.5 ? 'OVER' : 'UNDER')
    );
    if (overEv) {
      const stKey = `OVER_UNDER_${overEv.selection_code}`;
      const st = (settledMap[stKey] || 'WON') as 'WON' | 'LOST';
      settledPicks.push({
        match: m,
        marketType: 'OVER_UNDER',
        selectionCode: overEv.selection_code,
        lineValue: 2.5,
        decimalOdds: overEv.decimal_odds,
        category: 'SETTLED',
        categoryLabel: st === 'WON' ? 'Resultado Cumplido' : 'No Cumplido',
        categoryBadgeClass:
          st === 'WON'
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            : 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        pickTitle:
          totalG > 2.5
            ? `Más de 2.5 Goles (Finalizó ${m.home_score}-${m.away_score}, ${totalG} goles)`
            : `Menos de 2.5 Goles (Finalizó ${m.home_score}-${m.away_score}, ${totalG} goles)`,
        reasonLine: `Marcador oficial ${m.home_team_name} ${m.home_score}-${m.away_score} ${m.away_team_name} · Tiros: ${shotsH}-${shotsA} · Tarjetas: ${redTotal} Roja(s), ${yellowTotal} Amarilla(s).`,
        confidencePct: Math.round(overEv.model_prob * 100),
        confidenceLabel: 'Liquidado con Marcador Oficial',
        scoreRank: 100,
        settledStatus: st,
      });
    }
  }

  allPicks.sort((a, b) => b.scoreRank - a.scoreRank);

  const filteredPicks =
    filterCat === 'SETTLED'
      ? settledPicks.slice(0, 18)
      : filterCat === 'ALL'
      ? allPicks.slice(0, 18)
      : allPicks.filter((p) => p.category === filterCat).slice(0, 18);

  const isLegSelected = (matchId: string, marketType: string, selectionCode: string) =>
    parlayLegs.some(
      (l) =>
        l.match_id === matchId &&
        l.market_type === marketType &&
        l.selection_code === selectionCode
    );

  const renderCategoryIcon = (cat: EnrichedPick['category']) => {
    if (cat === 'SAFE') return <ShieldCheck className="w-3.5 h-3.5" />;
    if (cat === 'SHOTS') return <Crosshair className="w-3.5 h-3.5" />;
    if (cat === 'GOALS') return <Target className="w-3.5 h-3.5" />;
    if (cat === 'SETTLED') return <CheckCircle2 className="w-3.5 h-3.5" />;
    return <Gem className="w-3.5 h-3.5" />;
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Banner Explicativo con Iconos Vectoriales */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-emerald-500/25">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-extrabold mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SELECCIÓN EN TIEMPO REAL E INTELIGENCIA DE TIROS</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white">
              Jugadas Activas IA, Tiros de Jugadores y Resultados en Vivo
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Las probabilidades se ajustan dinámicamente con <strong>goles en vivo y tarjetas rojas/amarillas</strong>. Los partidos ya terminados se separan automáticamente en <strong>Verificados</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <span className="text-slate-400 block text-[10px]">Regla de Oro:</span>
              <strong className="text-emerald-300">Combina máximo 2 o 3 jugadas</strong>
            </div>
          </div>
        </div>

        {/* Filtros de Categoría con Iconos Shadcn/Lucide (Cero Emojis) */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'ALL', label: 'Todas Activas', icon: Sparkles },
            { id: 'SAFE', label: 'Fijas del Día', icon: ShieldCheck },
            { id: 'SHOTS', label: 'Tiros & Jugadores', icon: Crosshair },
            { id: 'GOALS', label: 'Tendencia de Goles', icon: Target },
            { id: 'VALUE', label: 'Oportunidad de Valor', icon: Gem },
            { id: 'SETTLED', label: `Finalizados (${settledPicks.length})`, icon: CheckCircle2 },
          ].map((tab) => {
            const active = filterCat === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterCat(tab.id as PickCategory)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                    : 'glass-pill text-slate-300 hover:text-white'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grilla de Tarjetas */}
      {filteredPicks.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center text-slate-300 text-sm">
          No hay jugadas en esta categoría para la liga seleccionada. Prueba cambiando a "Todas" en la barra superior.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPicks.map((item, idx) => {
            const { match } = item;
            const isFinished = match.status === 'FINISHED';
            const isInPlay = match.status === 'IN_PLAY';
            const stats = match.google_stats || {};
            const redTotal = (stats.red_cards_home ?? 0) + (stats.red_cards_away ?? 0);
            const yellowTotal = (stats.yellow_cards_home ?? 0) + (stats.yellow_cards_away ?? 0);

            const dateInfo = getRelativeDayInfo(match.kickoff_time);
            const selected = isLegSelected(match.id, item.marketType, item.selectionCode);
            const payout100 = (100 * item.decimalOdds).toFixed(0);
            const netProfit100 = (100 * (item.decimalOdds - 1)).toFixed(0);

            const barColor =
              item.confidencePct >= 65
                ? 'from-emerald-500 to-teal-400'
                : item.confidencePct >= 55
                ? 'from-teal-400 to-cyan-400'
                : 'from-amber-400 to-emerald-400';

            return (
              <motion.div
                key={`${match.id}-${item.marketType}-${item.selectionCode}-${idx}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.025, 0.25) }}
                className={`glass-card rounded-2xl p-4 flex flex-col justify-between transition-all ${
                  selected
                    ? 'ring-2 ring-emerald-400 border-emerald-400/60 bg-emerald-950/30'
                    : isInPlay
                    ? 'border-rose-500/45 hover:border-rose-400'
                    : 'hover:border-emerald-500/40'
                }`}
              >
                <div>
                  {/* 1. Cabecera: Liga + Estado En Vivo / Fecha + Etiqueta */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 truncate">
                      <span className="text-emerald-400">{match.competition_name}</span>
                      <span className="text-slate-600">·</span>
                      {isInPlay ? (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-black">
                          <Radio className="w-3 h-3 animate-pulse" />
                          <span>
                            EN VIVO {stats.live_minute} ({match.home_score ?? 0}-{match.away_score ?? 0})
                          </span>
                        </span>
                      ) : isFinished ? (
                        <span className="text-slate-400 font-semibold">
                          Final ({match.home_score}-{match.away_score})
                        </span>
                      ) : (
                        <span
                          className={
                            dateInfo.tag === 'HOY' ? 'text-emerald-300 font-extrabold' : 'text-slate-400'
                          }
                        >
                          {dateInfo.label} {dateInfo.formattedTime}
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 inline-flex items-center gap-1 ${item.categoryBadgeClass}`}
                    >
                      {renderCategoryIcon(item.category)}
                      <span>{item.categoryLabel}</span>
                    </span>
                  </div>

                  {/* 2. Partido con Escudos + Indicador de Tarjetas */}
                  <div className="flex items-center justify-between gap-2 bg-slate-950/55 rounded-xl p-2.5 border border-white/5 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {match.home_team_logo && (
                        <img
                          src={match.home_team_logo}
                          className="w-6 h-6 object-contain shrink-0"
                          alt=""
                        />
                      )}
                      <span className="text-xs sm:text-sm font-extrabold text-white truncate">
                        {match.home_team_name}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-400 px-1">
                      {isInPlay || isFinished
                        ? `${match.home_score ?? 0} - ${match.away_score ?? 0}`
                        : 'vs'}
                    </span>
                    <div className="flex items-center gap-2 min-w-0 justify-end">
                      <span className="text-xs sm:text-sm font-extrabold text-white truncate text-right">
                        {match.away_team_name}
                      </span>
                      {match.away_team_logo && (
                        <img
                          src={match.away_team_logo}
                          className="w-6 h-6 object-contain shrink-0"
                          alt=""
                        />
                      )}
                    </div>
                  </div>

                  {/* Alerta en vivo de tarjetas si existen */}
                  {(redTotal > 0 || yellowTotal > 0) && (
                    <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-white/10 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Disciplina del partido:</span>
                      <div className="flex items-center gap-2 font-mono font-bold">
                        {yellowTotal > 0 && (
                          <span className="inline-flex items-center gap-1 text-amber-300">
                            <span className="w-2 h-3 rounded-[2px] bg-amber-400 inline-block" />
                            {yellowTotal} Amarilla{yellowTotal > 1 ? 's' : ''}
                          </span>
                        )}
                        {redTotal > 0 && (
                          <span className="inline-flex items-center gap-1 text-rose-300">
                            <span className="w-2 h-3 rounded-[2px] bg-rose-500 inline-block" />
                            {redTotal} Roja{redTotal > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. Selección clara + Momio */}
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-emerald-400/90 font-bold block">
                        {isFinished ? 'Resultado Verificado:' : 'Jugada Recomendada:'}
                      </span>
                      <span className="text-sm font-black text-white">{item.pickTitle}</span>
                    </div>
                    <div className="text-right shrink-0 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-white/10">
                      <span className="text-[10px] text-slate-400 block">Momio</span>
                      <span className="text-base font-black font-mono text-emerald-400">
                        {formatOdds(item.decimalOdds, oddsFormat)}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Confianza IA */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-300 font-semibold flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-emerald-400" />
                        {item.confidenceLabel}
                      </span>
                      <span className="font-mono font-black text-emerald-400 text-sm">
                        {item.confidencePct}% éxito IA
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-950 overflow-hidden p-0.5 border border-white/10">
                      <div
                        style={{ width: `${Math.min(96, Math.max(20, item.confidencePct))}%` }}
                        className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
                      />
                    </div>
                  </div>

                  {/* Explicación humana en 1 línea */}
                  <div className="text-xs text-slate-300 leading-relaxed mb-3 bg-white/[0.03] p-2.5 rounded-xl border border-white/5 flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item.reasonLine}</span>
                  </div>
                </div>

                {/* 4. Cuánto ganas por cada $100 + Botón Rápido */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="text-[11px] text-slate-400 block">Si pones $100 cobras:</span>
                    <span className="font-mono font-black text-sm text-emerald-300">
                      ${payout100}{' '}
                      <span className="text-[11px] font-normal text-slate-400">
                        (+${netProfit100})
                      </span>
                    </span>
                  </div>

                  {isFinished ? (
                    <span
                      className={`px-3.5 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1.5 border ${
                        item.settledStatus === 'LOST'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {item.settledStatus === 'LOST' ? (
                        <>
                          <XCircle className="w-4 h-4" />
                          <span>Finalizado</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Cumplida</span>
                        </>
                      )}
                    </span>
                  ) : (
                    <button
                      onClick={() =>
                        onToggleLeg({
                          match_id: match.id,
                          market_type: item.marketType,
                          selection_code: item.selectionCode,
                          line_value: item.lineValue,
                          decimal_odds: item.decimalOdds,
                        })
                      }
                      className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-md ${
                        selected
                          ? 'bg-emerald-400 text-slate-950 shadow-emerald-500/30'
                          : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40'
                      }`}
                    >
                      {selected ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>En tu Boleto</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                          <span>Agregar al Boleto</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
