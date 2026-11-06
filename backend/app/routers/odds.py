from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from sqlmodel import select
from app.core.database import SessionDep
from app.models.domain import Match, OddsSnapshot
from app.schemas.domain import (
    OddsBatchInput, ClipboardParseRequest, ClipboardParseResponse, MarketSelectionEvaluation
)
from app.ingestion.draftea_parser import parse_draftea_clipboard_text
from app.analytics.quant_engine import calculate_overround

router = APIRouter(prefix="/odds", tags=["odds"])

@router.post("/parse-clipboard", response_model=ClipboardParseResponse)
def parse_clipboard(req: ClipboardParseRequest):
    """
    Parsea texto copiado de Draftea o notas para extraer cuotas y calcular margen.
    """
    return parse_draftea_clipboard_text(req.raw_text)

@router.post("/batch")
def save_odds_batch(data: OddsBatchInput, session: SessionDep):
    """
    Guarda un lote de cuotas (ej. capturadas manualmente o pegadas de Draftea).
    """
    match = session.get(Match, data.match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    now = datetime.now(timezone.utc)
    for item in data.items:
        snapshot = OddsSnapshot(
            match_id=data.match_id,
            bookmaker_code=data.bookmaker_code.upper(),
            source_type=data.source_type,
            market_type=item.market_type,
            line_value=item.line_value,
            selection_code=item.selection_code.upper(),
            decimal_odds=item.decimal_odds,
            captured_at=now
        )
        session.add(snapshot)

    session.commit()
    return {
        "status": "success",
        "saved_count": len(data.items),
        "bookmaker": data.bookmaker_code,
        "match_id": data.match_id
    }

@router.get("/{match_id}")
def get_match_odds(match_id: str, session: SessionDep):
    """
    Retorna todos los momios vigentes registrados para un partido, agrupados por casa de apuestas.
    """
    stmt = select(OddsSnapshot).where(OddsSnapshot.match_id == match_id).order_by(OddsSnapshot.captured_at.desc())
    snapshots = session.exec(stmt).all()

    grouped = {}
    for s in snapshots:
        key = s.bookmaker_code
        grouped.setdefault(key, []).append({
            "id": s.id,
            "market_type": s.market_type,
            "selection_code": s.selection_code,
            "line_value": s.line_value,
            "decimal_odds": s.decimal_odds,
            "captured_at": s.captured_at,
            "source_type": s.source_type
        })
    return grouped
