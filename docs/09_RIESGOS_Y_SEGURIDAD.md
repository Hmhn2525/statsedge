# 09. Riesgos, Seguridad, Gobernanza y Uso Responsable

## 1. Clasificación del Documento
- **Restricciones Obligatorias:** Cumplimiento estricto de las políticas de seguridad de credenciales, prohibición de scraping o acceso no autorizado a **Draftea**, exclusión total de apuestas automáticas o transacciones con dinero real, y diseño orientado al uso analítico responsable.

---

## 2. Matriz de Riesgos Técnicos, Estadísticos y Legales

| ID | Categoría | Descripción del Riesgo | Impacto | Probabilidad | Estrategia de Mitigación en el Diseño |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **R-01** | **Estadístico (Crítico)** | **Fuga de información futura (*Data Leakage*)** durante el backtesting que infle artificialmente el ROI simulado. | Crítico | Media | Partición cronológica estricta en SQL (`WHERE kickoff_time < :as_of_date`) y prueba unitaria automatizada de invarianza temporal en CI. |
| **R-02** | **Estadístico (Crítico)** | **Sobreajuste (*Overfitting*) y Sesgo de Selección Múltiple** al probar decenas de filtros por liga/mercado hasta encontrar uno rentable por azar. | Alto | Alta | Corrección por pruebas múltiples (Bonferroni / False Discovery Rate), tamaño mínimo de muestra ($N \ge 300$) y priorización de *Log-Loss* y *CLV* sobre el ROI bruto de muestras pequeñas. |
| **R-03** | **Modelado Deportivo** | **Comparación entre ligas dispares en Champions League** o cambios de formato en Liguilla de Liga MX / Playoffs de MLS. | Alto | Media | Incorporación del diferencial **ClubElo** para anclar fuerzas entre ligas europeas y bandera `stage_type` para ajustar la ventaja de localía en rondas de eliminación directa. |
| **R-04** | **Operativo / Económico** | **Agotamiento prematuro de la cuota gratuita** de *The Odds API* (500 créditos/mes) o *API-Football* (100 req/día). | Medio | Media | Tabla `api_quota_ledger` en Supabase que registra cada petición externa, bloquea llamadas redundantes mediante TTL de caché configurable y exige confirmación antes de sincronizaciones masivas. |
| **R-05** | **Legal y Cumplimiento** | **Incumplimiento de términos de servicio** por scraping agresivo o intento de extracción automatizada de casas protegidas como Draftea. | Crítico | Baja (por diseño) | **Bloqueo arquitectónico:** No existe ningún scraper dirigido a Draftea; sus cuotas entran únicamente vía formulario manual o *Clipboard Parser* del usuario. `Scrapling` se limita a `Fetcher` estático en fuentes públicas que lo permitan, respetando `robots.txt`. |
| **R-06** | **Cognitivo / Usuario** | **Falsa sensación de certeza** ante un porcentaje o un $EV$ positivo nominal, o abuso de parlays de muchas selecciones. | Alto | Media | Visualización obligatoria del intervalo de confianza $[p_{\text{low}}, p_{\text{high}}]$, uso de $EV_{\text{conservador}}$, alerta de margen compuesto en parlays y tope rígido de exposición (máx. 3% en Kelly fraccionario). |

---

## 3. Seguridad de la Información y Credenciales

1. **Gestión de Secretos y Variables de Entorno:**
   - Todas las credenciales (`SUPABASE_DB_URL`, `THE_ODDS_API_KEY`, `API_FOOTBALL_KEY`) se cargan exclusivamente mediante `pydantic-settings` desde un archivo `.env` local excluido en `.gitignore`.
   - Se proveerá únicamente una plantilla `.env.example` sin valores sensibles.
2. **Aislamiento de Claves en el Backend:**
   - El frontend en React **nunca** recibe ni almacena las claves de *The Odds API* ni *API-Football*, ni se conecta directamente a ellas. Toda consulta pasa por el backend en FastAPI.
3. **Prohibición de Credenciales de Casas de Apuestas:**
   - El sistema **no tendrá tablas, campos ni formularios** para almacenar usuarios, contraseñas, tokens de sesión ni métodos de pago de Draftea ni de ninguna otra casa de apuestas.
4. **Trazabilidad y Procedencia de Datos (*Data Lineage*):**
   - Cada fila en `odds_snapshots` y `matches` registra `source_provider`, `source_type` y `captured_at (TIMESTAMPTZ)` en UTC.
   - Si una fuente externa falla o devuelve datos incompletos, el sistema degrada elegantemente (*Graceful Degradation*): mantiene los últimos datos en caché mostrando una insignia de advertencia con la antigüedad exacta (`Datos con 18h de antigüedad — Fuente externa no disponible`).

---

## 4. Salvaguardas de Uso Responsable y Exclusión de Dinero Real

1. **Entorno 100% Simulado (*Paper Trading Only*):**
   - La plataforma no ejecuta apuestas reales ni se integra con APIs transaccionales de operadores de juego.
   - Todas las métricas de exposición utilizan **"Unidades Simuladas ($u$)"** sobre una banca teórica configurable de estudio (ej. $100u$).
2. **Límites Duros en el Motor de Riesgo:**
   - Aunque una cuota tenga una discrepancia matemática enorme (por ejemplo, por un error de captura manual), el motor de Kelly fraccionario tiene un **cortacircuitos duro (`HARD_CAP = 0.03`)** que impide sugerir más de $3u$ (3%) en una sola selección o más de $1u$ (1%) en un parlay.
3. **Advertencias Metodológicas Visibles:**
   - Todo reporte generado incluye al pie la nota técnica:
     > *"Las probabilidades estimadas provienen de un modelo estadístico sujeto a error muestral, varianza inherente al deporte y cambios de última hora (alineaciones, arbitraje, clima). Un Valor Esperado ($EV$) positivo teórico no garantiza resultados favorables en un partido individual ni rentabilidad futura."*
