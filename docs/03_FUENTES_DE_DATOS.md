# 03. Investigación y Gobernanza de Fuentes de Datos

## 1. Clasificación del Documento
- **Información Verificada:** Capacidades técnicas de `Scrapling` (verificadas vía Context7 `/d4vinci/scrapling`), cobertura de `The Odds API`, `API-Football`, `Football-Data.co.uk` y `ClubElo`.
- **Restricción Obligatoria:** Prohibición absoluta de scraping directo, evasión de CAPTCHA/Cloudflare o extracción no autorizada en **Draftea**.
- **Propuesta Aprobada:** Arquitectura híbrida de ingesta costo $0 (CSVs históricos + Free Tiers con caché en Supabase + `Scrapling` ético en fuentes públicas permitidas + Entrada Manual / Clipboard Parser para Draftea).

---

## 2. Matriz Comparativa de Fuentes Evaluadas

| Fuente | Tipo de Acceso | Datos Disponibles | Cobertura de nuestras Ligas (Liga MX, LaLiga, EPL, UCL, MLS) | Latencia y Actualización | Acceso Histórico | Costo y Límites (Free Tier) | Confiabilidad y Calidad |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Football-Data.co.uk** | Descarga directa CSV / HTTP estático | Resultados finales y al medio tiempo, estadísticas de partido (tiros, córners, faltas, tarjetas) y **momios de apertura y cierre** (Pinnacle, Bet365, promedio y máximo del mercado) para `1X2` y `Over/Under 2.5`. | **Excelente** en LaLiga (`SP1`) y Premier League (`E0`). **Buena** en Liga MX (`MEX`) y MLS (`USA`) dentro de la sección *Extra Leagues* (incluye resultados y momios Pinnacle/Avg). No cubre Champions League. | Actualización 1 a 2 veces por semana. | **+15 temporadas** gratuitas en formato CSV uniforme. | **100% Gratuito.** Sin clave API requerida. | **Muy Alta.** Estándar académico para backtesting de modelos de fútbol. |
| **The Odds API** | REST API JSON | Momios pre-partido en tiempo real de decenas de casas de apuestas internacionales y regionales (Pinnacle, Bet365, DraftKings, Codere, etc.) para `h2h` (1X2), `spreads` y `totals` (Over/Under), más `btts` en endpoints de evento. | **Completa** para las 5 ligas de fútbol (`soccer_mexico_ligamx`, `soccer_spain_la_liga`, `soccer_epl`, `soccer_uefa_champs_league`, `soccer_usa_mls`), además de `basketball_nba` y `americanfootball_nfl`. **Nota verificada:** No incluye a Draftea como bookmaker listado. | Tiempo real (actualización cada ~1-5 minutos). | Solo en planes de pago; en el plan gratuito solo entrega partidos futuros/actuales (por eso guardamos cada snapshot en Supabase para construir nuestro propio histórico hacia adelante). | **Gratuito hasta 500 créditos/mes.** Cada llamada por liga y mercado básico consume 1-2 créditos. | **Muy Alta.** Esquema JSON limpio y consistente entre deportes. |
| **API-Football (v3)** | REST API JSON | Calendarios (*fixtures*), alineaciones previas, lesionados/sancionados, tabla de posiciones, estadísticas por partido y $xG$ básico en ligas principales. | **Completa** en Liga MX (ID 262), LaLiga (ID 140), Premier League (ID 39), Champions League (ID 2) y MLS (ID 253). | Tiempo real / Diario. | Limitado en el plan gratuito (restringe acceso a ciertas temporadas o endpoints según políticas vigentes del free tier). | **Gratuito hasta 100 peticiones/día.** Sin tarjeta de crédito en registro directo. | **Alta**, aunque requiere normalizar IDs de equipos con las demás fuentes. |
| **ClubElo API** (`api.clubelo.com`) | REST CSV Abierto | Ratings Elo diarios históricos para todos los clubes europeos (incluyendo participantes de LaLiga, Premier League y UEFA Champions League) desde 1960 hasta el día actual, más probabilidades de transición. | **Completa** para LaLiga, Premier League y UEFA Champions League. No incluye Liga MX ni MLS (para ellas nuestro motor calcula su propio rating Elo interno a partir de los resultados históricos). | Diaria. | **Completo y gratuito** por fecha (`YYYY-MM-DD`) o por club. | **100% Gratuito** y abierto para uso analítico. | **Muy Alta.** Resuelve la calibración inter-ligas para la Champions League. |
| **Scrapling** (`D4Vinci/Scrapling`) | Biblioteca Python de extracción web adaptativa | Permite extraer tablas HTML/JSON de sitios públicos que lo permitan en sus términos y `robots.txt`. | Depende del sitio objetivo permitido. | Bajo demanda (con *rate limiting* estricto). | Según fuente pública. | **Open Source (Gratuito).** | **Alta** gracias a su motor `Fetcher` con `adaptive=True` que relocaliza selectores si cambia el DOM. |
| **Draftea (vía Entrada Manual / Clipboard Parser)** | Interfaz propia en el Dashboard | Momios exactos mostrados al usuario en Draftea para `1X2`, `Doble Oportunidad`, `Over/Under` y `BTTS`. | Cualquier partido que el usuario desee evaluar en Liga MX, LaLiga, EPL, UCL, MLS (y posteriormente NBA/NFL). | Instantánea al momento en que el usuario pega o digita las cuotas. | Se almacena en la tabla `odds_snapshots` de Supabase con `source_type = 'MANUAL_DRAFTEA'`. | **100% Gratuito y 100% Legal.** | **Alta**, validada con reglas Pydantic (chequeo de rango de momios y coherencia de margen). |

---

## 3. Evaluación Técnica y Reglas de Uso de `Scrapling`

De acuerdo con la documentación oficial verificada en **Context7** (`/d4vinci/scrapling`), `Scrapling` ofrece tres tipos de fetchers:
1. `Fetcher` / `AsyncFetcher`: Peticiones HTTP estáticas rápidas con soporte de selectores adaptativos (`page.css(..., auto_save=True, adaptive=True)`), XPath y navegación de árbol DOM.
2. `DynamicFetcher`: Automatización con navegador para sitios renderizados en cliente.
3. `StealthyFetcher`: Módulo diseñado para evasión antibots.

### Política de Gobernanza para `Scrapling` en este Proyecto
> [!CAUTION]
> **Regla de Cumplimiento Legal y Ético:**
> 1. **Desactivación de Evasión:** En este proyecto **solo se autoriza el uso de `Fetcher` / `AsyncFetcher` estándar** con cabeceras transparentes y respetando explícitamente el archivo `robots.txt` del sitio público consultado. Queda **estrictamente prohibido** el uso de `StealthyFetcher`, rotación de proxies residenciales para evadir bloqueos, resolución de CAPTCHAs o acceso automatizado a **Draftea**.
> 2. **Uso de la Función Adaptativa (`adaptive=True`):** La verdadera ventaja técnica de `Scrapling` para nuestro proyecto es su capacidad de **selectores adaptativos** (`auto_save=True` / `adaptive=True`) al descargar colecciones de archivos CSV públicos (como el índice de temporadas de `football-data.co.uk`) o tablas estadísticas públicas permitidas, evitando que un cambio menor de diseño HTML rompa el conector de ingesta.
> 3. **Rate Limiting Obligatorio:** Todo conector basado en `Scrapling` debe incluir un *throttling* mínimo configurable (ej. 1 petición cada 5–10 segundos) y almacenar en caché la respuesta en Supabase para nunca solicitar dos veces el mismo recurso estático.

---

## 4. Diseño del Módulo de Captura para Draftea (Sin Scraping)

Dado que **The Odds API** y **API-Football** no incluyen a **Draftea** en su catálogo de operadores y que está prohibido extraer sus datos de forma no autorizada, se diseñó un flujo de **Fricción Cero** para la entrada manual:

### 4.1 Tres Modos de Captura Manual
1. **Modo 1 — Formulario Rápido Asistido:**
   - El usuario selecciona un partido ya cargado en el sistema (ej. *América vs Cruz Azul*).
   - Ingresa las cuotas decimales (o americanas, ej. `+120`, `-150`, con conversión automática) para `1X2`, `Over/Under 2.5` y `BTTS`.
   - En tiempo real, mientras escribe, la interfaz muestra el **margen implícito (*overround*)** para detectar errores de dedo antes de guardar (ej. si escribe `1.20` en vez de `2.10`, el sistema alerta que el margen supera el 35% y pide confirmar).
2. **Modo 2 — Pegado Inteligente (*Clipboard Parser*):**
   - El usuario copia el bloque de texto de cuotas desde su navegador o notas y lo pega en un cuadro de texto en el dashboard.
   - Un parser determinista basado en expresiones regulares y reglas heurísticas identifica nombres de equipos, líneas (`Más de 2.5`, `Menos de 2.5`, `Ambos anotan: Sí/No`, `1`, `X`, `2`) y valores numéricos (tanto en formato decimal `1.85` como americano `-118`), pre-llenando la tabla para confirmación con un solo clic.
3. **Modo 3 — Importación por Lote (CSV / plantilla JSON):**
   - Permite subir una hoja rápida con múltiples cuotas de una jornada completa de Champions o Liga MX.

---

## 5. Estrategia de Reconciliación de Entidades (Entity Resolution)

Un problema clásico al combinar **Football-Data.co.uk**, **The Odds API**, **API-Football**, **ClubElo** y entradas manuales de **Draftea** es que cada fuente nombra a los equipos de forma distinta:
- Ejemplo: `"Man United"` (Football-Data) vs `"Manchester United"` (The Odds API) vs `"Manchester Utd"` (Draftea).

**Solución Arquitectónica:**
Se implementará una tabla maestra `canonical_teams` y una tabla de mapeo `team_External_aliases` en **Supabase**:
- Cada equipo tiene un `canonical_id` único (UUID), nombre oficial, código corto y liga principal.
- Todos los conectores pasan por un servicio `EntityResolver` que busca primero coincidencia exacta en `team_external_aliases` y, si encuentra un alias nuevo, sugiere el emparejamiento por similitud de cadenas (*Jaro-Winkler / RapidFuzz*) restringido a la misma liga/país para confirmación.
