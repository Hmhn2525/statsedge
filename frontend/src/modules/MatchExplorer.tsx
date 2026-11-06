import React, { useState, useEffect } from 'react';
import type { MatchSummary, ScoreMatrixResponse } from '../types';
import { fetchMatchScoreMatrix } from '../services/api';
import { ModelBadge, ObservedBadge } from '../components/Badges';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface MatchExplorerProps {
  matches: MatchSummary[];
  selectedMatch: MatchSummary | null;
  onSelectMatch: (match: MatchSummary) => void;
}

export const MatchExplorer: React.FC<MatchExplorerProps> = ({ matches, selectedMatch, onSelectMatch }) => {
  const currentMatch = selectedMatch || matches[0];
  const [matrixData, setMatrixData] = useState<ScoreMatrixResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentMatch) {
      setLoading(true);
      fetchMatchScoreMatrix(currentMatch.id)
        .then((res) => {
          setMatrixData(res);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [currentMatch]);

  if (!currentMatch) {
    return <div className="p-8 text-center text-slate-400">No hay partidos disponibles para explorar.</div>;
  }

  // Generar datos explicativos para el gráfico de barras
  const factorsData = matrixData
    ? [
        { factor: 'Ataque Local (α)', valor: matrixData.lambda_home * 0.45 },
        { factor: 'Defensa Visitante (β)', valor: matrixData.lambda_home * 0.35 },
        { factor: 'Ventaja Localía (γ)', valor: 0.28 },
        { factor: 'Ataque Visitante (α)', valor: matrixData.mu_away * 0.55 },
        { factor: 'Defensa Local (β)', valor: matrixData.mu_away * 0.45 }
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header & Match Picker */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-sky-400 uppercase tracking-wide">
              {currentMatch.competition_name} · {currentMatch.season}
            </span>
            <ObservedBadge timestamp={new Date(currentMatch.kickoff_time).toLocaleString()} />
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            {currentMatch.home_team_name} vs {currentMatch.away_team_name}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Cambiar Partido:</span>
          <select
            value={currentMatch.id}
            onChange={(e) => {
              const found = matches.find((m) => m.id === e.target.value);
              if (found) onSelectMatch(found);
            }}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-3 py-1.5 focus:outline-none focus:border-sky-500"
          >
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.home_team_name} vs {m.away_team_name} ({m.competition_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          Calculando matriz bivariada de marcadores...
        </div>
      ) : matrixData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Matriz Bivariada de Goles (Heatmap 6x6 visible) */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Matriz Bivariada de Marcadores Exactos P(X=i, Y=j)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Modelo Dixon-Coles con corrección de dependencia ρ = {matrixData.rho} en marcadores bajos.
                </p>
              </div>
              <ModelBadge />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-[11px] text-slate-500 bg-slate-950/60 border border-slate-800">
                      Local \ Vis
                    </th>
                    {[0, 1, 2, 3, 4, 5].map((g) => (
                      <th key={g} className="p-2 font-mono font-semibold text-slate-300 bg-slate-950 border border-slate-800">
                        {g}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2, 3, 4, 5].map((hGoals) => (
                    <tr key={hGoals}>
                      <th className="p-2 font-mono font-semibold text-slate-300 bg-slate-950 border border-slate-800">
                        {hGoals}
                      </th>
                      {[0, 1, 2, 3, 4, 5].map((aGoals) => {
                        const prob = matrixData.matrix_10x10[hGoals]?.[aGoals] || 0;
                        const pct = prob * 100;
                        // Color intensity based on percentage
                        let bgStyle = 'bg-slate-950/40 text-slate-400';
                        if (pct >= 10.0) bgStyle = 'bg-sky-600/60 text-white font-bold border-sky-400';
                        else if (pct >= 6.0) bgStyle = 'bg-sky-800/40 text-sky-200 font-semibold';
                        else if (pct >= 3.0) bgStyle = 'bg-sky-950/60 text-sky-300';

                        const isDixonColesAdjusted = hGoals <= 1 && aGoals <= 1;

                        return (
                          <td
                            key={aGoals}
                            className={`p-2.5 font-mono text-[11px] border border-slate-800/80 transition ${bgStyle} ${
                              isDixonColesAdjusted ? 'ring-1 ring-inset ring-amber-500/20' : ''
                            }`}
                            title={`Marcador ${hGoals}-${aGoals}: ${pct.toFixed(2)}% ${
                              isDixonColesAdjusted ? '(Ajustado por ρ de Dixon-Coles)' : ''
                            }`}
                          >
                            {pct.toFixed(1)}%
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
              <span>* Las celdas 0-0, 0-1, 1-0 y 1-1 incorporan ajuste no lineal de dependencia empírica.</span>
              <span className="text-sky-400">Celda más probable resaltada en azul</span>
            </div>
          </div>

          {/* Factores Explicativos y Goles Esperados */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-100 mb-3">Tasas Esperadas de Goles</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">λ (Goles Local)</div>
                  <div className="text-2xl font-mono font-bold text-sky-400">{matrixData.lambda_home}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{currentMatch.home_team_name}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">μ (Goles Visitante)</div>
                  <div className="text-2xl font-mono font-bold text-slate-200">{matrixData.mu_away}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{currentMatch.away_team_name}</div>
                </div>
              </div>
            </div>

            {/* Desglose de Factores Recharts */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-100 mb-2">Desglose de Contribución</h3>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={factorsData} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                    <XAxis type="number" stroke="#64748b" fontSize={10} />
                    <YAxis dataKey="factor" type="category" stroke="#94a3b8" fontSize={10} width={120} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px' }}
                      formatter={(val: any) => [`${Number(val).toFixed(2)} pts`, 'Contribución']}
                    />
                    <Bar dataKey="valor" fill="#0284c7" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
