import React, { useState } from 'react';
import { motion } from 'motion/react';
import type { MatchSummary, MarketSelectionEvaluation, ParlayLeg } from '../types';
import { formatOdds, getRelativeDayInfo, getShortTeamName, type OddsFormat } from '../utils/oddsFormat';
import {
  ShieldCheck,
  Sparkles,
  Check,
  Plus,
  Info,
} from 'lucide-react';

interface TopPicksViewProps {
  matches: MatchSummary[];
  oddsFormat: OddsFormat;
  parlayLegs: ParlayLeg[];
  onToggleLeg: (leg: ParlayLeg) => void;
}

type PickCategory = 'ALL' | 'SAFE' | 'VALUE' | 'GOALS';

interface EnrichedPick {
  match: MatchSummary;
  evaluation: MarketSelectionEvaluation;
  category: 'SAFE' | 'VALUE' | 'GOALS';
  categoryLabel: string;
  categoryBadgeClass: string;
  pickTitle: string;
  reasonLine: string;
  confidencePct: number;
  confidenceLabel: string;
  scoreRank: number;
}

export const TopPicksView: React.FC<TopPicksViewProps> = ({
  matches,
  oddsFormat,
  parlayLegs,
  onToggleLeg,
}) => {
  const [filterCat, setFilterCat] = useState<PickCategory>('ALL');

  // Solo considerar partidos próximos (SCHEDULED)
  const scheduled = matches.filter((m) => m.status === 'SCHEDULED');

  // Construir catálogo inteligente de jugadas recomendadas
  const allPicks: EnrichedPick[] = [];
  const seenKeys = new Set<string>();

  for (const m of scheduled) {
    const homeShort = getShortTeamName(m.home_team_name, m.home_short_name);
    const awayShort = getShortTeamName(m.away_team_name, m.away_short_name);
    const stats = m.google_stats || {};
    const xgH = stats.xg_home ?? m.home_xg ?? 1.45;
    const xgA = stats.xg_away ?? m.away_xg ?? 1.15;
    const recH = stats.home_record || '6-3-3';
    const recA = stats.away_record || '4-4-4';

    // Preferir cuotas DRAFTEA para mostrar un solo candidato limpio por selección
    const evals = m.evaluations.filter((e) => e.bookmaker_code === 'DRAFTEA');
    const pool = evals.length > 0 ? evals : m.evaluations;

    for (const ev of pool) {
      const uniqueKey = `${m.id}-${ev.market_type}-${ev.selection_code}`;
      if (seenKeys.has(uniqueKey)) continue;

      const probPct = Math.round(ev.model_prob * 100);
      const isGoalsMarket = ev.market_type === 'OVER_UNDER' || ev.market_type === 'BTTS';
      const isHighProb = probPct >= 54;
      const isGoodValue = ev.expected_value_nominal >= 0.02 && probPct >= 38;

      if (!isHighProb && !isGoodValue && !(isGoalsMarket && probPct >= 52)) {
        continue;
      }

      seenKeys.add(uniqueKey);

      let category: 'SAFE' | 'VALUE' | 'GOALS' = 'SAFE';
      let categoryLabel = '🔒 Fija del Día';
      let categoryBadgeClass =
        'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

      if (isGoalsMarket && probPct >= 52) {
        category = 'GOALS';
        categoryLabel = '⚽ Tendencia de Goles';
        categoryBadgeClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      } else if (probPct >= 55) {
        category = 'SAFE';
        categoryLabel = '🔒 Fija del Día';
        categoryBadgeClass =
          'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      } else {
        category = 'VALUE';
        categoryLabel = '💎 Oportunidad de Valor';
        categoryBadgeClass =
          'bg-amber-500/20 text-amber-300 border-amber-500/40';
      }

      // Título humano de la jugada
      let pickTitle = '';
      let reasonLine = '';

      if (ev.market_type === '1X2') {
        if (ev.selection_code === 'HOME') {
          pickTitle = `Gana ${homeShort} (Local)`;
          reasonLine = `${homeShort} llega con récord ${recH} y proyecta ${xgH.toFixed(
            2
          )} goles esperados en casa vs ${xgA.toFixed(2)} de ${awayShort}.`;
        } else if (ev.selection_code === 'AWAY') {
          pickTitle = `Gana ${awayShort} (Visitante)`;
          reasonLine = `${awayShort} supera en forma (${recA}) con proyección ofensiva de ${xgA.toFixed(
            2
          )} xG frente a ${homeShort}.`;
        } else {
          pickTitle = `Empate (${homeShort} vs ${awayShort})`;
          reasonLine = `Duelo muy parejo en fuerzas (${recH} vs ${recA}) con proyecciones cerradas (${xgH.toFixed(
            2
          )} vs ${xgA.toFixed(2)} xG).`;
        }
      } else if (ev.market_type === 'OVER_UNDER') {
        if (ev.selection_code === 'OVER') {
          pickTitle = 'Más de 2.5 Goles en el Partido';
          reasonLine = `Ambos ataques promedian ${(xgH + xgA).toFixed(
            2
          )} goles esperados combinados (${xgH.toFixed(2)} local + ${xgA.toFixed(2)} visita).`;
        } else {
          pickTitle = 'Menos de 2.5 Goles en el Partido';
          reasonLine = `Defensas sólidas: el modelo proyecta solo ${(xgH + xgA).toFixed(
            2
          )} goles totales esperados.`;
        }
      } else if (ev.market_type === 'BTTS') {
        if (ev.selection_code === 'YES') {
          pickTitle = 'Ambos Equipos Anotan: Sí';
          reasonLine = `${homeShort} (${xgH.toFixed(2)} xG) y ${awayShort} (${xgA.toFixed(
            2
          )} xG) tienen alta probabilidad de marcar al menos un gol.`;
        } else {
          pickTitle = 'Ambos Equipos Anotan: No';
          reasonLine = `Alta probabilidad de arco en cero según el perfil defensivo del encuentro.`;
        }
      }

      const confidenceLabel =
        probPct >= 65
          ? 'Confianza Muy Alta'
          : probPct >= 55
          ? 'Confianza Alta'
          : 'Buen Valor / Riesgo Medio';

      const scoreRank = probPct * 1.2 + ev.expected_value_nominal * 100;

      allPicks.push({
        match: m,
        evaluation: ev,
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
  }

  // Ordenar por mayor probabilidad y valor
  allPicks.sort((a, b) => b.scoreRank - a.scoreRank);

  const filteredPicks =
    filterCat === 'ALL'
      ? allPicks.slice(0, 18)
      : allPicks.filter((p) => p.category === filterCat).slice(0, 18);

  const isLegSelected = (matchId: string, marketType: string, selectionCode: string) =>
    parlayLegs.some(
      (l) =>
        l.match_id === matchId &&
        l.market_type === marketType &&
        l.selection_code === selectionCode
    );

  return (
    <div className="space-y-4 pb-28">
      {/* Banner Explicativo Sencillo */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-emerald-500/25">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-extrabold mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SELECCIÓN INTELIGENTE DE APUESTAS</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white">
              Las Mejores Jugadas Recomendadas por la IA
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Clasificadas en español claro según su <strong>probabilidad real de acierto</strong> y cuánto te pagan por cada <strong>$100</strong>.
            </p>
          </div>

          <div className="glass-pill rounded-xl p-2.5 text-[11px] text-slate-300 flex items-start gap-2 max-w-xs shrink-0">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Consejo:</strong> Elige 1 o 2 <em>Fijas del Día</em> para mantener tu riesgo bajo.
            </span>
          </div>
        </div>

        {/* Filtros por Categoría */}
        <div className="flex items-center gap-2 overflow-x-auto pt-3.5 mt-3 border-t border-white/10 no-scrollbar">
          {[
            { id: 'ALL', label: '🔥 Todas las Recomendadas', count: allPicks.length },
            {
              id: 'SAFE',
              label: '🔒 Fijas del Día (Más Seguras)',
              count: allPicks.filter((p) => p.category === 'SAFE').length,
            },
            {
              id: 'GOALS',
              label: '⚽ Tendencia de Goles',
              count: allPicks.filter((p) => p.category === 'GOALS').length,
            },
            {
              id: 'VALUE',
              label: '💎 Oportunidad de Valor (Mejor Pago)',
              count: allPicks.filter((p) => p.category === 'VALUE').length,
            },
          ].map((tab) => {
            const active = filterCat === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterCat(tab.id as PickCategory)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                    : 'glass-pill text-slate-300 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    active ? 'bg-slate-950/20 text-slate-950' : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de Tarjetas Glassy */}
      {filteredPicks.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-slate-400 text-sm">
          No hay jugadas en esta categoría para la liga seleccionada. Prueba seleccionando "Todas" arriba.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPicks.map((item, idx) => {
            const { match, evaluation } = item;
            const dateInfo = getRelativeDayInfo(match.kickoff_time);
            const selected = isLegSelected(
              match.id,
              evaluation.market_type,
              evaluation.selection_code
            );

            const payout100 = Math.round(100 * evaluation.decimal_odds);
            const netProfit100 = payout100 - 100;

            const barColor =
              item.confidencePct >= 62
                ? 'from-emerald-400 to-teal-300'
                : item.confidencePct >= 52
                ? 'from-teal-400 to-cyan-400'
                : 'from-amber-400 to-orange-400';

            return (
              <motion.div
                key={`${match.id}-${evaluation.market_type}-${evaluation.selection_code}-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.025 }}
                className={`glass-card-interactive rounded-2xl p-4 flex flex-col justify-between ${
                  selected ? 'ring-2 ring-emerald-400 border-emerald-400/60' : ''
                }`}
              >
                <div>
                  {/* 1. Cabecera: Liga + Fecha Relativa + Categoría */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-semibold">
                      <span className="text-emerald-400 font-bold">{match.competition_name}</span>
                      <span>•</span>
                      <span
                        className={
                          dateInfo.tag === 'HOY'
                            ? 'text-emerald-300 font-extrabold'
                            : 'text-slate-400'
                        }
                      >
                        {dateInfo.label} {dateInfo.formattedTime}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${item.categoryBadgeClass}`}
                    >
                      {item.categoryLabel}
                    </span>
                  </div>

                  {/* Equipos con escudos grandes */}
                  <div className="flex items-center justify-between gap-2 bg-slate-950/50 rounded-xl p-2.5 border border-white/5 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {match.home_team_logo && (
                        <img
                          src={match.home_team_logo}
                          alt={match.home_team_name}
                          className="w-6 h-6 object-contain shrink-0"
                        />
                      )}
                      <span className="text-xs sm:text-sm font-bold text-white truncate">
                        {match.home_team_name}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 px-1">VS</span>
                    <div className="flex items-center gap-2 min-w-0 justify-end">
                      <span className="text-xs sm:text-sm font-bold text-white truncate text-right">
                        {match.away_team_name}
                      </span>
                      {match.away_team_logo && (
                        <img
                          src={match.away_team_logo}
                          alt={match.away_team_name}
                          className="w-6 h-6 object-contain shrink-0"
                        />
                      )}
                    </div>
                  </div>

                  {/* Jugada Recomendada y Momio */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/60 via-slate-900/80 to-slate-900/80 border border-emerald-500/30 flex items-center justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-bold block">
                        Jugada Recomendada:
                      </span>
                      <span className="text-sm font-black text-white">{item.pickTitle}</span>
                    </div>
                    <div className="text-right shrink-0 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-white/10">
                      <span className="text-[10px] text-slate-400 block">Momio</span>
                      <span className="text-base font-black font-mono text-emerald-400">
                        {formatOdds(evaluation.decimal_odds, oddsFormat)}
                      </span>
                    </div>
                  </div>

                  {/* 1. Nivel de Confianza con Barra de Color */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-200 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Probabilidad IA: <strong className="text-white">{item.confidencePct}%</strong>
                      </span>
                      <span className="text-[11px] font-bold text-emerald-400">
                        {item.confidenceLabel}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/10">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
                        style={{ width: `${Math.min(95, Math.max(20, item.confidencePct))}%` }}
                      />
                    </div>
                  </div>

                  {/* 3. Razón en 1 línea */}
                  <p className="text-xs text-slate-300 leading-relaxed mb-3 bg-white/[0.03] p-2.5 rounded-xl border border-white/5">
                    💡 {item.reasonLine}
                  </p>
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

                  <button
                    onClick={() =>
                      onToggleLeg({
                        match_id: match.id,
                        market_type: evaluation.market_type,
                        selection_code: evaluation.selection_code,
                        decimal_odds: evaluation.decimal_odds,
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
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
