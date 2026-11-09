import React, { useState, useEffect, useMemo } from 'react';
import type { MatchSummary, ParlayLeg } from './types';
import type { OddsFormat } from './utils/oddsFormat';
import { fetchMatches, API_BASE } from './services/api';
import { buildAllUnifiedPicks, type UnifiedPickItem } from './utils/picksEngine';
import { SeriousHomeView } from './modules/SeriousHomeView';
import { SeriousCalendarView } from './modules/SeriousCalendarView';
import { SeriousPicksView } from './modules/SeriousPicksView';
import { SeriousFollowedView } from './modules/SeriousFollowedView';
import { SeriousBankrollView } from './modules/SeriousBankrollView';
import { SeriousAnalysisModal } from './components/SeriousAnalysisModal';
import { FloatingParlaySlip } from './components/FloatingParlaySlip';
import {
  Home,
  Calendar,
  Flame,
  Heart,
  Wallet,
  Bell,
  User,
  RefreshCw,
  ArrowLeftRight,
  Smartphone,
  Monitor,
  Radio,
  Globe,
  Shield,
  Trophy,
  Award,
  Star,
  Flag,
} from 'lucide-react';

type SeriousTab = 'inicio' | 'calendario' | 'picks' | 'seguidos' | 'bankroll';

const TOP_LEAGUES = [
  { code: 'ALL', label: 'Todas', tag: 'ALL', icon: Globe },
  { code: 'LIGA_MX', label: 'Liga MX', tag: 'MX', icon: Shield },
  { code: 'LA_LIGA', label: 'LaLiga', tag: 'ES', icon: Trophy },
  { code: 'EPL', label: 'Premier', tag: 'ENG', icon: Award },
  { code: 'UCL', label: 'Champions', tag: 'UCL', icon: Star },
  { code: 'MLS', label: 'MLS', tag: 'USA', icon: Flag },
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SeriousTab>('inicio');
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL');
  const [oddsFormat, setOddsFormat] = useState<OddsFormat>('DECIMAL');
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isMobileSim, setIsMobileSim] = useState<boolean>(false);

  // Persistencia de Seguidos (❤️) y Bankroll ($) en localStorage
  const [followedIds, setFollowedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('serious_followed_picks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [bankrollAmount, setBankrollAmount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('serious_bankroll_amount');
      return saved ? Math.max(100, Number(saved)) : 5000;
    } catch {
      return 5000;
    }
  });

  // Carrito de Parlays
  const [parlayLegs, setParlayLegs] = useState<ParlayLeg[]>([]);

  // Modal de Análisis IA & Monte Carlo
  const [selectedPickForModal, setSelectedPickForModal] =
    useState<UnifiedPickItem | null>(null);
  const [showOverviewModal, setShowOverviewModal] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('serious_followed_picks', JSON.stringify(followedIds));
    } catch {
      // ignore storage errors
    }
  }, [followedIds]);

  useEffect(() => {
    try {
      localStorage.setItem('serious_bankroll_amount', String(bankrollAmount));
    } catch {
      // ignore storage errors
    }
  }, [bankrollAmount]);

  const loadMatches = (silent = false) => {
    if (!silent) setLoading(true);
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
      loadMatches(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [selectedLeague]);

  // Auto-Sync en segundo plano cada 60s
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${API_BASE}/matches/sync`, { method: 'POST' })
        .then(() => loadMatches(true))
        .catch(() => loadMatches(true));
    }, 60000);
    return () => clearInterval(interval);
  }, [selectedLeague]);

  const allUnifiedPicks = useMemo(() => buildAllUnifiedPicks(matches), [matches]);

  const parlayPickIds = useMemo(() => {
    const set = new Set<string>();
    for (const p of allUnifiedPicks) {
      const found = parlayLegs.some(
        (l) =>
          l.match_id === p.parlayLeg.match_id &&
          l.market_type === p.parlayLeg.market_type &&
          l.selection_code === p.parlayLeg.selection_code
      );
      if (found) set.add(p.id);
    }
    return set;
  }, [allUnifiedPicks, parlayLegs]);

  const handleToggleFollow = (pickId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFollowedIds((prev) =>
      prev.includes(pickId) ? prev.filter((id) => id !== pickId) : [...prev, pickId]
    );
  };

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

  const handleToggleParlayFromPick = (pick: UnifiedPickItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    handleToggleLeg(pick.parlayLeg);
  };

  const handleRemoveLeg = (idx: number) => {
    setParlayLegs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClearSlip = () => {
    setParlayLegs([]);
  };

  const liveCount = matches.filter((m) => m.status === 'IN_PLAY').length;

  const appBody = (
    <div className="min-h-screen bg-[#06080a] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30">
      {/* BARRA SUPERIOR MINIMALISTA DARK OLED (Estilo Capturas + Selector de Ligas) */}
      <header className="sticky top-0 z-30 bg-[#06080a]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div
          className={`mx-auto px-4 pt-3 pb-2.5 ${
            isMobileSim ? 'max-w-full' : 'max-w-5xl'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            {/* Marca SERIOUS AI + Indicador En Vivo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-zinc-950 font-black text-sm shadow-md shadow-emerald-500/20">
                S
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black tracking-tight text-white">
                  SERIOUS<span className="text-emerald-400">PRO</span>
                </span>
                {liveCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-black">
                    <Radio className="w-2.5 h-2.5 animate-pulse" />
                    {liveCount} VIVO
                  </span>
                )}
              </div>
            </div>

            {/* Iconos Superiores Derechos (Momios, Sync, Vista Móvil, Campana y Perfil como en las capturas) */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setOddsFormat((prev) => (prev === 'DECIMAL' ? 'AMERICAN' : 'DECIMAL'))
                }
                title="Cambiar formato de cuota (Decimal / Americano)"
                className="px-2.5 py-1.5 rounded-full bg-[#11151b] border border-white/10 hover:border-emerald-500/40 text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeftRight className="w-3 h-3" />
                <span>{oddsFormat === 'DECIMAL' ? '1.85' : '-118'}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncData}
                disabled={isSyncing}
                title="Sincronizar partidos y cuotas en vivo"
                className="w-8 h-8 rounded-full bg-[#11151b] border border-white/10 hover:border-emerald-500/40 flex items-center justify-center text-zinc-300 hover:text-emerald-400 transition cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isSyncing ? 'animate-spin text-emerald-400' : ''
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => setIsMobileSim((prev) => !prev)}
                title="Alternar vista móvil / escritorio"
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition cursor-pointer ${
                  isMobileSim
                    ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                    : 'bg-[#11151b] border-white/10 text-zinc-300 hover:text-white'
                }`}
              >
                {isMobileSim ? (
                  <Monitor className="w-3.5 h-3.5" />
                ) : (
                  <Smartphone className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowOverviewModal(true)}
                title="Notificaciones y efectividad SERIOUS"
                className="w-8 h-8 rounded-full bg-[#11151b] border border-white/10 hover:border-white/25 flex items-center justify-center text-zinc-200 cursor-pointer"
              >
                <Bell className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowOverviewModal(true)}
                title="Estado de cuenta SERIOUS PRO (Desbloqueado)"
                className="w-8 h-8 rounded-full bg-[#11151b] border border-emerald-500/40 flex items-center justify-center text-emerald-400 cursor-pointer"
              >
                <User className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Barra Rápida de Ligas de Fútbol */}
          <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {TOP_LEAGUES.map((lg) => {
              const active = selectedLeague === lg.code;
              const Icon = lg.icon;
              return (
                <button
                  key={lg.code}
                  type="button"
                  onClick={() => setSelectedLeague(lg.code)}
                  className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-white text-zinc-950 shadow-sm'
                      : 'bg-[#11151b] text-zinc-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-zinc-950' : 'text-zinc-400'}`} />
                  <span>{lg.label}</span>
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                      active
                        ? 'bg-zinc-200 text-zinc-900 font-black'
                        : 'bg-white/5 text-zinc-500'
                    }`}
                  >
                    {lg.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main
        className={`flex-1 w-full mx-auto px-4 py-4 ${
          isMobileSim ? 'max-w-full' : 'max-w-5xl'
        }`}
      >
        {loading ? (
          <div className="p-14 text-center rounded-3xl bg-[#0d1115] border border-white/[0.07] text-zinc-400 text-sm animate-pulse">
            Cargando escudos oficiales HD, jugadores, cuotas justas y 100,000 simulaciones Monte Carlo...
          </div>
        ) : (
          <>
            {activeTab === 'inicio' && (
              <SeriousHomeView
                picks={allUnifiedPicks}
                oddsFormat={oddsFormat}
                followedIds={followedIds}
                parlayPickIds={parlayPickIds}
                onToggleFollow={handleToggleFollow}
                onToggleParlay={handleToggleParlayFromPick}
                onOpenAnalysis={(p) => setSelectedPickForModal(p)}
                onOpenOverviewBanner={() => setShowOverviewModal(true)}
                onGoToAllPicks={() => setActiveTab('picks')}
              />
            )}

            {activeTab === 'calendario' && (
              <SeriousCalendarView
                matches={matches}
                oddsFormat={oddsFormat}
                selectedLeague={selectedLeague}
                onLeagueChange={setSelectedLeague}
                parlayLegs={parlayLegs}
                onToggleLeg={handleToggleLeg}
              />
            )}

            {activeTab === 'picks' && (
              <SeriousPicksView
                picks={allUnifiedPicks}
                oddsFormat={oddsFormat}
                selectedLeague={selectedLeague}
                onLeagueChange={setSelectedLeague}
                followedIds={followedIds}
                parlayPickIds={parlayPickIds}
                onToggleFollow={handleToggleFollow}
                onToggleParlay={handleToggleParlayFromPick}
                onOpenAnalysis={(p) => setSelectedPickForModal(p)}
              />
            )}

            {activeTab === 'seguidos' && (
              <SeriousFollowedView
                picks={allUnifiedPicks}
                matches={matches}
                oddsFormat={oddsFormat}
                followedIds={followedIds}
                parlayLegs={parlayLegs}
                parlayPickIds={parlayPickIds}
                onToggleFollow={handleToggleFollow}
                onToggleParlay={handleToggleParlayFromPick}
                onRemoveLeg={handleRemoveLeg}
                onClearSlip={handleClearSlip}
                onSetPresetLegs={setParlayLegs}
                onOpenAnalysis={(p) => setSelectedPickForModal(p)}
                onGoToPicks={() => setActiveTab('picks')}
              />
            )}

            {activeTab === 'bankroll' && (
              <SeriousBankrollView
                picks={allUnifiedPicks}
                oddsFormat={oddsFormat}
                bankrollAmount={bankrollAmount}
                onChangeBankroll={setBankrollAmount}
                onOpenAnalysis={(p) => setSelectedPickForModal(p)}
              />
            )}
          </>
        )}
      </main>

      {/* BOLETO FLOTANTE DE PARLAY (Cuando hay selecciones activas fuera de Seguidos) */}
      {activeTab !== 'seguidos' && (
        <FloatingParlaySlip
          legs={parlayLegs}
          matches={matches}
          oddsFormat={oddsFormat}
          onRemoveLeg={handleRemoveLeg}
          onClearSlip={handleClearSlip}
          onOpenRiskLab={() => setActiveTab('seguidos')}
          isMobileSim={isMobileSim}
        />
      )}

      {/* MODAL DESBLOQUEADO DE ANÁLISIS IA, MONTE CARLO Y BANKROLL */}
      <SeriousAnalysisModal
        pick={selectedPickForModal}
        showOverviewBannerModal={showOverviewModal}
        oddsFormat={oddsFormat}
        bankrollAmount={bankrollAmount}
        isFollowed={
          selectedPickForModal ? followedIds.includes(selectedPickForModal.id) : false
        }
        isInParlay={
          selectedPickForModal ? parlayPickIds.has(selectedPickForModal.id) : false
        }
        onClose={() => {
          setSelectedPickForModal(null);
          setShowOverviewModal(false);
        }}
        onToggleFollow={(id) => handleToggleFollow(id)}
        onToggleParlay={(p) => handleToggleParlayFromPick(p)}
      />

      {/* BARRA DE NAVEGACIÓN INFERIOR DE 5 PESTAÑAS IDÉNTICA A LAS CAPTURAS (Inicio | Calendario | Picks | Seguidos | Bankroll) */}
      <nav
        className={`${
          isMobileSim ? 'sticky' : 'fixed'
        } bottom-0 left-0 right-0 z-40 bg-[#0b0e12]/98 backdrop-blur-xl border-t border-white/[0.08] shadow-[0_-12px_40px_rgba(0,0,0,0.95)]`}
      >
        <div className="max-w-lg mx-auto grid grid-cols-5 py-2 px-2 text-center">
          {[
            { id: 'inicio', label: 'Inicio', icon: Home, badge: 0 },
            { id: 'calendario', label: 'Calendario', icon: Calendar, badge: 0 },
            { id: 'picks', label: 'Picks', icon: Flame, badge: 0 },
            {
              id: 'seguidos',
              label: 'Seguidos',
              icon: Heart,
              badge: followedIds.length + parlayLegs.length,
            },
            { id: 'bankroll', label: 'Bankroll', icon: Wallet, badge: 0 },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as SeriousTab)}
                className={`relative py-1.5 flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-transform ${
                      active ? 'scale-110 text-white stroke-[2.4]' : 'stroke-[1.8]'
                    }`}
                  />
                  {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-3 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-500 text-zinc-950">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] tracking-tight ${
                    active ? 'font-extrabold text-white' : 'font-medium text-zinc-500'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );

  if (!isMobileSim) {
    return appBody;
  }

  return (
    <div className="min-h-screen bg-[#020406] py-6 px-2 flex flex-col items-center justify-start">
      <div className="mb-3 flex items-center gap-3 px-4 py-2 rounded-full bg-zinc-900 border border-emerald-500/40 text-xs text-slate-200 shadow-lg">
        <Smartphone className="w-4 h-4 text-emerald-400" />
        <span>
          Vista Celular (412px) — <strong>Modo SERIOUS PRO</strong>
        </span>
        <button
          onClick={() => setIsMobileSim(false)}
          className="ml-2 px-2.5 py-0.5 rounded-lg bg-emerald-500 text-slate-950 font-extrabold cursor-pointer"
        >
          Ver Pantalla Completa
        </button>
      </div>
      <div className="w-full max-w-[412px] h-[860px] overflow-y-auto rounded-[42px] border-[10px] border-zinc-900 shadow-[0_0_90px_rgba(16,185,129,0.18)] relative bg-[#06080a]">
        {appBody}
      </div>
    </div>
  );
};

export default App;
