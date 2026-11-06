import pytest
import numpy as np
from app.analytics.parlay_engine import evaluate_parlay
from app.schemas.domain import ParlayLeg
from app.analytics.dixon_coles import DixonColesModel

def test_same_game_parlay_correlation():
    model = DixonColesModel(xi=0.003, max_goals=10)
    matrix = model.get_score_matrix(lam=1.8, mu=0.9, rho=-0.05)

    legs = [
        ParlayLeg(match_id="m1", market_type="1X2", selection_code="HOME", decimal_odds=1.80),
        ParlayLeg(match_id="m1", market_type="OVER_UNDER", selection_code="OVER", line_value=2.5, decimal_odds=1.90),
    ]

    res = evaluate_parlay(
        legs=legs,
        score_matrices={"m1": matrix},
        model_single_probs={}
    )

    assert res.has_same_game_correlation is True
    # En fútbol ofensivo local, Local + Over 2.5 tiene correlación positiva:
    # La probabilidad conjunta real es diferente al producto ingenuo
    assert res.joint_model_prob > 0.0
    assert res.combined_decimal_odds == pytest.approx(1.80 * 1.90, 1e-4)

def test_parlay_logical_contradiction():
    model = DixonColesModel(xi=0.003, max_goals=10)
    matrix = model.get_score_matrix(lam=1.2, mu=0.8, rho=-0.05)

    # Contradicción: Under 0.5 (solo 0-0) y BTTS YES (requiere al menos 1-1)
    legs = [
        ParlayLeg(match_id="m1", market_type="OVER_UNDER", selection_code="UNDER", line_value=0.5, decimal_odds=8.0),
        ParlayLeg(match_id="m1", market_type="BTTS", selection_code="YES", decimal_odds=2.0),
    ]

    res = evaluate_parlay(
        legs=legs,
        score_matrices={"m1": matrix},
        model_single_probs={}
    )

    # La probabilidad conjunta debe ser 0.0
    assert res.joint_model_prob == 0.0
    assert "Contradicción lógica" in res.correlation_diagnosis
