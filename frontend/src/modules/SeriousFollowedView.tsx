import React, { useState } from 'react';
import type { MatchSummary, ParlayLeg } from '../types';
import type { UnifiedPickItem } from '../utils/picksEngine';
import type { OddsFormat } from '../utils/oddsFormat';
import { SeriousPickCard } from '../components/SeriousPickCard';
import { RiskBuilderLab } from './RiskBuilderLab';
import { Heart, Scale, Sparkles, Layers } from 'lucide-react';

interface SeriousFollowedViewProps {
  picks: UnifiedPickItem[];
  matches: MatchSummary[];
  oddsFormat: OddsFormat;
  followedIds: string[];
  parlayLegs: ParlayLeg[];
  parlayPickIds: Set<string>;
  onToggleFollow: (pickId: string, e?: React.MouseEvent) => void;
  onToggleParlay: (pick: UnifiedPickItem, e?: React.MouseEvent) => void;
  onRemoveLeg: (idx: number) => void;
  onClearSlip: () => void;
  onSetPresetLegs: (legs: ParlayLeg[]) => void;
  onOpenAnalysis: (pick: UnifiedPickItem) => void;
  onGoToPicks: () => void;
}

export const SeriousFollowedView: React.FC<SeriousFollowedViewProps> = ({
  picks,
  matches,
  oddsFormat,
  followedIds,
  parlayLegs,
  parlayPickIds,
  onToggleFollow,
  onToggleParlay,
  onRemoveLeg,
  onClearSlip,
  onSetPresetLegs,
  onOpenAnalysis,
  onGoToPicks,
}) => {
  const [subTab, setSubTab] = useState<'FOLLOWED' | 'PARLAY'>(
    parlayLegs.length > 0 && followedIds.length === 0 ? 'PARLAY' : 'FOLLOWED'
  );

  const followedPicks = picks.filter((p) => followedIds.includes(p.id));

  const handleLoadFollowedIntoParlay = () => {
    const legs = followedPicks.slice(0, 6).map((p) => p.parlayLeg);
    if (legs.length > 0) {
      onSetPresetLegs(legs);
      setSubTab('PARLAY');
    }
  };

  return (
    <div className="space-y-5 pb-28">
      {/* Encabezado Seguidos & Parlays */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Seguidos
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-zinc-400">
          Tus picks guardados en seguimiento y auditor de Parlays con correlación SGP
        </p>
      </div>

      {/* Selector Segmentado: Mis Picks (❤️) | Constructor Parlay (Scale) */}
      <div className="grid grid-cols-2 p-1 rounded-full bg-[#161a20] border border-white/[0.07]">
        <button
          type="button"
          onClick={() => setSubTab('FOLLOWED')}
          className={`py-2.5 px-3 rounded-full text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
            subTab === 'FOLLOWED'
              ? 'bg-white text-zinc-950 shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Mis Seguidos ({followedPicks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('PARLAY')}
          className={`py-2.5 px-3 rounded-full text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
            subTab === 'PARLAY'
              ? 'bg-white text-zinc-950 shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Parlay & Riesgo ({parlayLegs.length})</span>
        </button>
      </div>

      {subTab === 'FOLLOWED' ? (
        followedPicks.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 p-3.5 rounded-2xl bg-[#0d1115] border border-emerald-500/25">
              <div className="text-xs text-zinc-300">
                Tienes <span className="text-white font-black">{followedPicks.length}</span>{' '}
                picks en seguimiento activo.
              </div>
              <button
                type="button"
                onClick={handleLoadFollowedIntoParlay}
                className="px-3.5 py-1.5 rounded-full bg-emerald-500 text-zinc-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Combinar en Parlay</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {followedPicks.map((pick) => (
                <SeriousPickCard
                  key={pick.id}
                  pick={pick}
                  oddsFormat={oddsFormat}
                  isFollowed={true}
                  isInParlay={parlayPickIds.has(pick.id)}
                  onToggleFollow={(id, e) => {
                    e.stopPropagation();
                    onToggleFollow(id, e);
                  }}
                  onToggleParlay={(p, e) => {
                    e.stopPropagation();
                    onToggleParlay(p, e);
                  }}
                  onOpenAnalysis={onOpenAnalysis}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-[#0d1115] border border-white/[0.07] text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
              <Heart className="w-7 h-7 text-rose-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-white">
                Aún no has guardado picks en Seguidos
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
                Toca el icono de corazón (❤️) en cualquier tarjeta de Inicio o Picks para dar seguimiento en vivo o armar tu combinación.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => {
                  const top3 = picks.slice(0, 3);
                  top3.forEach((p) => onToggleFollow(p.id));
                }}
                className="px-4 py-2.5 rounded-full bg-emerald-500 text-zinc-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Seguir Top 3 Destacados del Día</span>
              </button>

              <button
                type="button"
                onClick={onGoToPicks}
                className="px-4 py-2.5 rounded-full bg-zinc-900 border border-white/15 text-white text-xs font-bold cursor-pointer"
              >
                Ir a Predicciones
              </button>
            </div>
          </div>
        )
      ) : (
        <RiskBuilderLab
          matches={matches}
          legs={parlayLegs}
          oddsFormat={oddsFormat}
          onRemoveLeg={onRemoveLeg}
          onClearSlip={onClearSlip}
          onSetPresetLegs={onSetPresetLegs}
          onGoToPicks={onGoToPicks}
        />
      )}
    </div>
  );
};
