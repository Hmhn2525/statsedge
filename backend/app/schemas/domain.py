from datetime import datetime
from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel, Field

MarketType = Literal["1X2", "DOUBLE_CHANCE", "OVER_UNDER", "BTTS", "SPREAD", "MONEYLINE_2WAY"]
DevigMethod = Literal["SHIN", "POWER", "MULTIPLICATIVE"]
SignalClassification = Literal["NO_EDGE", "HIGH_UNCERTAINTY", "CANDIDATE_VALUE"]

class OddsInputItem(BaseModel):
    market_type: MarketType
    selection_code: str
    decimal_odds: float = Field(gt=1.0, description="Cuota decimal mayor a 1.0")
    line_value: Optional[float] = None

class OddsBatchInput(BaseModel):
    match_id: str
    bookmaker_code: str = "DRAFTEA"
    source_type: Literal["MANUAL_FORM", "CLIPBOARD_PARSER", "CSV"] = "MANUAL_FORM"
    items: List[OddsInputItem]

class MarketSelectionEvaluation(BaseModel):
    market_type: MarketType
    selection_code: str
    line_value: Optional[float] = None
    bookmaker_code: str
    decimal_odds: float
    raw_implied_prob: float
    bookmaker_overround: float
    fair_market_prob: float
    devig_method: DevigMethod
    model_prob: float
    model_ci_low: float
    model_ci_high: float
    edge_vs_fair: float
    expected_value_nominal: float
    expected_value_conservative: float
    recommended_kelly_fraction: float
    signal_classification: SignalClassification

class MatchSummary(BaseModel):
    id: str
    competition_code: str
    competition_name: str
    season: str
    stage_type: str
    kickoff_time: datetime
    status: str
    home_team_name: str
    away_team_name: str
    home_short_name: Optional[str] = None
    away_short_name: Optional[str] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    home_xg: Optional[float] = None
    away_xg: Optional[float] = None
    home_team_logo: Optional[str] = None
    away_team_logo: Optional[str] = None
    home_rank: Optional[str] = None
    away_rank: Optional[str] = None
    round_name: Optional[str] = None
    home_form: List[str] = []
    away_form: List[str] = []
    scorers: List[Dict[str, Any]] = []
    google_stats: Optional[Dict[str, Any]] = None
    friendly_insight: Optional[Dict[str, Any]] = None
    evaluations: List[MarketSelectionEvaluation] = []

class ScoreMatrixResponse(BaseModel):
    match_id: str
    home_team: str
    away_team: str
    lambda_home: float
    mu_away: float
    rho: float
    matrix_10x10: List[List[float]] # P(X=i, Y=j)
    explanation_factors: Dict[str, Any]

class ParlayLeg(BaseModel):
    match_id: str
    market_type: MarketType
    selection_code: str
    line_value: Optional[float] = None
    decimal_odds: float

class ParlayEvaluationResponse(BaseModel):
    legs: List[ParlayLeg]
    combined_decimal_odds: float
    naive_multiplied_prob: float
    joint_model_prob: float
    has_same_game_correlation: bool
    correlation_diagnosis: str
    combined_expected_value: float
    risk_level: Literal["BAJO", "MEDIO", "ALTO", "EXTREMO"]
    individual_vs_parlay_ev_comparison: Dict[str, Any]

class ClipboardParseRequest(BaseModel):
    raw_text: str
    match_id: Optional[str] = None

class ClipboardParseResponse(BaseModel):
    detected_items: List[OddsInputItem]
    detected_bookmaker: str
    warnings: List[str]
    estimated_overround: Optional[float] = None
