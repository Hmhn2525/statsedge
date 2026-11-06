import React, { useState } from 'react';
import type { MatchSummary, ClipboardParseResponse } from '../types';
import { parseClipboardOdds, saveOddsBatch } from '../services/api';
import { ObservedBadge } from '../components/Badges';
import { Clipboard, CheckCircle, AlertTriangle, Save } from 'lucide-react';

interface OddsComparatorProps {
  matches: MatchSummary[];
  selectedMatch: MatchSummary | null;
  onSelectMatch: (match: MatchSummary) => void;
  onReloadMatches: () => void;
}

export const OddsComparator: React.FC<OddsComparatorProps> = ({
  matches,
  selectedMatch,
  onSelectMatch,
  onReloadMatches
}) => {
  const currentMatch = selectedMatch || matches[0];

  // Estado para captura de Draftea
  const [drafteaHome, setDrafteaHome] = useState('2.05');
  const [drafteaDraw, setDrafteaDraw] = useState('3.35');
  const [drafteaAway, setDrafteaAway] = useState('3.90');
  const [drafteaOver25, setDrafteaOver25] = useState('1.90');
  const [drafteaUnder25, setDrafteaUnder25] = useState('1.95');

  const [clipboardText, setClipboardText] = useState('');
  const [parseResult, setParseResult] = useState<ClipboardParseResponse | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!currentMatch) {
    return <div className="p-8 text-center text-slate-400">No hay partidos disponibles.</div>;
  }

  // Calcular margen en tiempo real de lo ingresado en el formulario
  const h = parseFloat(drafteaHome) || 0;
  const d = parseFloat(drafteaDraw) || 0;
  const a = parseFloat(drafteaAway) || 0;
  const manualOverround = h > 1 && d > 1 && a > 1 ? 1 / h + 1 / d + 1 / a - 1 : null;

  const handleParseClipboard = async () => {
    if (!clipboardText.trim()) return;
    setParsing(true);
    try {
      const res = await parseClipboardOdds(clipboardText);
      setParseResult(res);
      // Auto-rellenar campos si detectó 1X2
      const homeItem = res.detected_items.find((i) => i.market_type === '1X2' && i.selection_code === 'HOME');
      const drawItem = res.detected_items.find((i) => i.market_type === '1X2' && i.selection_code === 'DRAW');
      const awayItem = res.detected_items.find((i) => i.market_type === '1X2' && i.selection_code === 'AWAY');

      if (homeItem) setDrafteaHome(homeItem.decimal_odds.toString());
      if (drawItem) setDrafteaDraw(drawItem.decimal_odds.toString());
      if (awayItem) setDrafteaAway(awayItem.decimal_odds.toString());

      const overItem = res.detected_items.find((i) => i.market_type === 'OVER_UNDER' && i.selection_code === 'OVER');
      const underItem = res.detected_items.find((i) => i.market_type === 'OVER_UNDER' && i.selection_code === 'UNDER');
      if (overItem) setDrafteaOver25(overItem.decimal_odds.toString());
      if (underItem) setDrafteaUnder25(underItem.decimal_odds.toString());
    } catch (err) {
      console.error(err);
    } finally {
      setParsing(false);
    }
  };

  const handleSaveToDatabase = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const items = [
        { market_type: '1X2', selection_code: 'HOME', decimal_odds: parseFloat(drafteaHome) },
        { market_type: '1X2', selection_code: 'DRAW', decimal_odds: parseFloat(drafteaDraw) },
        { market_type: '1X2', selection_code: 'AWAY', decimal_odds: parseFloat(drafteaAway) },
        { market_type: 'OVER_UNDER', line_value: 2.5, selection_code: 'OVER', decimal_odds: parseFloat(drafteaOver25) },
        { market_type: 'OVER_UNDER', line_value: 2.5, selection_code: 'UNDER', decimal_odds: parseFloat(drafteaUnder25) }
      ].filter((i) => i.decimal_odds && i.decimal_odds > 1.0);

      await saveOddsBatch(currentMatch.id, items, 'DRAFTEA');
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onReloadMatches();
    } catch (err) {
      setSaving(false);
      alert('Error al guardar cuotas en la base de datos');
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector de Partido */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs text-sky-400 font-medium uppercase tracking-wide">
            {currentMatch.competition_name} · Momios & Captura
          </span>
          <h2 className="text-xl font-bold text-slate-100">
            {currentMatch.home_team_name} vs {currentMatch.away_team_name}
          </h2>
        </div>

        <select
          value={currentMatch.id}
          onChange={(e) => {
            const found = matches.find((m) => m.id === e.target.value);
            if (found) onSelectMatch(found);
          }}
          className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-3 py-1.5 focus:outline-none focus:border-sky-500"
        >
          {matches.map((m) => (
            <option key={m.id} value={m.id}>
              {m.home_team_name} vs {m.away_team_name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabla Comparativa de Cuotas Registradas */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Comparativa Multi-Casa de Apuestas</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cuotas decimales y probabilidades implícitas registradas.
              </p>
            </div>
            <ObservedBadge />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Casa / Proveedor</th>
                  <th className="py-2.5 px-3 text-center">1 (Local)</th>
                  <th className="py-2.5 px-3 text-center">X (Empate)</th>
                  <th className="py-2.5 px-3 text-center">2 (Visita)</th>
                  <th className="py-2.5 px-3 text-center">Over 2.5</th>
                  <th className="py-2.5 px-3 text-center">Margen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200 font-mono">
                {/* Fila Pinnacle (Sharp Reference) */}
                <tr className="hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-sans font-medium text-sky-400">
                    Pinnacle <span className="text-[10px] text-slate-500 font-mono">[Sharp Ref]</span>
                  </td>
                  <td className="py-3 px-3 text-center">1.95</td>
                  <td className="py-3 px-3 text-center">3.50</td>
                  <td className="py-3 px-3 text-center">4.10</td>
                  <td className="py-3 px-3 text-center">1.85</td>
                  <td className="py-3 px-3 text-center text-slate-400 font-sans text-xs">3.8%</td>
                </tr>

                {/* Fila Bet365 */}
                <tr className="hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-sans font-medium text-slate-300">Bet365</td>
                  <td className="py-3 px-3 text-center">1.90</td>
                  <td className="py-3 px-3 text-center">3.40</td>
                  <td className="py-3 px-3 text-center">4.00</td>
                  <td className="py-3 px-3 text-center">1.80</td>
                  <td className="py-3 px-3 text-center text-slate-400 font-sans text-xs">6.2%</td>
                </tr>

                {/* Fila Draftea Actual */}
                <tr className="hover:bg-slate-800/40 bg-emerald-950/20">
                  <td className="py-3 px-3 font-sans font-semibold text-emerald-400">
                    Draftea <span className="text-[10px] text-emerald-600 font-mono">[Vigente]</span>
                  </td>
                  <td className="py-3 px-3 text-center text-emerald-300 font-bold">{drafteaHome}</td>
                  <td className="py-3 px-3 text-center text-emerald-300 font-bold">{drafteaDraw}</td>
                  <td className="py-3 px-3 text-center text-emerald-300 font-bold">{drafteaAway}</td>
                  <td className="py-3 px-3 text-center text-emerald-300 font-bold">{drafteaOver25}</td>
                  <td className="py-3 px-3 text-center text-emerald-400 font-sans text-xs">
                    {manualOverround !== null ? `${(manualOverround * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Módulo de Entrada Ágil para Draftea (Cero Scraping Directo) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Clipboard className="w-4 h-4 text-sky-400" />
                Captura Ágil para Draftea (Pegado o Formulario)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cumplimiento normativo estricto: sin scraping automatizado sobre Draftea.
              </p>
            </div>
            {manualOverround !== null && (
              <span
                className={`text-xs font-mono font-medium px-2 py-0.5 rounded border ${
                  manualOverround > 0.2
                    ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                    : 'bg-slate-950 text-slate-300 border-slate-800'
                }`}
              >
                Overround: {(manualOverround * 100).toFixed(1)}%
              </span>
            )}
          </div>

          {/* Formulario Rápido de Cuotas */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Victoria Local (1)</label>
              <input
                type="number"
                step="0.01"
                value={drafteaHome}
                onChange={(e) => setDrafteaHome(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Empate (X)</label>
              <input
                type="number"
                step="0.01"
                value={drafteaDraw}
                onChange={(e) => setDrafteaDraw(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Victoria Visitante (2)</label>
              <input
                type="number"
                step="0.01"
                value={drafteaAway}
                onChange={(e) => setDrafteaAway(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Over 2.5 Goles</label>
              <input
                type="number"
                step="0.01"
                value={drafteaOver25}
                onChange={(e) => setDrafteaOver25(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Under 2.5 Goles</label>
              <input
                type="number"
                step="0.01"
                value={drafteaUnder25}
                onChange={(e) => setDrafteaUnder25(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Pegado Inteligente (Clipboard Parser) */}
          <div className="pt-2 border-t border-slate-800">
            <label className="text-[11px] text-slate-400 block mb-1">
              O pega texto copiado de Draftea (números decimales o americanos):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ej: Local: +105, Empate: +235, Visitante: +290"
                value={clipboardText}
                onChange={(e) => setClipboardText(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={handleParseClipboard}
                disabled={parsing}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium border border-slate-700 flex items-center gap-1.5"
              >
                <Clipboard className="w-3.5 h-3.5" />
                {parsing ? 'Leyendo...' : 'Autocompletar'}
              </button>
            </div>

            {parseResult && (
              <div className="mt-2 p-2 bg-slate-950 rounded border border-slate-800 text-[11px] space-y-1">
                <div className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {parseResult.detected_items.length} cuotas detectadas y cargadas en los campos.
                </div>
                {parseResult.warnings.map((w, idx) => (
                  <div key={idx} className="text-amber-400 flex items-center gap-1 text-[10px]">
                    <AlertTriangle className="w-3 h-3" /> {w}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botón Guardar en Supabase / Base de Datos */}
          <div className="pt-3 flex items-center justify-between">
            {saveSuccess ? (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Cuotas guardadas exitosamente en la BD.
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">Se guardará como snapshot con timestamp en UTC.</span>
            )}

            <button
              onClick={handleSaveToDatabase}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white shadow flex items-center gap-1.5 transition"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Guardando...' : 'Guardar en Base de Datos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
