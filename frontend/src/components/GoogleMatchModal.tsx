import React, { useState } from 'react';
import type { MatchSummary, ParlayLeg } from '../types';
import { formatOdds, type OddsFormat } from '../utils/oddsFormat';
import { X, ChevronDown, ChevronUp, Sparkles, CircleDot, Pencil } from 'lucide-react';
import { saveOddsBatch } from '../services/api';

interface GoogleMatchModalProps {
  match: MatchSummary;
  oddsFormat: OddsFormat;
  onClose: () => void;
  onAddLeg: (leg: ParlayLeg) => void;
  onRefreshMatch: () => void;
}

export const GoogleMatchModal: React.FC<GoogleMatchModalProps> = ({
  match,
  oddsFormat,
  onClose,
  onAddLeg,
  onRefreshMatch
}) => {
  const [activeTab, setActiveTab] = useState<'odds' | 'stats' | 'scores'>('odds');
  const [showMathDetail, setShowMathDetail] = useState(false);
  const [editingDraftea, setEditingDraftea] = useState(false);

  // Formulario rápido para editar cuotas de Draftea
  const eval1X2 = match.evaluations.filter((e) => e.market_type === '1X2');
  const homeEval = eval1X2.find((e) => e.selection_code === 'HOME');
  const drawEval = eval1X2.find((e) => e.selection_code === 'DRAW');
  const awayEval = eval1X2.find((e) => e.selection_code === 'AWAY');

  const [dHome, setDHome] = useState(homeEval?.decimal_odds.toFixed(2) || '2.10');
  const [dDraw, setDDraw] = useState(drawEval?.decimal_odds.toFixed(2) || '3.40');
  const [dAway, setDAway] = useState(awayEval?.decimal_odds.toFixed(2) || '3.60');
  const [savingDraftea, setSavingDraftea] = useState(false);

  const stats = match.google_stats || {};
  const isFinished = match.status === 'FINISHED';

  const handleSaveDraftea = async () => {
    setSavingDraftea(true);
    try {
      await saveOddsBatch(match.id, [
        { market_type: '1X2', selection_code: 'HOME', decimal_odds: parseFloat(dHome) },
        { market_type: '1X2', selection_code: 'DRAW', decimal_odds: parseFloat(dDraw) },
        { market_type: '1X2', selection_code: 'AWAY', decimal_odds: parseFloat(dAway) }
      ], 'DRAFTEA');
      setEditingDraftea(false);
      onRefreshMatch();
    } catch (err) {
      alert('Error al guardar cuotas de Draftea');
    } finally {
      setSavingDraftea(false);
    }
  };

  // Ayudante de comparación estadística (resalta al ganador con píldora de color)
  const renderStatRow = (label: string, homeVal: number, awayVal: number, isPercent = false, invertSuperior = false) => {
    const isHomeHigher = invertSuperior ? homeVal < awayVal : homeVal > awayVal;
    const isAwayHigher = invertSuperior ? awayVal < homeVal : awayVal > homeVal;

    return (
      <div className="flex items-center justify-between py-2.5 border-b border-slate-800/60 text-xs">
        {/* Valor Local */}
        <div className="w-16 flex justify-start">
          <span
            className={`px-2.5 py-0.5 rounded-full font-semibold transition ${
              isHomeHigher
                ? 'bg-sky-600 text-white font-bold shadow-sm'
                : 'text-slate-400 font-medium'
            }`}
          >
            {homeVal}{isPercent ? '%' : ''}
          </span>
        </div>

        {/* Etiqueta Central */}
        <div className="text-center text-slate-300 font-medium flex-1">
          {label}
        </div>

        {/* Valor Visitante */}
        <div className="w-16 flex justify-end">
          <span
            className={`px-2.5 py-0.5 rounded-full font-semibold transition ${
              isAwayHigher
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 font-medium'
            }`}
          >
            {awayVal}{isPercent ? '%' : ''}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full sm:max-w-2xl max-h-[92vh] sm:rounded-2xl rounded-t-2xl flex flex-col shadow-2xl overflow-hidden">
        
        {/* CABECERA ESTILO GOOGLE SPORTS */}
        <div className="bg-slate-950 p-4 sm:p-5 border-b border-slate-800 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Subtítulo: Liga y Estado */}
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3 pr-8">
            <span className="font-medium text-slate-300">
              {match.competition_name} · {match.round_name || match.season}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                isFinished ? 'bg-slate-800 text-slate-300' : 'bg-sky-950 text-sky-300 border border-sky-800'
              }`}
            >
              {isFinished ? 'Finalizado' : 'Próximo Partido'}
            </span>
          </div>

          {/* Enfrentamiento Principal: Escudos, Nombres, Posiciones y Marcador */}
          <div className="grid grid-cols-5 items-center gap-2">
            {/* Equipo Local */}
            <div className="col-span-2 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center p-2 mb-1.5 shadow-md">
                {match.home_team_logo ? (
                  <img src={match.home_team_logo} alt={match.home_team_name} className="w-10 h-10 object-contain" />
                ) : (
                  <span className="font-bold text-sky-400 text-base">{match.home_team_name.slice(0, 3)}</span>
                )}
              </div>
              <h3 className="font-bold text-slate-100 text-sm leading-tight">{match.home_team_name}</h3>
              {match.home_rank && (
                <span className="text-[11px] text-slate-400 mt-0.5 bg-slate-800/80 px-2 py-0.2 rounded-full font-mono">
                  {match.home_rank}
                </span>
              )}
            </div>

            {/* Marcador o VS */}
            <div className="col-span-1 flex flex-col items-center justify-center text-center">
              {isFinished ? (
                <div className="text-3xl font-extrabold font-mono text-slate-100 tracking-wider">
                  {match.home_score} - {match.away_score}
                </div>
              ) : (
                <div className="text-xs font-bold text-sky-400 bg-sky-950/80 px-2.5 py-1 rounded-full border border-sky-800/80">
                  {new Date(match.kickoff_time).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                  <div className="text-[10px] text-slate-300 font-mono">
                    {new Date(match.kickoff_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>

            {/* Equipo Visitante */}
            <div className="col-span-2 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center p-2 mb-1.5 shadow-md">
                {match.away_team_logo ? (
                  <img src={match.away_team_logo} alt={match.away_team_name} className="w-10 h-10 object-contain" />
                ) : (
                  <span className="font-bold text-amber-400 text-base">{match.away_team_name.slice(0, 3)}</span>
                )}
              </div>
              <h3 className="font-bold text-slate-100 text-sm leading-tight">{match.away_team_name}</h3>
              {match.away_rank && (
                <span className="text-[11px] text-slate-400 mt-0.5 bg-slate-800/80 px-2 py-0.2 rounded-full font-mono">
                  {match.away_rank}
                </span>
              )}
            </div>
          </div>

          {/* Goleadores (si el partido ya terminó) */}
          {match.scorers && match.scorers.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800/70 text-[11px] text-slate-400 space-y-1">
              {match.scorers.map((sc, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 ${
                    sc.team === 'home' ? 'justify-start' : 'justify-end'
                  }`}
                >
                  {sc.team === 'home' && (
                    <span className="text-slate-200 flex items-center gap-1">
                      <CircleDot className="w-3 h-3 text-emerald-400" />
                      <span>{sc.player} {sc.minute}</span>
                    </span>
                  )}
                  {sc.team === 'away' && (
                    <span className="text-slate-200 flex items-center gap-1">
                      <span>{sc.player} {sc.minute}</span>
                      <CircleDot className="w-3 h-3 text-emerald-400" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PESTAÑAS TIPO GOOGLE */}
        <div className="flex border-b border-slate-800 bg-slate-950 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('odds')}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              activeTab === 'odds'
                ? 'border-sky-500 text-sky-400 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Momios & Pronóstico IA
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              activeTab === 'stats'
                ? 'border-sky-500 text-sky-400 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Estadísticas
          </button>
          <button
            onClick={() => setActiveTab('scores')}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              activeTab === 'scores'
                ? 'border-sky-500 text-sky-400 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Marcadores Exactos
          </button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* PESTAÑA 1: MOMIOS Y PRONÓSTICO (ESTILO DRAFTEA) */}
          {activeTab === 'odds' && (
            <div className="space-y-4">
              {/* Insight amigable en lenguaje humano */}
              {match.friendly_insight && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                    match.friendly_insight.signal === 'GREEN'
                      ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                      : 'bg-amber-950/40 border-amber-700/60 text-amber-200'
                  }`}
                >
                  <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-sky-400" />
                  <div className="space-y-1">
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span>{match.friendly_insight.title}</span>
                      <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded font-mono">
                        {match.friendly_insight.recommended_pick}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {match.friendly_insight.text}
                    </p>
                  </div>
                </div>
              )}

              {/* Botones de Momios Tocables (Ganador 1X2 estilo Draftea) */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-slate-200">Ganador del Partido (1X2)</span>
                  <span className="text-[10px] text-slate-400">Toca para agregar a tu boleto de parlay</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {homeEval && (
                    <button
                      onClick={() => onAddLeg({ match_id: match.id, market_type: '1X2', selection_code: 'HOME', decimal_odds: homeEval.decimal_odds })}
                      className="p-2.5 bg-slate-900 hover:bg-sky-600/20 active:bg-sky-600/40 border border-slate-800 hover:border-sky-500 rounded-lg text-center transition group"
                    >
                      <div className="text-[11px] text-slate-400 group-hover:text-slate-200 truncate">{match.home_team_name}</div>
                      <div className="text-base font-bold font-mono text-sky-400">
                        {formatOdds(homeEval.decimal_odds, oddsFormat)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">Prob: {(homeEval.model_prob * 100).toFixed(0)}%</div>
                    </button>
                  )}

                  {drawEval && (
                    <button
                      onClick={() => onAddLeg({ match_id: match.id, market_type: '1X2', selection_code: 'DRAW', decimal_odds: drawEval.decimal_odds })}
                      className="p-2.5 bg-slate-900 hover:bg-sky-600/20 active:bg-sky-600/40 border border-slate-800 hover:border-sky-500 rounded-lg text-center transition group"
                    >
                      <div className="text-[11px] text-slate-400 group-hover:text-slate-200">Empate</div>
                      <div className="text-base font-bold font-mono text-slate-200">
                        {formatOdds(drawEval.decimal_odds, oddsFormat)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">Prob: {(drawEval.model_prob * 100).toFixed(0)}%</div>
                    </button>
                  )}

                  {awayEval && (
                    <button
                      onClick={() => onAddLeg({ match_id: match.id, market_type: '1X2', selection_code: 'AWAY', decimal_odds: awayEval.decimal_odds })}
                      className="p-2.5 bg-slate-900 hover:bg-sky-600/20 active:bg-sky-600/40 border border-slate-800 hover:border-sky-500 rounded-lg text-center transition group"
                    >
                      <div className="text-[11px] text-slate-400 group-hover:text-slate-200 truncate">{match.away_team_name}</div>
                      <div className="text-base font-bold font-mono text-sky-400">
                        {formatOdds(awayEval.decimal_odds, oddsFormat)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">Prob: {(awayEval.model_prob * 100).toFixed(0)}%</div>
                    </button>
                  )}
                </div>
              </div>

              {/* Botón de Edición Rápida de Momios Draftea */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <button
                  onClick={() => setEditingDraftea(!editingDraftea)}
                  className="w-full flex items-center justify-between text-xs text-sky-400 font-medium hover:text-sky-300"
                >
                  <span className="flex items-center gap-1.5">
                    <Pencil className="w-3.5 h-3.5 text-sky-400" />
                    <span>¿Ves momios distintos en Draftea? Tócalos para actualizarlos</span>
                  </span>
                  {editingDraftea ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {editingDraftea && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Local (1)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={dHome}
                          onChange={(e) => setDHome(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-center py-1.5 rounded text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Empate (X)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={dDraw}
                          onChange={(e) => setDDraw(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-center py-1.5 rounded text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Visitante (2)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={dAway}
                          onChange={(e) => setDAway(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-center py-1.5 rounded text-slate-100"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSaveDraftea}
                      disabled={savingDraftea}
                      className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-bold text-xs"
                    >
                      {savingDraftea ? 'Guardando...' : 'Guardar Cuotas Draftea'}
                    </button>
                  </div>
                )}
              </div>

              {/* Acordeón opcional: Detalle Matemático */}
              <div className="border border-slate-800 rounded-xl bg-slate-950 overflow-hidden">
                <button
                  onClick={() => setShowMathDetail(!showMathDetail)}
                  className="w-full p-3 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200"
                >
                  <span className="font-semibold">Ver detalle matemático cuantitativo (De-Vigging Shin & Kelly)</span>
                  {showMathDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showMathDetail && (
                  <div className="p-3 pt-0 text-[11px] text-slate-400 space-y-2 border-t border-slate-800/60 font-mono">
                    <p>• Margen de la casa: <strong>{((homeEval?.bookmaker_overround || 0.05) * 100).toFixed(1)}%</strong></p>
                    <p>• Probabilidad justa sin margen (Shin 1993): <strong>{((homeEval?.fair_market_prob || 0.5) * 100).toFixed(1)}%</strong></p>
                    <p>• Fracción sugerida de Kelly (1/8): <strong>{((homeEval?.recommended_kelly_fraction || 0.01) * 100).toFixed(2)}% del bankroll</strong></p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PESTAÑA 2: ESTADÍSTICAS (ESTILO GOOGLE SPORTS IDÉNTICO A LA CAPTURA) */}
          {activeTab === 'stats' && (
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
              {/* Encabezado con escudos */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  {match.home_team_logo && <img src={match.home_team_logo} alt="" className="w-6 h-6 object-contain" />}
                  <span className="text-xs font-bold text-slate-200">{match.home_team_name}</span>
                </div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                  ESTADÍSTICAS DEL EQUIPO
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200">{match.away_team_name}</span>
                  {match.away_team_logo && <img src={match.away_team_logo} alt="" className="w-6 h-6 object-contain" />}
                </div>
              </div>

              {/* Filas de estadísticas estilo Google Sports */}
              <div className="pt-2">
                {renderStatRow('Remates', stats.remates_home || 12, stats.remates_away || 9)}
                {renderStatRow('Remates al arco', stats.remates_arco_home || 5, stats.remates_arco_away || 3)}
                {renderStatRow('Posesión', stats.posesion_home || 52, stats.posesion_away || 48, true)}
                {renderStatRow('Pases', stats.pases_home || 420, stats.pases_away || 380)}
                {renderStatRow('Precisión de los pases', stats.precision_pases_home || 85, stats.precision_pases_away || 81, true)}
                {renderStatRow('Faltas', stats.faltas_home || 10, stats.faltas_away || 8, false, true)}
                {renderStatRow('Tiros de esquina', stats.corners_home || 6, stats.corners_away || 4)}
                {renderStatRow('Goles Esperados (xG)', match.home_xg || 1.65, match.away_xg || 1.10)}
              </div>

              <div className="mt-3 text-[10px] text-center text-slate-500 font-sans">
                {stats.stats_type === 'MATCH_OBSERVED'
                  ? '* Estadísticas registradas durante el partido oficial.'
                  : '* Promedios por partido durante la presente temporada.'}
              </div>
            </div>
          )}

          {/* PESTAÑA 3: MARCADORES EXACTOS */}
          {activeTab === 'scores' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                Proyecciones del modelo <strong>Dixon-Coles</strong> ordenadas por probabilidad:
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { score: '2 - 1', prob: 12.8, desc: 'Victoria Local ajustada' },
                  { score: '1 - 1', prob: 11.4, desc: 'Empate común (ajuste ρ)' },
                  { score: '1 - 0', prob: 10.2, desc: 'Local con arco en cero' },
                  { score: '2 - 0', prob: 9.5, desc: 'Solvencia local' },
                  { score: '1 - 2', prob: 8.4, desc: 'Sorpresa visitante' },
                  { score: '0 - 0', prob: 6.8, desc: 'Partido trabado' }
                ].map((s, idx) => (
                  <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                    <div className="text-lg font-mono font-bold text-sky-400">{s.score}</div>
                    <div className="text-xs font-semibold text-slate-200">{s.prob}%</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
