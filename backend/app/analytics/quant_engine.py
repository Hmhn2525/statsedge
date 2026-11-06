import math
import numpy as np
from typing import List, Dict, Literal
from scipy.optimize import brentq

def calculate_overround(decimal_odds_list: List[float]) -> float:
    """
    Calcula el margen de la casa (Overround) dado un conjunto de cuotas mutuamente excluyentes.
    M = sum(1 / O_i) - 1.
    Ejemplo: sum = 1.05 -> Overround = 0.05 (5%)
    """
    if not decimal_odds_list or any(o <= 1.0 for o in decimal_odds_list):
        return 0.0
    book_sum = sum(1.0 / o for o in decimal_odds_list)
    return max(0.0, book_sum - 1.0)

def devig_multiplicative(decimal_odds_list: List[float]) -> List[float]:
    """
    Método Multiplicativo básico (normalización proporcional).
    p_i = (1 / O_i) / sum(1 / O_j)
    """
    invs = [1.0 / o for o in decimal_odds_list]
    total = sum(invs)
    if total <= 0:
        return [1.0 / len(decimal_odds_list)] * len(decimal_odds_list)
    return [inv / total for inv in invs]

def devig_power(decimal_odds_list: List[float]) -> List[float]:
    """
    Power Method (Exponencial): Busca el exponente k tal que sum( (1 / O_i)^k ) == 1.
    Corrige parcialmente el Favourite-Longshot bias.
    """
    invs = np.array([1.0 / o for o in decimal_odds_list], dtype=float)
    total = np.sum(invs)
    if total <= 1.0:
        return (invs / total).tolist()

    def obj_func(k: float) -> float:
        return float(np.sum(invs ** k) - 1.0)

    try:
        # k debe ser > 1 para encoger la suma a 1.0
        k_opt = brentq(obj_func, 1.0, 10.0, xtol=1e-6)
        probs = invs ** k_opt
        probs = probs / np.sum(probs)
        return probs.tolist()
    except Exception:
        # Fallback al multiplicativo si no converge
        return devig_multiplicative(decimal_odds_list)

def devig_shin(decimal_odds_list: List[float]) -> List[float]:
    """
    Método de Shin (1993): Modela la presencia de una proporción z de flujo informado ('insiders').
    Resuelve z en [0, 0.4] tal que la suma de probabilidades justas sum(p_i(z)) == 1.
    Es el estándar cuantitativo para mercados de fútbol (1X2).
    """
    invs = np.array([1.0 / o for o in decimal_odds_list], dtype=float)
    beta = float(np.sum(invs))
    if beta <= 1.0:
        return (invs / beta).tolist()

    n = len(decimal_odds_list)

    def shin_prob(z: float, inv_val: float) -> float:
        num = math.sqrt(z**2 + 4.0 * (1.0 - z) * (inv_val**2 / beta)) - z
        den = 2.0 * (1.0 - z)
        return num / den

    def obj_func(z: float) -> float:
        return sum(shin_prob(z, inv) for inv in invs) - 1.0

    try:
        z_opt = brentq(obj_func, 0.0, 0.499, xtol=1e-6)
        probs = [shin_prob(z_opt, inv) for inv in invs]
        tot = sum(probs)
        return [p / tot for p in probs]
    except Exception:
        # Fallback a Power o Multiplicativo si falla la optimización de Shin
        return devig_power(decimal_odds_list)

def calculate_expected_value(prob: float, decimal_odds: float) -> float:
    """
    EV = p * Odds - 1
    Ejemplo: prob = 0.55, odds = 2.0 -> EV = 0.55 * 2.0 - 1 = +0.10 (+10%)
    """
    return (prob * decimal_odds) - 1.0

def calculate_kelly_fraction(
    prob_conservative: float,
    decimal_odds: float,
    kelly_scale: float = 0.125, # 1/8 Kelly por defecto
    max_cap: float = 0.03       # Tope estricto del 3% del bankroll
) -> float:
    """
    Criterio de Kelly fraccionario con tope de seguridad.
    b = decimal_odds - 1 (ganancia neta por unidad apostada)
    f* = (p * decimal_odds - 1) / b
    f_rec = min(max_cap, max(0, f* * kelly_scale))
    """
    b = decimal_odds - 1.0
    if b <= 0 or prob_conservative <= 0:
        return 0.0

    ev = (prob_conservative * decimal_odds) - 1.0
    if ev <= 0:
        return 0.0

    f_star = ev / b
    f_scaled = f_star * kelly_scale
    return min(max_cap, max(0.0, f_scaled))

def classify_bet_signal(
    ev_nominal: float,
    ev_conservative: float,
    ci_width: float,
    min_ev_threshold: float = 0.025,
    max_ci_width_threshold: float = 0.18
) -> Literal["NO_EDGE", "HIGH_UNCERTAINTY", "CANDIDATE_VALUE"]:
    """
    Clasifica una selección evaluando tanto el EV como la incertidumbre del modelo.
    """
    if ev_nominal < min_ev_threshold:
        return "NO_EDGE"

    if ev_conservative <= 0.0 or ci_width > max_ci_width_threshold:
        return "HIGH_UNCERTAINTY"

    return "CANDIDATE_VALUE"
