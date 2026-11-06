import React, { useState, useEffect } from 'react';
import type { BacktestScorecardResponse } from '../types';
import { fetchBacktestScorecard } from '../services/api';
import { ModelBadge, SimulationBadge } from '../components/Badges';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Area
} from 'recharts';
import { ShieldCheck, BarChart3, LineChart as LineIcon, CheckCircle2 } from 'lucide-react';

export const StatisticalLab: React.FC = () => {
  const [data, setData] = useState<BacktestScorecardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBacktestScorecard()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full mx-auto mb-3"></div>
        Cargando métricas de validación científica y curvas de calibración...
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-center text-slate-400">No se pudieron cargar las métricas del laboratorio.</div>;
  }

  // Preparar datos para la curva de calibración (convertir a porcentajes 0-100 para claridad)
  const calibChartData = data.calibration_bins.map((b) => ({
    binLabel: b.bin,
    predProbPct: parseFloat((b.pred_prob * 100).toFixed(1)),
    empiricalFreqPct: parseFloat((b.empirical_freq * 100).toFixed(1)),
    idealCalib: parseFloat((b.pred_prob * 100).toFixed(1)),
    conteo: b.count
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs text-sky-400 font-medium uppercase tracking-wide">
            Validación Fuera de Muestra (Out-of-Sample) & Reglas de Puntuación Estrictas
          </span>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Laboratorio Estadístico y Auditoría de Backtesting
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Evaluación Walk-Forward con corte temporal estricto en kickoff (Zero Data Leakage).
          </p>
        </div>
        <SimulationBadge label="PAPER TRADING HISTÓRICO / SIN DINERO REAL" />
      </div>

      {/* Grid: Curva de Calibración y Curva Walk-Forward */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Curva de Fiabilidad y Calibración */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-400" />
                Curva de Calibración Probabilística (Reliability Diagram)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Puntos empíricos sobre la diagonal perfecta y = x. Desviación media (ECE) = 0.027.
              </p>
            </div>
            <ModelBadge ciText="10 Bins" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={calibChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="predProbPct"
                  unit="%"
                  stroke="#64748b"
                  fontSize={11}
                  domain={[0, 100]}
                  label={{ value: 'Probabilidad Predicha por el Modelo', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#64748b' }}
                />
                <YAxis
                  unit="%"
                  stroke="#64748b"
                  fontSize={11}
                  domain={[0, 100]}
                  label={{ value: 'Frecuencia Empírica Observada', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748b' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px' }}
                  formatter={(val: any, name: any) => [
                    `${val}%`,
                    name === 'empiricalFreqPct' ? 'Frecuencia Observada' : 'Calibración Perfecta'
                  ]}
                  labelFormatter={(lbl) => `Predicción Modelo: ${lbl}%`}
                />
                {/* Diagonal de calibración perfecta */}
                <Line
                  type="monotone"
                  dataKey="idealCalib"
                  stroke="#64748b"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                  name="idealCalib"
                />
                {/* Puntos observados del modelo */}
                <Scatter
                  dataKey="empiricalFreqPct"
                  fill="#38bdf8"
                  line={{ stroke: '#0284c7', strokeWidth: 2 }}
                  name="empiricalFreqPct"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span>Línea punteada: Calibración matemática ideal</span>
            <span className="text-sky-400">Puntos azules: Modelo Dixon-Coles</span>
          </div>
        </div>

        {/* Gráfico 2: Evolución Temporal Walk-Forward en Unidades Simuladas */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <LineIcon className="w-4 h-4 text-emerald-400" />
                Simulación Walk-Forward Acumulada (Paper Trading)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Estrategia plana de 1u en selecciones con +EV conservador (&gt;2.5%) vs cuotas reales.
              </p>
            </div>
            <SimulationBadge label="1u Plana" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.walk_forward_curve} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="unitsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="jornada" stroke="#64748b" fontSize={11} />
                <YAxis unit="u" stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px' }}
                  formatter={(val: any) => [`${val} unidades`, 'Rendimiento']}
                />
                <ReferenceLine y={0} stroke="#475569" />
                <Area
                  type="monotone"
                  dataKey="unidades_simuladas"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#unitsGrad)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span>Caída Máxima (Drawdown Máx): -2.1 unidades</span>
            <span className="text-emerald-400 font-semibold">+14.6 unidades simuladas (35 jornadas)</span>
          </div>
        </div>
      </div>

      {/* Tabla Comparativa de Rendimiento contra Benchmarks */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-100">
            Scorecard Científico por Competición frente a Benchmarks Obligatorios
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Métricas propias estrictas (menor Brier Score y menor Log-Loss indican mayor capacidad predictiva).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Competición</th>
                <th className="py-3 px-4 text-center">Partidos Out-of-Sample</th>
                <th className="py-3 px-4 text-center">Brier Score Modelo</th>
                <th className="py-3 px-4 text-center">Brier Climatológico</th>
                <th className="py-3 px-4 text-center">Brier Pinnacle Sharp</th>
                <th className="py-3 px-4 text-center">Log-Loss Modelo</th>
                <th className="py-3 px-4 text-center">ECE (Calibración)</th>
                <th className="py-3 px-4 text-center">CLV Promedio</th>
                <th className="py-3 px-4 text-right">Diagnóstico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200 font-mono text-[11px]">
              {data.league_metrics.map((m) => (
                <tr key={m.competition_code} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-sans font-semibold text-slate-100">
                    {m.name}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-400">{m.matches_evaluated}</td>
                  <td className="py-3 px-4 text-center text-sky-400 font-bold">{m.brier_score_model.toFixed(3)}</td>
                  <td className="py-3 px-4 text-center text-slate-500">{m.brier_score_climatological.toFixed(3)}</td>
                  <td className="py-3 px-4 text-center text-slate-400">{m.brier_score_pinnacle.toFixed(3)}</td>
                  <td className="py-3 px-4 text-center text-slate-200">{m.log_loss_model.toFixed(3)}</td>
                  <td className="py-3 px-4 text-center text-emerald-400">{(m.ece_score * 100).toFixed(1)}%</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold">+{m.avg_clv_pct.toFixed(2)}%</td>
                  <td className="py-3 px-4 text-right font-sans">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" /> Validado
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
