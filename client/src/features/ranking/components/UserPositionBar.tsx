import { Trophy, TrendingUp } from 'lucide-react';
import type { RankingCriteria, RankingEntry } from '../types';

interface UserPositionBarProps {
  entry: RankingEntry;
  totalUsers: number;
  criteria: RankingCriteria;
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

export function UserPositionBar({ entry, totalUsers, criteria }: UserPositionBarProps) {
  const isTopTen = entry.position <= 10;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 py-3 px-4 sm:py-4 sm:px-6 z-50">
      <div className="max-w-4xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`flex items-center justify-center w-12 h-12 rounded-2xl ${isTopTen ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-violet-500/20 border border-violet-500/30'}`}>
            {isTopTen ? (
              <Trophy className="h-5 w-5 text-amber-400" />
            ) : (
              <span className="font-bold text-lg text-violet-300">#{entry.position}</span>
            )}
          </div>
          <div>
            <p className="font-semibold text-white">{entry.name}</p>
            <p className="text-sm text-gray-400">
              Voce esta em <span className="text-violet-300 font-medium">#{entry.position}</span> de {totalUsers}
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <div className="flex items-center gap-2 justify-end">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <p className="font-bold text-lg text-white">{formatValue(entry.value, criteria)}</p>
          </div>
          <p className="text-sm text-gray-500">{entry.orders_count} pedidos</p>
        </div>
      </div>
    </div>
  );
}
