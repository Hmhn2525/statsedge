# 05. Especificación del Motor Estadístico y Cuantitativo

## 1. Clasificación del Documento
- **Información Verificada:** Propiedades matemáticas de la distribución de Poisson bivariada con ajuste de **Dixon & Coles (1997)**, sistema de **Ratings Elo**, eliminación de margen mediante **Método de Shin (1993)** y **Power Method**, y **Criterio de Kelly Fraccionario**.
- **Decisiones Aprobadas:** Uso del modelo generativo **Dixon-Coles + Elo Dinámico + Calibración Isotónica/Platt** como núcleo predictivo del MVP para fútbol, alimentando una matriz conjunta de goles $P(X=i, Y=j)$ que unifica coherentemente los mercados `1X2`, `Doble Oportunidad`, `Over/Under` y `BTTS`, además de detectar correlación intrapartido en parlays (*Same-Game Parlays*).

---

## 2. Comparativa de Metodologías Evaluadas

| Metodología | Ventajas | Limitaciones | Rol en Nuestra Plataforma |
| :--- | :--- | :--- | :--- |
| **Poisson Independiente Básico** | Sencillo, interpretable, requiere pocos datos. | Subestima empates (`0-0`, `1-1`) porque asume independencia total entre goles locales y visitantes. | Descartado en favor de **Dixon-Coles**. |
| **Dixon-Coles (Poisson con Corrección de Dependencia y Decaimiento Temporal)** | Corrige la correlación en marcadores bajos ($\rho$), pondera más los partidos recientes ($\xi$) y produce la matriz completa $P(X=i, Y=j)$. | Si se usa aislado en torneos internacionales (Champions League), cuesta comparar equipos de distintas ligas. | **Motor Principal del MVP**, acoplado con **Ratings Elo** para resolver cruces inter-liga. |
| **Sistema Elo Dinámico Ajustado por Margen de Goles** | Captura tendencias de largo plazo y permite comparar clubes de distintas ligas europeas (vía *ClubElo*) o domésticas (Liga MX / MLS). | Por sí solo no estima líneas de goles (`Over/Under` ni `BTTS`). | **Covariable estructural** dentro de las tasas esperadas de gol $(\lambda, \mu)$ y modelo *benchmark*. |
| **Machine Learning Tabular (XGBoost / LightGBM / Regresión Logística)** | Puede incorporar muchas variables contextuales (descanso, lesiones, $xG$ móvil). | Si se entrena un clasificador separado para `1X2` y otro para `Over/Under 2.5`, pueden producir probabilidades incoherentes entre sí y sobreajustar en muestras pequeñas. | **Capa de ajuste / Ensemble en Fase 3** y clasificador secundario sobre las salidas de Dixon-Coles + Elo. |
| **Probabilidades Implícitas De-Vigged (Shin / Power sobre Pinnacle)** | Refleja toda la información pública y el consenso del dinero inteligente del mercado. | No disponible en mercados donde aún no abren líneas *sharp*. | **Benchmark Oficial (Gold Standard)** contra el cual debe medirse nuestro modelo en el backtesting y ancla Bayesiana para detectar valor en casas recreativas como Draftea. |

---

## 3. Formulación Matemática del Modelo Principal (Dixon-Coles + Elo)

### 3.1 Tasas Esperadas de Anotación ($\lambda_k$ Local, $\mu_k$ Visitante)
Para un partido $k$ entre el equipo local $i$ y el visitante $j$ en el instante $t_k$:

$$\ln(\lambda_k) = \alpha_i - \beta_j + \gamma \cdot I(\text{Localía no neutral}) + \eta \cdot \left(\frac{Elo_i(t_k) - Elo_j(t_k)}{400}\right)$$

$$\ln(\mu_k) = \alpha_j - \beta_i - \eta \cdot \left(\frac{Elo_i(t_k) - Elo_j(t_k)}{400}\right)$$

Donde:
- $\alpha_i, \beta_i$: Parámetros de fuerza de ataque y defensa del equipo $i$ (con restricción de identificabilidad $\sum_{i=1}^{N} \alpha_i = 0$).
- $\gamma$: Ventaja de localía específica de la competición (anulada automáticamente si `is_neutral_venue = True` o ajustada en fases de Liguilla/Champions).
- $Elo_i(t_k) - Elo_j(t_k)$: Diferencial de rating Elo estrictamente anterior al partido $k$.
- **Ponderación por Expectativa de Goles ($xG$):** Cuando el histórico cuenta con $xG$ verificado, la verosimilitud pondera una combinación convexa $G^* = w \cdot \text{Goles Reales} + (1-w) \cdot xG$ (con $w \in [0.3, 0.5]$ optimizado por validación cruzada cronológica) para reducir el ruido de la varianza de definición.

### 3.2 Función de Corrección de Correlación $\tau_{\lambda, \mu}(x, y)$ de Dixon-Coles
La probabilidad conjunta de que el equipo local anote $x$ goles y el visitante anote $y$ goles es:

$$P(X = x, Y = y) = \tau_{\lambda, \mu}(x, y) \frac{\lambda^x e^{-\lambda}}{x!} \frac{\mu^y e^{-\mu}}{y!}$$

Donde el factor de dependencia $\tau_{\lambda, \mu}(x, y)$ ajusta los marcadores bajos mediante el parámetro $\rho$:
- $\tau_{\lambda, \mu}(0, 0) = 1 - \lambda \mu \rho$
- $\tau_{\lambda, \mu}(0, 1) = 1 + \lambda \rho$
- $\tau_{\lambda, \mu}(1, 0) = 1 + \mu \rho$
- $\tau_{\lambda, \mu}(1, 1) = 1 - \rho$
- $\tau_{\lambda, \mu}(x, y) = 1$ para cualquier otro marcador $(x, y)$.

### 3.3 Decaimiento Temporal Exponencial ($\xi$)
Para que la forma reciente pese más que los partidos de hace un año sin descartar la historia estructural, la log-verosimilitud pondera cada partido pasado $m$ jugado en la fecha $t_m < t_{\text{actual}}$ mediante:

$$w(t_{\text{actual}} - t_m) = \exp\big(-\xi \cdot (t_{\text{actual}} - t_m)\big)$$

Donde $t_{\text{actual}} - t_m$ se expresa en días o semanas y $\xi \approx 0.002 - 0.0065$ se calibra mediante *Walk-Forward Validation*.

---

## 4. Derivación Coherente de Todos los Mercados desde la Matriz $M_{10 \times 10}$

A partir de la matriz truncada y renormalizada $P(X=i, Y=j)$ para $i, j \in \{0, 1, \dots, 10\}$:

1. **Mercado `1X2`:**
   - $P(\text{Local}) = \sum_{i > j} P(X=i, Y=j)$
   - $P(\text{Empate}) = \sum_{i = j} P(X=i, Y=j)$
   - $P(\text{Visitante}) = \sum_{i < j} P(X=i, Y=j)$
2. **Mercado `Doble Oportunidad` (`1X`, `12`, `X2`):**
   - $P(1X) = P(\text{Local}) + P(\text{Empate})$
   - $P(12) = P(\text{Local}) + P(\text{Visitante})$
   - $P(X2) = P(\text{Empate}) + P(\text{Visitante})$
3. **Mercado `Over/Under` (ej. Línea $L = 2.5$):**
   - $P(\text{Under } 2.5) = \sum_{i + j \le 2} P(X=i, Y=j)$
   - $P(\text{Over } 2.5) = 1 - P(\text{Under } 2.5)$
4. **Mercado `Ambos Equipos Anotan (BTTS / AA)`:**
   - $P(\text{BTTS Sí}) = \sum_{i \ge 1, \, j \ge 1} P(X=i, Y=j) = 1 - P(X=0) - P(Y=0) + P(X=0, Y=0)$
   - $P(\text{BTTS No}) = 1 - P(\text{BTTS Sí})$

> [!TIP]
> **Ventaja Crítica de este Diseño:** Es matemáticamente imposible que el modelo prediga incoherencias entre mercados (como asignar simultáneamente alta probabilidad a `0-0` y alta probabilidad a `BTTS Sí`).

---

## 5. Motor de Momios, Eliminación de Margen (De-Vigging) y Valor Esperado

### 5.1 Probabilidad Implícita Bruta y Margen (*Overround*)
Dadas las cuotas decimales $\{O_1, O_2, \dots, O_n\}$ de un mercado mutuamente excluyente:
- Probabilidad implícita bruta: $q_i = \frac{1}{O_i}$
- Suma de probabilidades brutas (*BookSum*): $S = \sum_{i=1}^n q_i$
- Margen de la casa (*Overround*): $M = S - 1$

### 5.2 Métodos de Eliminación de Margen (*De-Vigging*)
1. **Multiplicativo (Básico):** $p_i^{\text{mult}} = \frac{q_i}{S}$. Asume que la casa carga el margen proporcionalmente, lo cual falla en los *longshots* (cuotas altas) debido al *Favorite-Longshot Bias*.
2. **Power Method (Exponencial — Recomendado):** Busca el exponente único $k > 1$ tal que:
   $$\sum_{i=1}^n \left(\frac{1}{O_i}\right)^k = 1 \implies p_i^{\text{power}} = q_i^k$$
   Se resuelve numéricamente en milisegundos mediante el método de Brent (`scipy.optimize.brentq`).
3. **Método de Shin (1993 — Estándar Cuantitativo para 1X2):** Modela la presencia de una proporción $z \in (0, 1)$ de *insiders* o flujo informado, penalizando más las cuotas altas:
   $$p_i^{\text{shin}}(z) = \frac{\sqrt{z^2 + 4(1 - z)\frac{q_i^2}{S}} - z}{2(1 - z)}$$
   Donde $z$ se obtiene resolviendo $\sum_{i=1}^n p_i^{\text{shin}}(z) = 1$.

### 5.3 Valor Esperado ($EV$) Penalizado por Incertidumbre
Sea $\hat{p}$ la probabilidad central calibrada del modelo y $[p_{\text{low}}, p_{\text{high}}]$ su intervalo de confianza al 90% obtenido mediante *Parametric Bootstrap* de la matriz de covarianza de los parámetros $(\hat{\alpha}, \hat{\beta}, \hat{\gamma}, \hat{\rho})$:
- **EV Nominal:** $EV_{\text{nom}} = \hat{p} \cdot O - 1$
- **EV Conservador (Ajustado por Incertidumbre):**
  $$EV_{\text{cons}} = p_{\text{shrink}} \cdot O - 1, \quad \text{donde } p_{\text{shrink}} = \tau \cdot p_{\text{low}} + (1 - \tau) \cdot \hat{p}$$
- **Regla de Clasificación Anti-Ruido:** Una selección **solo** se etiqueta como `CANDIDATE_VALUE` si se cumplen simultáneamente tres condiciones:
  1. $EV_{\text{nom}} > \text{Umbral Mínimo}$ (ej. $+2.5\%$).
  2. $EV_{\text{cons}} > 0$ (incluso en el escenario conservador de error de estimación sigue teniendo valor positivo).
  3. El ancho del intervalo de incertidumbre $(p_{\text{high}} - p_{\text{low}})$ no supera el umbral máximo de dispersión (ej. $0.18$).

### 5.4 Gestión de Exposición: Kelly Fraccionario con Tope
La fracción óptima teórica de Kelly es $f^* = \frac{p_{\text{shrink}} \cdot O - 1}{O - 1}$. Para proteger contra la varianza y el error de especificación del modelo:
$$f_{\text{recomendada}} = \min\left( f_{\max}, \; \kappa \cdot \max(0, f^*) \right)$$
Donde $\kappa \in \{0.125, 0.25\}$ ($1/8$ o $1/4$ de Kelly) y $f_{\max} = 0.03$ (máximo 3% de unidades del bankroll simulado por selección).

---

## 6. Motor de Análisis de Parlays y Detección de Correlación

### 6.1 El Problema Matemático de las Combinadas
Si un usuario selecciona $K$ eventos $E_1, E_2, \dots, E_K$ con cuotas $O_1, \dots, O_K$, la cuota combinada nominal es $O_{\text{parlay}} = \prod_{k=1}^K O_k$.
Multiplicar ingenuamente $\prod_{k=1}^K P(E_k)$ **es un error grave** cuando las selecciones pertenecen al mismo partido (*Same-Game Parlay / Creación de Apuesta*) o comparten dependencias de torneo.

### 6.2 Taxonomía y Cálculo Exacto de Dependencias en Nuestro Motor

| Tipo de Relación entre Selecciones $A$ y $B$ | Ejemplo Real | Método de Cálculo de $P(A \cap B)$ en Nuestro Motor |
| :--- | :--- | :--- |
| **Caso 1: Mismo Partido (Same-Game Parlay / SGP)** | `Local Gana (1)` + `Over 2.5 Goles` en *Real Madrid vs Barcelona*. | **Integración Exacta sobre la Matriz Bivariada $M_{10 \times 10}$:** En lugar de multiplicar $P(1) \times P(\text{Over } 2.5)$, el motor suma directamente las celdas de la matriz que satisfacen ambas condiciones simultáneamente: $$P(A \cap B) = \sum_{(i, j) \in \mathcal{S}_A \cap \mathcal{S}_B} P(X=i, Y=j)$$ En este ejemplo: $\sum_{i > j \text{ y } i+j \ge 3} P(X=i, Y=j)$. |
| **Caso 2: Contradicción Lógica o Solapamiento Total** | `Empate (X)` + `Over 2.5` (solo válido en `2-2`, `3-3`, etc., correlación negativa fuerte) o `Under 1.5` + `BTTS Sí` (imposible: $P = 0$). | La intersección de conjuntos $\mathcal{S}_A \cap \mathcal{S}_B$ en la matriz $M_{10 \times 10}$ detecta automáticamente probabilidad $0$ (bloqueando el parlay por contradicción) o cuantifica el coeficiente de correlación $\phi = \frac{P(A \cap B) - P(A)P(B)}{\sqrt{P(A)(1-P(A))P(B)(1-P(B))}}$. |
| **Caso 3: Partidos Distintos pero con Equipo/Factor Común** | Partido de Ida y Partido de Vuelta de la misma serie de Liguilla / Champions. | Aplicación de **Cópula Gaussiana / Factor de Incertidumbre de Parámetro Compartido**: como ambos partidos dependen del mismo parámetro estimado $\hat{\alpha}_{\text{equipo}}$, un error de estimación afecta a ambas patas en la misma dirección, incrementando la varianza de la cola. |
| **Caso 4: Partidos Independientes** | *América vs Toluca* (`Over 2.5`) + *Arsenal vs Chelsea* (`BTTS Sí`). | Producto de probabilidades calibradas $P(A \cap B) = P(A) \cdot P(B)$, acompañado del cálculo de **Erosión por Margen Compuesto**: $$M_{\text{compuesto}} = \left(\prod_{k=1}^K (1 + M_k)\right) - 1$$ |
