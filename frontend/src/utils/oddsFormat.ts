export type OddsFormat = 'AMERICAN' | 'DECIMAL';

export function getShortTeamName(fullName: string, explicitShort?: string): string {
  if (explicitShort && explicitShort.trim().length > 0) return explicitShort;
  if (!fullName) return 'Equipo';
  const cleaned = fullName
    .replace(/^(Club|Deportivo|CD|CF|FC|Real|Sporting|Atlético)\s+/i, '')
    .replace(/\s+(FC|CF|UANL|UNAM)$/i, '')
    .trim();
  return cleaned || fullName;
}

export function formatPercent(prob: number): string {
  if (typeof prob !== 'number' || isNaN(prob)) return '0%';
  return `${Math.round(prob * 100)}%`;
}

export function formatOdds(decimalOdds: number, format: OddsFormat = 'DECIMAL'): string {
  if (!decimalOdds || decimalOdds <= 1.0) return '—';
  
  if (format === 'DECIMAL') {
    return decimalOdds.toFixed(2);
  }

  // Conversión a Momio Americano
  if (decimalOdds >= 2.0) {
    const american = Math.round((decimalOdds - 1.0) * 100);
    return `+${american}`;
  } else {
    const american = Math.round(-100 / (decimalOdds - 1.0));
    return `${american}`;
  }
}

export function parseOddsInput(inputStr: string): number | null {
  const clean = inputStr.trim().replace(' ', '');
  const val = parseFloat(clean);
  if (isNaN(val)) return null;

  if (val > 0) {
    if (val < 10.0) return val; // Ya es decimal
    return 1.0 + (val / 100.0); // +150 -> 2.50
  } else if (val < 0) {
    return 1.0 + (100.0 / Math.abs(val)); // -110 -> 1.909
  }
  return null;
}

export function getSignalMeta(classification: string) {
  switch (classification) {
    case 'CANDIDATE_VALUE':
      return {
        label: 'Buen Valor IA',
        badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-600',
        dotClass: 'bg-emerald-400',
        icon: '🟢'
      };
    case 'HIGH_UNCERTAINTY':
      return {
        label: 'Precio Justo',
        badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-600',
        dotClass: 'bg-amber-400',
        icon: '🟡'
      };
    default:
      return {
        label: 'Sin Ventaja',
        badgeClass: 'bg-slate-900 text-slate-400 border-slate-800',
        dotClass: 'bg-slate-500',
        icon: '🔴'
      };
  }
}
