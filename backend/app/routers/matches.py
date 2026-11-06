from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select
from app.core.database import SessionDep
from app.models.domain import Competition, Match, Team, OddsSnapshot, ModelPrediction
from app.schemas.domain import MatchSummary, MarketSelectionEvaluation, ScoreMatrixResponse
from app.analytics.quant_engine import (
    calculate_overround, devig_shin, devig_power,
    calculate_expected_value, calculate_kelly_fraction, classify_bet_signal
)
from app.ingestion.live_sports_sync import sync_live_and_curated_data

router = APIRouter(prefix="/matches", tags=["matches"])

@router.post("/sync")
def trigger_sync_matches(session: SessionDep):
    """
    Sincroniza partidos con datos reales, escudos, posiciones y estadísticas tipo Google Sports.
    """
    return sync_live_and_curated_data(session)

@router.get("", response_model=List[MatchSummary])
def list_matches(
    session: SessionDep,
    competition_code: Optional[str] = Query(None, description="Filtrar por código de liga: LIGA_MX, LA_LIGA, EPL, UCL, MLS"),
    status: Optional[str] = Query(None, description="SCHEDULED, FINISHED o ALL"),
    limit: int = Query(50, le=100)
):
    query = select(Match)
    if status and status != "ALL":
        query = query.where(Match.status == status)

    if competition_code:
        comp_stmt = select(Competition).where(Competition.code == competition_code)
        comp = session.exec(comp_stmt).first()
        if comp:
            query = query.where(Match.competition_id == comp.id)

    query = query.order_by(Match.kickoff_time.asc()).limit(limit)
    matches = session.exec(query).all()

    results: List[MatchSummary] = []
    for m in matches:
        home_team = session.get(Team, m.home_team_id)
        away_team = session.get(Team, m.away_team_id)
        comp = session.get(Competition, m.competition_id)

        # Consultar momios y predicciones para armar la evaluación de mercado
        odds_list = session.exec(select(OddsSnapshot).where(OddsSnapshot.match_id == m.id)).all()
        preds = session.exec(select(ModelPrediction).where(ModelPrediction.match_id == m.id)).all()

        pred_map = {(p.market_type, p.selection_code): p for p in preds}

        evaluations: List[MarketSelectionEvaluation] = []

        # Agrupar cuotas por casa y mercado para desvigorizar
        book_market_odds = {}
        for o in odds_list:
            key = (o.bookmaker_code, o.market_type)
            book_market_odds.setdefault(key, []).append(o)

        for (b_code, m_type), o_group in book_market_odds.items():
            if m_type == "1X2" and len(o_group) == 3:
                # Ordenar HOME, DRAW, AWAY
                o_dict = {o.selection_code: o for o in o_group}
                if "HOME" in o_dict and "DRAW" in o_dict and "AWAY" in o_dict:
                    odds_vals = [o_dict["HOME"].decimal_odds, o_dict["DRAW"].decimal_odds, o_dict["AWAY"].decimal_odds]
                    overround = calculate_overround(odds_vals)
                    fair_probs = devig_shin(odds_vals)

                    for idx, sel_code in enumerate(["HOME", "DRAW", "AWAY"]):
                        curr_o = o_dict[sel_code]
                        p_model_rec = pred_map.get((m_type, sel_code))

                        p_model = p_model_rec.predicted_prob if p_model_rec else fair_probs[idx]
                        ci_low = p_model_rec.prob_ci_low if p_model_rec and p_model_rec.prob_ci_low else p_model * 0.90
                        ci_high = p_model_rec.prob_ci_high if p_model_rec and p_model_rec.prob_ci_high else p_model * 1.10

                        ev_nom = calculate_expected_value(p_model, curr_o.decimal_odds)
                        ev_cons = calculate_expected_value(ci_low, curr_o.decimal_odds)
                        kelly = calculate_kelly_fraction(ci_low, curr_o.decimal_odds)
                        signal = classify_bet_signal(ev_nom, ev_cons, ci_high - ci_low)

                        evaluations.append(MarketSelectionEvaluation(
                            market_type="1X2",
                            selection_code=sel_code,
                            bookmaker_code=b_code,
                            decimal_odds=curr_o.decimal_odds,
                            raw_implied_prob=round(1.0 / curr_o.decimal_odds, 4),
                            bookmaker_overround=round(overround, 4),
                            fair_market_prob=round(fair_probs[idx], 4),
                            devig_method="SHIN",
                            model_prob=round(p_model, 4),
                            model_ci_low=round(ci_low, 4),
                            model_ci_high=round(ci_high, 4),
                            edge_vs_fair=round(p_model - fair_probs[idx], 4),
                            expected_value_nominal=round(ev_nom, 4),
                            expected_value_conservative=round(ev_cons, 4),
                            recommended_kelly_fraction=round(kelly, 4),
                            signal_classification=signal
                        ))
            elif m_type in ("OVER_UNDER", "BTTS") and len(o_group) == 2:
                o_dict = {o.selection_code: o for o in o_group}
                pair_codes = ["OVER", "UNDER"] if m_type == "OVER_UNDER" else ["YES", "NO"]
                if pair_codes[0] in o_dict and pair_codes[1] in o_dict:
                    odds_vals = [o_dict[pair_codes[0]].decimal_odds, o_dict[pair_codes[1]].decimal_odds]
                    overround = calculate_overround(odds_vals)
                    fair_probs = devig_shin(odds_vals)
                    for idx, sel_code in enumerate(pair_codes):
                        curr_o = o_dict[sel_code]
                        p_model_rec = pred_map.get((m_type, sel_code))
                        p_model = p_model_rec.predicted_prob if p_model_rec else fair_probs[idx]
                        ci_low = p_model_rec.prob_ci_low if p_model_rec and p_model_rec.prob_ci_low else p_model * 0.90
                        ci_high = p_model_rec.prob_ci_high if p_model_rec and p_model_rec.prob_ci_high else p_model * 1.10
                        ev_nom = calculate_expected_value(p_model, curr_o.decimal_odds)
                        ev_cons = calculate_expected_value(ci_low, curr_o.decimal_odds)
                        kelly = calculate_kelly_fraction(ci_low, curr_o.decimal_odds)
                        signal = classify_bet_signal(ev_nom, ev_cons, ci_high - ci_low)
                        evaluations.append(MarketSelectionEvaluation(
                            market_type=m_type,
                            selection_code=sel_code,
                            line_value=curr_o.line_value,
                            bookmaker_code=b_code,
                            decimal_odds=curr_o.decimal_odds,
                            raw_implied_prob=round(1.0 / curr_o.decimal_odds, 4),
                            bookmaker_overround=round(overround, 4),
                            fair_market_prob=round(fair_probs[idx], 4),
                            devig_method="SHIN",
                            model_prob=round(p_model, 4),
                            model_ci_low=round(ci_low, 4),
                            model_ci_high=round(ci_high, 4),
                            edge_vs_fair=round(p_model - fair_probs[idx], 4),
                            expected_value_nominal=round(ev_nom, 4),
                            expected_value_conservative=round(ev_cons, 4),
                            recommended_kelly_fraction=round(kelly, 4),
                            signal_classification=signal
                        ))

        meta = m.metadata_json or {}

        results.append(MatchSummary(
            id=m.id,
            competition_code=comp.code if comp else "UNKNOWN",
            competition_name=comp.name if comp else "Desconocida",
            season=m.season,
            stage_type=m.stage_type,
            kickoff_time=m.kickoff_time,
            status=m.status,
            home_team_name=home_team.canonical_name if home_team else "Local",
            away_team_name=away_team.canonical_name if away_team else "Visitante",
            home_short_name=meta.get("home_short_name") or (home_team.canonical_name if home_team else "Local"),
            away_short_name=meta.get("away_short_name") or (away_team.canonical_name if away_team else "Visitante"),
            home_score=m.home_score,
            away_score=m.away_score,
            home_xg=m.home_xg,
            away_xg=m.away_xg,
            home_team_logo=meta.get("home_team_logo"),
            away_team_logo=meta.get("away_team_logo"),
            home_rank=meta.get("home_rank"),
            away_rank=meta.get("away_rank"),
            round_name=meta.get("round_name"),
            home_form=meta.get("home_form", []),
            away_form=meta.get("away_form", []),
            scorers=meta.get("scorers", []),
            google_stats=meta.get("google_stats"),
            friendly_insight=meta.get("friendly_insight"),
            evaluations=evaluations
        ))

    return results

@router.get("/{match_id}/score-matrix", response_model=ScoreMatrixResponse)
def get_match_score_matrix(match_id: str, session: SessionDep):
    m = session.get(Match, match_id)
    if not m:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    home_team = session.get(Team, m.home_team_id)
    away_team = session.get(Team, m.away_team_id)

    # Buscar predicción con matriz guardada
    pred = session.exec(
        select(ModelPrediction)
        .where(ModelPrediction.match_id == match_id, ModelPrediction.score_matrix_json.isnot(None))
    ).first()

    if not pred or not pred.score_matrix_json:
        raise HTTPException(status_code=404, detail="Matriz de goles no disponible para este partido")

    matrix_data = pred.score_matrix_json.get("matrix", [])
    lam = pred.score_matrix_json.get("lambda", 1.5)
    mu = pred.score_matrix_json.get("mu", 1.1)
    rho = pred.score_matrix_json.get("rho", -0.05)

    return ScoreMatrixResponse(
        match_id=m.id,
        home_team=home_team.canonical_name if home_team else "Local",
        away_team=away_team.canonical_name if away_team else "Visitante",
        lambda_home=round(lam, 3),
        mu_away=round(mu, 3),
        rho=round(rho, 3),
        matrix_10x10=matrix_data,
        explanation_factors=pred.explanation_factors or {}
    )
