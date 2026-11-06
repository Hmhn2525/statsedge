import re
from typing import List, Optional, Tuple
from app.schemas.domain import OddsInputItem, ClipboardParseResponse
from app.analytics.quant_engine import calculate_overround

def american_to_decimal(val_str: str) -> Optional[float]:
    """
    Convierte momio americano (+150, -110) a decimal (2.50, 1.9091).
    """
    cleaned = val_str.strip().replace(" ", "")
    try:
        val = float(cleaned)
        if val > 0:
            if val < 10.0:
                # Ya es decimal (ej. 2.15)
                return val
            return 1.0 + (val / 100.0)
        elif val < 0:
            return 1.0 + (100.0 / abs(val))
        return None
    except ValueError:
        return None

def parse_draftea_clipboard_text(raw_text: str) -> ClipboardParseResponse:
    """
    Analiza texto copiado del portapapeles y extrae líneas de momios para Draftea.
    """
    detected_items: List[OddsInputItem] = []
    warnings: List[str] = []

    # Dividir tanto por saltos de línea como por delimitadores habituales (, ; | tab)
    raw_lines = re.split(r'[\r\n;,|]+', raw_text)
    lines = [line.strip() for line in raw_lines if line.strip()]

    # Expresiones regulares comunes para momios
    odds_regex = re.compile(r'([+-]?\d+(?:\.\d+)?)')

    for line in lines:
        lower = line.lower()
        numbers = odds_regex.findall(line)

        # 1. 1X2 / Ganador
        if any(kw in lower for kw in ["local", "gana 1", "victoria local", " 1 "]) or lower.startswith("1 "):
            for n in numbers:
                dec = american_to_decimal(n)
                if dec and dec > 1.01:
                    detected_items.append(OddsInputItem(market_type="1X2", selection_code="HOME", decimal_odds=round(dec, 4)))
                    break
        elif any(kw in lower for kw in ["empate", "tie", " x ", "empatan"]) or lower == "x":
            for n in numbers:
                dec = american_to_decimal(n)
                if dec and dec > 1.01:
                    detected_items.append(OddsInputItem(market_type="1X2", selection_code="DRAW", decimal_odds=round(dec, 4)))
                    break
        elif any(kw in lower for kw in ["visitante", "gana 2", "victoria visitante", " 2 "]) or lower.startswith("2 "):
            for n in numbers:
                dec = american_to_decimal(n)
                if dec and dec > 1.01:
                    detected_items.append(OddsInputItem(market_type="1X2", selection_code="AWAY", decimal_odds=round(dec, 4)))
                    break

        # 2. Over / Under (Totales / Altas / Bajas)
        elif any(kw in lower for kw in ["más de", "over", "altas", "+"]):
            line_val = 2.5
            if "1.5" in lower: line_val = 1.5
            elif "3.5" in lower: line_val = 3.5
            for n in numbers:
                dec = american_to_decimal(n)
                if dec and dec > 1.01 and dec != line_val:
                    detected_items.append(OddsInputItem(market_type="OVER_UNDER", selection_code="OVER", line_value=line_val, decimal_odds=round(dec, 4)))
                    break
        elif any(kw in lower for kw in ["menos de", "under", "bajas", "-"]):
            line_val = 2.5
            if "1.5" in lower: line_val = 1.5
            elif "3.5" in lower: line_val = 3.5
            for n in numbers:
                dec = american_to_decimal(n)
                if dec and dec > 1.01 and dec != line_val:
                    detected_items.append(OddsInputItem(market_type="OVER_UNDER", selection_code="UNDER", line_value=line_val, decimal_odds=round(dec, 4)))
                    break

        # 3. Ambos Anotan (BTTS)
        elif any(kw in lower for kw in ["ambos anotan", "ambos marcan", "btts", "gol de ambos"]):
            if any(yes_kw in lower for yes_kw in ["sí", "si", "yes"]):
                for n in numbers:
                    dec = american_to_decimal(n)
                    if dec and dec > 1.01:
                        detected_items.append(OddsInputItem(market_type="BTTS", selection_code="YES", decimal_odds=round(dec, 4)))
                        break
            elif any(no_kw in lower for no_kw in ["no"]):
                for n in numbers:
                    dec = american_to_decimal(n)
                    if dec and dec > 1.01:
                        detected_items.append(OddsInputItem(market_type="BTTS", selection_code="NO", decimal_odds=round(dec, 4)))
                        break

    # Si no detectó por palabras clave pero hay 3 números en líneas continuas (típico 1-X-2)
    if not detected_items and len(numbers) >= 3:
        dec_candidates = [american_to_decimal(n) for n in numbers[:3]]
        if all(d and d > 1.01 for d in dec_candidates):
            detected_items = [
                OddsInputItem(market_type="1X2", selection_code="HOME", decimal_odds=round(dec_candidates[0], 4)),
                OddsInputItem(market_type="1X2", selection_code="DRAW", decimal_odds=round(dec_candidates[1], 4)),
                OddsInputItem(market_type="1X2", selection_code="AWAY", decimal_odds=round(dec_candidates[2], 4)),
            ]
            warnings.append("Formato no etiquetado detectado: Se asignaron las 3 cuotas secuencialmente a 1-X-2.")

    # Calcular overround estimado si hay un mercado completo
    h2h_items = [it for it in detected_items if it.market_type == "1X2"]
    est_overround = None
    if len(h2h_items) == 3:
        est_overround = calculate_overround([it.decimal_odds for it in h2h_items])
        if est_overround > 0.25:
            warnings.append(f"Atención: Margen implícito muy alto ({est_overround*100:.1f}%). Verifique si las cuotas fueron capturadas correctamente.")
        elif est_overround < 0.01:
            warnings.append(f"Atención: Margen sospechosamente bajo ({est_overround*100:.1f}%). Revise los números.")

    if not detected_items:
        warnings.append("No se pudieron extraer cuotas del texto proporcionado. Puede ingresarlas manualmente en el formulario.")

    return ClipboardParseResponse(
        detected_items=detected_items,
        detected_bookmaker="DRAFTEA",
        warnings=warnings,
        estimated_overround=round(est_overround, 4) if est_overround is not None else None
    )
