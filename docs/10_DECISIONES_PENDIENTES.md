# 10. Registro de Decisiones Arquitectónicas (ADR) y Decisiones Pendientes

## 1. Decisiones Arquitectónicas ya Resueltas y Aprobadas (Durante `/grill-me`)

Estas decisiones ya fueron acordadas con el usuario y constituyen la línea base firme para iniciar la **Fase 1**:

| ID | Área | Decisión Acordada | Justificación |
| :--- | :--- | :--- | :--- |
| **ADR-01** | **Alcance Deportivo por Fases** | **MVP enfocado en Fútbol** (**Liga MX, LaLiga, Premier League, UEFA Champions League y MLS**), con esquema de base de datos agnóstico al deporte; **NBA y NFL** se implementan en la **Fase 7 (Post-MVP)**. | Permite construir y validar con rigor científico el motor de goles (Dixon-Coles) sin mezclar prematuramente la matemática de puntos/spreads de básquetbol y fútbol americano, pero dejando la base de datos lista desde el día 1. |
| **ADR-02** | **Política de Costos e Ingesta** | **Presupuesto $0 USD/mes en el MVP:** combinación de CSVs históricos abiertos (`Football-Data.co.uk`, `ClubElo`), Free Tiers con caché persistente (`The Odds API` 500 req/mes + `API-Football` 100 req/día), `Scrapling` ético solo en dominios públicos permitidos y captura manual para Draftea. | Maximiza la calidad de datos históricos y actuales sin incurrir en costos fijos mensuales antes de demostrar empíricamente el valor predictivo de los modelos. |
| **ADR-03** | **Captura de Cuotas de Draftea** | **Formulario Ágil + Pegado Inteligente (*Clipboard Parser*) + Importación CSV** en la interfaz, sin ningún tipo de scraping directo ni evasión antibots sobre Draftea. | Cumple al 100% con la restricción legal y contractual obligatoria, reduciendo la fricción operativa a menos de 10 segundos por partido. |
| **ADR-04** | **Persistencia y Base de Datos** | **Supabase (PostgreSQL en la nube, Free Tier)** desde el Día 1, accedido mediante `SQLModel` / `SQLAlchemy 2.0` + `Alembic` a través del Session Pooler (`Supavisor`). | Ofrece una base de datos PostgreSQL real, remota y accesible desde cualquier lugar sin costo en el MVP (500 MB cubren >350,000 partidos). |
| **ADR-05** | **Motor Predictivo del MVP** | **Modelo Dixon-Coles (Poisson bivariado con corrección en marcadores bajos $\rho$ y decaimiento temporal $\xi$) + Ratings Elo Dinámicos + Calibración Isotónica/Platt.** | Genera una única matriz $10 \times 10$ coherente que alimenta simultáneamente `1X2`, `Doble Oportunidad`, `Over/Under` y `BTTS`, y resuelve de forma nativa las correlaciones en *Same-Game Parlays*. |
| **ADR-06** | **De-Vigging y Gestión de Riesgo** | **Power / Shin De-vigging** para estimar probabilidades justas del mercado + **Kelly Fraccionario ajustable** ($1/8$ o $1/4$ Kelly) con tope de exposición (máx. 3%) y penalización automática por incertidumbre del modelo ($EV_{\text{conservador}}$). | Elimina el sesgo *Favorite-Longshot* de las cuotas y evita que errores de estimación del modelo sugieran exposiciones riesgosas. |

---

## 2. Decisiones Operativas Pendientes (Para Resolver al Iniciar Cada Fase)

A continuación se documentan los puntos operativos que requieren confirmación o provisión de datos por parte del usuario conforme avancemos en la implementación:

### 2.1 Para el Inicio Inmediato de la Fase 1 (Configuración de Supabase)
> [!IMPORTANT]
> **Credenciales del Proyecto en Supabase:**
> Para ejecutar las migraciones iniciales (`Alembic`) y poblar el dataset histórico en la Fase 1, necesitaremos que coloques en el archivo `.env` local (que nunca se subirá a repositorios públicos) la cadena de conexión de tu proyecto de Supabase:
> - `DATABASE_URL=postgresql+psycopg://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres`

### 2.2 Para la Fase 3 (Umbrales Exactos de Aceptación y Staking por Defecto)
- **Propuesta por defecto establecida en el plan (ajustable por el usuario en la UI):**
  - Nivel de confianza de los intervalos de incertidumbre por predicción: **90%** ($[p_{05}, p_{95}]$).
  - Umbral mínimo de $EV_{\text{nominal}}$ para resaltar una discrepancia: **$+2.5\%$** (siempre que $EV_{\text{conservador}} > 0$).
  - Fracción de Kelly predeterminada en el simulador: **$1/8$ de Kelly ($\kappa = 0.125$)** con tope máximo de **$3.0\%$** por apuesta individual y **$1.0\%$** para parlays.

### 2.3 Para la Fase 4 (Formato Exacto del Texto Copiado desde Draftea)
- El **Clipboard Parser** soportará desde el primer día formatos estándar de cuotas decimales (`1.85`, `3.40`, `4.20`) y americanas (`-118`, `+240`, `+320`).
- Cuando estemos en la Fase 4, podrás pegarnos un ejemplo real de texto tal como se copia desde tu navegador o pantalla de Draftea para afinar las expresiones regulares exactas a su disposición visual de líneas.

### 2.4 Para la Fase 6 (Claves de Free Tier de APIs Externas)
- No son necesarias para las Fases 1, 2, 3, 4 ni 5 (que funcionan al 100% con los datasets abiertos de `Football-Data.co.uk`, `ClubElo` y la entrada manual/portapapeles de `Draftea`).
- Al llegar a la Fase 6, opcionalmente se podrán agregar en `.env`:
  - `THE_ODDS_API_KEY` (registro gratuito en `the-odds-api.com`).
  - `API_FOOTBALL_KEY` (registro gratuito en `api-football.com`).
