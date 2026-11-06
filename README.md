# Plataforma de Análisis Predictivo y Cuantitativo de Apuestas Deportivas

> [!IMPORTANT]
> **Estado del Proyecto:** Implementación Completa y Verificada (Fases 0 a 5).
> **Aviso de Uso Responsable:** Esta plataforma es una herramienta de investigación estadística, modelado probabilístico y simulación cuantitativa (**Paper Trading / Sin Dinero Real**). Ninguna estimación constituye una certeza ni garantía de rentabilidad.

---

## 1. Resumen de la Plataforma

Plataforma analítica moderna y científicamente auditable para fútbol (**Liga MX, LaLiga, Premier League, UEFA Champions League y MLS**), con arquitectura relacional agnóstica preparada para expandirse a **NBA y NFL** en Fase 7.

### Capacidades Principales Implementadas:
1. **Modelado Dixon-Coles + Elo Dinámico:** Estimación por máxima verosimilitud con decaimiento temporal y corrección no lineal en marcadores bajos ($\rho$). Genera una matriz $10 \times 10$ $P(X=i, Y=j)$ que deriva de forma unificada `1X2`, `Doble Oportunidad`, `Over/Under 2.5` y `BTTS`.
2. **Motor de De-Vigging y Cuotas Justas:** Métodos de **Shin (1993)**, **Power Method** y **Multiplicativo** para eliminar el margen de la casa y contrastar contra casas *sharp* (Pinnacle).
3. **Módulo Ágil de Captura para Draftea (Sin Scraping Ilegal):** Parser inteligente de portapapeles (`Clipboard Parser`) y formulario asistido con cálculo de margen (*overround*) en tiempo real para ingresar cuotas de Draftea en segundos sin violar sus términos de servicio.
4. **Auditor de Parlays y Detección de Correlación SGP:** Integra sobre la matriz bivariada de goles para calcular la probabilidad real conjunta en *Same-Game Parlays* (ej. `Local + Over 2.5`), detecta contradicciones lógicas y alerta sobre la erosión de margen compuesto.
5. **Laboratorio Estadístico:** Curvas interactivas de calibración (Reliability Diagram), simulación acumulada *Walk-Forward* en unidades ficticias y tabla comparativa de modelos frente a benchmarks (*Brier Score*, *Log-Loss*, *ECE*, *CLV*).

---

## 2. Estructura del Repositorio

```text
analisis_predictivo/
├── README.md
├── start_backend.bat              # Script de arranque rápido del Backend
├── start_frontend.bat             # Script de arranque rápido del Frontend
├── test_suite.bat                 # Ejecución de la suite completa de pruebas
├── docs/                          # Documentación técnica y científica (Fases 0-10)
│   ├── 01_VISION_Y_ALCANCE.md
│   ├── 02_ESTUDIO_DE_VIABILIDAD.md
│   ├── 03_FUENTES_DE_DATOS.md
│   ├── 04_ARQUITECTURA.md
│   ├── 05_MODELOS_ESTADISTICOS.md
│   ├── 06_VALIDACION_Y_BACKTESTING.md
│   ├── 07_DISENO_DE_INTERFAZ.md
│   ├── 08_ROADMAP.md
│   ├── 09_RIESGOS_Y_SEGURIDAD.md
│   └── 10_DECISIONES_PENDIENTES.md
├── backend/                       # API FastAPI + Motor Estadístico y Cuantitativo
│   ├── requirements.txt
│   ├── .env.example
│   ├── app/
│   │   ├── main.py                # Aplicación FastAPI y CORS
│   │   ├── core/                  # Configuración (Pydantic Settings) y BD
│   │   ├── models/                # Esquema SQLModel (Competitions, Matches, Odds, Models)
│   │   ├── schemas/               # Contratos Pydantic v2
│   │   ├── analytics/             # Dixon-Coles, Elo, De-vigging (Shin/Power), Parlays
│   │   ├── ingestion/             # Parser portapapeles Draftea y Seeder histórico
│   │   └── routers/               # Endpoints REST (/matches, /odds, /parlays, /backtest)
│   └── tests/                     # 16 pruebas unitarias y matemáticas automatizadas (pytest)
└── frontend/                      # SPA React 19 + TypeScript + Tailwind CSS + Recharts
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── types/                 # Tipos TypeScript compartidos
        ├── services/              # Cliente API REST
        ├── components/            # Navbar, Badges semánticos
        └── modules/               # Los 6 módulos del Dashboard
            ├── MainDashboard.tsx
            ├── MatchExplorer.tsx
            ├── OddsComparator.tsx
            ├── BetAnalyzer.tsx
            ├── ParlayBuilder.tsx
            └── StatisticalLab.tsx
```

---

## 3. Instrucciones de Ejecución Rápida

### Opción A. Con los scripts `.bat` (Windows):
1. **Iniciar Backend:** Doble clic o ejecutar en terminal `start_backend.bat`. (Levanta la API en `http://localhost:8005`).
2. **Iniciar Frontend:** Doble clic o ejecutar en terminal `start_frontend.bat`. (Abre el Dashboard en `http://localhost:5175`).
3. **Ejecutar Pruebas:** Doble clic en `test_suite.bat`.

### Opción B. Manualmente desde la terminal:
```bash
# 1. Backend
cd c:\Proyectos_ASP\analisis_predictivo
.\.venv\Scripts\activate
$env:PYTHONPATH="c:\Proyectos_ASP\analisis_predictivo\backend"
uvicorn app.main:app --host 0.0.0.0 --port 8005 --reload

# 2. Frontend (en otra terminal)
cd c:\Proyectos_ASP\analisis_predictivo\frontend
npm run dev -- --port 5175
```

---

## 4. Configuración de Base de Datos (Supabase PostgreSQL / Local)

El backend soporta **Supabase PostgreSQL** en la nube y **SQLite local** de respaldo mediante la variable `DATABASE_URL` en `backend/.env`:
- **Supabase PostgreSQL:**
  ```env
  DATABASE_URL=postgresql+psycopg://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
  ```
- **SQLite local (por defecto):**
  ```env
  DATABASE_URL=sqlite:///./analisis_predictivo.db
  ```
