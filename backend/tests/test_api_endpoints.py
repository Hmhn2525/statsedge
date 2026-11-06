import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_and_root():
    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"

    res_root = client.get("/")
    assert res_root.status_code == 200
    assert "LIGA_MX" in res_root.json()["leagues_covered"]

def test_list_matches_and_evaluations():
    res = client.get("/api/matches?limit=10")
    assert res.status_code == 200
    matches = res.json()
    assert len(matches) > 0
    first_match = matches[0]
    assert "home_team_name" in first_match
    assert "away_team_name" in first_match
    assert "evaluations" in first_match

def test_score_matrix_endpoint():
    # Obtener el primer partido para pedir su matriz
    res_m = client.get("/api/matches?limit=1")
    matches = res_m.json()
    if matches:
        m_id = matches[0]["id"]
        res_matrix = client.get(f"/api/matches/{m_id}/score-matrix")
        assert res_matrix.status_code in [200, 404]
        if res_matrix.status_code == 200:
            data = res_matrix.json()
            assert "matrix_10x10" in data
            assert len(data["matrix_10x10"]) == 11

def test_backtest_scorecard_endpoint():
    res = client.get("/api/backtest/scorecard")
    assert res.status_code == 200
    data = res.json()
    assert "league_metrics" in data
    assert len(data["league_metrics"]) >= 5
    assert "calibration_bins" in data
    assert len(data["calibration_bins"]) == 10

def test_clipboard_parse_endpoint():
    sample = "Local: 2.10, Empate: 3.40, Visitante: 3.50"
    res = client.post("/api/odds/parse-clipboard", json={"raw_text": sample})
    assert res.status_code == 200
    data = res.json()
    assert len(data["detected_items"]) == 3
