import numpy as np
from typing import List, Dict, Tuple
from fastapi import APIRouter, HTTPException
from sqlmodel import select
from app.core.database import SessionDep
from app.models.domain import ModelPrediction
from app.schemas.domain import ParlayLeg, ParlayEvaluationResponse
from app.analytics.parlay_engine import evaluate_parlay

router = APIRouter(prefix="/parlays", tags=["parlays"])

@router.post("/evaluate", response_model=ParlayEvaluationResponse)
def evaluate_custom_parlay(legs: List[ParlayLeg], session: SessionDep):
    if not legs:
        raise HTTPException(status_code=400, detail="Debe proporcionar al menos una selección para el parlay")

    match_ids = list(set(leg.match_id for leg in legs))

    score_matrices: Dict[str, np.ndarray] = {}
    model_single_probs: Dict[Tuple[str, str, str], float] = {}

    for m_id in match_ids:
        preds = session.exec(
            select(ModelPrediction).where(ModelPrediction.match_id == m_id)
        ).all()

        for p in preds:
            model_single_probs[(p.match_id, p.market_type, p.selection_code)] = p.predicted_prob
            if p.score_matrix_json and "matrix" in p.score_matrix_json and m_id not in score_matrices:
                score_matrices[m_id] = np.array(p.score_matrix_json["matrix"], dtype=float)

    return evaluate_parlay(legs, score_matrices, model_single_probs)
