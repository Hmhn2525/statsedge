from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    ENVIRONMENT: Literal["development", "testing", "production"] = "development"
    LOG_LEVEL: str = "INFO"
    PORT: int = Field(default=8005)

    # Base de Datos
    # Default to sqlite local, pero acepta postgresql+psycopg:// para Supabase
    DATABASE_URL: str = Field(default="sqlite:///./analisis_predictivo.db")

    # APIs Externas (Opcionales para fases avanzadas)
    THE_ODDS_API_KEY: str | None = None
    API_FOOTBALL_KEY: str | None = None

    # Parámetros Cuantitativos
    KELLY_MAX_FRACTION: float = 0.03 # Máximo 3% del bankroll
    KELLY_SCALE: float = 0.125       # 1/8 Kelly
    MIN_POSITIVE_EV_THRESHOLD: float = 0.025 # +2.5% EV
    CONFIDENCE_LEVEL: float = 0.90   # Intervalos de incertidumbre al 90%

settings = Settings()
