import pytest
from app.ingestion.draftea_parser import parse_draftea_clipboard_text, american_to_decimal

def test_american_to_decimal():
    assert pytest.approx(american_to_decimal("+150"), 1e-4) == 2.50
    assert pytest.approx(american_to_decimal("-110"), 1e-4) == 1.9091
    assert pytest.approx(american_to_decimal("2.15"), 1e-4) == 2.15

def test_parse_clipboard_labeled_text():
    sample_text = """
    Club América vs Guadalajara
    Victoria Local: 2.05
    Empate: +240
    Victoria Visitante: +280
    Más de 2.5 goles: 1.85
    Menos de 2.5 goles: -115
    Ambos anotan Sí: 1.75
    Ambos anotan No: 2.05
    """

    res = parse_draftea_clipboard_text(sample_text)
    assert len(res.detected_items) >= 5
    assert any(it.market_type == "1X2" and it.selection_code == "HOME" for it in res.detected_items)
    assert any(it.market_type == "OVER_UNDER" and it.selection_code == "OVER" for it in res.detected_items)
    assert any(it.market_type == "BTTS" and it.selection_code == "YES" for it in res.detected_items)
    assert res.estimated_overround is not None
    assert 0.02 < res.estimated_overround < 0.20
