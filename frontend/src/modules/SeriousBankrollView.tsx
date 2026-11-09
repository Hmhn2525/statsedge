import React, { useState } from 'react';
import type { UnifiedPickItem } from '../utils/picksEngine';
import { formatOdds, type OddsFormat } from '../utils/oddsFormat';
import { TeamCrest } from '../utils/teamAssets';
import { StatisticalLab } from './StatisticalLab';
import {
  Wallet,
  ShieldCheck,
  BarChart3,
  Calculator,
  ChevronRight,
} from 'lucide-react';

interface SeriousBankrollViewProps {
  picks: UnifiedPickItem[];
  oddsFormat: OddsFormat;
  bankrollAmount: number;
  onChangeBankroll: (amount: number) => void;
  onOpenAnalysis: (pick: UnifiedPickItem) => void;
}

export const SeriousBankrollView: React.FC<SeriousBankrollViewProps> = ({
  picks,
  oddsFormat,
  bankrollAmount,
  onChangeBankroll,
  onOpenAnalysis,
}) => {
  const [kellyProfile, setKellyProfile] = useState<'CONSERVATIVE' | 'MODERATE' | 'FLAT'>(
    'CONSERVATIVE'
  );
  const [showFullQuantLab, setShowFullQuantLab] = useState(false);

  const activePicks = picks
    .filter((p) => p.match.status !== 'FINISHED')
    .slice(0, 8);
  const displayPicks = activePicks.length > 0 ? activePicks : picks.slice(0, 8);

  const multiplier =
    kellyProfile === 'CONSERVATIVE' ? 1.0 : kellyProfile === 'MODERATE' ? 1.75 : 0.0;

  const getRecommendedStake = (p: UnifiedPickItem) => {
    if (kellyProfile === 'FLAT') {
      return Math.round(bankrollAmount * 0.025); // 2.5% plano
    }
    return Math.max(25, Math.round(bankrollAmount * p.kellyFraction * multiplier));
  };

  const totalAllocated = displayPicks
    .slice(0, 5)
    .reduce((acc, p) => acc + getRecommendedStake(p), 0);

  const expectedDayProfit = displayPicks
    .slice(0, 5)
    .reduce(
      (acc, p) => acc + Math.round(getRecommendedStake(p) * (p.evPct / 100)),
      0
    );

  return (
    <div className="space-y-5 pb-28">
      {/* 1. ENCABEZADO BANKROLL DESBLOQUEADO */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Módulo SERIOUS Desbloqueado</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Bankroll & Kelly
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400">
            Cuánto apostar exactamente en cada pick según tu capital y el Criterio de Kelly
          </p>
        </div>
      </div>

      {/* 2. CONFIGURADOR DE CAPITAL Y PERFIL DE RIESGO */}
      <div className="p-5 rounded-3xl bg-[#0d1115] border border-white/[0.08] space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Tu Banca Total (Paper Trading / Unidades $)</span>
            </label>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-2xl font-black text-emerald-400">$</span>
              <input
                type="number"
                min={100}
                step={100}
                value={bankrollAmount}
                onChange={(e) =>
                  onChangeBankroll(Math.max(100, Number(e.target.value) || 1000))
                }
                className="w-40 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/15 text-xl font-mono font-black text-white focus:outline-none focus:border-emerald-400"
              />
              <div className="flex items-center gap-1">
                {[1000, 5000, 10000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onChangeBankroll(preset)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition cursor-pointer ${
                      bankrollAmount === preset
                        ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                        : 'bg-zinc-900 text-zinc-400 border-white/10 hover:text-white'
                    }`}
                  >
                    ${preset.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Selector de Estrategia de Stake */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Perfil de Gestión
            </div>
            <div className="grid grid-cols-3 p-1 rounded-2xl bg-[#161a20] border border-white/10">
              {[
                { id: 'CONSERVATIVE', label: '1/4 Kelly' },
                { id: 'MODERATE', label: '1/2 Kelly' },
                { id: 'FLAT', label: 'Plano 2.5%' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setKellyProfile(mode.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    kellyProfile === mode.id
                      ? 'bg-white text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Resumen de Asignación para los 5 Destacados */}
        <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/[0.06]">
          <div className="p-3 rounded-2xl bg-black/35 border border-white/5">
            <div className="text-[11px] text-zinc-400">Capital en Top 5</div>
            <div className="mt-0.5 text-lg font-mono font-black text-white">
              ${totalAllocated.toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-black/35 border border-white/5">
            <div className="text-[11px] text-zinc-400">Reserva Protegida</div>
            <div className="mt-0.5 text-lg font-mono font-black text-emerald-400">
              ${Math.max(0, bankrollAmount - totalAllocated).toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/25">
            <div className="text-[11px] text-emerald-300">Valor Esperado (EV)</div>
            <div className="mt-0.5 text-lg font-mono font-black text-emerald-300">
              +${expectedDayProfit.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 3. TABLA DE ASIGNACIÓN DE STAKE POR PICK (Con Escudos Oficiales HD) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-amber-400" />
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              Cuánto apostar en cada pick hoy
            </h2>
          </div>
          <span className="text-xs text-zinc-400">Toca un pick para ver Monte Carlo</span>
        </div>

        <div className="space-y-2.5">
          {displayPicks.map((p) => {
            const stakeMoney = getRecommendedStake(p);
            const netWin = Math.round(stakeMoney * (p.decimalOdds - 1));
            const pctOfBank = ((stakeMoney / Math.max(1, bankrollAmount)) * 100).toFixed(
              1
            );

            return (
              <div
                key={p.id}
                onClick={() => onOpenAnalysis(p)}
                className="p-3.5 sm:p-4 rounded-2xl bg-[#0d1115] border border-white/[0.07] hover:border-emerald-500/40 flex items-center justify-between gap-3 transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <TeamCrest
                    teamName={p.teamName}
                    shortName={p.teamShort}
                    logoUrl={p.teamLogo}
                    sizeClass="w-11 h-11"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-white truncate">
                        {p.subjectName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-black">
                        {p.confidencePct}%
                      </span>
                    </div>
                    <div className="text-xs font-bold text-emerald-400 truncate mt-0.5">
                      {p.pillText} · Cuota {formatOdds(p.decimalOdds, oddsFormat)}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate">
                      {p.matchupSubtitle} · Edge +{p.edgePct}%
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-2.5">
                  <div>
                    <div className="text-base sm:text-lg font-mono font-black text-amber-300">
                      ${stakeMoney.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-mono text-emerald-400">
                      +{pctOfBank}% banca · Ganas +${netWin.toLocaleString()}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. LABORATORIO DE CALIBRACIÓN Y WALK-FORWARD BACKTEST */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowFullQuantLab((prev) => !prev)}
          className="w-full p-4 rounded-2xl bg-[#11161d] border border-white/10 hover:border-emerald-500/40 flex items-center justify-between text-left transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-sm font-extrabold text-white">
                Laboratorio Estadístico & Backtesting Walk-Forward
              </div>
              <div className="text-xs text-zinc-400">
                Curva de calibración, Brier Score, Log-Loss y simulación histórica por liga
              </div>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-400">
            {showFullQuantLab ? 'Ocultar' : 'Ver Métricas >'}
          </span>
        </button>

        {showFullQuantLab && (
          <div className="mt-4">
            <StatisticalLab />
          </div>
        )}
      </div>
    </div>
  );
};
