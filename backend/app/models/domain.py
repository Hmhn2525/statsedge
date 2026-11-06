import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship, Column, JSON

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Competition(SQLModel, table=True):
    __tablename__ = "competitions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    sport_code: str = Field(index=True) # 'FOOTBALL', 'NBA', 'NFL'
    code: str = Field(unique=True, index=True) # 'LIGA_MX', 'LA_LIGA', 'EPL', 'UCL', 'MLS'
    name: str
    country: Optional[str] = None
    has_draws: bool = Field(default=True)
    is_active: bool = Field(default=True)

    matches: List["Match"] = Relationship(back_populates="competition")

class Team(SQLModel, table=True):
    __tablename__ = "teams"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    sport_code: str = Field(index=True) # 'FOOTBALL', 'NBA', 'NFL'
    canonical_name: str = Field(index=True)
    short_code: Optional[str] = None
    country: Optional[str] = None

    aliases: List["TeamAlias"] = Relationship(back_populates="team")

class TeamAlias(SQLModel, table=True):
    __tablename__ = "team_aliases"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    team_id: str = Field(foreign_key="teams.id", index=True)
    source_provider: str = Field(index=True) # 'FOOTBALL_DATA_UK', 'THE_ODDS_API', 'API_FOOTBALL', 'CLUB_ELO', 'DRAFTEA'
    alias_name: str = Field(index=True)

    team: Optional[Team] = Relationship(back_populates="aliases")

class Match(SQLModel, table=True):
    __tablename__ = "matches"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    competition_id: str = Field(foreign_key="competitions.id", index=True)
    season: str = Field(index=True) # '2023-2024', '2024-2025'
    stage_type: str = Field(default="REGULAR_SEASON") # 'REGULAR_SEASON', 'PLAYOFF', 'FINAL'
    kickoff_time: datetime = Field(index=True)
    status: str = Field(default="SCHEDULED", index=True) # 'SCHEDULED', 'FINISHED', 'POSTPONED'
    home_team_id: str = Field(foreign_key="teams.id", index=True)
    away_team_id: str = Field(foreign_key="teams.id", index=True)
    is_neutral_venue: bool = Field(default=False)
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    home_xg: Optional[float] = None
    away_xg: Optional[float] = None
    metadata_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utc_now)

    competition: Optional[Competition] = Relationship(back_populates="matches")
    odds: List["OddsSnapshot"] = Relationship(back_populates="match")
    predictions: List["ModelPrediction"] = Relationship(back_populates="match")

class OddsSnapshot(SQLModel, table=True):
    __tablename__ = "odds_snapshots"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    match_id: str = Field(foreign_key="matches.id", index=True)
    bookmaker_code: str = Field(index=True) # 'PINNACLE', 'BET365', 'DRAFTEA', 'MARKET_AVG'
    source_type: str = Field(default="API") # 'API', 'CSV', 'MANUAL_FORM', 'CLIPBOARD_PARSER'
    market_type: str = Field(index=True) # '1X2', 'DOUBLE_CHANCE', 'OVER_UNDER', 'BTTS'
    line_value: Optional[float] = Field(default=None) # ej. 2.5 para Over/Under
    selection_code: str = Field(index=True) # 'HOME', 'DRAW', 'AWAY', 'OVER', 'UNDER', 'YES', 'NO'
    decimal_odds: float
    captured_at: datetime = Field(default_factory=utc_now, index=True)
    is_closing_line: bool = Field(default=False)

    match: Optional[Match] = Relationship(back_populates="odds")

class ModelVersion(SQLModel, table=True):
    __tablename__ = "model_versions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    model_name: str = Field(index=True) # 'DIXON_COLES_ELO_V1'
    version_tag: str = Field(unique=True, index=True)
    sport_code: str = Field(default="FOOTBALL")
    hyperparameters: dict = Field(default_factory=dict, sa_column=Column(JSON))
    calibration_method: str = Field(default="NONE") # 'ISOTONIC', 'PLATT', 'NONE'
    trained_up_to: datetime
    created_at: datetime = Field(default_factory=utc_now)

    predictions: List["ModelPrediction"] = Relationship(back_populates="model_version")

class ModelPrediction(SQLModel, table=True):
    __tablename__ = "model_predictions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    match_id: str = Field(foreign_key="matches.id", index=True)
    model_version_id: str = Field(foreign_key="model_versions.id", index=True)
    generated_at: datetime = Field(default_factory=utc_now)
    market_type: str = Field(index=True)
    line_value: Optional[float] = None
    selection_code: str
    predicted_prob: float
    prob_ci_low: Optional[float] = None
    prob_ci_high: Optional[float] = None
    score_matrix_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    explanation_factors: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    match: Optional[Match] = Relationship(back_populates="predictions")
    model_version: Optional[ModelVersion] = Relationship(back_populates="predictions")

class BacktestRun(SQLModel, table=True):
    __tablename__ = "backtest_runs"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    model_version_id: str = Field(foreign_key="model_versions.id", index=True)
    competition_code: str = Field(index=True)
    market_type: str = Field(index=True)
    start_date: datetime
    end_date: datetime
    n_matches: int
    brier_score: float
    log_loss: float
    ece_score: float # Expected Calibration Error
    simulated_roi: float
    simulated_units_won: float
    max_drawdown_units: float
    benchmark_comparison_json: dict = Field(default_factory=dict, sa_column=Column(JSON))
    executed_at: datetime = Field(default_factory=utc_now)
