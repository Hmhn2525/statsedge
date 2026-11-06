import pytest
from app.analytics.quant_engine import (
    calculate_overround, devig_multiplicative, devig_power, devig_shin,
    calculate_expected_value, calculate_kelly_fraction, classify_bet_signal
)

def test_overround_calculation():
    # Cuotas con margen evidente: 2.0, 3.2, 3.5 -> 1/2 + 1/3.2 + 1/3.5 = 0.5 + 0.3125 + 0.2857 = 1.0982 (9.82%)
    odds = [2.0, 3.2, 3.5]
    overround = calculate_overround(odds)
    assert 0.09 < overround < 0.11

def test_devig_methods_sum_to_one():
    odds = [1.90, 3.40, 4.20]

    probs_mult = devig_multiplicative(odds)
    probs_power = devig_power(odds)
    probs_shin = devig_shin(odds)

    assert pytest.approx(sum(probs_mult), 1e-5) == 1.0
    assert pytest.approx(sum(probs_power), 1e-5) == 1.0
    assert pytest.approx(sum(probs_shin), 1e-5) == 1.0

def test_shin_reduces_favourite_longshot_bias():
    # En cuotas extremas, Shin debe castigar más a los longshots (dar menor prob justa a 10.0 que el multiplicativo)
    odds = [1.15, 7.50, 15.0]
    p_mult = devig_multiplicative(odds)
    p_shin = devig_shin(odds)

    # Shin asigna MENOR probabilidad al longshot que el multiplicativo ingenuo
    assert p_shin[2] <= p_mult[2]
    # Y mayor probabilidad al favorito fuerte
    assert p_shin[0] >= p_mult[0]

def test_expected_value_and_kelly():
    # Probabilidad 55% a cuota 2.00 -> EV = 0.55 * 2 - 1 = +10%
    ev = calculate_expected_value(0.55, 2.00)
    assert pytest.approx(ev, 1e-4) == 0.10

    # Kelly al 1/8 con tope 3%:
    # f* = (0.55 * 2 - 1) / (2 - 1) = 0.10. 1/8 * 0.10 = 0.0125 (1.25%)
    kelly = calculate_kelly_fraction(0.55, 2.00, kelly_scale=0.125, max_cap=0.03)
    assert pytest.approx(kelly, 1e-4) == 0.0125

    # Si EV es negativo, Kelly debe ser estrictamente 0.0
    kelly_neg = calculate_kelly_fraction(0.40, 2.00)
    assert kelly_neg == 0.0

def test_signal_classification():
    # Buen valor con baja incertidumbre
    sig1 = classify_bet_signal(ev_nominal=0.06, ev_conservative=0.02, ci_width=0.08)
    assert sig1 == "CANDIDATE_VALUE"

    # Valor aparente pero con alta incertidumbre (ev conservador negativo)
    sig2 = classify_bet_signal(ev_nominal=0.04, ev_conservative=-0.01, ci_width=0.15)
    assert sig2 == "HIGH_UNCERTAINTY"

    # Sin valor
    sig3 = classify_bet_signal(ev_nominal=-0.02, ev_conservative=-0.05, ci_width=0.06)
    assert sig3 == "NO_EDGE"
