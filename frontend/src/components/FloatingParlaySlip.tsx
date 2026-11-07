import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { ParlayLeg, MatchSummary } from '../types';
import { formatOdds, type OddsFormat } from '../utils/oddsFormat';
import { ChevronUp, ChevronDown, Trash2, Scale, ShieldAlert } from 'lucide-react';

interface FloatingParlaySlipProps {
  legs: ParlayLeg[];
  matches: MatchSummary[];
  oddsFormat: OddsFormat;
  onRemoveLeg: (index: number) => void;
  onClearSlip: () => void;
  onOpenRiskLab: () => void;
  isMobileSim?: boolean;
}

export const FloatingParlaySlip: React.FC<FloatingParlaySlipProps> = ({
  legs,
  matches,
  oddsFormat,
  onRemoveLeg,
  onClearSlip,
  onOpenRiskLab,
  isMobileSim = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [simulatedStake, setSimulatedStake] = useState('100');

  if (legs.length === 0) return null;

  const combinedDecimal = legs.reduce((acc, leg) => acc * leg.decimal_odds, 1.0);
  const stakeNum = parseFloat(simulatedStake) || 100;
  const potentialPayout = stakeNum * combinedDecimal;

  const matchCounts: Record<string, number> = {};
  legs.forEach((l) => {
    matchCounts[l.match_id] = (matchCounts[l.match_id] || 0) + 1;
  });
  const hasSgp = Object.values(matchCounts).some((count) => count > 1);

  // Probabilidad real acumulada usando el modelo IA
  const rawJointProb = legs.reduce((acc, l) => {
    const match = matches.find((m) => m.id === l.match_id);
    const ev = match?.evaluations.find(
      (e) => e.market_type === l.market_type && e.selection_code === l.selection_code
    );
    const prob = ev ? ev.model_prob : Math.min(0.88, 0.94 / l.decimal_odds);
    return acc * prob;
  }, 1.0);

  const jointProbPct = Math.round(Math.min(0.95, hasSgp ? rawJointProb * 1.08 : rawJointProb) * 100);

  const riskBadge =
    jointProbPct >= 50
      ? { label: '🟢 Riesgo Bajo', classes: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' }
      : jointProbPct >= 30
      ? { label: '🟡 Moderado', classes: 'bg-amber-500/20 text-amber-300 border-amber-500/40' }
      : jointProbPct >= 15
      ? { label: '🟠 Riesgo Alto', classes: 'bg-orange-500/20 text-orange-300 border-orange-500/40' }
      : { label: '🔴 Muy Alto', classes: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`${
        isMobileSim ? 'absolute' : 'fixed'
      } bottom-16 sm:bottom-16 left-0 right-0 z-40 max-w-lg mx-auto px-3 sm:px-4`}
    >
      <div className="bg-[#0b121a] border-2 border-emerald-500/80 rounded-2xl shadow-2xl shadow-black/90 overflow-hidden">
        {/* BARRA COMPACTA */}
        <div
          onClick={() => setExpanded(!expanded)}
          className="p-3 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-900 flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-sm shadow-md shadow-emerald-500/30">
              {legs.length}
            </div>
            <div>
              <div className="text-xs font-extrabold text-white flex items-center gap-1.5 flex-wrap">
                <span>Mi Boleto ({legs.length} {legs.length === 1 ? 'Jugada' : 'Patas'})</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${riskBadge.classes}`}>
                  {riskBadge.label} ({jointProbPct}% éxito)
                </span>
              </div>
              <div className="text-[11px] text-emerald-400 font-mono font-bold mt-0.5">
                Momio: {formatOdds(combinedDecimal, oddsFormat)} · $100 pagan{' '}
                <span className="text-white">${(100 * combinedDecimal).toFixed(0)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenRiskLab();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black transition cursor-pointer shadow-md"
            >
              Ver Riesgo
            </button>
            {expanded ? (
              <ChevronDown className="w-5 h-5 text-emerald-400" />
            ) : (
              <ChevronUp className="w-5 h-5 text-emerald-400" />
            )}
          </div>
        </div>

        {/* DETALLES DESPLEGABLES */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-4 bg-slate-950/95 border-t border-white/10 space-y-3 max-h-80 overflow-y-auto"
            >
              <div className="space-y-2">
                {legs.map((leg, idx) => {
                  const match = matches.find((m) => m.id === leg.match_id);
                  const ev = match?.evaluations.find(
                    (e) => e.market_type === leg.market_type && e.selection_code === leg.selection_code
                  );
                  const legProb = Math.round((ev ? ev.model_prob : 0.94 / leg.decimal_odds) * 100);
                  return (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-900/90 rounded-xl border border-white/10 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">
                          {match
                            ? `${match.home_short_name || match.home_team_name} vs ${
                                match.away_short_name || match.away_team_name
                              }`
                            : 'Partido'}
                        </div>
                        <div className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-2">
                          <span>
                            {leg.market_type} · <strong>{leg.selection_code}</strong>
                          </span>
                          <span className="text-[10px] font-mono text-slate-300 bg-white/5 px-1.5 py-0.5 rounded">
                            {legProb}% IA
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-black text-emerald-400 text-sm">
                          {formatOdds(leg.decimal_odds, oddsFormat)}
                        </span>
                        <button
                          onClick={() => onRemoveLeg(idx)}
                          className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg bg-white/5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Advertencia de Riesgo Acumulado */}
              {legs.length > 1 && (
                <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-500/30 text-[11px] text-slate-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Al juntar <strong>{legs.length} jugadas</strong>, tu probabilidad de acertar todas baja a{' '}
                      <strong className="text-amber-300 font-mono">{jointProbPct}%</strong>.
                    </span>
                  </div>
                </div>
              )}

              {/* Simulador Rápido */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-bold">Monto ($):</span>
                  <input
                    type="number"
                    value={simulatedStake}
                    onChange={(e) => setSimulatedStake(e.target.value)}
                    className="w-20 bg-slate-900 border border-white/15 text-center font-mono font-bold rounded-lg py-1 text-white"
                  />
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Cobro Total en Parlay:</span>
                  <span className="text-base font-mono font-black text-emerald-400">
                    ${potentialPayout.toFixed(0)}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  onClick={onClearSlip}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Vaciar
                </button>
                <button
                  onClick={() => {
                    setExpanded(false);
                    onOpenRiskLab();
                  }}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Scale className="w-3.5 h-3.5" /> Comparar Por Separado vs Parlay
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
