import React, { useState } from 'react';

export interface TeamVisualProfile {
  canonicalName: string;
  abbr: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  glowCss: string;
}

interface CatalogTeamEntry {
  abbr: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
}

// Catálogo garantizado de escudos oficiales en alta resolución (ESPN CDN Oficial) y colores de club
const TEAM_VISUAL_CATALOG: Record<string, CatalogTeamEntry> = {
  // LaLiga
  'real madrid': {
    abbr: 'RMA',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/86.png',
    primaryColor: '#3b82f6',
    secondaryColor: '#f59e0b',
  },
  barcelona: {
    abbr: 'BAR',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/83.png',
    primaryColor: '#a81c40',
    secondaryColor: '#1d4ed8',
  },
  'atletico madrid': {
    abbr: 'ATM',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/1068.png',
    primaryColor: '#dc2626',
    secondaryColor: '#1e3a8a',
  },
  'atlético madrid': {
    abbr: 'ATM',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/1068.png',
    primaryColor: '#dc2626',
    secondaryColor: '#1e3a8a',
  },
  'real sociedad': {
    abbr: 'RSO',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/89.png',
    primaryColor: '#2563eb',
    secondaryColor: '#eff6ff',
  },
  villarreal: {
    abbr: 'VIL',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/102.png',
    primaryColor: '#eab308',
    secondaryColor: '#1e3a8a',
  },
  'athletic club': {
    abbr: 'ATH',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/93.png',
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
  },
  'real betis': {
    abbr: 'BET',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/244.png',
    primaryColor: '#16a34a',
    secondaryColor: '#ffffff',
  },
  sevilla: {
    abbr: 'SEV',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/243.png',
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
  },
  valencia: {
    abbr: 'VAL',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/94.png',
    primaryColor: '#f97316',
    secondaryColor: '#18181b',
  },
  girona: {
    abbr: 'GIR',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/9812.png',
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
  },
  espanyol: {
    abbr: 'ESP',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/88.png',
    primaryColor: '#2563eb',
    secondaryColor: '#ffffff',
  },
  'celta vigo': {
    abbr: 'CEL',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/85.png',
    primaryColor: '#38bdf8',
    secondaryColor: '#dc2626',
  },
  osasuna: {
    abbr: 'OSA',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/97.png',
    primaryColor: '#b91c1c',
    secondaryColor: '#1e3a8a',
  },
  mallorca: {
    abbr: 'MLL',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/84.png',
    primaryColor: '#dc2626',
    secondaryColor: '#18181b',
  },
  'rayo vallecano': {
    abbr: 'RAY',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/101.png',
    primaryColor: '#ef4444',
    secondaryColor: '#ffffff',
  },
  getafe: {
    abbr: 'GET',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/2922.png',
    primaryColor: '#1d4ed8',
    secondaryColor: '#ffffff',
  },

  // Premier League
  arsenal: {
    abbr: 'ARS',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/359.png',
    primaryColor: '#dc2626',
    secondaryColor: '#f59e0b',
  },
  'manchester city': {
    abbr: 'MCI',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/382.png',
    primaryColor: '#38bdf8',
    secondaryColor: '#1e3a8a',
  },
  liverpool: {
    abbr: 'LIV',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/364.png',
    primaryColor: '#dc2626',
    secondaryColor: '#f59e0b',
  },
  chelsea: {
    abbr: 'CHE',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/363.png',
    primaryColor: '#1d4ed8',
    secondaryColor: '#60a5fa',
  },
  'manchester united': {
    abbr: 'MUN',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/360.png',
    primaryColor: '#dc2626',
    secondaryColor: '#facc15',
  },
  'tottenham hotspur': {
    abbr: 'TOT',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/367.png',
    primaryColor: '#60a5fa',
    secondaryColor: '#1e293b',
  },
  'newcastle united': {
    abbr: 'NEW',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/361.png',
    primaryColor: '#64748b',
    secondaryColor: '#f8fafc',
  },
  'aston villa': {
    abbr: 'AVL',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/362.png',
    primaryColor: '#881337',
    secondaryColor: '#38bdf8',
  },
  brighton: {
    abbr: 'BHA',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/331.png',
    primaryColor: '#2563eb',
    secondaryColor: '#facc15',
  },
  fulham: {
    abbr: 'FUL',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/370.png',
    primaryColor: '#dc2626',
    secondaryColor: '#e2e8f0',
  },
  'west ham': {
    abbr: 'WHU',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/371.png',
    primaryColor: '#881337',
    secondaryColor: '#38bdf8',
  },

  // Liga MX
  américa: {
    abbr: 'AME',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/227.png',
    primaryColor: '#eab308',
    secondaryColor: '#1e3a8a',
  },
  america: {
    abbr: 'AME',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/227.png',
    primaryColor: '#eab308',
    secondaryColor: '#1e3a8a',
  },
  'cruz azul': {
    abbr: 'CAZ',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/218.png',
    primaryColor: '#2563eb',
    secondaryColor: '#dc2626',
  },
  guadalajara: {
    abbr: 'GDL',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/219.png',
    primaryColor: '#dc2626',
    secondaryColor: '#1e3a8a',
  },
  'pumas unam': {
    abbr: 'PUM',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/233.png',
    primaryColor: '#ca8a04',
    secondaryColor: '#1e3a8a',
  },
  'tigres uanl': {
    abbr: 'TIG',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/232.png',
    primaryColor: '#eab308',
    secondaryColor: '#1d4ed8',
  },
  monterrey: {
    abbr: 'MTY',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/220.png',
    primaryColor: '#1e3a8a',
    secondaryColor: '#93c5fd',
  },
  toluca: {
    abbr: 'TOL',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/223.png',
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
  },
  pachuca: {
    abbr: 'PAC',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/234.png',
    primaryColor: '#2563eb',
    secondaryColor: '#ffffff',
  },
  león: {
    abbr: 'LEO',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/228.png',
    primaryColor: '#16a34a',
    secondaryColor: '#facc15',
  },
  atlas: {
    abbr: 'ATL',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/216.png',
    primaryColor: '#dc2626',
    secondaryColor: '#18181b',
  },
  santos: {
    abbr: 'SAN',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/225.png',
    primaryColor: '#16a34a',
    secondaryColor: '#ffffff',
  },
  tijuana: {
    abbr: 'TIJ',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/10125.png',
    primaryColor: '#dc2626',
    secondaryColor: '#18181b',
  },
  necaxa: {
    abbr: 'NEC',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/229.png',
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
  },
  querétaro: {
    abbr: 'QRO',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/222.png',
    primaryColor: '#1d4ed8',
    secondaryColor: '#18181b',
  },
  puebla: {
    abbr: 'PUE',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/231.png',
    primaryColor: '#2563eb',
    secondaryColor: '#ffffff',
  },
  mazatlán: {
    abbr: 'MAZ',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/20702.png',
    primaryColor: '#7e22ce',
    secondaryColor: '#18181b',
  },
  juárez: {
    abbr: 'JUA',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/17851.png',
    primaryColor: '#16a34a',
    secondaryColor: '#dc2626',
  },

  // Champions / Europa / MLS
  'bayern munich': {
    abbr: 'BAY',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/132.png',
    primaryColor: '#dc2626',
    secondaryColor: '#1e3a8a',
  },
  'paris saint-germain': {
    abbr: 'PSG',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/160.png',
    primaryColor: '#1e3a8a',
    secondaryColor: '#dc2626',
  },
  inter: {
    abbr: 'INT',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/110.png',
    primaryColor: '#1d4ed8',
    secondaryColor: '#18181b',
  },
  'ac milan': {
    abbr: 'MIL',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/103.png',
    primaryColor: '#dc2626',
    secondaryColor: '#18181b',
  },
  juventus: {
    abbr: 'JUV',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/111.png',
    primaryColor: '#64748b',
    secondaryColor: '#f8fafc',
  },
  'inter miami': {
    abbr: 'MIA',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/20232.png',
    primaryColor: '#ec4899',
    secondaryColor: '#18181b',
  },
  'la galaxy': {
    abbr: 'LAG',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/187.png',
    primaryColor: '#1e3a8a',
    secondaryColor: '#eab308',
  },
  lafc: {
    abbr: 'LAF',
    logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/18966.png',
    primaryColor: '#ca8a04',
    secondaryColor: '#18181b',
  },
};

const PALETTE_FALLBACKS: Array<{ primary: string; secondary: string }> = [
  { primary: '#10b981', secondary: '#065f46' },
  { primary: '#3b82f6', secondary: '#1e3a8a' },
  { primary: '#ef4444', secondary: '#7f1d1d' },
  { primary: '#f59e0b', secondary: '#78350f' },
  { primary: '#8b5cf6', secondary: '#4c1d95' },
  { primary: '#06b6d4', secondary: '#164e63' },
];

export function getTeamAbbr(teamName: string, shortName?: string): string {
  const lower = (teamName || '').toLowerCase();
  for (const [key, entry] of Object.entries(TEAM_VISUAL_CATALOG)) {
    if (lower.includes(key)) {
      return entry.abbr;
    }
  }
  const base = (shortName || teamName || 'CLB')
    .replace(/^(Club|CF|FC|CD|Real|Deportivo|Atlético|Sporting)\s+/i, '')
    .trim();
  const words = base.split(/\s+/);
  if (words.length >= 2 && words[0].length >= 2 && words[1].length >= 1) {
    return (words[0].slice(0, 2) + words[1].slice(0, 1)).toUpperCase();
  }
  return base.slice(0, 3).toUpperCase();
}

export function getTeamVisualProfile(
  teamName: string,
  shortName?: string,
  existingLogoUrl?: string
): TeamVisualProfile {
  const lower = (teamName || '').toLowerCase();
  let matched: CatalogTeamEntry | null = null;
  for (const [key, entry] of Object.entries(TEAM_VISUAL_CATALOG)) {
    if (lower.includes(key)) {
      matched = entry;
      break;
    }
  }

  const hash = Array.from(teamName || 'Team').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const fallbackColors = PALETTE_FALLBACKS[hash % PALETTE_FALLBACKS.length];

  const primaryColor = matched?.primaryColor || fallbackColors.primary;
  const secondaryColor = matched?.secondaryColor || fallbackColors.secondary;
  const logoUrl =
    (existingLogoUrl && existingLogoUrl.trim().length > 5 ? existingLogoUrl : '') ||
    matched?.logoUrl ||
    '';
  const abbr = matched?.abbr || getTeamAbbr(teamName, shortName);

  return {
    canonicalName: teamName,
    abbr,
    logoUrl,
    primaryColor,
    secondaryColor,
    glowCss: `radial-gradient(circle at 38% 50%, ${primaryColor}55 0%, ${secondaryColor}25 48%, rgba(10,14,18,0.96) 100%)`,
  };
}

// Componente de Escudo Oficial HD con Fallback SVG Vectorial Garantizado (Nunca queda vacío)
interface TeamCrestProps {
  teamName: string;
  shortName?: string;
  logoUrl?: string;
  sizeClass?: string;
  className?: string;
}

export const TeamCrest: React.FC<TeamCrestProps> = ({
  teamName,
  shortName,
  logoUrl,
  sizeClass = 'w-12 h-12',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const profile = getTeamVisualProfile(teamName, shortName, logoUrl);

  if (profile.logoUrl && !imgError) {
    return (
      <div
        className={`relative flex items-center justify-center shrink-0 select-none ${sizeClass} ${className}`}
      >
        <img
          src={profile.logoUrl}
          alt={teamName}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.75)]"
        />
      </div>
    );
  }

  // Escudo SVG oficial estilizado en caso de que un equipo menor no tenga imagen en el CDN
  return (
    <div
      className={`relative flex items-center justify-center shrink-0 select-none ${sizeClass} ${className}`}
    >
      <svg viewBox="0 0 64 72" className="w-full h-full drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
        <defs>
          <linearGradient id={`crest-${profile.abbr}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={profile.primaryColor} />
            <stop offset="100%" stopColor={profile.secondaryColor} />
          </linearGradient>
        </defs>
        <path
          d="M32 4 L58 14 V34 C58 51 46 63 32 68 C18 63 6 51 6 34 V14 Z"
          fill={`url(#crest-${profile.abbr})`}
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="3"
        />
        <text
          x="32"
          y="41"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="16"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.5"
        >
          {profile.abbr}
        </text>
      </svg>
    </div>
  );
};

// Panel Visual Izquierdo para las Tarjetas de Picks (34% del ancho de la tarjeta)
interface PickCardLeftVisualProps {
  kind: 'PLAYER' | 'TEAM';
  teamName: string;
  teamShort?: string;
  teamLogo?: string;
  opponentName?: string;
  opponentLogo?: string;
  playerName?: string;
  playerJersey?: string;
  playerHeadshot?: string;
  isDualTeamMarket?: boolean;
}

export const PickCardLeftVisual: React.FC<PickCardLeftVisualProps> = ({
  kind,
  teamName,
  teamShort,
  teamLogo,
  opponentName,
  opponentLogo,
  playerName,
  playerJersey = '9',
  playerHeadshot,
  isDualTeamMarket = false,
}) => {
  const [headshotError, setHeadshotError] = useState(false);
  const profile = getTeamVisualProfile(teamName, teamShort, teamLogo);
  const oppProfile = opponentName
    ? getTeamVisualProfile(opponentName, undefined, opponentLogo)
    : null;

  const hasValidHeadshot = Boolean(playerHeadshot && playerHeadshot.length > 6 && !headshotError);

  return (
    <div
      className="relative w-[112px] sm:w-[126px] shrink-0 overflow-hidden flex items-center justify-center self-stretch rounded-l-2xl border-r border-white/[0.06]"
      style={{ background: profile.glowCss }}
    >
      {/* Textura diagonal sutil de fondo */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)',
          backgroundSize: '10px 10px',
        }}
      />

      {kind === 'PLAYER' ? (
        <div className="relative w-full h-full flex items-center justify-center p-2">
          {/* Escudo oficial de fondo translúcido como marca de agua */}
          <div className="absolute -left-2 -top-2 opacity-20 scale-125 pointer-events-none">
            <TeamCrest
              teamName={teamName}
              shortName={teamShort}
              logoUrl={profile.logoUrl}
              sizeClass="w-16 h-16"
            />
          </div>

          {hasValidHeadshot ? (
            <img
              src={playerHeadshot}
              alt={playerName || teamName}
              onError={() => setHeadshotError(true)}
              className="relative z-10 w-20 h-20 sm:w-22 sm:h-22 object-cover object-top drop-shadow-[0_6px_14px_rgba(0,0,0,0.85)] translate-y-1"
            />
          ) : (
            /* Silueta de Camiseta / Dorsal Oficial + Escudo HD en primer plano */
            <div className="relative z-10 flex flex-col items-center justify-center">
              <TeamCrest
                teamName={teamName}
                shortName={teamShort}
                logoUrl={profile.logoUrl}
                sizeClass="w-14 h-14 sm:w-16 sm:h-16"
              />
              <span
                className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider text-white border border-white/25 shadow-md"
                style={{ backgroundColor: `${profile.primaryColor}dd` }}
              >
                #{playerJersey}
              </span>
            </div>
          )}

          {/* Insignia del escudo oficial en la esquina inferior derecha */}
          {hasValidHeadshot && (
            <div className="absolute bottom-1.5 right-1.5 z-20 bg-black/75 backdrop-blur-md p-1 rounded-full border border-white/20 shadow-lg">
              <TeamCrest
                teamName={teamName}
                shortName={teamShort}
                logoUrl={profile.logoUrl}
                sizeClass="w-6 h-6"
              />
            </div>
          )}
        </div>
      ) : isDualTeamMarket && oppProfile ? (
        /* Doble escudo oficial HD superpuesto para mercados de partido completo (Over/Under, BTTS) */
        <div className="relative w-full h-full flex items-center justify-center px-2">
          <div className="relative flex items-center justify-center">
            <div className="-mr-3 z-10 transform -rotate-6 transition-transform group-hover:rotate-0">
              <TeamCrest
                teamName={teamName}
                shortName={teamShort}
                logoUrl={profile.logoUrl}
                sizeClass="w-12 h-12 sm:w-14 sm:h-14"
              />
            </div>
            <div className="-ml-2 z-20 transform rotate-6 transition-transform group-hover:rotate-0">
              <TeamCrest
                teamName={opponentName!}
                logoUrl={oppProfile.logoUrl}
                sizeClass="w-12 h-12 sm:w-14 sm:h-14"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Escudo oficial HD individual en grande para picks de Equipo */
        <div className="relative w-full h-full flex items-center justify-center p-3">
          <TeamCrest
            teamName={teamName}
            shortName={teamShort}
            logoUrl={profile.logoUrl}
            sizeClass="w-16 h-16 sm:w-[72px] sm:h-[72px]"
          />
        </div>
      )}

      {/* Suavizado lateral derecho hacia el fondo oscuro de la tarjeta */}
      <div className="absolute inset-y-0 right-0 w-5 bg-gradient-to-r from-transparent to-[#0d1115] pointer-events-none" />
    </div>
  );
};
