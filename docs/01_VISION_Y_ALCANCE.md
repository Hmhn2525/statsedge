# 01. Visión y Alcance del Proyecto

## 1. Clasificación Epistemológica del Documento
- **Información Verificada:** Los mercados de apuestas deportivas incorporan un margen comercial (*overround* o *vig*) y ajustan sus precios dinámicamente según el flujo de capital e información pública/privada.
- **Propuesta Aprobada:** Construcción de una plataforma web de análisis cuantitativo con persistencia en **Supabase (PostgreSQL)**, backend en **FastAPI**, frontend en **React + TypeScript**, y foco inicial (MVP) en fútbol (**Liga MX, LaLiga, Premier League, Champions League y MLS**), con arquitectura preparada para escalar a **NBA y NFL**.
- **Hipótesis Científica a Validar:** Es posible construir un modelo estadístico híbrido (Dixon-Coles + Elo dinámico + calibración) capaz de lograr una calibración probabilística competitiva y detectar discrepancias de precio (* +EV* ajustado por incertidumbre) en mercados seleccionados o casas recreativas (como Draftea) al compararse contra líneas *sharp* (Pinnacle).

---

## 2. Objetivo General

Diseñar, implementar y validar científicamente una plataforma web de inteligencia estadística deportiva que permita recopilar datos históricos y actuales, registrar momios de múltiples proveedores (incluyendo entrada asistida para **Draftea**), estimar probabilidades reales por mercado, auditar el valor esperado ($EV$) y simular estrategias mediante *backtesting* riguroso sin involucrar dinero real.

---

## 3. Objetivos Específicos y Capacidades del Sistema

1. **Consulta Unificada de Partidos (Históricos y Próximos):** Visualización cronológica por competición, temporada y jornada con sellos de tiempo exactos en UTC y conversión a zona horaria local (`America/Mexico_City`).
2. **Ingesta de Estadísticas de Fuentes Autorizadas:** Normalización de resultados, goles, Expected Goals ($xG$ cuando exista cobertura) y ratings Elo históricos sin violar términos de servicio.
3. **Integración y Caché de Momios:** Consulta eficiente de momios vía APIs autorizadas con presupuesto $0 en el MVP (usando *caching* persistente en Supabase para respetar cuotas gratuitas).
4. **Entrada Manual Ágil + Clipboard Parser para Draftea:** Interfaz dedicada que permite tanto la captura por formulario como el pegado inteligente de texto/tablas desde el portapapeles para registrar momios de Draftea en segundos, sin recurrir a scraping prohibido.
5. **Motor de Probabilidades Implícitas y De-Vigging:** Cálculo del margen de la casa (*overround*) y obtención de probabilidades justas de mercado mediante métodos **Multiplicativo, Power y Shin**.
6. **Modelado Predictivo Independiente:** Estimación de distribuciones de goles mediante el modelo **Dixon-Coles** enriquecido con **Elo dinámico**, derivando probabilidades coherentes para `1X2`, `Doble Oportunidad`, `Over/Under` y `BTTS` (Ambos Anotan).
7. **Detección de Valor Esperado ($EV$) Ajustado por Incertidumbre:** Comparación entre la probabilidad calibrada del modelo (con su intervalo de confianza) y la cuota disponible, evitando clasificar como "oportunidad" cualquier ruido estadístico.
8. **Analizador de Apuestas Individuales y Parlays (Combinadas):** Evaluación de selecciones múltiples, detección automática de **correlación intrapartido (Same-Game Parlay)** e interpartido, y cálculo de probabilidad conjunta real mediante la matriz bivariada de goles.
9. **Gestión Cuantitativa del Riesgo:** Sugerencia de exposición en unidades simuladas mediante **Criterio de Kelly Fraccionario** (ej. $1/4$ o $1/8$ Kelly) con tope estricto de exposición máxima.
10. **Dashboard Analítico de Bajo Ruido Visual:** Interfaz profesional basada en `shadcn/ui` y `Recharts` que distingue visual y semánticamente entre:
    - **Hecho Observado** (resultados históricos, momios capturados en un timestamp exacto).
    - **Estimación del Modelo** (probabilidades inferidas e intervalos de incertidumbre).
    - **Simulación** (resultados de *backtesting* y escenarios de Monte Carlo).
11. **Laboratorio de Validación Científica:** Ejecución de *backtesting walk-forward* (entrenamiento estrictamente anterior al partido evaluado) midiendo *Brier Score*, *Log-Loss*, *Expected Calibration Error (ECE)* y *Closing Line Value (CLV)*.
12. **Explicabilidad y Reportes:** Desglose transparente de los factores que empujan cada pronóstico (diferencial de ataque/defensa, ventaja de localía, diferencial Elo, ajuste de correlación en marcadores bajos y margen de la casa).

---

## 4. Alcance Funcional: Dentro vs. Fuera del MVP

| Dimensión | Dentro del Alcance (MVP - Fases 1 a 6) | Fuera del Alcance Inicial (Fase 7 / Prohibido) |
| :--- | :--- | :--- |
| **Deportes y Ligas** | Fútbol: **Liga MX, LaLiga, Premier League, UEFA Champions League, MLS**. | **NBA y NFL** (soportados en el esquema de BD desde Fase 1, pero sus modelos de puntos/spreads se implementan en Fase 7). |
| **Mercados** | `1X2`, `Doble Oportunidad`, `Over/Under (2.5 y líneas estándar)`, `BTTS (Ambos Anotan)`. | Mercados de props de jugadores (tiros a puerta, tarjetas, córners) y mercados en vivo (*In-Play / Live Betting*). |
| **Captura de Draftea** | Formulario estructurado + **Clipboard Parser** (pegado rápido de texto) + importación CSV. | **PROHIBIDO:** Bots de scraping directo a Draftea, evasión de Cloudflare/CAPTCHA o uso de cuentas de usuario automatizadas. |
| **Operación Financiera** | Simulación (*Paper Trading*) en unidades abstractas o bankroll ficticio. | **PROHIBIDO:** Ejecución automática de apuestas con dinero real, pasarelas de pago o almacenamiento de credenciales de casas de apuestas. |

---

## 5. Principios Rectores Irrenunciables

1. **Escepticismo Estadístico (Hipótesis Nula por Defecto):** El sistema asume por defecto que el mercado (especialmente la línea de cierre de Pinnacle) es altamente eficiente. Cualquier afirmación de ventaja estadística debe demostrarse fuera de muestra (*out-of-sample*).
2. **Cero Fuga del Futuro (*Zero Data Leakage*):** Ninguna predicción o prueba histórica puede utilizar estadísticas, ratings o cuotas registradas después del pitazo inicial (`kickoff_time`) del partido evaluado.
3. **Transparencia léxica:** Queda prohibido en el código, la base de datos y la interfaz el uso de términos engañosos como *"Apuesta Segura"*, *"Lock"*, *"Pick Garantizado"* o *"Dinero Fácil"*.
