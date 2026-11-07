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

    # Auto-verificación de datos: si la base de datos está vacía o tiene menos de 20 partidos,
    # ejecutar sincronización automática con Scrapling para auto-poblar fixtures reales
    try:
        from sqlmodel import Session, select
        from app.core.database import engine
        from app.models.domain import Match
        from app.ingestion.live_sports_sync import sync_live_and_curated_data

        with Session(engine) as session:
            count = len(session.exec(select(Match)).all())
            if count < 20:
                print(f"[Lifespan] Base de datos con {count} partidos. Sincronizando datos reales con Scrapling...")
                sync_live_and_curated_data(session)
                print("[Lifespan] Sincronización Scrapling completada con éxito.")
            else:
                print(f"[Lifespan] Base de datos lista con {count} partidos verificados.")
    except Exception as e:
        print(f"[Lifespan] Advertencia al verificar/sincronizar partidos en inicio: {e}")

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
