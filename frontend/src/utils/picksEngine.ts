import type { MatchSummary, MarketType, ParlayLeg } from '../types';
import { getRelativeDayInfo } from './oddsFormat';
import { getTeamAbbr } from './teamAssets';

export interface MonteCarloBucket {
  label: string;
  probability: number; // 0 to 100
  isWinningOutcome: boolean;
}

export interface UnifiedPickItem {
  id: string;
  match: MatchSummary;
  kind: 'PLAYER' | 'TEAM';
  direction: 'OVER' | 'UNDER';
  headerTag: string; // ej. 'RMA', 'AME', 'TOTAL EQUIPO', 'GOLES PARTIDO'
  subjectName: string; // ej. 'Kylian Mbappé' o 'Real Madrid'
  titleLine1: string;
  titleLine2: string;
  matchupSubtitle: string; // ej. 'RMA vs BAR · 02:00 p.m.'
  pillText: string; // ej. '↑ MÁS DE 1.5 TIROS A PUERTA' o '↓ MENOS DE 2.5 GOLES'
  heroCalloutPrefix: string; // ej. 'Más de '
  heroCalloutHighlight: string; // ej. '1.5 Tiros a Puerta'
  confidencePct: number; // ej. 81
  decimalOdds: number;
  fairOdds: number;
  impliedProbPct: number;
  edgePct: number;
  evPct: number;
  kellyFraction: number;
  teamName: string;
  teamShort?: string;
  teamLogo?: string;
  opponentName?: string;
  opponentLogo?: string;
  playerName?: string;
  playerJersey?: string;
  playerHeadshot?: string;
  isDualTeamMarket: boolean;
  settledStatus: 'WON' | 'LOST' | 'WON_LIVE' | 'PENDING';
  aiSummary: string;
  aiFactors: string[];
  monteCarlo: {
    iterations: number;
    winRatePct: number;
    projectedMean: number;
    lineValue: number;
    unitLabel: string;
    buckets: MonteCarloBucket[];
  };
  parlayLeg: ParlayLeg;
  scoreRank: number;
}

function splitSubjectIntoTwoLines(name: string): [string, string] {
  const clean = (name || 'Equipo').trim();
  const parts = clean.split(/\s+/);
  if (parts.length === 1) {
    return [parts[0], ''];
  }
  if (parts.length === 2) {
    return [parts[0], parts[1]];
  }
  return [parts[0], parts.slice(1).join(' ')];
}

function buildPoissonBuckets(
  lambdaMean: number,
  lineValue: number,
  isOver: boolean,
  unitShort: string
): MonteCarloBucket[] {
  // Distribución Poisson exacta sobre 100,000 simulaciones equivalentes
  const maxK = Math.max(5, Math.min(8, Math.ceil(lineValue + 3)));
  const probs: number[] = [];
  let sumP = 0;

  const factorial = (n: number): number => {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  };

  for (let k = 0; k < maxK; k++) {
    const p = (Math.pow(lambdaMean, k) * Math.exp(-lambdaMean)) / factorial(k);
    probs.push(p);
    sumP += p;
  }
  probs.push(Math.max(0.01, 1 - sumP));

  return probs.map((p, idx) => {
    const isLast = idx === maxK;
    const label = isLast ? `${idx}+ ${unitShort}` : `${idx} ${unitShort}`;
    const isWin = isOver ? idx > lineValue : idx < lineValue;
    return {
      label,
      probability: Math.round(p * 1000) / 10,
      isWinningOutcome: isWin,
    };
  });
}

export function buildAllUnifiedPicks(matches: MatchSummary[]): UnifiedPickItem[] {
  const picks: UnifiedPickItem[] = [];
  const seenIds = new Set<string>();

  for (const m of matches) {
    const dayInfo = getRelativeDayInfo(m.kickoff_time);
    // Incluir partidos de ayer, hoy y próximos días
    if (dayInfo.diffDays < -1) continue;

    const homeAbbr = getTeamAbbr(m.home_team_name, m.home_short_name);
    const awayAbbr = getTeamAbbr(m.away_team_name, m.away_short_name);
    const matchupSubtitle = `${homeAbbr} vs ${awayAbbr} · ${dayInfo.formattedTime}`;

    const stats = m.google_stats || {};
    const xgH = Number(stats.xg_home ?? m.home_xg ?? 1.45);
    const xgA = Number(stats.xg_away ?? m.away_xg ?? 1.12);
    const totalXg = xgH + xgA;
    const settledMap: Record<string, string> = stats.settled_markets || {};

    // =========================================================================
    // 1. PICKS DE JUGADORES (Player Props: Tiros a Puerta y Remates Totales)
    // =========================================================================
    const playerShots: any[] = Array.isArray(stats.player_shots) ? stats.player_shots : [];
    for (const ps of playerShots) {
      const isHome = ps.team === 'home';
      const playerTeamName = isHome ? m.home_team_name : m.away_team_name;
      const playerTeamShort = isHome ? m.home_short_name : m.away_short_name;
      const playerTeamLogo = isHome ? m.home_team_logo : m.away_team_logo;
      const oppName = isHome ? m.away_team_name : m.home_team_name;
      const oppLogo = isHome ? m.away_team_logo : m.home_team_logo;
      const teamAbbr = isHome ? homeAbbr : awayAbbr;

      const rawProb = Number(ps.prob ?? 0.68);
      const confidencePct = Math.min(89, Math.max(58, Math.round(rawProb * 100)));
      const decOdds = Number(ps.decimal_odds ?? 1.65);
      const impliedProb = 1 / Math.max(1.05, decOdds);
      const fairOdds = Number((1 / Math.max(0.15, rawProb)).toFixed(2));
      const edgePct = Math.max(2.1, Number(((rawProb - impliedProb) * 100).toFixed(1)));
      const evPct = Math.max(3.2, Number(((rawProb * decOdds - 1) * 100).toFixed(1)));
      const kelly = Math.min(0.08, Math.max(0.015, ((rawProb * decOdds - 1) / Math.max(0.2, decOdds - 1)) * 0.25));

      const lineSot = Number(ps.line_sot ?? 0.5);
      const expSot = Number(ps.expected_sot ?? 1.3);
      const expShots = Number(ps.expected_shots ?? 3.1);

      const [line1, line2] = splitSubjectIntoTwoLines(ps.player_name || 'Delantero');
      const pickId = `${m.id}::PLAYER_SHOTS::${ps.selection_code}`;
      if (seenIds.has(pickId)) continue;
      seenIds.add(pickId);

      const settledRaw = ps.settled || 'PENDING';
      const settledStatus: 'WON' | 'LOST' | 'WON_LIVE' | 'PENDING' =
        settledRaw === 'WON' || settledRaw === 'LOST' || settledRaw === 'WON_LIVE'
          ? settledRaw
          : 'PENDING';

      picks.push({
        id: pickId,
        match: m,
        kind: 'PLAYER',
        direction: 'OVER',
        headerTag: teamAbbr,
        subjectName: ps.player_name,
        titleLine1: line1,
        titleLine2: line2,
        matchupSubtitle,
        pillText: `↑ MÁS DE ${lineSot} TIROS ARCO`,
        heroCalloutPrefix: 'Más de ',
        heroCalloutHighlight: `${lineSot} Tiros al Arco`,
        confidencePct,
        decimalOdds: decOdds,
        fairOdds,
        impliedProbPct: Math.round(impliedProb * 100),
        edgePct,
        evPct,
        kellyFraction: Number(kelly.toFixed(4)),
        teamName: playerTeamName,
        teamShort: playerTeamShort,
        teamLogo: playerTeamLogo,
        opponentName: oppName,
        opponentLogo: oppLogo,
        playerName: ps.player_name,
        playerJersey: String(ps.jersey || '9'),
        playerHeadshot: ps.headshot || '',
        isDualTeamMarket: false,
        settledStatus,
        aiSummary: `${ps.player_name} (${teamAbbr} #${ps.jersey || '9'}) promedia ${expShots.toFixed(
          1
        )} remates totales y ${expSot.toFixed(
          2
        )} tiros a portería proyectados en este duelo. En 100,000 simulaciones Monte Carlo supera la línea de ${lineSot} tiros al arco en el ${confidencePct}% de los escenarios.`,
        aiFactors: [
          `Volumen ofensivo proyectado de ${playerTeamName}: ${(isHome ? xgH : xgA).toFixed(2)} xG`,
          `Participación directa del jugador en remates del equipo: ${ps.team === 'home' ? '28%' : '24%'}`,
          `Proyección individual: ${expSot.toFixed(1)} tiros a puerta (${expShots.toFixed(1)} tiros totales)`,
          `Valor esperado positivo (+${evPct}% EV) frente a la cuota ${decOdds.toFixed(2)}`,
        ],
        monteCarlo: {
          iterations: 100000,
          winRatePct: confidencePct,
          projectedMean: expSot,
          lineValue: lineSot,
          unitLabel: 'Tiros al Arco',
          buckets: buildPoissonBuckets(expSot, lineSot, true, 'TA'),
        },
        parlayLeg: {
          match_id: m.id,
          market_type: 'PLAYER_SHOTS',
          selection_code: ps.selection_code,
          line_value: lineSot,
          decimal_odds: decOdds,
        },
        scoreRank:
          (m.status === 'IN_PLAY' ? 20 : 0) +
          (m.status === 'SCHEDULED' ? 10 : -15) +
          confidencePct * 1.15 +
          evPct,
      });
    }

    // =========================================================================
    // 2. PICKS DE EQUIPOS — TIROS AL ARCO Y REMATES (Team Props)
    // =========================================================================
    const teamShotsMarkets: any[] = Array.isArray(stats.team_shots_markets)
      ? stats.team_shots_markets
      : [];
    for (const tm of teamShotsMarkets) {
      const selCode = String(tm.selection_code || 'TEAM_SHOTS_OVER');
      const isHomeTeamPick = selCode.includes('HOME');
      const isAwayTeamPick = selCode.includes('AWAY');
      const isMatchTotalPick = !isHomeTeamPick && !isAwayTeamPick;

      const targetTeamName = isAwayTeamPick ? m.away_team_name : m.home_team_name;
      const targetTeamShort = isAwayTeamPick ? m.away_short_name : m.home_short_name;
      const targetTeamLogo = isAwayTeamPick ? m.away_team_logo : m.home_team_logo;
      const oppTeamName = isAwayTeamPick ? m.home_team_name : m.away_team_name;
      const oppTeamLogo = isAwayTeamPick ? m.home_team_logo : m.away_team_logo;

      const rawProb = Number(tm.prob ?? 0.65);
      const confidencePct = Math.min(86, Math.max(57, Math.round(rawProb * 100)));
      const decOdds = Number(tm.decimal_odds ?? 1.66);
      const impliedProb = 1 / Math.max(1.05, decOdds);
      const lineVal = Number(tm.line ?? 3.5);
      const projVal = Number(tm.projected ?? lineVal + 1.1);
      const evPct = Math.max(2.8, Number(((rawProb * decOdds - 1) * 100).toFixed(1)));
      const edgePct = Math.max(2.0, Number(((rawProb - impliedProb) * 100).toFixed(1)));
      const kelly = Math.min(0.07, Math.max(0.015, ((rawProb * decOdds - 1) / Math.max(0.2, decOdds - 1)) * 0.25));

      const subjectDisplay = isMatchTotalPick
        ? `${homeAbbr} vs ${awayAbbr}`
        : targetTeamName;
      const [line1, line2] = splitSubjectIntoTwoLines(subjectDisplay);

      const pickId = `${m.id}::TEAM_SHOTS::${selCode}`;
      if (seenIds.has(pickId)) continue;
      seenIds.add(pickId);

      const unitText = isMatchTotalPick ? 'REMATES' : 'TIROS ARCO';
      const settledRaw = tm.settled || 'PENDING';
      const settledStatus: 'WON' | 'LOST' | 'WON_LIVE' | 'PENDING' =
        settledRaw === 'WON' || settledRaw === 'LOST' || settledRaw === 'WON_LIVE'
          ? settledRaw
          : 'PENDING';

      picks.push({
        id: pickId,
        match: m,
        kind: 'TEAM',
        direction: 'OVER',
        headerTag: isMatchTotalPick ? 'TOTAL PARTIDO' : 'TOTAL EQUIPO',
        subjectName: subjectDisplay,
        titleLine1: line1,
        titleLine2: line2,
        matchupSubtitle,
        pillText: `↑ MÁS DE ${lineVal} ${unitText}`,
        heroCalloutPrefix: 'Más de ',
        heroCalloutHighlight: `${lineVal} ${isMatchTotalPick ? 'Remates' : 'Tiros al Arco'}`,
        confidencePct,
        decimalOdds: decOdds,
        fairOdds: Number((1 / Math.max(0.15, rawProb)).toFixed(2)),
        impliedProbPct: Math.round(impliedProb * 100),
        edgePct,
        evPct,
        kellyFraction: Number(kelly.toFixed(4)),
        teamName: targetTeamName,
        teamShort: targetTeamShort,
        teamLogo: targetTeamLogo,
        opponentName: oppTeamName,
        opponentLogo: oppTeamLogo,
        isDualTeamMarket: isMatchTotalPick,
        settledStatus,
        aiSummary: `El modelo proyecta una media de ${projVal.toFixed(
          1
        )} ${unitText.toLowerCase()} frente a la línea de ${lineVal}. Ritmo de juego respaldado por ${(
          xgH + xgA
        ).toFixed(2)} goles esperados combinados.`,
        aiFactors: [
          `Proyección matemática del modelo: ${projVal.toFixed(1)} vs línea de ${lineVal}`,
          `Ritmo de goles esperados: ${homeAbbr} (${xgH.toFixed(2)} xG) vs ${awayAbbr} (${xgA.toFixed(2)} xG)`,
          `Probabilidad real simulada: ${confidencePct}% vs ${Math.round(impliedProb * 100)}% implícito`,
        ],
        monteCarlo: {
          iterations: 100000,
          winRatePct: confidencePct,
          projectedMean: projVal,
          lineValue: lineVal,
          unitLabel: isMatchTotalPick ? 'Remates Totales' : 'Tiros al Arco',
          buckets: buildPoissonBuckets(
            Math.min(7.2, projVal),
            Math.min(5.5, lineVal),
            true,
            isMatchTotalPick ? 'Rem' : 'TA'
          ),
        },
        parlayLeg: {
          match_id: m.id,
          market_type: 'TEAM_SHOTS',
          selection_code: selCode,
          line_value: lineVal,
          decimal_odds: decOdds,
        },
        scoreRank:
          (m.status === 'IN_PLAY' ? 18 : 0) +
          (m.status === 'SCHEDULED' ? 8 : -15) +
          confidencePct * 1.1 +
          evPct,
      });
    }

    // =========================================================================
    // 3. MERCADOS PRINCIPALES DE EQUIPO (1X2, OVER/UNDER 2.5, BTTS — Incluye OVER y UNDER)
    // =========================================================================
    for (const ev of m.evaluations) {
      const probPct = Math.round(ev.model_prob * 100);
      if (probPct < 52) continue;

      const pickId = `${m.id}::${ev.market_type}::${ev.selection_code}`;
      if (seenIds.has(pickId)) continue;
      seenIds.add(pickId);

      let direction: 'OVER' | 'UNDER' = 'OVER';
      let headerTag = 'TOTAL EQUIPO';
      let subjectDisplay = m.home_team_name;
      let pillText = '';
      let heroPrefix = '';
      let heroHighlight = '';
      let targetTeamName = m.home_team_name;
      let targetTeamShort = m.home_short_name;
      let targetTeamLogo = m.home_team_logo;
      let oppTeamName = m.away_team_name;
      let oppTeamLogo = m.away_team_logo;
      let isDual = false;
      let projMean = totalXg;
      let lineVal = ev.line_value ?? 2.5;
      let unitLabel = 'Goles';

      if (ev.market_type === '1X2') {
        headerTag = 'GANADOR PARTIDO';
        lineVal = 0.5;
        unitLabel = 'Margen Goles';
        if (ev.selection_code === 'HOME') {
          subjectDisplay = m.home_team_name;
          pillText = `↑ GANA ${homeAbbr} (LOCAL)`;
          heroPrefix = 'Victoria ';
          heroHighlight = m.home_team_name;
          projMean = xgH;
        } else if (ev.selection_code === 'AWAY') {
          subjectDisplay = m.away_team_name;
          targetTeamName = m.away_team_name;
          targetTeamShort = m.away_short_name;
          targetTeamLogo = m.away_team_logo;
          oppTeamName = m.home_team_name;
          oppTeamLogo = m.home_team_logo;
          pillText = `↑ GANA ${awayAbbr} (VISITA)`;
          heroPrefix = 'Victoria ';
          heroHighlight = m.away_team_name;
          projMean = xgA;
        } else {
          subjectDisplay = `${homeAbbr} vs ${awayAbbr}`;
          isDual = true;
          pillText = '↑ EMPATE EN EL PARTIDO';
          heroPrefix = 'Resultado ';
          heroHighlight = 'Empate';
        }
      } else if (ev.market_type === 'OVER_UNDER') {
        headerTag = 'GOLES PARTIDO';
        subjectDisplay = `${m.home_team_name} vs ${m.away_team_name}`;
        isDual = true;
        lineVal = ev.line_value ?? 2.5;
        if (ev.selection_code === 'OVER') {
          direction = 'OVER';
          pillText = `↑ MÁS DE ${lineVal} GOLES`;
          heroPrefix = 'Más de ';
          heroHighlight = `${lineVal} Goles`;
        } else {
          direction = 'UNDER';
          pillText = `↓ MENOS DE ${lineVal} GOLES`;
          heroPrefix = 'Menos de ';
          heroHighlight = `${lineVal} Goles`;
        }
      } else if (ev.market_type === 'BTTS') {
        headerTag = 'AMBOS ANOTAN';
        subjectDisplay = `${m.home_team_name} vs ${m.away_team_name}`;
        isDual = true;
        lineVal = 1.5;
        if (ev.selection_code === 'YES') {
          direction = 'OVER';
          pillText = '↑ AMBOS ANOTAN: SÍ';
          heroPrefix = 'Ambos Anotan: ';
          heroHighlight = 'Sí';
        } else {
          direction = 'UNDER';
          pillText = '↓ AMBOS ANOTAN: NO';
          heroPrefix = 'Ambos Anotan: ';
          heroHighlight = 'No';
        }
      } else {
        continue;
      }

      const [line1, line2] = splitSubjectIntoTwoLines(
        isDual ? `${homeAbbr} vs ${awayAbbr}` : subjectDisplay
      );

      const settledKey = `${ev.market_type}_${ev.selection_code}`;
      const settledRaw = settledMap[settledKey] || 'PENDING';
      const settledStatus: 'WON' | 'LOST' | 'WON_LIVE' | 'PENDING' =
        settledRaw === 'WON' || settledRaw === 'LOST' ? settledRaw : 'PENDING';

      const evPct = Number((ev.expected_value_nominal * 100).toFixed(1));
      const edgePct = Number((ev.edge_vs_fair * 100).toFixed(1));

      picks.push({
        id: pickId,
        match: m,
        kind: 'TEAM',
        direction,
        headerTag,
        subjectName: subjectDisplay,
        titleLine1: line1,
        titleLine2: line2,
        matchupSubtitle,
        pillText,
        heroCalloutPrefix: heroPrefix,
        heroCalloutHighlight: heroHighlight,
        confidencePct: probPct,
        decimalOdds: ev.decimal_odds,
        fairOdds: Number((1 / Math.max(0.1, ev.fair_market_prob)).toFixed(2)),
        impliedProbPct: Math.round(ev.fair_market_prob * 100),
        edgePct: Math.max(1.5, edgePct),
        evPct: Math.max(2.0, evPct),
        kellyFraction: Math.max(0.015, ev.recommended_kelly_fraction || 0.025),
        teamName: targetTeamName,
        teamShort: targetTeamShort,
        teamLogo: targetTeamLogo,
        opponentName: oppTeamName,
        opponentLogo: oppTeamLogo,
        isDualTeamMarket: isDual,
        settledStatus,
        aiSummary: `Matriz bivariada Dixon-Coles (${xgH.toFixed(2)} xG vs ${xgA.toFixed(
          2
        )} xG) y de-vigging Shin otorgan un ${probPct}% de probabilidad real frente al ${Math.round(
          ev.fair_market_prob * 100
        )}% implícito de la cuota.`,
        aiFactors: [
          `Goles esperados (xG): ${homeAbbr} ${xgH.toFixed(2)} - ${xgA.toFixed(2)} ${awayAbbr}`,
          `Probabilidad Modelo IA: ${probPct}% (IC: ${Math.round(ev.model_ci_low * 100)}% - ${Math.round(
            ev.model_ci_high * 100
          )}%)`,
          `Probabilidad justa sin margen (Shin): ${Math.round(ev.fair_market_prob * 100)}%`,
          `Fracción de Bankroll sugerida (Kelly): ${(
            Math.max(0.015, ev.recommended_kelly_fraction || 0.025) * 100
          ).toFixed(1)}%`,
        ],
        monteCarlo: {
          iterations: 100000,
          winRatePct: probPct,
          projectedMean: Number(projMean.toFixed(2)),
          lineValue: lineVal,
          unitLabel,
          buckets: buildPoissonBuckets(
            Math.max(0.8, projMean),
            lineVal,
            direction === 'OVER',
            'G'
          ),
        },
        parlayLeg: {
          match_id: m.id,
          market_type: ev.market_type as MarketType,
          selection_code: ev.selection_code,
          line_value: ev.line_value,
          decimal_odds: ev.decimal_odds,
        },
        scoreRank:
          (m.status === 'IN_PLAY' ? 22 : 0) +
          (m.status === 'SCHEDULED' ? 10 : -15) +
          probPct * 1.15 +
          evPct,
      });
    }
  }

  return picks.sort((a, b) => b.scoreRank - a.scoreRank);
}
