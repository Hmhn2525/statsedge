import math
from typing import Dict, Tuple, List, Optional
from datetime import datetime

class EloRatingSystem:
    """
    Sistema de Ratings Elo para fútbol con ajuste por margen de goles y ventaja de localía.
    """
    def __init__(
        self,
        k_factor: float = 24.0,
        home_advantage: float = 65.0,
        default_rating: float = 1500.0
    ):
        self.k_factor = k_factor
        self.home_advantage = home_advantage
        self.default_rating = default_rating
        self.ratings: Dict[str, float] = {}

    def get_rating(self, team_id: str) -> float:
        return self.ratings.get(team_id, self.default_rating)

    def set_rating(self, team_id: str, rating: float) -> None:
        self.ratings[team_id] = rating

    def expected_scores(
        self,
        home_team_id: str,
        away_team_id: str,
        is_neutral: bool = False
    ) -> Tuple[float, float]:
        r_home = self.get_rating(home_team_id) + (0.0 if is_neutral else self.home_advantage)
        r_away = self.get_rating(away_team_id)

        diff = (r_away - r_home) / 400.0
        exp_home = 1.0 / (1.0 + math.pow(10.0, diff))
        exp_away = 1.0 - exp_home
        return exp_home, exp_away

    def update_match(
        self,
        home_team_id: str,
        away_team_id: str,
        home_goals: int,
        away_goals: int,
        is_neutral: bool = False
    ) -> Tuple[float, float]:
        """
        Actualiza los ratings tras un partido y retorna los nuevos ratings (home_new, away_new).
        """
        exp_home, exp_away = self.expected_scores(home_team_id, away_team_id, is_neutral)

        # Resultado real (1 = victoria, 0.5 = empate, 0 = derrota)
        if home_goals > away_goals:
            s_home, s_away = 1.0, 0.0
            goal_diff = home_goals - away_goals
        elif home_goals == away_goals:
            s_home, s_away = 0.5, 0.5
            goal_diff = 0
        else:
            s_home, s_away = 0.0, 1.0
            goal_diff = away_goals - home_goals

        # Multiplicador por margen de victoria (World Football Elo Ratings standard)
        if goal_diff <= 1:
            g_multiplier = 1.0
        elif goal_diff == 2:
            g_multiplier = 1.5
        else:
            g_multiplier = (11.0 + goal_diff) / 8.0

        r_home_old = self.get_rating(home_team_id)
        r_away_old = self.get_rating(away_team_id)

        delta_home = self.k_factor * g_multiplier * (s_home - exp_home)
        delta_away = self.k_factor * g_multiplier * (s_away - exp_away)

        r_home_new = r_home_old + delta_home
        r_away_new = r_away_old + delta_away

        self.ratings[home_team_id] = r_home_new
        self.ratings[away_team_id] = r_away_new

        return r_home_new, r_away_new
