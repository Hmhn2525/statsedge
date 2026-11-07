import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import type { MatchSummary, ParlayLeg } from './types';
import type { OddsFormat } from './utils/oddsFormat';
import { formatOdds } from './utils/oddsFormat';
import { fetchMatches, API_BASE } from './services/api';
import { Navbar } from './components/Navbar';
import { MainDashboard } from './modules/MainDashboard';
import { StatisticalLab } from './modules/StatisticalLab';
import { FloatingParlaySlip } from './components/FloatingParlaySlip';
import { Activity, Sparkles, ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState<'matches' | 'picks' | 'lab'>('matches');
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL');
  const [oddsFormat, setOddsFormat] = useState<OddsFormat>('DECIMAL');
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Carrito Flotante de Parlays
  const [parlayLegs, setParlayLegs] = useState<ParlayLeg[]>([]);

  const loadMatches = () => {
    setLoading(true);
    fetchMatches(selectedLeague, 'ALL')
      .then((data) => {
        setMatches(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      await fetch(`${API_BASE}/matches/sync`, { method: 'POST' });
      loadMatches();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [selectedLeague]);

  const handleToggleOddsFormat = () => {
    setOddsFormat((prev) => (prev === 'DECIMAL' ? 'AMERICAN' : 'DECIMAL'));
  };

  const handleAddLeg = (leg: ParlayLeg) => {
    const exists = parlayLegs.some(
      (l) =>
        l.match_id === leg.match_id &&
        l.market_type === leg.market_type &&
        l.selection_code === leg.selection_code
    );
    if (!exists) {
      setParlayLegs((prev) => [...prev, leg]);
    }
  };

  const handleRemoveLeg = (idx: number) => {
    setParlayLegs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClearSlip = () => {
    setParlayLegs([]);
  };

  const valuePicks = matches.flatMap((m) =>
    m.evaluations
      .filter((ev) => ev.signal_classification === 'CANDIDATE_VALUE' || ev.expected_value_nominal > 0.015)
      .map((ev) => ({ match: m, evaluation: ev }))
  );

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Barra Superior con Carrusel de Ligas y Switch de Momios */}
      <Navbar
        selectedLeague={selectedLeague}
        onLeagueChange={setSelectedLeague}
        oddsFormat={oddsFormat}
        onToggleOddsFormat={handleToggleOddsFormat}
        onSyncData={handleSyncData}
        isSyncing={isSyncing}
        parlayCount={parlayLegs.length}
        onOpenParlays={() => {}}
      />

      {/* Contenido Principal Ampliado (max-w-7xl para Vista Dividida Sofascore) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4">
        {/* PESTAÑA 1: PARTIDOS (VISTA DIVIDIDA SOFASCORE) */}
        {activeMainTab === 'matches' && (
          <MainDashboard
            matches={matches}
            loading={loading}
            oddsFormat={oddsFormat}
            onAddLeg={handleAddLeg}
            onRefreshMatches={loadMatches}
          />
        )}

        {/* PESTAÑA 2: PICKS CON VALOR IA (+EV) */}
        {activeMainTab === 'picks' && (
          <div className="space-y-4 pb-24">
            <div className="bg-[#121820] border border-[#1f2a37] rounded-2xl p-4">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Selecciones con Ventaja Estadística (+EV)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Oportunidades donde la probabilidad estimada por el modelo supera la probabilidad implícita sin margen de la cuota.
              </p>
            </div>

            {valuePicks.length === 0 ? (
              <div className="p-12 text-center bg-[#121820] rounded-2xl border border-[#1f2a37] text-slate-400 text-xs">
                No hay discrepancias positivas en esta liga por ahora. Las cuotas actuales están alineadas con el modelo.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {valuePicks.map(({ match, evaluation }, idx) => {
                  const homeShort = match.home_short_name || match.home_team_name;
                  const awayShort = match.away_short_name || match.away_team_name;
                  const pickLabel =
                    evaluation.selection_code === 'HOME'
                      ? `Victoria ${homeShort}`
                      : evaluation.selection_code === 'AWAY'
                      ? `Victoria ${awayShort}`
                      : evaluation.selection_code === 'DRAW'
                      ? 'Empate'
                      : `${evaluation.market_type} · ${evaluation.selection_code}`;

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="bg-[#121820] border border-emerald-500/35 rounded-2xl p-4 flex flex-col justify-between shadow-lg hover:border-emerald-400 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
                          <span className="font-semibold text-emerald-400">
                            {match.competition_name}
                          </span>
                          <span className="text-slate-950 font-extrabold bg-emerald-400 px-2 py-0.5 rounded text-[10px] font-mono">
                            +{(evaluation.expected_value_nominal * 100).toFixed(1)}% EV
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 font-extrabold text-white text-sm mb-3">
                          {match.home_team_logo && (
                            <img src={match.home_team_logo} className="w-5 h-5 object-contain" alt="" />
                          )}
                          <span className="truncate">{match.home_team_name}</span>
                          <span className="text-slate-500 text-xs">vs</span>
                          <span className="truncate">{match.away_team_name}</span>
                          {match.away_team_logo && (
                            <img src={match.away_team_logo} className="w-5 h-5 object-contain" alt="" />
                          )}
                        </div>

                        <div className="p-3 bg-[#0b0f14] rounded-xl border border-[#1f2a37] flex items-center justify-between mb-3">
                          <div>
                            <span className="text-[10px] text-slate-400 block">
                              Selección ({evaluation.bookmaker_code}):
                            </span>
                            <span className="text-xs font-extrabold text-emerald-400">
                              {pickLabel}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Momio:</span>
                            <span className="text-base font-black font-mono text-white">
                              {formatOdds(evaluation.decimal_odds, oddsFormat)}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          Modelo IA:{' '}
                          <strong className="text-emerald-400">
                            {(evaluation.model_prob * 100).toFixed(0)}%
                          </strong>{' '}
                          vs Mercado justo:{' '}
                          <strong>{(evaluation.fair_market_prob * 100).toFixed(0)}%</strong>.
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#1f2a37] flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-400">
                          Kelly 0.25x: {(evaluation.recommended_kelly_fraction * 100).toFixed(1)}%
                        </span>

                        <button
                          onClick={() =>
                            handleAddLeg({
                              match_id: match.id,
                              market_type: evaluation.market_type,
                              selection_code: evaluation.selection_code,
                              decimal_odds: evaluation.decimal_odds,
                            })
                          }
                          className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-extrabold shadow-md shadow-emerald-500/20 cursor-pointer transition"
                        >
                          + Agregar al Boleto
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3: LABORATORIO DE RENDIMIENTO Y CALIBRACIÓN */}
        {activeMainTab === 'lab' && (
          <div className="pb-24">
            <StatisticalLab />
          </div>
        )}
      </main>

      {/* BOLETO FLOTANTE DE PARLAY */}
      <FloatingParlaySlip
        legs={parlayLegs}
        matches={matches}
        oddsFormat={oddsFormat}
        onRemoveLeg={handleRemoveLeg}
        onClearSlip={handleClearSlip}
      />

      {/* BARRA INFERIOR DE NAVEGACIÓN (SOFASCORE EMERALD) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#0b0f14]/95 border-t border-[#1f2a37] backdrop-blur-md">
        <div className="max-w-md mx-auto grid grid-cols-3 py-1 text-center">
          {[
            { id: 'matches', label: 'Partidos & En Vivo', icon: Activity },
            { id: 'picks', label: 'Picks +EV IA', icon: Sparkles, badge: valuePicks.length > 0 },
            { id: 'lab', label: 'Backtesting Lab', icon: ShieldCheck },
          ].map((navItem) => {
            const Icon = navItem.icon;
            const active = activeMainTab === navItem.id;
            return (
              <button
                key={navItem.id}
                onClick={() => setActiveMainTab(navItem.id as 'matches' | 'picks' | 'lab')}
                className={`relative py-2 flex flex-col items-center gap-1 transition cursor-pointer ${
                  active ? 'text-emerald-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    className="absolute top-0 w-10 h-0.5 bg-emerald-400 rounded-full"
                  />
                )}
                <Icon className="w-5 h-5" />
                <span className="text-[10px]">{navItem.label}</span>
                {navItem.badge && (
                  <span className="absolute top-1.5 right-8 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default App;
