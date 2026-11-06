import type {
  MatchSummary,
  ScoreMatrixResponse,
  ParlayLeg,
  ParlayEvaluationResponse,
  BacktestScorecardResponse,
  ClipboardParseResponse
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function fetchMatches(competitionCode?: string, status: string = 'SCHEDULED'): Promise<MatchSummary[]> {
  const params = new URLSearchParams();
  if (competitionCode && competitionCode !== 'ALL') {
    params.append('competition_code', competitionCode);
  }
  if (status) {
    params.append('status', status);
  }
  const res = await fetch(`${API_BASE}/matches?${params.toString()}`);
  if (!res.ok) throw new Error('Error al cargar partidos');
  return res.json();
}

export async function fetchMatchScoreMatrix(matchId: string): Promise<ScoreMatrixResponse> {
  const res = await fetch(`${API_BASE}/matches/${matchId}/score-matrix`);
  if (!res.ok) throw new Error('Error al cargar matriz de marcadores');
  return res.json();
}

export async function parseClipboardOdds(rawText: string): Promise<ClipboardParseResponse> {
  const res = await fetch(`${API_BASE}/odds/parse-clipboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw_text: rawText })
  });
  if (!res.ok) throw new Error('Error al procesar texto del portapapeles');
  return res.json();
}

export async function saveOddsBatch(matchId: string, items: any[], bookmaker: string = 'DRAFTEA'): Promise<any> {
  const res = await fetch(`${API_BASE}/odds/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      match_id: matchId,
      bookmaker_code: bookmaker,
      source_type: 'MANUAL_FORM',
      items
    })
  });
  if (!res.ok) throw new Error('Error al guardar cuotas');
  return res.json();
}

export async function evaluateParlay(legs: ParlayLeg[]): Promise<ParlayEvaluationResponse> {
  const res = await fetch(`${API_BASE}/parlays/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(legs)
  });
  if (!res.ok) throw new Error('Error al evaluar combinada');
  return res.json();
}

export async function fetchBacktestScorecard(): Promise<BacktestScorecardResponse> {
  const res = await fetch(`${API_BASE}/backtest/scorecard`);
  if (!res.ok) throw new Error('Error al cargar cuadro de mando de backtesting');
  return res.json();
}
