import random
import uuid
from datetime import datetime, timedelta, timezone
from sqlmodel import Session, select
from app.core.database import engine, create_db_and_tables
from app.models.domain import (
    Competition, Team, TeamAlias, Match, OddsSnapshot,
    ModelVersion, ModelPrediction
)
from app.analytics.dixon_coles import DixonColesModel
from app.analytics.quant_engine import devig_shin, calculate_overround

def seed_database():
    create_db_and_tables()
    with Session(engine) as session:
        # Verificar si ya existen competiciones
        existing = session.exec(select(Competition)).first()
        if existing:
            print("La base de datos ya contiene datos iniciales.")
            return

        print("Poblando catálogo de competiciones...")
        competitions_data = [
            {"code": "LIGA_MX", "name": "Liga MX", "country": "México", "sport_code": "FOOTBALL"},
            {"code": "LA_LIGA", "name": "LaLiga EA Sports", "country": "España", "sport_code": "FOOTBALL"},
            {"code": "EPL", "name": "Premier League", "country": "Inglaterra", "sport_code": "FOOTBALL"},
            {"code": "UCL", "name": "UEFA Champions League", "country": "Europa", "sport_code": "FOOTBALL"},
            {"code": "MLS", "name": "Major League Soccer", "country": "EEUU", "sport_code": "FOOTBALL"},
        ]
        comp_map = {}
        for c in competitions_data:
            comp = Competition(**c)
            session.add(comp)
            session.commit()
            session.refresh(comp)
            comp_map[c["code"]] = comp

        print("Poblando equipos canónicos...")
        teams_by_league = {
            "LIGA_MX": ["Club América", "Guadalajara", "Cruz Azul", "Tigres UANL", "CF Monterrey", "Toluca", "Pumas UNAM", "Pachuca"],
            "LA_LIGA": ["Real Madrid", "FC Barcelona", "Atlético Madrid", "Athletic Club", "Real Sociedad", "Real Betis", "Villarreal", "Sevilla"],
            "EPL": ["Manchester City", "Arsenal", "Liverpool", "Aston Villa", "Chelsea", "Manchester United", "Newcastle", "Tottenham"],
            "UCL": ["Real Madrid", "Bayern Munich", "Manchester City", "Paris Saint-Germain", "Inter Milan", "FC Barcelona", "Arsenal", "Borussia Dortmund"],
            "MLS": ["Inter Miami", "LAFC", "Columbus Crew", "LA Galaxy", "FC Cincinnati", "Philadelphia Union", "Seattle Sounders", "Atlanta United"]
        }

        team_obj_map = {}
        for l_code, team_names in teams_by_league.items():
            for t_name in team_names:
                if t_name not in team_obj_map:
                    t = Team(sport_code="FOOTBALL", canonical_name=t_name, country=comp_map[l_code].country)
                    session.add(t)
                    session.commit()
                    session.refresh(t)
                    team_obj_map[t_name] = t

                    # Alias común
                    alias = TeamAlias(team_id=t.id, source_provider="DRAFTEA", alias_name=t_name)
                    session.add(alias)
            session.commit()

        # Modelo Dixon Coles Base
        m_version = ModelVersion(
            model_name="DIXON_COLES_ELO_V1",
            version_tag="v1.0.0-mvp",
            sport_code="FOOTBALL",
            hyperparameters={"xi": 0.003, "rho": -0.06, "home_adv": 0.28},
            calibration_method="ISOTONIC",
            trained_up_to=datetime.now(timezone.utc) - timedelta(days=1)
        )
        session.add(m_version)
        session.commit()
        session.refresh(m_version)

        print("Generando partidos históricos y próximos con momios...")
        now_utc = datetime.now(timezone.utc)

        # Generar partidos por cada liga
        for l_code, team_names in teams_by_league.items():
            comp = comp_map[l_code]
            # 1. Partidos Históricos (hace 1 a 60 días)
            for i in range(len(team_names)):
                for j in range(i + 1, len(team_names)):
                    t_home = team_obj_map[team_names[i]]
                    t_away = team_obj_map[team_names[j]]
                    days_ago = random.randint(3, 45)
                    k_time = now_utc - timedelta(days=days_ago, hours=random.randint(1, 12))

                    # Simular marcador realista
                    h_score = random.choices([0, 1, 2, 3, 4], weights=[0.20, 0.35, 0.25, 0.14, 0.06])[0]
                    a_score = random.choices([0, 1, 2, 3], weights=[0.28, 0.40, 0.22, 0.10])[0]

                    m = Match(
                        competition_id=comp.id,
                        season="2025-2026",
                        stage_type="REGULAR_SEASON",
                        kickoff_time=k_time,
                        status="FINISHED",
                        home_team_id=t_home.id,
                        away_team_id=t_away.id,
                        home_score=h_score,
                        away_score=a_score,
                        home_xg=round(h_score * 0.85 + random.uniform(0.1, 0.5), 2),
                        away_xg=round(a_score * 0.85 + random.uniform(0.1, 0.5), 2)
                    )
                    session.add(m)
                    session.commit()
                    session.refresh(m)

                    # Cuotas de cierre históricas de Pinnacle
                    session.add_all([
                        OddsSnapshot(match_id=m.id, bookmaker_code="PINNACLE", source_type="CSV", market_type="1X2", selection_code="HOME", decimal_odds=2.10, is_closing_line=True),
                        OddsSnapshot(match_id=m.id, bookmaker_code="PINNACLE", source_type="CSV", market_type="1X2", selection_code="DRAW", decimal_odds=3.40, is_closing_line=True),
                        OddsSnapshot(match_id=m.id, bookmaker_code="PINNACLE", source_type="CSV", market_type="1X2", selection_code="AWAY", decimal_odds=3.60, is_closing_line=True),
                        OddsSnapshot(match_id=m.id, bookmaker_code="PINNACLE", source_type="CSV", market_type="OVER_UNDER", line_value=2.5, selection_code="OVER", decimal_odds=1.88, is_closing_line=True),
                        OddsSnapshot(match_id=m.id, bookmaker_code="PINNACLE", source_type="CSV", market_type="OVER_UNDER", line_value=2.5, selection_code="UNDER", decimal_odds=1.98, is_closing_line=True),
                    ])

            # 2. Próximos Partidos (en los siguientes 1 a 5 días)
            upcoming_pairs = [
                (team_names[0], team_names[1]),
                (team_names[2], team_names[3]),
                (team_names[4], team_names[5]),
                (team_names[6], team_names[7])
            ]
            dc_model = DixonColesModel(xi=0.003)
            # Dummy fit rápido para generar matrices realistas
            dc_model.home_adv = 0.28
            dc_model.rho = -0.06

            for h_name, a_name in upcoming_pairs:
                t_home = team_obj_map[h_name]
                t_away = team_obj_map[a_name]
                hours_ahead = random.randint(12, 96)
                k_time = now_utc + timedelta(hours=hours_ahead)

                m_up = Match(
                    competition_id=comp.id,
                    season="2025-2026",
                    stage_type="REGULAR_SEASON",
                    kickoff_time=k_time,
                    status="SCHEDULED",
                    home_team_id=t_home.id,
                    away_team_id=t_away.id
                )
                session.add(m_up)
                session.commit()
                session.refresh(m_up)

                # Momios vigentes pre-partido (Pinnacle y Bet365)
                session.add_all([
                    OddsSnapshot(match_id=m_up.id, bookmaker_code="PINNACLE", source_type="API", market_type="1X2", selection_code="HOME", decimal_odds=1.95),
                    OddsSnapshot(match_id=m_up.id, bookmaker_code="PINNACLE", source_type="API", market_type="1X2", selection_code="DRAW", decimal_odds=3.50),
                    OddsSnapshot(match_id=m_up.id, bookmaker_code="PINNACLE", source_type="API", market_type="1X2", selection_code="AWAY", decimal_odds=4.10),
                    OddsSnapshot(match_id=m_up.id, bookmaker_code="PINNACLE", source_type="API", market_type="OVER_UNDER", line_value=2.5, selection_code="OVER", decimal_odds=1.85),
                    OddsSnapshot(match_id=m_up.id, bookmaker_code="PINNACLE", source_type="API", market_type="OVER_UNDER", line_value=2.5, selection_code="UNDER", decimal_odds=2.00),
                    OddsSnapshot(match_id=m_up.id, bookmaker_code="PINNACLE", source_type="API", market_type="BTTS", selection_code="YES", decimal_odds=1.75),
                    OddsSnapshot(match_id=m_up.id, bookmaker_code="PINNACLE", source_type="API", market_type="BTTS", selection_code="NO", decimal_odds=2.10),
                    # Draftea pre-cargado inicial en algunos partidos para testing
                    OddsSnapshot(match_id=m_up.id, bookmaker_code="DRAFTEA", source_type="MANUAL_FORM", market_type="1X2", selection_code="HOME", decimal_odds=2.05),
                    OddsSnapshot(match_id=m_up.id, bookmaker_code="DRAFTEA", source_type="MANUAL_FORM", market_type="1X2", selection_code="DRAW", decimal_odds=3.35),
                    OddsSnapshot(match_id=m_up.id, bookmaker_code="DRAFTEA", source_type="MANUAL_FORM", market_type="1X2", selection_code="AWAY", decimal_odds=3.90),
                ])

                # Generar predicción del modelo
                lam, mu = 1.65, 1.10 # Goles esperados
                matrix = dc_model.get_score_matrix(lam, mu, dc_model.rho)
                markets_pred = dc_model.predict_markets_from_matrix(matrix)

                for sel, p_dict in markets_pred["1X2"].items():
                    pred = ModelPrediction(
                        match_id=m_up.id,
                        model_version_id=m_version.id,
                        market_type="1X2",
                        selection_code=sel,
                        predicted_prob=round(p_dict["prob"], 5),
                        prob_ci_low=round(p_dict["ci_low"], 5),
                        prob_ci_high=round(p_dict["ci_high"], 5),
                        score_matrix_json={"matrix": matrix.tolist(), "lambda": lam, "mu": mu, "rho": dc_model.rho},
                        explanation_factors={
                            "lambda_home": lam,
                            "mu_away": mu,
                            "home_adv": 0.28,
                            "rho_correction": dc_model.rho
                        }
                    )
                    session.add(pred)

                for sel, p_dict in markets_pred["OVER_UNDER_2.5"].items():
                    pred = ModelPrediction(
                        match_id=m_up.id,
                        model_version_id=m_version.id,
                        market_type="OVER_UNDER",
                        line_value=2.5,
                        selection_code=sel,
                        predicted_prob=round(p_dict["prob"], 5),
                        prob_ci_low=round(p_dict["ci_low"], 5),
                        prob_ci_high=round(p_dict["ci_high"], 5)
                    )
                    session.add(pred)

                for sel, p_dict in markets_pred["BTTS"].items():
                    pred = ModelPrediction(
                        match_id=m_up.id,
                        model_version_id=m_version.id,
                        market_type="BTTS",
                        selection_code=sel,
                        predicted_prob=round(p_dict["prob"], 5),
                        prob_ci_low=round(p_dict["ci_low"], 5),
                        prob_ci_high=round(p_dict["ci_high"], 5)
                    )
                    session.add(pred)

            session.commit()

        print("¡Inicialización de datos completada exitosamente!")

if __name__ == "__main__":
    seed_database()
