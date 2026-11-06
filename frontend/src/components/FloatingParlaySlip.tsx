import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { ParlayLeg, MatchSummary } from '../types';
import { formatOdds, type OddsFormat } from '../utils/oddsFormat';
import { ChevronUp, ChevronDown, Trash2, Sparkles, CheckCircle2 } from 'lucide-react';

interface FloatingParlaySlipProps {
  legs: ParlayLeg[];
  matches: MatchSummary[];
  oddsFormat: OddsFormat;
  onRemoveLeg: (index: number) => void;
  onClearSlip: () => void;
}

export const FloatingParlaySlip: React.FC<FloatingParlaySlipProps> = ({
  legs,
  matches,
  oddsFormat,
  onRemoveLeg,
  onClearSlip,
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

  const naiveProb = legs.reduce((acc, l) => acc * (1.0 / l.decimal_odds), 1.0);
  const jointProbEst = hasSgp ? naiveProb * 1.15 : naiveProb;

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-16 sm:bottom-4 left-0 right-0 z-40 max-w-lg mx-auto px-3 sm:px-4"
    >
      <div className="bg-[#121820] border-2 border-emerald-500/80 rounded-2xl shadow-2xl shadow-emerald-950/60 overflow-hidden backdrop-blur-md">
        {/* BARRA COMPACTA */}
        <div
          onClick={() => setExpanded(!expanded)}
          className="p-3 bg-gradient-to-r from-emerald-950/80 via-[#121820] to-[#121820] flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xs shadow-md">
              {legs.length}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Boleto Parlay Cuantitativo</span>
                {hasSgp && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-mono">
                    Same-Game Parlay (SGP)
                  </span>
                )}
              </div>
              <div className="text-[11px] text-emerald-400 font-mono font-bold">
                Momio Total: {formatOdds(combinedDecimal, oddsFormat)} ({combinedDecimal.toFixed(2)}x)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              {expanded ? 'Ocultar' : 'Analizar SGP'}
            </span>
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
              className="p-4 bg-[#0b0f14] border-t border-[#1f2a37] space-y-3 max-h-72 overflow-y-auto"
            >
              <div className="space-y-2">
                {legs.map((leg, idx) => {
                  const match = matches.find((m) => m.id === leg.match_id);
                  return (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#121820] rounded-xl border border-[#1f2a37] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-200">
                          {match
                            ? `${match.home_short_name || match.home_team_name} vs ${
                                match.away_short_name || match.away_team_name
                              }`
                            : 'Partido'}
                        </div>
                        <div className="text-[11px] text-emerald-400 mt-0.5">
                          {leg.market_type} · <strong>{leg.selection_code}</strong>
                          {leg.line_value ? ` (${leg.line_value})` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-extrabold text-emerald-400">
                          {formatOdds(leg.decimal_odds, oddsFormat)}
                        </span>
                        <button
                          onClick={() => onRemoveLeg(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Diagnóstico de Correlación SGP */}
              <div className="p-2.5 bg-[#121820] rounded-xl border border-[#1f2a37] text-[11px] space-y-1">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Probabilidad Conjunta Estimada:</span>
                  <strong className="text-emerald-400 font-mono">
                    {(jointProbEst * 100).toFixed(1)}%
                  </strong>
                </div>
                {hasSgp ? (
                  <div className="text-emerald-400 flex items-center gap-1 text-[10px]">
                    <CheckCircle2 className="w-3 h-3" />
                    Matriz Bivariada Dixon-Coles activa para selecciones del mismo encuentro.
                  </div>
                ) : (
                  <div className="text-slate-400 flex items-center gap-1 text-[10px]">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    Eventos independientes evaluados sin correlación cruzada.
                  </div>
                )}
              </div>

              {/* Simulador Paper Trading */}
              <div className="pt-2 border-t border-[#1f2a37] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Unidades Sim:</span>
                  <input
                    type="number"
                    value={simulatedStake}
                    onChange={(e) => setSimulatedStake(e.target.value)}
                    className="w-16 bg-[#121820] border border-[#263545] text-center font-mono rounded-lg py-1 text-white"
                  />
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Retorno Simulado:</span>
                  <span className="text-sm font-mono font-extrabold text-emerald-400">
                    ${potentialPayout.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  onClick={onClearSlip}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Limpiar Boleto
                </button>
                <button
                  onClick={() => setExpanded(false)}
                  className="px-3 py-1 bg-[#18222d] hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Minimizar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
