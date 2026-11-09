import React from 'react';
import type { UnifiedPickItem } from '../utils/picksEngine';
import { formatOdds, type OddsFormat } from '../utils/oddsFormat';
import { PickCardLeftVisual } from '../utils/teamAssets';
import { Heart, Plus, Check, CheckCircle2, Radio } from 'lucide-react';

interface SeriousPickCardProps {
  pick: UnifiedPickItem;
  oddsFormat: OddsFormat;
  isFollowed: boolean;
  isInParlay: boolean;
  onToggleFollow: (pickId: string, e: React.MouseEvent) => void;
  onToggleParlay: (pick: UnifiedPickItem, e: React.MouseEvent) => void;
  onOpenAnalysis: (pick: UnifiedPickItem) => void;
}

export const SeriousPickCard: React.FC<SeriousPickCardProps> = ({
  pick,
  oddsFormat,
  isFollowed,
  isInParlay,
  onToggleFollow,
  onToggleParlay,
  onOpenAnalysis,
}) => {
  const isOver = pick.direction === 'OVER';
  const isInPlay = pick.match.status === 'IN_PLAY';

  return (
    <div
      onClick={() => onOpenAnalysis(pick)}
      className="group relative flex items-stretch rounded-2xl bg-[#0d1115] border border-white/[0.07] hover:border-emerald-500/40 transition-all duration-200 overflow-hidden cursor-pointer shadow-[0_8px_28px_rgba(0,0,0,0.65)] min-h-[132px]"
    >
      {/* Panel Visual Izquierdo con Escudo Oficial HD + Jugador y Resplandor del Club */}
      <PickCardLeftVisual
        kind={pick.kind}
        teamName={pick.teamName}
        teamShort={pick.teamShort}
        teamLogo={pick.teamLogo}
        opponentName={pick.opponentName}
        opponentLogo={pick.opponentLogo}
        playerName={pick.playerName}
        playerJersey={pick.playerJersey}
        playerHeadshot={pick.playerHeadshot}
        isDualTeamMarket={pick.isDualTeamMarket}
      />

      {/* Contenido Derecho estilo SERIOUS Dark OLED */}
      <div className="flex-1 min-w-0 p-3.5 sm:p-4 flex flex-col justify-between">
        {/* Fila Superior: Tag de Equipo/Categoría + Badge de % de Confianza */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-400">
                {pick.headerTag}
              </span>
              {isInPlay && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-black">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  VIVO
                </span>
              )}
              {pick.settledStatus === 'WON' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  ACERTADO
                </span>
              )}
            </div>

            {/* Nombre del Jugador o Equipo en 2 líneas de alto impacto */}
            <h3 className="mt-0.5 text-lg sm:text-xl font-extrabold text-white leading-[1.12] tracking-tight truncate">
              {pick.titleLine1}
              {pick.titleLine2 && (
                <>
                  <br />
                  <span className="text-zinc-100">{pick.titleLine2}</span>
                </>
              )}
            </h3>

            {/* Partido y Hora */}
            <p className="mt-1 text-xs font-medium text-zinc-400 truncate">
              {pick.matchupSubtitle}
            </p>
          </div>

          {/* Badge Superior Derecho: Confianza (🟢 81%) + Corazón para Seguidos */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={(e) => onToggleFollow(pick.id, e)}
              title={isFollowed ? 'Quitar de Seguidos' : 'Guardar en Seguidos'}
              className={`w-7 h-7 rounded-full flex items-center justify-center border transition cursor-pointer ${
                isFollowed
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                  : 'bg-zinc-900/90 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFollowed ? 'fill-rose-400' : ''}`} />
            </button>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0c261b] border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              <span className="text-xs font-extrabold text-emerald-300 tabular-nums">
                {pick.confidencePct}%
              </span>
            </div>
          </div>
        </div>

        {/* Fila Inferior: Píldora Verde (↑ MÁS DE...) o Naranja/Roja (↓ MENOS DE...) + Cuota Desbloqueada */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-black tracking-wide truncate ${
              isOver
                ? 'bg-[#0b2b1d] text-[#34d399] border border-emerald-500/30'
                : 'bg-[#2c1610] text-[#fb923c] border border-orange-500/30'
            }`}
          >
            <span className="truncate">{pick.pillText}</span>
          </div>

          {/* Botón de Cuota Desbloqueada (Sin Candado 🔒) + 1-Tap al Parlay */}
          <button
            type="button"
            onClick={(e) => onToggleParlay(pick, e)}
            title="Agregar o quitar del Constructor de Parlay"
            className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-mono font-bold border transition cursor-pointer ${
              isInParlay
                ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-zinc-900/95 text-zinc-200 border-white/10 hover:border-emerald-500/50 hover:text-emerald-300'
            }`}
          >
            <span className="text-[10px] font-sans font-semibold text-zinc-400">
              {isInParlay ? '' : 'cuota'}
            </span>
            <span className="font-extrabold">
              {formatOdds(pick.decimalOdds, oddsFormat)}
            </span>
            {isInParlay ? (
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            ) : (
              <Plus className="w-3 h-3 text-emerald-400" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
