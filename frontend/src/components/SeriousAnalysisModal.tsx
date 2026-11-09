import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { UnifiedPickItem } from '../utils/picksEngine';
import { formatOdds, type OddsFormat } from '../utils/oddsFormat';
import { TeamCrest } from '../utils/teamAssets';
import {
  X,
  Brain,
  Dices,
  TrendingUp,
  Wallet,
  Heart,
  Plus,
  Check,
  CheckCircle2,
  ShieldCheck,
  Target,
  Star,
} from 'lucide-react';

interface SeriousAnalysisModalProps {
  pick: UnifiedPickItem | null;
  showOverviewBannerModal?: boolean;
  statsSummary?: {
    hits: number;
    total: number;
    hitRatePct: number;
    avgOdds: number;
  };
  oddsFormat: OddsFormat;
  bankrollAmount: number;
  isFollowed: boolean;
  isInParlay: boolean;
  onClose: () => void;
  onToggleFollow: (pickId: string) => void;
  onToggleParlay: (pick: UnifiedPickItem) => void;
}

export const SeriousAnalysisModal: React.FC<SeriousAnalysisModalProps> = ({
  pick,
  showOverviewBannerModal = false,
  statsSummary = { hits: 42, total: 53, hitRatePct: 79, avgOdds: 1.64 },
  oddsFormat,
  bankrollAmount,
  isFollowed,
  isInParlay,
  onClose,
  onToggleFollow,
  onToggleParlay,
}) => {
  if (!pick && !showOverviewBannerModal) return null;

  // Modal de Resumen "SERIOUS PRO DESBLOQUEADO" (Captura 1)
  if (showOverviewBannerModal && !pick) {
    return (
      <AnimatePresence>
        <div
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-[#0b0e12] border border-orange-500/30 overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.95)]"
          >
            {/* Cabecera Naranja Degradada idéntica a la Captura 1 */}
            <div className="relative p-6 bg-gradient-to-br from-[#8c3208] via-[#c94b0c] to-[#ea580c] text-white">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/25 hover:bg-black/40 flex items-center justify-center text-white/90 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/25 border border-white/20 text-[11px] font-bold tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full bg-amber-300" />
                SERIOUS ACERTÓ {statsSummary.hits} DE {statsSummary.total} ({statsSummary.hitRatePct}%)
              </div>

              <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold leading-tight">
                Modo SERIOUS PRO Activo.
                <br />
                <span className="text-amber-200">Todo Desbloqueado.</span>
              </h2>

              <p className="mt-2.5 text-xs sm:text-sm text-orange-100/90 leading-relaxed">
                En nuestra plataforma tienes acceso directo y sin candados a los 6 módulos cuantitativos de nivel profesional.
              </p>
            </div>

            {/* Grid 2x3 de Capacidades Desbloqueadas */}
            <div className="p-5 space-y-4">
              <div className="text-[11px] font-bold tracking-widest uppercase text-zinc-400">
                MÓDULOS ACTIVOS EN TU CUENTA
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    icon: Target,
                    title: 'Todos los picks',
                    desc: 'Sin límite diario',
                  },
                  {
                    icon: Star,
                    title: '5 destacados',
                    desc: 'Los de mayor confianza',
                  },
                  {
                    icon: Brain,
                    title: 'Análisis IA',
                    desc: 'Explicación completa xG',
                  },
                  {
                    icon: Dices,
                    title: 'Monte Carlo',
                    desc: '100,000 simulaciones',
                  },
                  {
                    icon: TrendingUp,
                    title: 'Edge y cuotas',
                    desc: 'De-vigging Shin sin candado',
                  },
                  {
                    icon: Wallet,
                    title: 'Bankroll',
                    desc: 'Cálculo Kelly por pick',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="p-3 rounded-2xl bg-[#12161c] border border-orange-500/20 flex items-center gap-2.5"
                    >
                      <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-white truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black text-sm tracking-wide uppercase shadow-lg shadow-orange-500/25 transition cursor-pointer"
              >
                EXPLORAR PICKS DESBLOQUEADOS &gt;
              </button>

              <p className="text-[10px] text-center text-zinc-500">
                Simulación cuantitativa auditada · Resultados pasados no garantizan resultados futuros.
              </p>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  if (!pick) return null;

  const isOver = pick.direction === 'OVER';
  const recommendedStakeMoney = Math.max(
    25,
    Math.round(bankrollAmount * pick.kellyFraction)
  );
  const potentialProfitMoney = Math.round(
    recommendedStakeMoney * (pick.decimalOdds - 1)
  );

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 36 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#0a0e13] border border-white/10 overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.95)] max-h-[92vh] flex flex-col"
        >
          {/* Cabecera con Escudo Oficial HD, Jugador/Equipo y Confianza */}
          <div className="relative p-5 bg-gradient-to-br from-[#07291c] via-[#0b1f18] to-[#0a0e13] border-b border-emerald-500/20">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-200 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3.5">
              <div className="p-2 rounded-2xl bg-black/40 border border-white/10 shrink-0">
                <TeamCrest
                  teamName={pick.teamName}
                  shortName={pick.teamShort}
                  logoUrl={pick.teamLogo}
                  sizeClass="w-14 h-14"
                />
              </div>

              <div className="min-w-0 flex-1 pr-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase">
                    {pick.match.competition_name}
                  </span>
                  <span className="text-xs font-semibold text-zinc-400">
                    {pick.matchupSubtitle}
                  </span>
                </div>

                <h2 className="mt-1 text-xl sm:text-2xl font-black text-white truncate">
                  {pick.subjectName}
                </h2>

                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${
                      isOver
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                    }`}
                  >
                    {pick.pillText}
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-white/15 text-xs font-mono font-bold text-white">
                    Cuota {formatOdds(pick.decimalOdds, oddsFormat)}
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-xs font-extrabold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {pick.confidencePct}% Confianza
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cuerpo Desplazable con los 4 Módulos SERIOUS Desbloqueados */}
          <div className="p-5 overflow-y-auto space-y-4">
            {/* 1. ANALISIS IA COMPLETO */}
            <div className="p-4 rounded-2xl bg-[#11161d] border border-white/[0.07] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
                  <Brain className="w-4 h-4" />
                  <span>1. Análisis IA Completo</span>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Dixon-Coles + Elo
                </span>
              </div>

              <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                {pick.aiSummary}
              </p>

              <ul className="space-y-1.5 pt-1">
                {pick.aiFactors.map((f, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-zinc-300 flex items-start gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2. MONTE CARLO (100,000 SIMULACIONES) */}
            <div className="p-4 rounded-2xl bg-[#11161d] border border-white/[0.07] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                  <Dices className="w-4 h-4" />
                  <span>2. Monte Carlo (100,000 Simulaciones)</span>
                </div>
                <span className="text-xs font-mono font-bold text-zinc-300">
                  Media: {pick.monteCarlo.projectedMean} {pick.monteCarlo.unitLabel}
                </span>
              </div>

              <div className="space-y-2">
                {pick.monteCarlo.buckets.map((b) => (
                  <div key={b.label} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span
                        className={`font-mono font-bold ${
                          b.isWinningOutcome ? 'text-emerald-300' : 'text-zinc-400'
                        }`}
                      >
                        {b.label} {b.isWinningOutcome ? '(Acierta)' : ''}
                      </span>
                      <span className="font-mono font-bold text-zinc-200">
                        {b.probability.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          b.isWinningOutcome
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : 'bg-zinc-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(4, b.probability * 1.8))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. EDGE Y CUOTAS (DONDE ESTA EL VALOR) */}
            <div className="p-4 rounded-2xl bg-[#11161d] border border-white/[0.07]">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-cyan-400 mb-3">
                <TrendingUp className="w-4 h-4" />
                <span>3. Edge y Cuotas (De-Vigging Shin)</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-[10px] text-zinc-400 uppercase">Cuota Actual</div>
                  <div className="mt-0.5 text-base font-mono font-black text-white">
                    {formatOdds(pick.decimalOdds, oddsFormat)}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    Implícita {pick.impliedProbPct}%
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-[10px] text-zinc-400 uppercase">Cuota Justa IA</div>
                  <div className="mt-0.5 text-base font-mono font-black text-emerald-400">
                    {formatOdds(pick.fairOdds, oddsFormat)}
                  </div>
                  <div className="text-[10px] text-emerald-400/80">
                    Real {pick.confidencePct}%
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                  <div className="text-[10px] text-emerald-300 uppercase">Ventaja / EV</div>
                  <div className="mt-0.5 text-base font-mono font-black text-emerald-300">
                    +{pick.evPct}%
                  </div>
                  <div className="text-[10px] text-emerald-400/80">
                    Edge +{pick.edgePct}%
                  </div>
                </div>
              </div>
            </div>

            {/* 4. BANKROLL (CUANTO APOSTAR EN ESTE PICK) */}
            <div className="p-4 rounded-2xl bg-[#11161d] border border-white/[0.07] flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-300">
                  <Wallet className="w-4 h-4" />
                  <span>4. Bankroll (Stake Kelly 1/4)</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Sobre tu banca de{' '}
                  <span className="text-white font-mono font-bold">
                    ${bankrollAmount.toLocaleString()}
                  </span>{' '}
                  ({(pick.kellyFraction * 100).toFixed(1)}% sugerido)
                </p>
              </div>

              <div className="text-right shrink-0">
                <div className="text-lg font-mono font-black text-amber-300">
                  ${recommendedStakeMoney.toLocaleString()}
                </div>
                <div className="text-[11px] font-mono text-emerald-400">
                  Ganancia +${potentialProfitMoney.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Barra Inferior de Acciones del Modal */}
          <div className="p-4 bg-[#070a0e] border-t border-white/10 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onToggleFollow(pick.id)}
              className={`flex-1 py-3 px-4 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 border transition cursor-pointer ${
                isFollowed
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                  : 'bg-zinc-900 border-white/15 text-white hover:border-white/30'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFollowed ? 'fill-rose-400 text-rose-400' : ''}`} />
              <span>{isFollowed ? 'Guardado en Seguidos' : 'Seguir Pick'}</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleParlay(pick)}
              className={`flex-1 py-3 px-4 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                isInParlay
                  ? 'bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/25'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/25'
              }`}
            >
              {isInParlay ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>En tu Parlay ({formatOdds(pick.decimalOdds, oddsFormat)})</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Sumar al Parlay ({formatOdds(pick.decimalOdds, oddsFormat)})</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
