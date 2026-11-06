import pytest
import numpy as np
from app.analytics.dixon_coles import DixonColesModel, tau_correction

def test_tau_correction_properties():
    # Con rho < 0 (efecto Dixon-Coles típico en fútbol para corregir déficit de empates y 0-0):
    # tau(0, 0) = 1 - lam * mu * rho > 1 cuando rho < 0
    t_00 = tau_correction(0, 0, lam=1.4, mu=1.1, rho=-0.05)
    assert t_00 > 1.0

    # tau en marcadores altos debe ser 1.0
    assert tau_correction(2, 2, lam=1.4, mu=1.1, rho=-0.05) == 1.0
    assert tau_correction(3, 1, lam=1.4, mu=1.1, rho=-0.05) == 1.0

def test_score_matrix_sum_and_coherence():
    model = DixonColesModel(xi=0.003, max_goals=10)
    matrix = model.get_score_matrix(lam=1.6, mu=1.2, rho=-0.06)

    # La matriz 11x11 debe sumar exactamente 1.0
    assert pytest.approx(float(np.sum(matrix)), 1e-6) == 1.0

    # Derivación de mercados
    markets = model.predict_markets_from_matrix(matrix)

    p_home = markets["1X2"]["HOME"]["prob"]
    p_draw = markets["1X2"]["DRAW"]["prob"]
    p_away = markets["1X2"]["AWAY"]["prob"]

    # Suma de 1X2 = 1.0
    assert pytest.approx(p_home + p_draw + p_away, 1e-5) == 1.0

    # Doble Oportunidad coherente
    p_1x = markets["DOUBLE_CHANCE"]["1X"]["prob"]
    assert pytest.approx(p_1x, 1e-5) == (p_home + p_draw)

    # Over + Under = 1.0
    p_over = markets["OVER_UNDER_2.5"]["OVER"]["prob"]
    p_under = markets["OVER_UNDER_2.5"]["UNDER"]["prob"]
    assert pytest.approx(p_over + p_under, 1e-5) == 1.0

    # BTTS Yes + No = 1.0
    p_btts_y = markets["BTTS"]["YES"]["prob"]
    p_btts_n = markets["BTTS"]["NO"]["prob"]
    assert pytest.approx(p_btts_y + p_btts_n, 1e-5) == 1.0
