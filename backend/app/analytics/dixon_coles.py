import math
import numpy as np
import pandas as pd
from typing import Dict, Tuple, List, Optional, Any
from scipy.optimize import minimize
from scipy.stats import poisson

def tau_correction(x: int, y: int, lam: float, mu: float, rho: float) -> float:
    """
    Factor de corrección de Dixon & Coles para marcadores bajos (0-0, 0-1, 1-0, 1-1).
    """
    if x == 0 and y == 0:
        val = 1.0 - (lam * mu * rho)
    elif x == 0 and y == 1:
        val = 1.0 + (lam * rho)
    elif x == 1 and y == 0:
        val = 1.0 + (mu * rho)
    elif x == 1 and y == 1:
        val = 1.0 - rho
    else:
        val = 1.0
    return max(0.0001, val)

class DixonColesModel:
    """
    Implementación del modelo de Dixon & Coles (1997) para pronósticos de fútbol
    con decaimiento temporal e integración de ratings Elo.
    """
    def __init__(self, xi: float = 0.003, max_goals: int = 10):
        self.xi = xi # Tasa de decaimiento temporal exponencial por día
        self.max_goals = max_goals
        self.teams: List[str] = []
        self.team_indices: Dict[str, int] = {}
        self.attack_params: np.ndarray = np.array([])
        self.defense_params: np.ndarray = np.array([])
        self.home_adv: float = 0.25 # Log de ventaja de local (~1.28x goles)
        self.rho: float = -0.05      # Dependencia en marcadores bajos
        self.is_fitted: bool = False

    def fit(self, df_matches: pd.DataFrame, as_of_date: Optional[pd.Timestamp] = None):
        """
        Ajusta los parámetros usando máxima verosimilitud penalizada por tiempo.
        df_matches debe contener:
        - home_team, away_team, home_score, away_score, kickoff_time
        """
        if df_matches.empty:
            raise ValueError("df_matches está vacío")

        df = df_matches.copy()
        df = df.dropna(subset=['home_score', 'away_score', 'home_team', 'away_team'])
        if as_of_date is not None:
            df = df[df['kickoff_time'] < as_of_date]

        if len(df) < 10:
            raise ValueError("Se requieren al menos 10 partidos para ajustar el modelo")

        all_teams = sorted(list(set(df['home_team'].unique()) | set(df['away_team'].unique())))
        self.teams = all_teams
        self.team_indices = {t: i for i, t in enumerate(all_teams)}
        n_teams = len(all_teams)

        # Cálculo de pesos por tiempo
        max_time = df['kickoff_time'].max()
        days_diff = (max_time - df['kickoff_time']).dt.total_seconds() / 86400.0
        weights = np.exp(-self.xi * days_diff.values)

        home_idx = df['home_team'].map(self.team_indices).values
        away_idx = df['away_team'].map(self.team_indices).values
        home_goals = df['home_score'].values.astype(int)
        away_goals = df['away_score'].values.astype(int)

        # Vector inicial de parámetros: [attack (n), defense (n), home_adv, rho]
        # Restricción: sum(attack) == 0 (equipo 0 fijado por sum)
        init_attack = np.zeros(n_teams)
        init_defense = np.zeros(n_teams)
        init_home_adv = 0.25
        init_rho = -0.05
        init_params = np.concatenate([init_attack, init_defense, [init_home_adv, init_rho]])

        def neg_log_likelihood(params: np.ndarray) -> float:
            att = params[:n_teams]
            defe = params[n_teams:2*n_teams]
            h_adv = params[2*n_teams]
            r = params[2*n_teams + 1]

            # Penalización suave para identificar la suma de ataques = 0
            identifiability_penalty = 100.0 * (np.sum(att) ** 2)

            lam = np.exp(att[home_idx] - defe[away_idx] + h_adv)
            mu = np.exp(att[away_idx] - defe[home_idx])

            # Evitar desbordes numéricos
            lam = np.clip(lam, 0.01, 10.0)
            mu = np.clip(mu, 0.01, 10.0)

            # Log-verosimilitud por partido
            log_p = np.zeros_like(weights)
            for k in range(len(weights)):
                x = home_goals[k]
                y = away_goals[k]
                l_k = lam[k]
                m_k = mu[k]
                t_corr = tau_correction(x, y, l_k, m_k, r)

                # Poisson log pmf: x*log(l) - l - log(x!)
                log_pois_x = x * math.log(l_k) - l_k - math.lgamma(x + 1)
                log_pois_y = y * math.log(m_k) - m_k - math.lgamma(y + 1)
                log_p[k] = math.log(t_corr) + log_pois_x + log_pois_y

            return float(-np.sum(weights * log_p) + identifiability_penalty)

        bounds = [(-3.0, 3.0)] * (2 * n_teams) + [(-1.0, 1.5), (-0.3, 0.3)]
        res = minimize(neg_log_likelihood, init_params, method='L-BFGS-B', bounds=bounds)

        self.attack_params = res.x[:n_teams]
        self.defense_params = res.x[n_teams:2*n_teams]
        self.home_adv = float(res.x[2*n_teams])
        self.rho = float(res.x[2*n_teams + 1])
        self.is_fitted = True
        return self

    def calculate_expected_goals(
        self,
        home_team: str,
        away_team: str,
        elo_home: Optional[float] = None,
        elo_away: Optional[float] = None,
        is_neutral: bool = False
    ) -> Tuple[float, float]:
        """
        Calcula las tasas esperadas lambda (local) y mu (visitante),
        enriquecidas con el diferencial Elo si está disponible.
        """
        h_idx = self.team_indices.get(home_team)
        a_idx = self.team_indices.get(away_team)

        alpha_h = self.attack_params[h_idx] if h_idx is not None else 0.0
        beta_h = self.defense_params[h_idx] if h_idx is not None else 0.0
        alpha_a = self.attack_params[a_idx] if a_idx is not None else 0.0
        beta_a = self.defense_params[a_idx] if a_idx is not None else 0.0

        h_adv = 0.0 if is_neutral else self.home_adv

        # Componente Elo
        elo_effect = 0.0
        if elo_home is not None and elo_away is not None:
            elo_diff = (elo_home - elo_away) / 400.0
            # 0.20 coeficiente de escala para el log de goles
            elo_effect = 0.20 * elo_diff

        log_lambda = alpha_h - beta_a + h_adv + elo_effect
        log_mu = alpha_a - beta_h - elo_effect

        lam = float(np.clip(math.exp(log_lambda), 0.1, 7.0))
        mu = float(np.clip(math.exp(log_mu), 0.1, 7.0))
        return lam, mu

    def get_score_matrix(
        self,
        lam: float,
        mu: float,
        rho: Optional[float] = None
    ) -> np.ndarray:
        """
        Construye la matriz bivariada de marcadores 10x10 P(X=i, Y=j).
        """
        if rho is None:
            rho = self.rho

        max_g = self.max_goals
        matrix = np.zeros((max_g + 1, max_g + 1), dtype=float)

        pois_x = [poisson.pmf(i, lam) for i in range(max_g + 1)]
        pois_y = [poisson.pmf(j, mu) for j in range(max_g + 1)]

        for i in range(max_g + 1):
            for j in range(max_g + 1):
                t_val = tau_correction(i, j, lam, mu, rho)
                matrix[i, j] = t_val * pois_x[i] * pois_y[j]

        # Normalizar para que sume 1.0 exactamente
        tot = np.sum(matrix)
        if tot > 0:
            matrix /= tot
        return matrix

    def predict_markets_from_matrix(
        self,
        matrix: np.ndarray,
        sample_size: int = 40 # Tamaño muestral para intervalos de confianza bootstrap
    ) -> Dict[str, Dict[str, float]]:
        """
        Deriva de forma coherente 1X2, Doble Oportunidad, Over/Under y BTTS
        con intervalos de confianza (low 5%, high 95%).
        """
        p_home = float(np.sum(np.tril(matrix, -1)))
        p_draw = float(np.sum(np.diag(matrix)))
        p_away = float(np.sum(np.triu(matrix, 1)))

        # Doble Oportunidad
        p_1x = p_home + p_draw
        p_12 = p_home + p_away
        p_x2 = p_draw + p_away

        # Over / Under 2.5
        under_indices = [(i, j) for i in range(matrix.shape[0]) for j in range(matrix.shape[1]) if i + j <= 2]
        p_under_25 = float(sum(matrix[i, j] for i, j in under_indices))
        p_over_25 = float(1.0 - p_under_25)

        # Both Teams to Score (BTTS)
        p_btts_yes = float(np.sum(matrix[1:, 1:]))
        p_btts_no = float(1.0 - p_btts_yes)

        def add_ci(p_val: float) -> Dict[str, float]:
            # Margen de error estándar binomial para el intervalo del 90%
            se = math.sqrt(max(0.0001, p_val * (1.0 - p_val)) / max(10, sample_size))
            z = 1.645 # 90% de confianza
            return {
                "prob": p_val,
                "ci_low": max(0.01, p_val - z * se),
                "ci_high": min(0.99, p_val + z * se)
            }

        return {
            "1X2": {
                "HOME": add_ci(p_home),
                "DRAW": add_ci(p_draw),
                "AWAY": add_ci(p_away)
            },
            "DOUBLE_CHANCE": {
                "1X": add_ci(p_1x),
                "12": add_ci(p_12),
                "X2": add_ci(p_x2)
            },
            "OVER_UNDER_2.5": {
                "OVER": add_ci(p_over_25),
                "UNDER": add_ci(p_under_25)
            },
            "BTTS": {
                "YES": add_ci(p_btts_yes),
                "NO": add_ci(p_btts_no)
            }
        }
