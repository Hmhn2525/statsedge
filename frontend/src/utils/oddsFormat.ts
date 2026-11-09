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
        icon: null
      };
    case 'HIGH_UNCERTAINTY':
      return {
        label: 'Precio Justo',
        badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-600',
        dotClass: 'bg-amber-400',
        icon: null
      };
    default:
      return {
        label: 'Sin Ventaja',
        badgeClass: 'bg-slate-900 text-slate-400 border-slate-800',
        dotClass: 'bg-slate-500',
        icon: null
      };
  }
}

export interface RelativeDayInfo {
  diffDays: number;
  label: string; // 'Ayer', 'Hoy', 'Mañana', 'Dom 08 Nov'
  pillLabel: string; // 'Ayer · Vie 06', 'Hoy · Sáb 07', 'Mañana · Dom 08', 'Dom 08 Nov'
  tag: 'AYER' | 'HOY' | 'MANANA' | 'FUTURO' | 'PASADO';
  formattedTime: string; // '07:00 p.m.'
  dateKey: string; // '2026-11-07' en zona local
  dayShort: string; // 'sáb 07 nov'
}

export function getRelativeDayInfo(dateInput: string | Date): RelativeDayInfo {
  const d = new Date(dateInput);
  const now = new Date();

  // Medianoche local para comparar días calendario exactos
  const dMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = dMidnight.getTime() - nowMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateKey = `${year}-${month}-${day}`;

  const formattedTime = d.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const rawDayShort = d.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });

  const cleanDayShort = rawDayShort
    .replace(' de ', ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  if (diffDays === -1) {
    return {
      diffDays,
      label: 'Ayer',
      pillLabel: `Ayer (${cleanDayShort})`,
      tag: 'AYER',
      formattedTime,
      dateKey,
      dayShort: cleanDayShort,
    };
  } else if (diffDays === 0) {
    return {
      diffDays,
      label: 'Hoy',
      pillLabel: `Hoy (${cleanDayShort})`,
      tag: 'HOY',
      formattedTime,
      dateKey,
      dayShort: cleanDayShort,
    };
  } else if (diffDays === 1) {
    return {
      diffDays,
      label: 'Mañana',
      pillLabel: `Mañana (${cleanDayShort})`,
      tag: 'MANANA',
      formattedTime,
      dateKey,
      dayShort: cleanDayShort,
    };
  } else if (diffDays > 1) {
    return {
      diffDays,
      label: cleanDayShort,
      pillLabel: cleanDayShort,
      tag: 'FUTURO',
      formattedTime,
      dateKey,
      dayShort: cleanDayShort,
    };
  } else {
    return {
      diffDays,
      label: cleanDayShort,
      pillLabel: cleanDayShort,
      tag: 'PASADO',
      formattedTime,
      dateKey,
      dayShort: cleanDayShort,
    };
  }
}
