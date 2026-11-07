import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import type { MatchSummary, ParlayLeg } from './types';
import type { OddsFormat } from './utils/oddsFormat';
import { fetchMatches, API_BASE } from './services/api';
import { Navbar } from './components/Navbar';
import { MainDashboard } from './modules/MainDashboard';
import { TopPicksView } from './modules/TopPicksView';
import { RiskBuilderLab } from './modules/RiskBuilderLab';
import { FloatingParlaySlip } from './components/FloatingParlaySlip';
import { Activity, Sparkles, Scale, Smartphone, Monitor, Layers } from 'lucide-react';

export const App: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState<'matches' | 'picks' | 'lab'>('matches');
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL');
  const [oddsFormat, setOddsFormat] = useState<OddsFormat>('DECIMAL');
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isMobileSim, setIsMobileSim] = useState<boolean>(false);

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

  // Toggle 1-Tap: si ya está, la quita; si hay otra del mismo partido y mismo mercado, la reemplaza
  const handleToggleLeg = (leg: ParlayLeg) => {
    setParlayLegs((prev) => {
      const exactIndex = prev.findIndex(
        (l) =>
          l.match_id === leg.match_id &&
          l.market_type === leg.market_type &&
          l.selection_code === leg.selection_code
      );
      if (exactIndex >= 0) {
        return prev.filter((_, idx) => idx !== exactIndex);
      }
      const filteredSameMarket = prev.filter(
        (l) => !(l.match_id === leg.match_id && l.market_type === leg.market_type)
      );
      return [...filteredSameMarket, leg];
    });
  };

  const handleRemoveLeg = (idx: number) => {
    setParlayLegs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClearSlip = () => {
    setParlayLegs([]);
  };

  const topPicksCount = matches.filter((m) => m.status !== 'FINISHED').length;

  const appBody = (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Barra Superior Glassy con Carrusel de Ligas y Botón de Vista Celular */}
      <Navbar
        selectedLeague={selectedLeague}
        onLeagueChange={setSelectedLeague}
        oddsFormat={oddsFormat}
        onToggleOddsFormat={handleToggleOddsFormat}
        onSyncData={handleSyncData}
        isSyncing={isSyncing}
        parlayCount={parlayLegs.length}
        onOpenParlays={() => setActiveMainTab('lab')}
        isMobileSim={isMobileSim}
        onToggleMobileSim={() => setIsMobileSim((prev) => !prev)}
      />

      {/* Contenido Principal */}
      <main
        className={`flex-1 w-full mx-auto px-3 sm:px-5 py-4 ${
          isMobileSim ? 'max-w-full' : 'max-w-7xl'
        }`}
      >
        {/* PESTAÑA 1: PARTIDOS (CON BOTONES 1X2 INTERACTIVOS 1-TAP) */}
        {activeMainTab === 'matches' && (
          <MainDashboard
            matches={matches}
            loading={loading}
            oddsFormat={oddsFormat}
            parlayLegs={parlayLegs}
            onToggleLeg={handleToggleLeg}
            onRefreshMatches={loadMatches}
            isMobileSim={isMobileSim}
          />
        )}

        {/* PESTAÑA 2: TOP JUGADAS IA (SIMPLE, EN ESPAÑOL CLARO Y CON RETORNO POR $100) */}
        {activeMainTab === 'picks' && (
          <TopPicksView
            matches={matches}
            oddsFormat={oddsFormat}
            parlayLegs={parlayLegs}
            onToggleLeg={handleToggleLeg}
          />
        )}

        {/* PESTAÑA 3: CONSTRUCTOR & TERMÓMETRO DE RIESGO ACUMULADO */}
        {activeMainTab === 'lab' && (
          <RiskBuilderLab
            matches={matches}
            legs={parlayLegs}
            oddsFormat={oddsFormat}
            onRemoveLeg={handleRemoveLeg}
            onClearSlip={handleClearSlip}
            onSetPresetLegs={(legs) => setParlayLegs(legs)}
            onGoToPicks={() => setActiveMainTab('picks')}
          />
        )}
      </main>

      {/* BOLETO FLOTANTE DE PARLAY (SOLO FUERA DE LA PESTAÑA DE RIESGO O CUANDO HAY JUGADAS) */}
      {activeMainTab !== 'lab' && (
        <FloatingParlaySlip
          legs={parlayLegs}
          matches={matches}
          oddsFormat={oddsFormat}
          onRemoveLeg={handleRemoveLeg}
          onClearSlip={handleClearSlip}
          onOpenRiskLab={() => setActiveMainTab('lab')}
          isMobileSim={isMobileSim}
        />
      )}

      {/* BARRA INFERIOR DE NAVEGACIÓN - SÓLIDA CON MÁXIMO CONTRASTE (SIN TRANSPARENCIAS QUE CHOQUEN CON LAS CARTAS) */}
      <nav
        className={`${
          isMobileSim ? 'sticky' : 'fixed'
        } bottom-0 left-0 right-0 z-40 bg-[#070b10] border-t border-slate-800/90 shadow-[0_-12px_36px_rgba(0,0,0,0.95)]`}
      >
        <div className="max-w-md mx-auto grid grid-cols-3 py-2 px-2 text-center">
          {[
            { id: 'matches', label: 'Partidos', icon: Activity, badge: 0 },
            {
              id: 'picks',
              label: 'Top Jugadas IA',
              icon: Sparkles,
              badge: topPicksCount > 0 ? topPicksCount : 0,
            },
            {
              id: 'lab',
              label: 'Constructor & Riesgo',
              icon: Scale,
              badge: parlayLegs.length,
            },
          ].map((navItem) => {
            const Icon = navItem.icon;
            const active = activeMainTab === navItem.id;
            return (
              <button
                key={navItem.id}
                onClick={() => setActiveMainTab(navItem.id as 'matches' | 'picks' | 'lab')}
                className={`relative py-1.5 px-1 flex flex-col items-center gap-1 transition cursor-pointer rounded-xl ${
                  active
                    ? 'text-emerald-400 font-black bg-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200 font-semibold hover:bg-white/5'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    className="absolute top-0 w-12 h-1 bg-emerald-400 rounded-full shadow-sm shadow-emerald-400"
                  />
                )}
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {navItem.badge > 0 && (
                    <span
                      className={`absolute -top-1.5 -right-3 px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                        navItem.id === 'lab'
                          ? 'bg-emerald-400 text-slate-950'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {navItem.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] tracking-tight">{navItem.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );

  // MODO SIMULADOR DE CELULAR EN VIVO (VENTANA IPHONE INTERACTIVA)
  if (isMobileSim) {
    return (
      <div className="min-h-screen bg-[#04070a] py-4 px-2 flex flex-col items-center justify-start">
        {/* Barra de Control del Simulador Móvil */}
        <div className="w-full max-w-[430px] mb-3 glass-card rounded-2xl p-3 flex items-center justify-between border border-emerald-500/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-white">Simulador Celular En Vivo</div>
              <div className="text-[10px] text-emerald-400">
                412 × 860 px · Diseño Glassy Optimizado
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveMainTab('lab')}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" /> Riesgo ({parlayLegs.length})
            </button>
            <button
              onClick={() => setIsMobileSim(false)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Monitor className="w-3.5 h-3.5" /> Pantalla Completa
            </button>
          </div>
        </div>

        {/* Marco de Smartphone iPhone 16 Pro */}
        <div className="w-full max-w-[424px] h-[850px] rounded-[46px] border-[10px] border-slate-800/95 bg-[#070b10] shadow-[0_0_90px_rgba(16,185,129,0.18)] overflow-hidden flex flex-col relative ring-1 ring-white/15">
          {/* Dynamic Island */}
          <div className="bg-[#070b10] pt-2 pb-1 flex justify-center items-center shrink-0 z-50 border-b border-white/5">
            <div className="w-28 h-5 bg-black rounded-full border border-white/10 flex items-center justify-end px-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500/60 animate-pulse" />
            </div>
          </div>

          {/* Pantalla scrolleable del teléfono */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
            {appBody}
          </div>
        </div>
      </div>
    );
  }

  return appBody;
};

export default App;
