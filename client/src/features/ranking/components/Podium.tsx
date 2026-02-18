import type { RankingCriteria, RankingEntry } from '../types';

interface PodiumProps {
  entries: RankingEntry[];
  criteria: RankingCriteria;
}

const POSITION_CONFIG = {
  1: {
    bg: 'bg-gradient-to-br from-amber-500/30 via-amber-400/20 to-yellow-500/30',
    border: 'border-amber-400/50',
    glow: 'shadow-lg shadow-amber-500/30',
    text: 'text-amber-300',
    badgeBg: 'bg-gradient-to-br from-amber-400 to-amber-600',
    badgeGlow: 'shadow-lg shadow-amber-500/50',
    size: 'w-20 h-20 sm:w-28 sm:h-28',
    textSize: 'text-2xl',
    badgeSize: 'w-10 h-10',
  },
  2: {
    bg: 'bg-gradient-to-br from-slate-400/30 via-slate-300/20 to-gray-400/30',
    border: 'border-slate-400/50',
    glow: 'shadow-lg shadow-slate-500/20',
    text: 'text-slate-300',
    badgeBg: 'bg-gradient-to-br from-slate-400 to-slate-600',
    badgeGlow: 'shadow-lg shadow-slate-500/40',
    size: 'w-16 h-16 sm:w-24 sm:h-24',
    textSize: 'text-xl',
    badgeSize: 'w-9 h-9',
  },
  3: {
    bg: 'bg-gradient-to-br from-orange-500/30 via-orange-400/20 to-amber-600/30',
    border: 'border-orange-400/50',
    glow: 'shadow-lg shadow-orange-500/20',
    text: 'text-orange-300',
    badgeBg: 'bg-gradient-to-br from-orange-400 to-orange-600',
    badgeGlow: 'shadow-lg shadow-orange-500/40',
    size: 'w-16 h-16 sm:w-24 sm:h-24',
    textSize: 'text-xl',
    badgeSize: 'w-9 h-9',
  },
};

// Trophy SVG Component
function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 2h-4V1h-2v1H7c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V15H7v2h10v-2h-6v-2.09c1.63-.33 2.98-1.46 3.61-2.96C17.08 9.63 19 7.55 19 5V4c0-1.1-.9-2-2-2zm-8 6.32C7.21 8.08 6 6.63 6 5V4h3v4.32zM15 8.32V4h3v1c0 1.63-1.21 3.08-3 3.32z" />
      <path d="M12 13c-1.66 0-3-1.34-3-3V4h6v6c0 1.66-1.34 3-3 3z" />
    </svg>
  );
}

// Medal SVG Component
function MedalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
      <path d="M16 2l-4 7 1.5 1.5L16 14V2zM8 2v12l2.5-3.5L12 9 8 2z"/>
      <circle cx="12" cy="10" r="2"/>
    </svg>
  );
}

// Award SVG Component
function AwardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 15c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/>
      <path d="M19 9c0-3.87-3.13-7-7-7S5 5.13 5 9c0 3.53 2.61 6.43 6 6.92V21l1-1 1 1v-5.08c3.39-.49 6-3.39 6-6.92zm-7 5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
      <circle cx="12" cy="9" r="1.5"/>
    </svg>
  );
}

function formatValue(value: number, criteria: RankingCriteria): string {
  switch (criteria) {
    case 'productivity':
      return `${value} pedidos`;
    case 'revenue':
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    case 'punctuality':
      return `${value.toFixed(1)}%`;
    case 'satisfaction':
      return `${value.toFixed(1)} estrelas`;
    case 'quality':
      return `${value.toFixed(2)} pts`;
    default:
      return String(value);
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function PodiumCard({
  entry,
  criteria,
  isFirst,
}: {
  entry: RankingEntry;
  criteria: RankingCriteria;
  isFirst: boolean;
}) {
  const config = POSITION_CONFIG[entry.position as 1 | 2 | 3] || POSITION_CONFIG[3];

  // Select appropriate icon based on position
  const BadgeIcon = entry.position === 1 ? TrophyIcon : entry.position === 2 ? MedalIcon : AwardIcon;

  return (
    <div
      className={`flex flex-col items-center ${isFirst ? 'order-2 -mt-6' : entry.position === 2 ? 'order-1' : 'order-3'}`}
    >
      <div
        className={`relative ${config.size} rounded-full ${config.bg} border-4 ${config.border} ${config.glow} flex items-center justify-center mb-3 backdrop-blur-sm`}
      >
        <span className={`${config.textSize} font-bold ${config.text}`}>
          {getInitials(entry.name)}
        </span>
        {/* Enhanced Badge with Trophy/Medal/Award */}
        <div
          className={`absolute -top-2 -right-2 ${config.badgeSize} rounded-full ${config.badgeBg} ${config.badgeGlow} flex items-center justify-center backdrop-blur-sm border-2 border-black/20`}
        >
          <BadgeIcon className="h-5 w-5 text-white drop-shadow-lg" />
        </div>
      </div>
      <p className={`font-semibold text-center ${isFirst ? 'text-base' : 'text-sm'} text-white truncate max-w-[140px]`}>
        {entry.name}
      </p>
      <p className={`${config.text} font-medium text-sm mt-1`}>{formatValue(entry.value, criteria)}</p>
      <p className="text-xs text-gray-500 mt-0.5">{entry.orders_count} pedidos</p>
    </div>
  );
}

export function Podium({ entries, criteria }: PodiumProps) {
  if (!entries || entries.length === 0) {
    return null;
  }

  const top3 = entries.slice(0, 3);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-4 sm:p-8">
      <div className="flex justify-center items-end gap-4 sm:gap-10 min-h-[160px] sm:min-h-[200px]">
        {top3.map((entry) => (
          <PodiumCard key={entry.collaborator_id} entry={entry} criteria={criteria} isFirst={entry.position === 1} />
        ))}
      </div>
    </div>
  );
}
