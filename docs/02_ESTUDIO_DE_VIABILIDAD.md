# 02. Estudio de Viabilidad Técnica, Económica y Científica

## 1. Clasificación del Documento
- **Información Verificada:** Costos de planes gratuitos de APIs deportivas, capacidades de Supabase Free Tier y propiedades matemáticas de los mercados de apuestas.
- **Decisiones Aprobadas:** Operación con **Presupuesto $0 USD/mes** durante el MVP, uso de **Supabase (PostgreSQL)** como base de datos en la nube, y enfoque inicial en 5 competiciones de fútbol antes de expandir a NBA/NFL.

---

## 2. Viabilidad Económica (Presupuesto $0 USD/mes en el MVP)

El proyecto es **100% viable sin costo monetario durante el MVP** si se implementa una arquitectura de **ingesta desacoplada con caché persistente en base de datos**. El error más común en proyectos similares es consultar la API externa cada vez que el usuario abre el dashboard; en nuestra arquitectura, el frontend **jamás** llama a APIs externas directamente: solo consulta **Supabase** a través de nuestro backend en **FastAPI**, y las sincronizaciones externas ocurren bajo demanda controlada o programación diaria.

### Desglose de Costos e Infraestructura para el MVP

| Componente | Proveedor / Herramienta | Plan en MVP | Límite del Plan Gratuito | Estrategia de Mitigación Técnica | Costo Mensual |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Base de Datos** | **Supabase** (PostgreSQL) | Free Tier | 500 MB almacenamiento, 5 GB egress, proyectos ilimitados (hasta 2 activos). | 500 MB almacenan más de **350,000 partidos** con sus cuotas e historiales de predicción. Uso de índices compactos y limpieza de logs efímeros. | **$0.00** |
| **Momios Pre-Partido** | **The Odds API** | Free Tier | 500 créditos/mes. | 1 petición por liga trae todos los partidos próximos con múltiples casas de apuestas para `h2h` (1X2) y `totals` (Over/Under). Sincronizando 5 ligas 2 veces por semana se consumen ~80-160 créditos/mes. | **$0.00** |
| **Estadísticas y Calendarios** | **API-Football** | Free Tier | 100 peticiones/día. | Suficiente para actualizar calendarios, resultados diarios y lesionados de las 5 ligas objetivo si se almacena la respuesta en Supabase. | **$0.00** |
| **Datos Históricos Masivos** | **Football-Data.co.uk** + **ClubElo API** | Open Data | Sin costo (CSVs descargables y API abierta de Elo). | Provee más de 10 temporadas de resultados y momios de apertura/cierre para LaLiga, Premier League y Liga MX (en sección de ligas extra). | **$0.00** |
| **Cuotas de Draftea** | **Módulo Propio (Manual + Clipboard Parser)** | Interno | Sin límite. | Permite pegar texto copiado desde el navegador/app o ingresar cuotas manualmente en <10 segundos por partido. | **$0.00** |
| **Stack de Ejecución** | **FastAPI + React (Vite)** | Local / Self-hosted | Sin límite. | Ejecución local en la máquina de trabajo conectada a Supabase Cloud. | **$0.00** |

---

## 3. Viabilidad Técnica

### 3.1 Complejidad de las 5 Competiciones Seleccionadas en el MVP
Al haber seleccionado **Liga MX, LaLiga, Premier League, UEFA Champions League y MLS**, existen particularidades técnicas verificadas que el diseño resuelve:
1. **LaLiga y Premier League:** Cobertura perfecta en todas las fuentes (Football-Data.co.uk, ClubElo, Understat/FBref, The Odds API).
2. **Liga MX y MLS:**
   - Tienen formato de fase regular + *Playoffs* (Liguilla / Play-In en Liga MX; MLS Cup Playoffs en MLS).
   - **Impacto en el modelo:** En fase de eliminación directa o partidos de vuelta, los incentivos de empate o goles cambian respecto a la liga regular. Por ello, el esquema de datos incluye la bandera `stage_type` (`REGULAR_SEASON`, `PLAYOFF_LEG_1`, `PLAYOFF_LEG_2`, `FINAL_NEUTRAL`) para ajustar o filtrar la ventaja de localía.
3. **UEFA Champions League:**
   - Enfrenta a equipos de distintas ligas nacionales (ej. un club de LaLiga contra uno de la Bundesliga).
   - **Impacto en el modelo:** Un modelo Poisson entrenado solo con partidos domésticos no puede comparar directamente la fuerza de ataque de ligas distintas sin un ancla común. La integración de **Ratings Elo inter-ligas (ClubElo)** resuelve este problema actuando como covariable de fortaleza relativa global.

### 3.2 Preparación para NBA y NFL (Fase 7)
- Si diseñáramos tablas con columnas fijas como `home_goals` o `draw_odds`, tendríamos que rehacer la base de datos al agregar NBA y NFL.
- **Solución técnica adoptada:** El esquema en Supabase utiliza `home_score` / `away_score`, una columna `sport_code` (`FOOTBALL`, `NBA`, `NFL`), y una estructura de mercados estandarizada (`market_type`: `1X2`, `MONEYLINE_2WAY`, `SPREAD`, `TOTAL`, `BTTS` con parámetro `line_value`, ej. `2.5` goles o `-6.5` puntos en NFL/NBA).

---

## 4. Viabilidad Científica y de Mercado

> [!WARNING]
> **Realismo Cuantitativo:** Los mercados principales (`1X2` y `Over/Under 2.5`) de la Premier League, LaLiga y Champions League momentos antes del inicio del partido están entre los mercados financieros/deportivos más eficientes del mundo. Superar sistemáticamente la línea de cierre de **Pinnacle** solo con datos públicos es extraordinariamente difícil.

### ¿Dónde reside entonces la viabilidad real y utilidad práctica de la plataforma?
1. **Ineficiencias de Precio entre Casas Recreativas vs. Mercado Sharp (Top-Down / Arbitraje de Valor):**
   - Casas locales o recreativas como **Draftea** u operadores regionales frecuentemente tardan más en ajustar sus cuotas ante movimientos del mercado global o aplican márgenes asimétricos según el sesgo del apostador recreativo local (por ejemplo, sobrevalorar a equipos populares en Liga MX o Champions).
   - Al comparar la probabilidad justa (*de-vigged* mediante método de Shin) de casas *sharp* + la probabilidad de nuestro modelo **Dixon-Coles + Elo** contra la cuota manual ingresada de **Draftea**, la plataforma puede detectar discrepancias objetivas de precio.
2. **Auditoría Matemática de Parlays (Evitar Trampas de Margen Compuesto):**
   - En una combinada de $k$ selecciones independientes con margen $m$, el margen efectivo de la casa crece de forma compuesta: $(1 + m)^k - 1$. En un parlay de 4 selecciones con 6% de margen cada una, la ventaja de la casa sube a **~26.2%**.
   - El analizador cuantifica exactamente esta erosión de valor y evalúa cuándo una correlación positiva intrapartido compensa (o no) dicho margen.
3. **Verificabilidad Empírica:**
   - El sistema incluye un criterio de éxito científico honesto: si tras el *backtesting walk-forward* un modelo no supera la línea base o presenta mala calibración, el **Laboratorio Estadístico** lo reportará explícitamente con métricas auditable (*Brier Score*, *Log-Loss*, *CLV*), impidiendo tomar decisiones a ciegas.

---

## 5. Conclusión de Viabilidad

El proyecto es **técnica, económica y legalmente viable** bajo las restricciones acordadas:
- **Presupuesto:** $0 USD/mes.
- **Riesgo Legal:** Nulo (uso exclusivo de datos abiertos, APIs con licencia/free tier, `Scrapling` solo en dominios públicos permitidos respetando `robots.txt`, y captura manual/portapapeles para Draftea).
- **Escalabilidad:** Alta gracias a Supabase + FastAPI + arquitectura modular de motores predictivos.
