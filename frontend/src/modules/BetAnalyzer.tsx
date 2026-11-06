import React, { useState } from 'react';
import type { MatchSummary, MarketSelectionEvaluation, DevigMethod } from '../types';
import { ModelBadge } from '../components/Badges';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { Calculator, Shield, TrendingUp, AlertTriangle } from 'lucide-react';

interface BetAnalyzerProps {
  matches: MatchSummary[];
  selectedMatch: MatchSummary | null;
  onSelectMatch: (match: MatchSummary) => void;
  onAddToParlay?: (evaluation: MarketSelectionEvaluation, match: MatchSummary) => void;
}

export const BetAnalyzer: React.FC<BetAnalyzerProps> = ({
  matches,
  selectedMatch,
  onSelectMatch,
  onAddToParlay
}) => {
  const currentMatch = selectedMatch || matches[0];

  const [selectedMarketIndex, setSelectedMarketIndex] = useState(0);
  const [activeDevigMethod, setActiveDevigMethod] = useState<DevigMethod>('SHIN');
  const [customOdds, setCustomOdds] = useState<string>('');
  const [kellyFractionType, setKellyFractionType] = useState<number>(0.125); // 1/8 Kelly default

  if (!currentMatch) {
    return <div className="p-8 text-center text-slate-400">No hay partidos disponibles.</div>;
  }

  const evals = currentMatch.evaluations;
  const currentEval = evals[selectedMarketIndex] || evals[0];

  // Si el usuario edita la cuota localmente
  const effectiveOdds = customOdds ? parseFloat(customOdds) || currentEval?.decimal_odds || 2.0 : currentEval?.decimal_odds || 2.0;
  const breakEvenProb = 1.0 / effectiveOdds;

  const modelProb = currentEval ? currentEval.model_prob : 0.5;
  const ciLow = currentEval ? currentEval.model_ci_low : modelProb * 0.9;
  const ciHigh = currentEval ? currentEval.model_ci_high : modelProb * 1.1;

  const evNominal = (modelProb * effectiveOdds) - 1.0;
  const evConservative = (ciLow * effectiveOdds) - 1.0;

  // Cálculo de Kelly
  const b = effectiveOdds - 1.0;
  const fStar = b > 0 ? evConservative / b : 0;
  const recommendedKelly = Math.min(0.03, Math.max(0, fStar * kellyFractionType));

  // Generar datos de la curva de densidad normal simulada para Recharts
  const chartData = [];
  const mean = modelProb;
  const std = (ciHigh - ciLow) / 3.29; // ~90% CI en normal

  for (let p = Math.max(0.01, mean - 3 * std); p <= Math.min(0.99, mean + 3 * std); p += 0.01) {
    const density = (1.0 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((p - mean) / std, 2));
    chartData.push({
      prob: parseFloat(p.toFixed(3)),
      probPct: parseFloat((p * 100).toFixed(1)),
      densidad: parseFloat(density.toFixed(2))
    });
  }

  return (
    <div className="space-y-6">
      {/* Selector de Partido */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs text-sky-400 font-medium uppercase tracking-wide">
            {currentMatch.competition_name} · Analizador Cuantitativo
          </span>
          <h2 className="text-xl font-bold text-slate-100">
            {currentMatch.home_team_name} vs {currentMatch.away_team_name}
          </h2>
        </div>

        <select
          value={currentMatch.id}
          onChange={(e) => {
            const found = matches.find((m) => m.id === e.target.value);
            if (found) {
              onSelectMatch(found);
              setSelectedMarketIndex(0);
              setCustomOdds('');
            }
          }}
          className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-3 py-1.5 focus:outline-none focus:border-sky-500"
        >
          {matches.map((m) => (
            <option key={m.id} value={m.id}>
              {m.home_team_name} vs {m.away_team_name}
            </option>
          ))}
        </select>
      </div>

      {evals.length === 0 ? (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
          No hay cuotas registradas para este partido. Registra cuotas en el Comparador de Momios para auditar.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Configuración del Análisis */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-sky-400" />
                Selección de Mercado a Auditar
              </h3>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Mercado / Selección:</label>
                <select
                  value={selectedMarketIndex}
                  onChange={(e) => {
                    setSelectedMarketIndex(parseInt(e.target.value));
                    setCustomOdds('');
                  }}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-2 focus:outline-none focus:border-sky-500 font-mono"
                >
                  {evals.map((e, idx) => (
                    <option key={idx} value={idx}>
                      {e.market_type} · {e.selection_code} @ {e.decimal_odds.toFixed(2)} ({e.bookmaker_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Cuota Decimal a Evaluar (editable para Draftea):
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder={currentEval.decimal_odds.toFixed(2)}
                  value={customOdds}
                  onChange={(e) => setCustomOdds(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 font-mono font-bold text-sm rounded px-3 py-2 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Selector de Método de De-Vigging */}
              <div className="pt-2 border-t border-slate-800">
                <label className="text-[11px] text-slate-400 block mb-1.5">Método de Eliminación de Margen:</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-center">
                  {(['SHIN', 'POWER', 'MULTIPLICATIVE'] as DevigMethod[]).map((method) => (
                    <button
                      key={method}
                      onClick={() => setActiveDevigMethod(method)}
                      className={`py-1 text-[11px] font-medium rounded transition ${
                        activeDevigMethod === method
                          ? 'bg-sky-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {method === 'SHIN' ? 'Shin (1993)' : method === 'POWER' ? 'Power' : 'Multiplic.'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gestión de Riesgo (Kelly) */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="text-[11px] text-slate-400 block">Fracción de Kelly (Control de Varianza):</label>
                <div className="grid grid-cols-3 gap-1 text-center text-xs">
                  {[
                    { label: '1/8 Kelly', val: 0.125 },
                    { label: '1/4 Kelly', val: 0.25 },
                    { label: '1/2 Kelly', val: 0.50 }
                  ].map((k) => (
                    <button
                      key={k.val}
                      onClick={() => setKellyFractionType(k.val)}
                      className={`py-1 rounded border text-[11px] ${
                        kellyFractionType === k.val
                          ? 'bg-sky-950 border-sky-600 text-sky-300 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>

              {onAddToParlay && (
                <button
                  onClick={() => onAddToParlay(currentEval, currentMatch)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition"
                >
                  + Agregar al Auditor de Parlays
                </button>
              )}
            </div>
          </div>

          {/* Columna Central y Derecha: Visualización de Incertidumbre y Sensibilidad */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tarjetas Cuantitativas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Prob. Modelo</span>
                <div className="text-xl font-bold font-mono text-sky-400 mt-1">
                  {(modelProb * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  [{(ciLow * 100).toFixed(1)}% - {(ciHigh * 100).toFixed(1)}%]
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Break-Even (1/O)</span>
                <div className="text-xl font-bold font-mono text-slate-200 mt-1">
                  {(breakEvenProb * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">Cuota {effectiveOdds.toFixed(2)}</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[10px] text-slate-400 uppercase font-mono">EV Conservador</span>
                <div
                  className={`text-xl font-bold font-mono mt-1 ${
                    evConservative > 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {evConservative > 0 ? `+${(evConservative * 100).toFixed(1)}%` : `${(evConservative * 100).toFixed(1)}%`}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Nominal: +{(evNominal * 100).toFixed(1)}%
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Kelly Recomendado</span>
                <div className="text-xl font-bold font-mono text-sky-300 mt-1">
                  {(recommendedKelly * 100).toFixed(2)}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Tope máx 3.0% bankroll</div>
              </div>
            </div>

            {/* Gráfico Recharts de Densidad de Probabilidad vs Break-Even */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-sky-400" />
                    Distribución de Probabilidad del Modelo vs Punto de Equilibrio
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Existe ventaja real cuando la mayor parte de la distribución se sitúa a la derecha de la línea de Break-Even.
                  </p>
                </div>
                <ModelBadge ciText="IC 90%" />
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="probGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="probPct"
                      unit="%"
                      stroke="#64748b"
                      fontSize={11}
                      domain={['auto', 'auto']}
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px' }}
                      formatter={(val: any) => [`${val}`, 'Densidad']}
                      labelFormatter={(lbl) => `Probabilidad: ${lbl}%`}
                    />
                    <ReferenceLine
                      x={parseFloat((breakEvenProb * 100).toFixed(1))}
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      label={{ value: `Break-Even ${(breakEvenProb * 100).toFixed(1)}%`, fill: '#f59e0b', fontSize: 11, position: 'top' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="densidad"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#probGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Diagnóstico Epistemológico */}
              <div className="mt-4 p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs flex items-start gap-2.5">
                {evConservative > 0 ? (
                  <>
                    <Shield className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-emerald-300">Discrepancia Positiva Robusta:</span> Incluso si
                      el modelo sobreestimó la probabilidad y el valor real se ubica en el extremo inferior del intervalo (
                      {(ciLow * 100).toFixed(1)}%), la cuota disponible sigue ofreciendo un Valor Esperado positivo (+
                      {(evConservative * 100).toFixed(1)}%).
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-amber-300">Incertidumbre Significativa:</span> Aunque el EV nominal
                      parece positivo (+{(evNominal * 100).toFixed(1)}%), la línea de equilibrio cae dentro de la banda de
                      incertidumbre del modelo. Se recomienda cautela o abstención.
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
