from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import create_db_and_tables
from app.routers import matches, odds, parlays, backtest

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicializar tablas si no existen
    create_db_and_tables()
    yield

app = FastAPI(
    title="Plataforma de Análisis Predictivo y Cuantitativo de Apuestas Deportivas",
    description="Motor probabilístico (Dixon-Coles + Elo), de-vigging de momios (Shin/Power), análisis de parlays correlacionados y backtesting científico.",
    version="1.0.0",
    lifespan=lifespan
)

# Habilitar CORS para el Frontend Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar Routers Modulares
app.include_router(matches.router, prefix="/api")
app.include_router(odds.router, prefix="/api")
app.include_router(parlays.router, prefix="/api")
app.include_router(backtest.router, prefix="/api")

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "database": "connected"
    }

@app.get("/")
def root():
    return {
        "name": "API de Análisis Predictivo Deportivo",
        "docs_url": "/docs",
        "leagues_covered": ["LIGA_MX", "LA_LIGA", "EPL", "UCL", "MLS"],
        "future_expansion": ["NBA", "NFL"],
        "compliance": "Paper Trading Only - Sin Apuestas con Dinero Real"
    }
