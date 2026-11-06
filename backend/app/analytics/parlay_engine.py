import math
import numpy as np
from typing import List, Dict, Any, Tuple
from app.schemas.domain import ParlayLeg, ParlayEvaluationResponse

def evaluate_parlay(
    legs: List[ParlayLeg],
    score_matrices: Dict[str, np.ndarray], # match_id -> matrix 11x11
    model_single_probs: Dict[Tuple[str, str, str], float] # (match_id, market_type, selection) -> prob
) -> ParlayEvaluationResponse:
    """
    Evalúa combinadas (parlays) diferenciando selecciones independientes de
    selecciones correlacionadas del mismo partido (Same-Game Parlays).
    """
    if not legs:
        raise ValueError("El parlay debe tener al menos una selección")

    # Cuota combinada nominal
    combined_odds = 1.0
    for leg in legs:
        combined_odds *= leg.decimal_odds

    # Agrupar patas por partido para detectar SGP
    matches_legs: Dict[str, List[ParlayLeg]] = {}
    for leg in legs:
        matches_legs.setdefault(leg.match_id, []).append(leg)

    has_sgp = any(len(group) > 1 for group in matches_legs.values())
    naive_prob = 1.0
    joint_prob = 1.0
    correlation_notes: List[str] = []

    for match_id, m_legs in matches_legs.items():
        if len(m_legs) == 1:
            leg = m_legs[0]
            p = model_single_probs.get((leg.match_id, leg.market_type, leg.selection_code), 1.0 / leg.decimal_odds)
            naive_prob *= p
            joint_prob *= p
        else:
            # Same-Game Parlay! Calcular usando la matriz bivariada de goles
            matrix = score_matrices.get(match_id)
            if matrix is None:
                # Si no hay matriz cargada, fallback al producto ingenuo
                for leg in m_legs:
                    p = model_single_probs.get((leg.match_id, leg.market_type, leg.selection_code), 1.0 / leg.decimal_odds)
                    naive_prob *= p
                    joint_prob *= p
                continue

            max_g = matrix.shape[0] - 1
            # Para cada celda (i, j), verificar si cumple TODAS las selecciones del partido
            valid_mask = np.ones_like(matrix, dtype=bool)
            individual_sgp_probs = []

            for leg in m_legs:
                leg_mask = np.zeros_like(matrix, dtype=bool)
                for i in range(max_g + 1):
                    for j in range(max_g + 1):
                        if leg.market_type == "1X2":
                            if leg.selection_code == "HOME" and i > j:
                                leg_mask[i, j] = True
                            elif leg.selection_code == "DRAW" and i == j:
                                leg_mask[i, j] = True
                            elif leg.selection_code == "AWAY" and i < j:
                                leg_mask[i, j] = True
                        elif leg.market_type == "DOUBLE_CHANCE":
                            if leg.selection_code == "1X" and i >= j:
                                leg_mask[i, j] = True
                            elif leg.selection_code == "12" and i != j:
                                leg_mask[i, j] = True
                            elif leg.selection_code == "X2" and i <= j:
                                leg_mask[i, j] = True
                        elif leg.market_type == "OVER_UNDER":
                            val = leg.line_value if leg.line_value is not None else 2.5
                            if leg.selection_code == "OVER" and (i + j) > val:
                                leg_mask[i, j] = True
                            elif leg.selection_code == "UNDER" and (i + j) < val:
                                leg_mask[i, j] = True
                        elif leg.market_type == "BTTS":
                            if leg.selection_code == "YES" and i >= 1 and j >= 1:
                                leg_mask[i, j] = True
                            elif leg.selection_code == "NO" and (i == 0 or j == 0):
                                leg_mask[i, j] = True

                p_single = float(np.sum(matrix[leg_mask]))
                individual_sgp_probs.append(p_single)
                naive_prob *= p_single
                valid_mask = valid_mask & leg_mask

            sgp_joint_prob = float(np.sum(matrix[valid_mask]))
            joint_prob *= sgp_joint_prob

            # Diagnóstico de correlación
            naive_sgp_prod = np.prod(individual_sgp_probs)
            if sgp_joint_prob <= 1e-6:
                correlation_notes.append(f"Partido {match_id[:8]}: ¡Contradicción lógica detectada! Probabilidad conjunta = 0.")
            elif sgp_joint_prob > naive_sgp_prod * 1.05:
                diff_pct = ((sgp_joint_prob / naive_sgp_prod) - 1.0) * 100.0
                correlation_notes.append(f"Partido {match_id[:8]}: Correlación positiva (+{diff_pct:.1f}% vs producto independiente).")
            elif sgp_joint_prob < naive_sgp_prod * 0.95:
                diff_pct = (1.0 - (sgp_joint_prob / naive_sgp_prod)) * 100.0
                correlation_notes.append(f"Partido {match_id[:8]}: Correlación negativa (-{diff_pct:.1f}% vs producto independiente).")
            else:
                correlation_notes.append(f"Partido {match_id[:8]}: Correlación casi nula.")

    combined_ev = (joint_prob * combined_odds) - 1.0

    # Nivel de riesgo según probabilidad real de acertar todas las patas
    if joint_prob >= 0.40:
        risk_level = "BAJO"
    elif joint_prob >= 0.20:
        risk_level = "MEDIO"
    elif joint_prob >= 0.08:
        risk_level = "ALTO"
    else:
        risk_level = "EXTREMO"

    diag_text = " | ".join(correlation_notes) if correlation_notes else "Selecciones en partidos independientes sin correlación intrapartido."

    return ParlayEvaluationResponse(
        legs=legs,
        combined_decimal_odds=round(combined_odds, 4),
        naive_multiplied_prob=round(naive_prob, 5),
        joint_model_prob=round(joint_prob, 5),
        has_same_game_correlation=has_sgp,
        correlation_diagnosis=diag_text,
        combined_expected_value=round(combined_ev, 4),
        risk_level=risk_level,
        individual_vs_parlay_ev_comparison={
            "prob_acierto_total": round(joint_prob, 4),
            "prob_fallar_al_menos_una": round(1.0 - joint_prob, 4),
            "combined_ev_nominal_pct": round(combined_ev * 100.0, 2),
            "margin_erosion_alert": len(legs) >= 3 and combined_ev < 0
        }
    )
