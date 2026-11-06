export type MarketType = '1X2' | 'DOUBLE_CHANCE' | 'OVER_UNDER' | 'BTTS';
export type DevigMethod = 'SHIN' | 'POWER' | 'MULTIPLICATIVE';
export type SignalClassification = 'NO_EDGE' | 'HIGH_UNCERTAINTY' | 'CANDIDATE_VALUE';

export interface MarketSelectionEvaluation {
  market_type: MarketType;
  selection_code: string;
  line_value?: number;
  bookmaker_code: string;
  decimal_odds: number;
  raw_implied_prob: number;
  bookmaker_overround: number;
  fair_market_prob: number;
  devig_method: DevigMethod;
  model_prob: number;
  model_ci_low: number;
  model_ci_high: number;
  edge_vs_fair: number;
  expected_value_nominal: number;
  expected_value_conservative: number;
  recommended_kelly_fraction: number;
  signal_classification: SignalClassification;
}

export interface MatchSummary {
  id: string;
  competition_code: string;
  competition_name: string;
  season: string;
  stage_type: string;
  kickoff_time: string;
  status: string;
  home_team_name: string;
  away_team_name: string;
  home_short_name?: string;
  away_short_name?: string;
  home_score?: number;
  away_score?: number;
  home_xg?: number;
  away_xg?: number;
  home_team_logo?: string;
  away_team_logo?: string;
  home_rank?: string;
  away_rank?: string;
  round_name?: string;
  home_form?: string[];
  away_form?: string[];
  scorers?: { team: string; player: string; minute: string }[];
  google_stats?: Record<string, any>;
  friendly_insight?: {
    signal: string;
    title: string;
    text: string;
    recommended_pick: string;
  };
  evaluations: MarketSelectionEvaluation[];
}

export interface ScoreMatrixResponse {
  match_id: string;
  home_team: string;
  away_team: string;
  lambda_home: number;
  mu_away: number;
  rho: number;
  matrix_10x10: number[][];
  explanation_factors: Record<string, any>;
}

export interface ParlayLeg {
  match_id: string;
  market_type: MarketType;
  selection_code: string;
  line_value?: number;
  decimal_odds: number;
}

export interface ParlayEvaluationResponse {
  legs: ParlayLeg[];
  combined_decimal_odds: number;
  naive_multiplied_prob: number;
  joint_model_prob: number;
  has_same_game_correlation: boolean;
  correlation_diagnosis: string;
  combined_expected_value: number;
  risk_level: 'BAJO' | 'MEDIO' | 'ALTO' | 'EXTREMO';
  individual_vs_parlay_ev_comparison: {
    prob_acierto_total: number;
    prob_fallar_al_menos_una: number;
    combined_ev_nominal_pct: number;
    margin_erosion_alert: boolean;
  };
}

export interface LeagueScorecard {
  competition_code: string;
  name: string;
  matches_evaluated: number;
  brier_score_model: number;
  brier_score_climatological: number;
  brier_score_elo: number;
  brier_score_pinnacle: number;
  log_loss_model: number;
  log_loss_pinnacle: number;
  ece_score: number;
  avg_clv_pct: number;
  status: string;
}

export interface CalibrationBin {
  bin: string;
  pred_prob: number;
  empirical_freq: number;
  count: number;
}

export interface WalkForwardPoint {
  jornada: string;
  unidades_simuladas: number;
  drawdown: number;
}

export interface BacktestScorecardResponse {
  league_metrics: LeagueScorecard[];
  calibration_bins: CalibrationBin[];
  walk_forward_curve: WalkForwardPoint[];
  methodology: string;
  benchmark_rules: string;
}

export interface ClipboardParseResponse {
  detected_items: {
    market_type: MarketType;
    selection_code: string;
    decimal_odds: number;
    line_value?: number;
  }[];
  detected_bookmaker: string;
  warnings: string[];
  estimated_overround?: number;
}
