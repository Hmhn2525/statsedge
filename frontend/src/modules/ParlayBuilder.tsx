import React, { useState } from 'react';
import type { MatchSummary, ParlayLeg, ParlayEvaluationResponse } from '../types';
import { evaluateParlay } from '../services/api';
import { ModelBadge, SimulationBadge } from '../components/Badges';
import { Layers, Trash2, AlertOctagon, CheckCircle2, TrendingDown, PlusCircle } from 'lucide-react';

interface ParlayBuilderProps {
  matches: MatchSummary[];
  parlayLegs: ParlayLeg[];
  onRemoveLeg: (index: number) => void;
  onAddLeg: (leg: ParlayLeg) => void;
  onClearParlay: () => void;
}

export const ParlayBuilder: React.FC<ParlayBuilderProps> = ({
  matches,
  parlayLegs,
  onRemoveLeg,
  onAddLeg,
  onClearParlay
}) => {
  const [evaluation, setEvaluation] = useState<ParlayEvaluationResponse | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  // Selector para agregar selección rápidamente
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.id || '');
  const [selectedMarket, setSelectedMarket] = useState<'1X2' | 'OVER_UNDER' | 'BTTS'>('1X2');
  const [selectedCode, setSelectedCode] = useState('HOME');
  const [legOdds, setLegOdds] = useState('1.95');

  const handleEvaluate = async () => {
    if (parlayLegs.length === 0) return;
    setEvaluating(true);
    try {
      const res = await evaluateParlay(parlayLegs);
      setEvaluation(res);
    } catch (err) {
      console.error(err);
      alert('Error al evaluar el parlay');
    } finally {
      setEvaluating(false);
    }
  };

  const handleAddCustomLeg = () => {
    if (!selectedMatchId) return;
    const oddsNum = parseFloat(legOdds) || 1.95;
    const newLeg: ParlayLeg = {
      match_id: selectedMatchId,
      market_type: selectedMarket,
      selection_code: selectedCode,
      line_value: selectedMarket === 'OVER_UNDER' ? 2.5 : undefined,
      decimal_odds: oddsNum
    };
    onAddLeg(newLeg);
    setEvaluation(null); // Reset anterior
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs text-sky-400 font-medium uppercase tracking-wide">
            Motor de Probabilidades Conjuntas & Detección de Correlación
          </span>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            Auditor y Constructor de Parlays (Combinadas)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Detecta automáticamente dependencias en combinadas del mismo partido (Same-Game Parlay) mediante integración bivariada de goles.
          </p>
        </div>
        <SimulationBadge label="AUDITORÍA CUANTITATIVA / PAPER TRADING" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Constructor de Patas */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-sky-400" />
              Agregar Selección al Parlay
            </h3>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Partido:</label>
              <select
                value={selectedMatchId}
                onChange={(e) => setSelectedMatchId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
              >
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.home_team_name} vs {m.away_team_name} ({m.competition_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Mercado:</label>
                <select
                  value={selectedMarket}
                  onChange={(e) => {
                    const m = e.target.value as any;
                    setSelectedMarket(m);
                    if (m === '1X2') setSelectedCode('HOME');
                    else if (m === 'OVER_UNDER') setSelectedCode('OVER');
                    else if (m === 'BTTS') setSelectedCode('YES');
                  }}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
                >
                  <option value="1X2">1X2</option>
                  <option value="OVER_UNDER">Over/Under 2.5</option>
                  <option value="BTTS">Ambos Anotan</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Selección:</label>
                <select
                  value={selectedCode}
                  onChange={(e) => setSelectedCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
                >
                  {selectedMarket === '1X2' && (
                    <>
                      <option value="HOME">Local (1)</option>
                      <option value="DRAW">Empate (X)</option>
                      <option value="AWAY">Visitante (2)</option>
                    </>
                  )}
                  {selectedMarket === 'OVER_UNDER' && (
                    <>
                      <option value="OVER">Over 2.5 Goles</option>
                      <option value="UNDER">Under 2.5 Goles</option>
                    </>
                  )}
                  {selectedMarket === 'BTTS' && (
                    <>
                      <option value="YES">Ambos Anotan: Sí</option>
                      <option value="NO">Ambos Anotan: No</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Momio de la Selección:</label>
              <input
                type="number"
                step="0.01"
                value={legOdds}
                onChange={(e) => setLegOdds(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              onClick={handleAddCustomLeg}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
            >
              + Agregar Selección
            </button>
          </div>
        </div>

        {/* Columna Central y Derecha: Carrito de Selecciones y Diagnóstico */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-100">
                Selecciones en la Combinada ({parlayLegs.length})
              </h3>
              {parlayLegs.length > 0 && (
                <button
                  onClick={onClearParlay}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Vaciar Carrito
                </button>
              )}
            </div>

            {parlayLegs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No has agregado selecciones. Agrega al menos 2 selecciones para auditar la correlación y probabilidad conjunta.
              </div>
            ) : (
              <div className="space-y-2">
                {parlayLegs.map((leg, idx) => {
                  const match = matches.find((m) => m.id === leg.match_id);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">
                          {match ? `${match.home_team_name} vs ${match.away_team_name}` : `Partido ${leg.match_id.slice(0, 8)}`}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {leg.market_type} · <strong className="text-sky-300">{leg.selection_code}</strong>
                          {leg.line_value && ` (${leg.line_value})`}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-slate-100">
                          {leg.decimal_odds.toFixed(2)}
                        </span>
                        <button
                          onClick={() => onRemoveLeg(idx)}
                          className="text-slate-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-3 flex justify-end">
                  <button
                    onClick={handleEvaluate}
                    disabled={evaluating || parlayLegs.length < 2}
                    className={`px-5 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                      parlayLegs.length < 2
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-sky-600 hover:bg-sky-500 text-white shadow'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    {evaluating ? 'Calculando Matriz...' : 'Auditar Probabilidades Conjuntas y Correlación'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Resultado de la Auditoría */}
          {evaluation && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-sm font-semibold text-slate-100">Diagnóstico Matemático de la Combinada</h4>
                <ModelBadge ciText="Matriz Bivariada" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Momio Total</span>
                  <div className="text-xl font-mono font-bold text-sky-400 mt-1">
                    {evaluation.combined_decimal_odds.toFixed(2)}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Prob. Conjunta Real</span>
                  <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
                    {(evaluation.joint_model_prob * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Ingenua: {(evaluation.naive_multiplied_prob * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">EV Combinado</span>
                  <div
                    className={`text-xl font-mono font-bold mt-1 ${
                      evaluation.combined_expected_value > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {evaluation.combined_expected_value > 0
                      ? `+${(evaluation.combined_expected_value * 100).toFixed(1)}%`
                      : `${(evaluation.combined_expected_value * 100).toFixed(1)}%`}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Nivel de Riesgo</span>
                  <div
                    className={`text-sm font-bold mt-2 px-2 py-0.5 rounded inline-block ${
                      evaluation.risk_level === 'BAJO'
                        ? 'bg-emerald-950 text-emerald-300'
                        : evaluation.risk_level === 'MEDIO'
                        ? 'bg-sky-950 text-sky-300'
                        : evaluation.risk_level === 'ALTO'
                        ? 'bg-amber-950 text-amber-300'
                        : 'bg-rose-950 text-rose-300'
                    }`}
                  >
                    {evaluation.risk_level}
                  </div>
                </div>
              </div>

              {/* Mensaje de Diagnóstico de Correlación */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                  {evaluation.has_same_game_correlation ? (
                    <AlertOctagon className="w-4 h-4 text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                  )}
                  Análisis de Dependencia:
                </div>
                <div className="text-slate-400">{evaluation.correlation_diagnosis}</div>
              </div>

              {/* Comparativa Individual vs Parlay y Alerta de Margen Compuesto */}
              <div className="p-3 bg-amber-950/20 rounded-lg border border-amber-900/40 text-xs space-y-1 text-slate-300">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-amber-400" />
                  Erosión de Margen & Realidad Probabilística:
                </div>
                <div>
                  Probabilidad de acertar <strong>todas</strong> las selecciones:{' '}
                  <strong className="text-emerald-400">
                    {(evaluation.individual_vs_parlay_ev_comparison.prob_acierto_total * 100).toFixed(1)}%
                  </strong>{' '}
                  vs Probabilidad de fallar <strong>al menos una</strong>:{' '}
                  <strong className="text-rose-400">
                    {(evaluation.individual_vs_parlay_ev_comparison.prob_fallar_al_menos_una * 100).toFixed(1)}%
                  </strong>.
                </div>
                {evaluation.individual_vs_parlay_ev_comparison.margin_erosion_alert && (
                  <div className="text-amber-400 text-[11px] font-medium pt-1">
                    * Atención: En combinadas de 3 o más selecciones sin correlación fuertemente positiva, el margen compuesto de la casa destruye el valor esperado. Considera jugar apuestas individuales.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
