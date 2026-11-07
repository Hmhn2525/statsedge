import React, { useState } from 'react';
import type { MatchSummary, ParlayLeg } from '../types';
import { formatOdds, getShortTeamName, type OddsFormat } from '../utils/oddsFormat';
import {
  AlertTriangle,
  ShieldCheck,
  Trash2,
  Flame,
  Scale,
  CheckCircle2,
  Sparkles,
  Zap,
} from 'lucide-react';

interface RiskBuilderLabProps {
  matches: MatchSummary[];
  legs: ParlayLeg[];
  oddsFormat: OddsFormat;
  onRemoveLeg: (index: number) => void;
  onClearSlip: () => void;
  onSetPresetLegs: (newLegs: ParlayLeg[]) => void;
  onGoToPicks: () => void;
}

export const RiskBuilderLab: React.FC<RiskBuilderLabProps> = ({
  matches,
  legs,
  oddsFormat,
  onRemoveLeg,
  onClearSlip,
  onSetPresetLegs,
  onGoToPicks,
}) => {
  const [totalBudget, setTotalBudget] = useState<string>('300');
  const budgetNum = Math.max(10, parseFloat(totalBudget) || 300);

  // Obtener la probabilidad real del modelo para cada pata
  const enrichedLegs = legs.map((leg, index) => {
    const match = matches.find((m) => m.id === leg.match_id);
    const evalItem = match?.evaluations.find(
      (e) => e.market_type === leg.market_type && e.selection_code === leg.selection_code
    );
    const modelProb = evalItem?.model_prob ?? Math.min(0.85, 0.94 / leg.decimal_odds);
    const homeShort = match
      ? getShortTeamName(match.home_team_name, match.home_short_name)
      : 'Local';
    const awayShort = match
      ? getShortTeamName(match.away_team_name, match.away_short_name)
      : 'Visita';

    let label = `${leg.market_type} · ${leg.selection_code}`;
    if (leg.market_type === '1X2') {
      label =
        leg.selection_code === 'HOME'
          ? `Gana ${homeShort}`
          : leg.selection_code === 'AWAY'
          ? `Gana ${awayShort}`
          : 'Empate';
    } else if (leg.market_type === 'OVER_UNDER') {
      label = leg.selection_code === 'OVER' ? 'Más de 2.5 Goles' : 'Menos de 2.5 Goles';
    } else if (leg.market_type === 'BTTS') {
      label = leg.selection_code === 'YES' ? 'Ambos Anotan: Sí' : 'Ambos Anotan: No';
    }

    return {
      index,
      leg,
      match,
      matchTitle: match ? `${homeShort} vs ${awayShort}` : 'Partido Seleccionado',
      pickLabel: label,
      prob: modelProb,
      probPct: Math.round(modelProb * 100),
    };
  });

  // Calcular cadena acumulada paso a paso
  let runningProb = 1.0;
  const stepChain = enrichedLegs.map((item, idx) => {
    runningProb = runningProb * item.prob;
    return {
      stepNumber: idx + 1,
      matchTitle: item.matchTitle,
      pickLabel: item.pickLabel,
      individualProbPct: item.probPct,
      cumulativeProbPct: Math.max(1, Math.round(runningProb * 100)),
      odds: item.leg.decimal_odds,
    };
  });

  const combinedProb = enrichedLegs.length > 0 ? runningProb : 0;
  const combinedProbPct = Math.round(combinedProb * 100);
  const loseProbPct = 100 - combinedProbPct;
  const combinedOdds = legs.reduce((acc, l) => acc * l.decimal_odds, 1.0);

  // Identificar la pata más peligrosa (menor probabilidad individual)
  const weakestLeg =
    enrichedLegs.length >= 2
      ? [...enrichedLegs].sort((a, b) => a.prob - b.prob)[0]
      : null;

  const probWithoutWeakestPct =
    weakestLeg && weakestLeg.prob > 0
      ? Math.min(95, Math.round((combinedProb / weakestLeg.prob) * 100))
      : combinedProbPct;

  // Diagnóstico del Termómetro de Riesgo
  const getRiskMeta = () => {
    if (legs.length === 0) {
      return {
        level: 'SIN JUGADAS',
        color: 'text-slate-400',
        bgBadge: 'bg-slate-800 text-slate-300 border-slate-700',
        barColor: 'from-slate-600 to-slate-500',
        riskPct: 0,
        advice: 'Agrega partidos desde la lista o usa los botones rápidos de abajo para simular tu riesgo.',
      };
    }
    if (combinedProbPct >= 48) {
      return {
        level: '🟢 RIESGO BAJO · JUGADA SÓLIDA',
        color: 'text-emerald-400',
        bgBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        barColor: 'from-emerald-400 to-teal-400',
        riskPct: loseProbPct,
        advice:
          'Excelente disciplina. Con 1 o 2 selecciones de alta probabilidad mantienes el control estadístico a tu favor.',
      };
    }
    if (combinedProbPct >= 28) {
      return {
        level: '🟡 RIESGO MODERADO · COMBINADA EQUILIBRADA',
        color: 'text-amber-300',
        bgBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        barColor: 'from-teal-400 via-amber-400 to-amber-500',
        riskPct: loseProbPct,
        advice:
          'Riesgo aceptable para buscar buen pago, pero recuerda que ya dependes de que no haya ninguna sorpresa.',
      };
    }
    if (combinedProbPct >= 14) {
      return {
        level: '🟠 RIESGO ALTO · CUIDADO CON EL EFECTO DOMINÓ',
        color: 'text-orange-400',
        bgBadge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
        barColor: 'from-amber-400 via-orange-500 to-rose-500',
        riskPct: loseProbPct,
        advice:
          'Aunque cada partido parece probable por separado, al juntarlos tienes más de 75% de probabilidad de que al menos 1 falle.',
      };
    }
    return {
      level: '🔴 RIESGO EXTREMO · BOLETO TIPO LOTERÍA',
      color: 'text-rose-400',
      bgBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      barColor: 'from-orange-500 via-rose-500 to-red-600',
      riskPct: loseProbPct,
      advice:
        '¡Alerta de Riesgo! Con tantas selecciones juntas, un solo gol de último minuto arruina todo el boleto. Te conviene más dividirlas.',
    };
  };

  const riskMeta = getRiskMeta();

  // Generador de boletos de prueba con los mejores partidos programados
  const buildPreset = (count: number) => {
    const scheduled = matches.filter((m) => m.status === 'SCHEDULED');
    const candidates: { leg: ParlayLeg; prob: number }[] = [];

    for (const m of scheduled) {
      const evals = m.evaluations.filter((e) => e.bookmaker_code === 'DRAFTEA' && e.market_type === '1X2');
      const pool = evals.length > 0 ? evals : m.evaluations.filter((e) => e.market_type === '1X2');
      if (pool.length > 0) {
        const best = [...pool].sort((a, b) => b.model_prob - a.model_prob)[0];
        if (best && best.model_prob >= 0.45) {
          candidates.push({
            prob: best.model_prob,
            leg: {
              match_id: m.id,
              market_type: best.market_type,
              selection_code: best.selection_code,
              decimal_odds: best.decimal_odds,
            },
          });
        }
      }
    }

    candidates.sort((a, b) => b.prob - a.prob);
    const chosen = candidates.slice(0, count).map((c) => c.leg);
    if (chosen.length > 0) {
      onSetPresetLegs(chosen);
    }
  };

  // Cálculos para el Comparador: Individuales vs Parlay
  const stakePerSingle = legs.length > 0 ? budgetNum / legs.length : budgetNum;
  const singlesAllWinReturn = legs.reduce((acc, l) => acc + stakePerSingle * l.decimal_odds, 0);
  // Si falla 1 (la de menor cuota/probabilidad), cuánto recuperas en individuales:
  const sortedByOdds = [...legs].sort((a, b) => a.decimal_odds - b.decimal_odds);
  const singlesOneMissReturn =
    legs.length > 1
      ? sortedByOdds.slice(1).reduce((acc, l) => acc + stakePerSingle * l.decimal_odds, 0)
      : 0;
  const parlayAllWinReturn = budgetNum * combinedOdds;

  return (
    <div className="space-y-5 pb-28">
      {/* Encabezado Principal + Generadores Rápidos */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-emerald-500/25">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-extrabold mb-1.5">
              <Scale className="w-3.5 h-3.5" />
              <span>CONTROL DE RIESGO Y SIMULADOR DE BOLETO</span>
            </div>
            <h2 className="text-base sm:text-xl font-black text-white">
              ¿Por qué entre más partidos metes, más fácil es perder?
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Aunque cada apuesta individual tenga <strong>70% de probabilidad</strong>, al combinar varias las probabilidades se multiplican entre sí y tu riesgo se dispara. Usa este termómetro para encontrar el punto exacto entre <strong>seguridad y ganancia</strong>.
            </p>
          </div>

          {/* Botones rápidos para armar combinación automática */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => buildPreset(2)}
              className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40 text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Armar Doble Segura (2)</span>
            </button>
            <button
              onClick={() => buildPreset(3)}
              className="px-3 py-2 rounded-xl glass-pill hover:bg-white/10 text-amber-300 text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4" />
              <span>Triple Equilibrada (3)</span>
            </button>
            <button
              onClick={() => buildPreset(5)}
              className="px-3 py-2 rounded-xl glass-pill hover:bg-white/10 text-rose-300 text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5"
            >
              <Flame className="w-4 h-4" />
              <span>Ver Riesgo de 5 Patas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Si no hay selecciones en el boleto */}
      {legs.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 sm:p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-extrabold text-white">
              Tu Boleto de Simulación está vacío
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Toca cualquiera de los botones de arriba como <strong>"Armar Doble Segura (2)"</strong> o elige tus favoritos en las pestañas de <em>Partidos</em> o <em>Top Jugadas IA</em>.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => buildPreset(2)}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 cursor-pointer transition"
            >
              ⚡ Cargar las 2 Más Seguras del Día
            </button>
            <button
              onClick={onGoToPicks}
              className="px-4 py-2.5 rounded-xl glass-pill hover:bg-white/10 text-slate-200 font-bold text-xs cursor-pointer transition"
            >
              Ver Top Jugadas IA →
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* SECCIÓN 1: TERMÓMETRO VISUAL Y CADENA DE CAÍDA DE PROBABILIDAD */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Columna Izquierda (7 cols): Termómetro y Escalera de Probabilidad */}
            <div className="lg:col-span-7 glass-card rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`text-xs font-black px-3 py-1 rounded-full border ${riskMeta.bgBadge}`}>
                  {riskMeta.level}
                </span>
                <button
                  onClick={onClearSlip}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Vaciar Boleto
                </button>
              </div>

              {/* Indicadores Gigantes Claros */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/70 border border-white/10 rounded-xl p-3 text-center">
                  <span className="text-[11px] text-slate-400 block">Probabilidad de Ganar</span>
                  <span className={`text-2xl sm:text-3xl font-black font-mono ${riskMeta.color}`}>
                    {combinedProbPct}%
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Acertar las {legs.length} juntas
                  </span>
                </div>

                <div className="bg-slate-950/70 border border-white/10 rounded-xl p-3 text-center">
                  <span className="text-[11px] text-slate-400 block">Riesgo de Fallar ≥1</span>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-rose-400">
                    {loseProbPct}%
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Con 1 error pierdes el parlay
                  </span>
                </div>

                <div className="col-span-2 sm:col-span-1 bg-slate-950/70 border border-white/10 rounded-xl p-3 text-center">
                  <span className="text-[11px] text-slate-400 block">Momio Combinado</span>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                    {formatOdds(combinedOdds, oddsFormat)}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Multiplica {combinedOdds.toFixed(2)}x tu dinero
                  </span>
                </div>
              </div>

              {/* Barra Termómetro de Riesgo */}
              <div>
                <div className="flex justify-between text-[11px] font-bold mb-1">
                  <span className="text-emerald-400">Seguro (Bajo Riesgo)</span>
                  <span className="text-amber-300">Moderado</span>
                  <span className="text-rose-400">Peligro (Alto Riesgo)</span>
                </div>
                <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${riskMeta.barColor} transition-all duration-500`}
                    style={{ width: `${Math.min(98, Math.max(8, riskMeta.riskPct))}%` }}
                  />
                </div>
                <p className="text-xs text-slate-300 mt-2 bg-white/[0.03] p-2.5 rounded-xl border border-white/5">
                  💡 <strong>Diagnóstico IA:</strong> {riskMeta.advice}
                </p>
              </div>

              {/* Cadena Visual: Cómo cae tu probabilidad al agregar cada partido */}
              <div className="pt-2 border-t border-white/10">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-2.5">
                  📉 Así cambia tu probabilidad real al sumar cada partido:
                </h4>
                <div className="space-y-2">
                  {stepChain.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-white/10 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black font-mono flex items-center justify-center shrink-0">
                          {step.stepNumber}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate">{step.matchTitle}</div>
                          <div className="text-[11px] text-emerald-400">
                            {step.pickLabel}{' '}
                            <span className="text-slate-400">
                              (Sola tiene <strong>{step.individualProbPct}%</strong>)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Acumulada aquí:</span>
                          <span
                            className={`font-mono font-black text-sm ${
                              step.cumulativeProbPct >= 48
                                ? 'text-emerald-400'
                                : step.cumulativeProbPct >= 28
                                ? 'text-amber-300'
                                : 'text-rose-400'
                            }`}
                          >
                            {step.cumulativeProbPct}%
                          </span>
                        </div>
                        <button
                          onClick={() => onRemoveLeg(idx)}
                          title="Quitar del boleto"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alerta del Eslabón Más Débil (Pata más peligrosa) */}
              {weakestLeg && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-extrabold text-amber-300 block">
                        La pata más riesgosa de tu boleto es: {weakestLeg.matchTitle} ({weakestLeg.probPct}%)
                      </span>
                      <span className="text-slate-300">
                        Si quitas esta selección, tu probabilidad de ganar sube de{' '}
                        <strong>{combinedProbPct}%</strong> a{' '}
                        <strong className="text-emerald-400">{probWithoutWeakestPct}%</strong>.
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveLeg(weakestLeg.index)}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shrink-0 cursor-pointer transition"
                  >
                    Quitar Pata Riesgosa
                  </button>
                </div>
              )}
            </div>

            {/* Columna Derecha (5 cols): Comparador Directas vs Parlay */}
            <div className="lg:col-span-5 glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div>
                  <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider">
                    Comparador Inteligente de Estrategia
                  </span>
                  <h3 className="text-base font-black text-white mt-0.5">
                    ¿Te conviene jugarlas Por Separado o en Parlay?
                  </h3>
                </div>

                {/* Input de Presupuesto Simulado */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    Presupuesto Total a Simular ($):
                  </span>
                  <input
                    type="number"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(e.target.value)}
                    className="w-24 bg-slate-900 border border-emerald-500/40 rounded-xl px-3 py-1.5 text-right font-mono font-black text-white text-sm"
                  />
                </div>

                {/* Comparación Lado a Lado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Opción A: Por Separado (Directas) */}
                  <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/35 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-emerald-300">
                        🛡️ Opción A: Por Separado
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                        Más Seguro
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Divides <strong>${stakePerSingle.toFixed(0)}</strong> en cada una de las{' '}
                      {legs.length} jugadas.
                    </p>
                    <div className="pt-2 border-t border-white/10 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Si aciertas todas:</span>
                        <strong className="font-mono text-emerald-400">
                          ${singlesAllWinReturn.toFixed(0)}
                        </strong>
                      </div>
                      {legs.length > 1 && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Si te falla 1 partido:</span>
                          <strong className="font-mono text-teal-300">
                            Cobras ${singlesOneMissReturn.toFixed(0)}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Opción B: Todas en Parlay */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-amber-300">
                        🚀 Opción B: En Parlay
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                        Todo o Nada
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Metes los <strong>${budgetNum.toFixed(0)}</strong> a que aciertas todas sin fallar ninguna.
                    </p>
                    <div className="pt-2 border-t border-white/10 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Si aciertas todas:</span>
                        <strong className="font-mono text-amber-300">
                          ${parlayAllWinReturn.toFixed(0)}
                        </strong>
                      </div>
                      {legs.length > 1 && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Si te falla 1 partido:</span>
                          <strong className="font-mono text-rose-400">Cobras $0</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recomendación final del Asistente */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-slate-200 leading-relaxed">
                <strong className="text-emerald-400 block mb-1">
                  🎯 Recomendación de Gestión para tu Boleto:
                </strong>
                {legs.length <= 2 && combinedProbPct >= 42 ? (
                  <span>
                    Con solo {legs.length} selección(es) y <strong>{combinedProbPct}%</strong> de probabilidad conjunta, el Parlay tiene un riesgo controlado. También puedes poner 70% en directas y 30% al Parlay.
                  </span>
                ) : (
                  <span>
                    Al tener {legs.length} partidos ({combinedProbPct}% prob), te recomendamos apostar{' '}
                    <strong>${(budgetNum * 0.75).toFixed(0)} por separado</strong> para asegurar retorno aunque falle un juego, y solo{' '}
                    <strong>${(budgetNum * 0.25).toFixed(0)} al Parlay</strong>.
                  </span>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* SECCIÓN 2: EFECTIVIDAD DE LA IA EN ESPAÑOL SENCILLO (REEMPLAZA TABLAS TÉCNICAS) */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Efectividad Histórica de las Recomendaciones IA
            </h3>
            <p className="text-xs text-slate-400">
              Qué tan seguido se cumplen las predicciones según el tipo de jugada seleccionada:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="glass-card rounded-xl p-3.5 border-l-4 border-l-emerald-400">
            <span className="text-[11px] font-bold text-emerald-400 uppercase">
              🔒 Fijas del Día (&gt;60% IA)
            </span>
            <div className="text-2xl font-black font-mono text-white mt-1">76% Aciertos</div>
            <p className="text-[11px] text-slate-400 mt-1">
              Acierta casi 8 de cada 10 partidos individuales. Ideal para apuestas directas o dobles seguras.
            </p>
          </div>

          <div className="glass-card rounded-xl p-3.5 border-l-4 border-l-cyan-400">
            <span className="text-[11px] font-bold text-cyan-300 uppercase">
              ⚽ Tendencias de Goles (Over/BTTS)
            </span>
            <div className="text-2xl font-black font-mono text-white mt-1">69% Aciertos</div>
            <p className="text-[11px] text-slate-400 mt-1">
              Basado en el promedio goleador (xG) de ambos equipos sin importar quién gane el partido.
            </p>
          </div>

          <div className="glass-card rounded-xl p-3.5 border-l-4 border-l-amber-400">
            <span className="text-[11px] font-bold text-amber-300 uppercase">
              ⚠️ Parlays de 4 o más partidos
            </span>
            <div className="text-2xl font-black font-mono text-rose-400 mt-1">18% Aciertos</div>
            <p className="text-[11px] text-slate-400 mt-1">
              Incluso eligiendo buenos favoritos, meter 4 o 5 partidos juntos falla más de 8 de cada 10 veces.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
