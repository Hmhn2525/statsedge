import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { MatchSummary, ParlayLeg } from '../types';
import type { OddsFormat } from '../utils/oddsFormat';
import { formatOdds, formatPercent, getShortTeamName } from '../utils/oddsFormat';
import { saveOddsBatch, parseClipboardOdds } from '../services/api';
import {
  Badge,
  SofascoreRatingBadge,
  SofascoreStatBar,
  AnimatedTabs,
} from './ui/primitives';
import {
  X,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Plus,
  Activity,
  BarChart3,
  Scale,
  Swords,
  Flame,
} from 'lucide-react';

interface SofascoreMatchCenterProps {
  match: MatchSummary;
  oddsFormat: OddsFormat;
  onClose?: () => void;
  isMobileDrawer?: boolean;
  onAddLeg: (leg: ParlayLeg) => void;
  onRefreshMatch: () => void;
}

export const SofascoreMatchCenter: React.FC<SofascoreMatchCenterProps> = ({
  match,
  oddsFormat,
  onClose,
  isMobileDrawer = false,
  onAddLeg,
  onRefreshMatch,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'odds'>('overview');

  // Estado para actualizar cuotas de Draftea manualmente o por portapapeles
  const [homeOdd, setHomeOdd] = useState('1.95');
  const [drawOdd, setDrawOdd] = useState('3.40');
  const [awayOdd, setAwayOdd] = useState('3.80');
  const [clipText, setClipText] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const isFinished = match.status === 'FINISHED';
  const stats = match.google_stats || {};
  const isObserved = stats.stats_type === 'MATCH_OBSERVED';

  const homeShort = getShortTeamName(match.home_team_name, match.home_short_name);
  const awayShort = getShortTeamName(match.away_team_name, match.away_short_name);

  const homeRating: number = stats.sofascore_home_rating || 7.18;
  const awayRating: number = stats.sofascore_away_rating || 7.04;
  const xgHome: number = stats.xg_home ?? match.home_xg ?? 1.45;
  const xgAway: number = stats.xg_away ?? match.away_xg ?? 1.12;
  const bigChancesHome: number = stats.big_chances_home ?? 2;
  const bigChancesAway: number = stats.big_chances_away ?? 2;

  const momentumData: { minute: string; value: number }[] = stats.attack_momentum || [];
  const h2h = stats.h2h || { home_wins: 4, draws: 3, away_wins: 3 };

  // Evaluaciones 1X2
  const getEval = (market: string, sel: string, book?: string) =>
    match.evaluations.find(
      (e) =>
        e.market_type === market &&
        e.selection_code === sel &&
        (!book || e.bookmaker_code === book)
    ) || match.evaluations.find((e) => e.market_type === market && e.selection_code === sel);

  const homeEval = getEval('1X2', 'HOME', 'DRAFTEA') || getEval('1X2', 'HOME');
  const drawEval = getEval('1X2', 'DRAW', 'DRAFTEA') || getEval('1X2', 'DRAW');
  const awayEval = getEval('1X2', 'AWAY', 'DRAFTEA') || getEval('1X2', 'AWAY');

  const overEval = getEval('OVER_UNDER', 'OVER');
  const underEval = getEval('OVER_UNDER', 'UNDER');
  const bttsYesEval = getEval('BTTS', 'YES');
  const bttsNoEval = getEval('BTTS', 'NO');

  const pHome = Math.round((homeEval?.model_prob || 0.45) * 100);
  const pDraw = Math.round((drawEval?.model_prob || 0.27) * 100);
  const pAway = Math.max(1, 100 - pHome - pDraw);

  const handleSaveDraftea = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveOddsBatch(
        match.id,
        [
          { market_type: '1X2', selection_code: 'HOME', decimal_odds: parseFloat(homeOdd) },
          { market_type: '1X2', selection_code: 'DRAW', decimal_odds: parseFloat(drawOdd) },
          { market_type: '1X2', selection_code: 'AWAY', decimal_odds: parseFloat(awayOdd) },
        ],
        'DRAFTEA'
      );
      setSavedToast(true);
      onRefreshMatch();
      setTimeout(() => setSavedToast(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleParseClip = async () => {
    if (!clipText.trim()) return;
    const res = await parseClipboardOdds(clipText);
    for (const item of res.detected_items) {
      if (item.selection_code === 'HOME') setHomeOdd(item.decimal_odds.toString());
      if (item.selection_code === 'DRAW') setDrawOdd(item.decimal_odds.toString());
      if (item.selection_code === 'AWAY') setAwayOdd(item.decimal_odds.toString());
    }
  };

  const renderFormPill = (res: string, i: number) => {
    const color =
      res === 'G'
        ? 'bg-emerald-500 text-slate-950'
        : res === 'E'
        ? 'bg-amber-400 text-slate-950'
        : 'bg-rose-500/90 text-white';
    return (
      <span
        key={i}
        className={`w-4 h-4 rounded text-[9px] font-extrabold flex items-center justify-center ${color}`}
      >
        {res}
      </span>
    );
  };

  const content = (
    <div className="bg-[#121820] border border-[#1f2a37] rounded-2xl overflow-hidden flex flex-col shadow-2xl">
      {/* CABECERA SOFASCORE */}
      <div className="bg-gradient-to-b from-[#162228] to-[#121820] p-4 border-b border-[#1f2a37]">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
              {match.competition_name}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-[11px] text-slate-400">{match.round_name || 'Fase Regular'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isFinished ? 'default' : 'emerald'}>
              {isFinished ? 'FINALIZADO' : 'PRE-PARTIDO IA'}
            </Badge>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg bg-[#1b2430] text-slate-400 hover:text-white transition"
                aria-label="Cerrar panel"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* MARCADOR CENTRAL Y ESCUDOS OFICIALES */}
        <div className="grid grid-cols-3 items-center gap-2 py-2">
          {/* Equipo Local */}
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-[#18222d] border border-[#263545] p-2 flex items-center justify-center shadow-md">
                {match.home_team_logo ? (
                  <img
                    src={match.home_team_logo}
                    alt={match.home_team_name}
                    className="w-10 h-10 object-contain"
                  />
                ) : (
                  <span className="text-sm font-bold">{homeShort.slice(0, 3)}</span>
                )}
              </div>
              <div className="absolute -bottom-1.5 -right-2">
                <SofascoreRatingBadge rating={homeRating} />
              </div>
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-white mt-2.5 leading-tight">
              {match.home_team_name}
            </span>
            <div className="flex items-center gap-1 mt-1">
              {match.home_rank && (
                <span className="text-[10px] text-slate-400 font-semibold bg-[#1a2430] px-1.5 py-0.5 rounded">
                  Pos. {match.home_rank}
                </span>
              )}
              {stats.home_record && (
                <span className="text-[10px] text-emerald-400/90 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  {stats.home_record}
                </span>
              )}
            </div>
            {/* Forma Reciente */}
            {match.home_form && match.home_form.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5">
                {match.home_form.map((r, idx) => renderFormPill(r, idx))}
              </div>
            )}
          </div>

          {/* Centro: Marcador o Hora + xG */}
          <div className="flex flex-col items-center justify-center">
            {isFinished ? (
              <>
                <div className="flex items-center gap-2.5 text-3xl font-black font-mono text-white tracking-tight">
                  <span>{match.home_score}</span>
                  <span className="text-slate-600 text-xl">-</span>
                  <span className="text-emerald-400">{match.away_score}</span>
                </div>
                <div className="mt-1.5 px-2.5 py-0.5 rounded-full bg-[#1a2430] border border-[#263545] text-[10px] font-mono text-slate-300">
                  xG: <strong className="text-emerald-400">{xgHome.toFixed(2)}</strong> -{' '}
                  <strong className="text-teal-300">{xgAway.toFixed(2)}</strong>
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-extrabold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-xl">
                  {new Date(match.kickoff_time).toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <span className="text-[10px] text-slate-400 mt-1">
                  {new Date(match.kickoff_time).toLocaleDateString('es-MX', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                <div className="mt-1.5 px-2 py-0.5 rounded-md bg-[#1a2430] text-[10px] font-mono text-slate-300">
                  xG Proy: <strong className="text-emerald-400">{xgHome.toFixed(2)}</strong> vs{' '}
                  <strong className="text-teal-300">{xgAway.toFixed(2)}</strong>
                </div>
              </>
            )}
          </div>

          {/* Equipo Visitante */}
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-[#18222d] border border-[#263545] p-2 flex items-center justify-center shadow-md">
                {match.away_team_logo ? (
                  <img
                    src={match.away_team_logo}
                    alt={match.away_team_name}
                    className="w-10 h-10 object-contain"
                  />
                ) : (
                  <span className="text-sm font-bold">{awayShort.slice(0, 3)}</span>
                )}
              </div>
              <div className="absolute -bottom-1.5 -right-2">
                <SofascoreRatingBadge rating={awayRating} />
              </div>
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-white mt-2.5 leading-tight">
              {match.away_team_name}
            </span>
            <div className="flex items-center gap-1 mt-1">
              {match.away_rank && (
                <span className="text-[10px] text-slate-400 font-semibold bg-[#1a2430] px-1.5 py-0.5 rounded">
                  Pos. {match.away_rank}
                </span>
              )}
              {stats.away_record && (
                <span className="text-[10px] text-teal-300/90 font-mono bg-teal-500/10 px-1.5 py-0.5 rounded">
                  {stats.away_record}
                </span>
              )}
            </div>
            {match.away_form && match.away_form.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5">
                {match.away_form.map((r, idx) => renderFormPill(r, idx))}
              </div>
            )}
          </div>
        </div>

        {/* Goleadores en partido finalizado */}
        {isFinished && match.scorers && match.scorers.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-[#1f2a37]/80 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
            <div className="space-y-0.5">
              {match.scorers
                .filter((s) => s.team === 'home')
                .map((s, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-emerald-400">⚽</span>
                    <span>{s.player}</span>
                    <span className="text-slate-500 font-mono text-[10px]">{s.minute}</span>
                  </div>
                ))}
            </div>
            <div className="space-y-0.5 text-right">
              {match.scorers
                .filter((s) => s.team === 'away')
                .map((s, i) => (
                  <div key={i} className="flex items-center justify-end gap-1">
                    <span className="text-slate-300">{s.player}</span>
                    <span className="text-slate-500 font-mono text-[10px]">{s.minute}</span>
                    <span className="text-teal-300">⚽</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* NAVEGACIÓN INTERNA ANIMADA CON SHADCN + MOTION */}
      <div className="px-3 pt-3 bg-[#121820] flex justify-center">
        <AnimatedTabs
          layoutGroupId={`match-center-tab-${isMobileDrawer ? 'mob' : 'desk'}`}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as 'overview' | 'stats' | 'odds')}
          tabs={[
            { id: 'overview', label: 'Momentum & IA' },
            { id: 'stats', label: 'Estadísticas' },
            { id: 'odds', label: 'Momios & Draftea' },
          ]}
        />
      </div>

      {/* CONTENIDO DE PESTAÑA CON TRANSICIÓN SUAVE */}
      <div className="p-4 overflow-y-auto max-h-[68vh] lg:max-h-[calc(100vh-290px)] space-y-4">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {/* WIDGET 1: ATTACK MOMENTUM SOFASCORE */}
              <div className="bg-[#161e27] border border-[#222f3d] rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-emerald-400" />
                    Attack Momentum {isFinished ? '(Observado)' : '(Proyección de Presión IA)'}
                  </span>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <span className="w-2 h-2 rounded-xs bg-emerald-500" /> {homeShort}
                    </span>
                    <span className="flex items-center gap-1 text-teal-300 font-semibold">
                      <span className="w-2 h-2 rounded-xs bg-teal-400" /> {awayShort}
                    </span>
                  </div>
                </div>

                {/* Gráfico de Barras Bidireccional estilo Sofascore */}
                <div className="relative h-28 bg-[#11171f] rounded-lg border border-[#1f2a37] px-2 py-2 flex items-center">
                  {/* Línea central cero */}
                  <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-slate-700/70 z-0" />
                  <div className="w-full h-full grid grid-cols-18 gap-1 items-center z-10">
                    {momentumData.map((pt, i) => {
                      const isPos = pt.value >= 0;
                      const heightPct = Math.min(48, Math.max(6, Math.abs(pt.value) * 0.48));
                      return (
                        <div
                          key={i}
                          className="h-full flex flex-col justify-center items-center relative group"
                        >
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${heightPct}%` }}
                            transition={{
                              type: 'spring',
                              stiffness: 180,
                              damping: 22,
                              delay: i * 0.015,
                            }}
                            style={{
                              position: 'absolute',
                              bottom: isPos ? '50%' : undefined,
                              top: isPos ? undefined : '50%',
                            }}
                            className={`w-full rounded-xs ${
                              isPos
                                ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                                : 'bg-gradient-to-b from-teal-500 to-cyan-400'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1 px-1">
                  <span>1'</span>
                  <span>25'</span>
                  <span>MT (45')</span>
                  <span>70'</span>
                  <span>90'</span>
                </div>
              </div>

              {/* WIDGET 2: PROBABILIDAD REAL DIXON-COLES (BARRA TRICOLOR SOFASCORE) */}
              <div className="bg-[#161e27] border border-[#222f3d] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Probabilidad del Modelo (Dixon-Coles + Elo)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Sin Margen
                  </span>
                </div>

                <div className="grid grid-cols-3 text-center text-xs font-bold">
                  <div className="text-left">
                    <span className="text-emerald-400 font-mono text-sm">{pHome}%</span>
                    <span className="block text-[10px] text-slate-400">{homeShort}</span>
                  </div>
                  <div>
                    <span className="text-slate-300 font-mono text-sm">{pDraw}%</span>
                    <span className="block text-[10px] text-slate-400">Empate</span>
                  </div>
                  <div className="text-right">
                    <span className="text-teal-300 font-mono text-sm">{pAway}%</span>
                    <span className="block text-[10px] text-slate-400">{awayShort}</span>
                  </div>
                </div>

                <div className="h-3 rounded-full bg-[#11171f] overflow-hidden flex gap-0.5 p-0.5 border border-[#1f2a37]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pHome}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                    className="bg-emerald-500 rounded-l-full"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pDraw}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                    className="bg-slate-500"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pAway}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                    className="bg-teal-400 rounded-r-full"
                  />
                </div>
              </div>

              {/* WIDGET 3: INSIGHT DE VALOR IA */}
              {match.friendly_insight && (
                <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {match.friendly_insight.title}
                    </span>
                    <Badge variant="emerald">Pick IA</Badge>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {match.friendly_insight.text}
                  </p>
                  <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Enfoque sugerido:</span>
                    <span className="font-bold text-emerald-300">
                      {match.friendly_insight.recommended_pick}
                    </span>
                  </div>
                </div>
              )}

              {/* WIDGET 4: H2H ENFRENTAMIENTOS DIRECTOS */}
              <div className="bg-[#161e27] border border-[#222f3d] rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Swords className="w-4 h-4 text-emerald-400" />
                    Historial Directo (Últimos {h2h.home_wins + h2h.draws + h2h.away_wins} Duelos)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#11171f] border border-emerald-500/25 rounded-lg p-2">
                    <span className="text-base font-extrabold font-mono text-emerald-400">
                      {h2h.home_wins}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      Victorias {homeShort}
                    </span>
                  </div>
                  <div className="bg-[#11171f] border border-[#1f2a37] rounded-lg p-2">
                    <span className="text-base font-extrabold font-mono text-slate-300">
                      {h2h.draws}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">Empates</span>
                  </div>
                  <div className="bg-[#11171f] border border-teal-500/25 rounded-lg p-2">
                    <span className="text-base font-extrabold font-mono text-teal-300">
                      {h2h.away_wins}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      Victorias {awayShort}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="bg-[#161e27] border border-[#222f3d] rounded-xl p-4 space-y-2"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#222f3d]">
                <div className="flex items-center gap-1.5">
                  {match.home_team_logo && (
                    <img src={match.home_team_logo} className="w-4 h-4 object-contain" alt="" />
                  )}
                  <span className="text-xs font-bold text-emerald-400">{homeShort}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                  {isObserved ? 'Estadísticas Finales' : 'Promedios por Partido'}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-teal-300">{awayShort}</span>
                  {match.away_team_logo && (
                    <img src={match.away_team_logo} className="w-4 h-4 object-contain" alt="" />
                  )}
                </div>
              </div>

              <SofascoreStatBar
                label="Expected Goals (xG)"
                homeVal={xgHome}
                awayVal={xgAway}
                isDecimal
              />
              <SofascoreStatBar
                label="Posesión de Balón"
                homeVal={stats.posesion_home ?? 50}
                awayVal={stats.posesion_away ?? 50}
                unit="%"
              />
              <SofascoreStatBar
                label="Grandes Ocasiones"
                homeVal={bigChancesHome}
                awayVal={bigChancesAway}
              />
              <SofascoreStatBar
                label="Remates Totales"
                homeVal={stats.remates_home ?? 12}
                awayVal={stats.remates_away ?? 10}
                isDecimal={!isObserved}
              />
              <SofascoreStatBar
                label="Remates al Arco"
                homeVal={stats.remates_arco_home ?? 5}
                awayVal={stats.remates_arco_away ?? 4}
                isDecimal={!isObserved}
              />
              <SofascoreStatBar
                label="Pases Completados"
                homeVal={stats.pases_home ?? 450}
                awayVal={stats.pases_away ?? 420}
              />
              <SofascoreStatBar
                label="Precisión de Pases"
                homeVal={stats.precision_pases_home ?? 85}
                awayVal={stats.precision_pases_away ?? 83}
                unit="%"
              />
              <SofascoreStatBar
                label="Tiros de Esquina"
                homeVal={stats.corners_home ?? 5}
                awayVal={stats.corners_away ?? 4}
                isDecimal={!isObserved}
              />
              <SofascoreStatBar
                label="Faltas Cometidas"
                homeVal={stats.faltas_home ?? 11}
                awayVal={stats.faltas_away ?? 12}
                isDecimal={!isObserved}
              />
            </motion.div>
          )}

          {activeTab === 'odds' && (
            <motion.div
              key="odds"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {/* MERCADO 1X2 */}
              <div className="bg-[#161e27] border border-[#222f3d] rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    Ganador del Partido (1X2)
                  </span>
                  <span className="text-[10px] text-slate-400">Toca para agregar al Boleto</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { code: 'HOME', label: `1 (${homeShort})`, ev: homeEval },
                    { code: 'DRAW', label: 'X (Empate)', ev: drawEval },
                    { code: 'AWAY', label: `2 (${awayShort})`, ev: awayEval },
                  ].map(({ code, label, ev }) => {
                    if (!ev) return null;
                    const hasEdge = ev.expected_value_nominal > 0.02;
                    return (
                      <button
                        key={code}
                        onClick={() =>
                          onAddLeg({
                            match_id: match.id,
                            market_type: '1X2',
                            selection_code: code,
                            decimal_odds: ev.decimal_odds,
                          })
                        }
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between group ${
                          hasEdge
                            ? 'bg-emerald-950/30 border-emerald-500/50 hover:border-emerald-400'
                            : 'bg-[#11171f] border-[#222f3d] hover:border-emerald-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] font-bold text-slate-400 truncate">
                            {label}
                          </span>
                          <Plus className="w-3 h-3 text-slate-500 group-hover:text-emerald-400" />
                        </div>
                        <div className="my-1 text-base font-extrabold font-mono text-emerald-400">
                          {formatOdds(ev.decimal_odds, oddsFormat)}
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">
                            IA: {formatPercent(ev.model_prob)}
                          </span>
                          {hasEdge && (
                            <span className="text-emerald-400 font-bold">
                              +{(ev.expected_value_nominal * 100).toFixed(1)}% EV
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MERCADOS SECUNDARIOS: OVER/UNDER 2.5 Y AMBOS ANOTAN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Totales 2.5 */}
                <div className="bg-[#161e27] border border-[#222f3d] rounded-xl p-3">
                  <span className="text-xs font-bold text-white block mb-2">
                    Total de Goles (2.5)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { code: 'OVER', label: 'Más de 2.5', ev: overEval },
                      { code: 'UNDER', label: 'Menos de 2.5', ev: underEval },
                    ].map(({ code, label, ev }) =>
                      ev ? (
                        <button
                          key={code}
                          onClick={() =>
                            onAddLeg({
                              match_id: match.id,
                              market_type: 'OVER_UNDER',
                              selection_code: code,
                              line_value: 2.5,
                              decimal_odds: ev.decimal_odds,
                            })
                          }
                          className="p-2 rounded-lg bg-[#11171f] border border-[#222f3d] hover:border-emerald-500/40 text-center transition"
                        >
                          <span className="text-[10px] text-slate-400 block">{label}</span>
                          <span className="text-sm font-extrabold font-mono text-emerald-400">
                            {formatOdds(ev.decimal_odds, oddsFormat)}
                          </span>
                          <span className="block text-[9px] text-slate-500">
                            IA {formatPercent(ev.model_prob)}
                          </span>
                        </button>
                      ) : null
                    )}
                  </div>
                </div>

                {/* Ambos Anotan */}
                <div className="bg-[#161e27] border border-[#222f3d] rounded-xl p-3">
                  <span className="text-xs font-bold text-white block mb-2">
                    Ambos Equipos Anotan
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { code: 'YES', label: 'Sí (BTTS)', ev: bttsYesEval },
                      { code: 'NO', label: 'No', ev: bttsNoEval },
                    ].map(({ code, label, ev }) =>
                      ev ? (
                        <button
                          key={code}
                          onClick={() =>
                            onAddLeg({
                              match_id: match.id,
                              market_type: 'BTTS',
                              selection_code: code,
                              decimal_odds: ev.decimal_odds,
                            })
                          }
                          className="p-2 rounded-lg bg-[#11171f] border border-[#222f3d] hover:border-emerald-500/40 text-center transition"
                        >
                          <span className="text-[10px] text-slate-400 block">{label}</span>
                          <span className="text-sm font-extrabold font-mono text-emerald-400">
                            {formatOdds(ev.decimal_odds, oddsFormat)}
                          </span>
                          <span className="block text-[9px] text-slate-500">
                            IA {formatPercent(ev.model_prob)}
                          </span>
                        </button>
                      ) : null
                    )}
                  </div>
                </div>
              </div>

              {/* ACTUALIZAR CUOTAS DE DRAFTEA MANUALMENTE */}
              <div className="bg-[#161e27] border border-[#222f3d] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    Ingresar Momios de Draftea en Vivo
                  </span>
                  <Badge variant="outline">Sin Scraping</Badge>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={clipText}
                    onChange={(e) => setClipText(e.target.value)}
                    placeholder="Pegar ej: Local 1.95, Empate 3.45, Visita 3.90"
                    className="flex-1 bg-[#11171f] border border-[#222f3d] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleParseClip}
                    className="px-3 py-1.5 bg-[#1f2a37] hover:bg-slate-700 text-xs font-bold text-emerald-400 rounded-lg transition"
                  >
                    Extraer
                  </button>
                </div>

                <form onSubmit={handleSaveDraftea} className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      1 ({homeShort})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={homeOdd}
                      onChange={(e) => setHomeOdd(e.target.value)}
                      className="w-full bg-[#11171f] border border-[#222f3d] rounded-lg px-2 py-1.5 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">X (Empate)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={drawOdd}
                      onChange={(e) => setDrawOdd(e.target.value)}
                      className="w-full bg-[#11171f] border border-[#222f3d] rounded-lg px-2 py-1.5 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      2 ({awayShort})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={awayOdd}
                      onChange={(e) => setAwayOdd(e.target.value)}
                      className="w-full bg-[#11171f] border border-[#222f3d] rounded-lg px-2 py-1.5 text-xs font-mono text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="col-span-3 mt-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs transition shadow-md shadow-emerald-500/15"
                  >
                    {saving ? 'Recalculando EV...' : 'Guardar Cuotas y Evaluar Valor Esperado'}
                  </button>
                </form>

                {savedToast && (
                  <div className="p-2 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Momios de Draftea actualizados y evaluados contra el modelo.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  if (isMobileDrawer) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end justify-center lg:hidden">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="w-full max-w-lg max-h-[92vh] overflow-hidden rounded-t-3xl"
          >
            {content}
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  return content;
};
