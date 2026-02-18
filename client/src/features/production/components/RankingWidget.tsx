import { Trophy, Medal, Award } from 'lucide-react';
import type { CollaboratorRanking } from '../types';

interface RankingWidgetProps {
  rankings: CollaboratorRanking[];
  isLoading?: boolean;
}

export function RankingWidget({ rankings, isLoading }: RankingWidgetProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-400" />
          <h3 className="font-semibold text-white">Top 5 Colaboradores</h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-500" />;
      default:
        return <span className="flex h-5 w-5 items-center justify-center text-sm text-gray-500">{position}</span>;
    }
  };

  const getRankStyle = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-yellow-500/10 border-yellow-500/20';
      case 2:
        return 'bg-gray-500/10 border-gray-500/20';
      case 3:
        return 'bg-amber-500/10 border-amber-500/20';
      default:
        return 'bg-white/5 border-white/10';
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-400" />
        <h3 className="font-semibold text-white">Top 5 Colaboradores</h3>
      </div>

      {rankings.length === 0 ? (
        <p className="text-center text-gray-500">Nenhum dado disponivel</p>
      ) : (
        <div className="space-y-2">
          {rankings.slice(0, 5).map((entry, index) => (
            <div
              key={entry.collaborator_id}
              className={`flex items-center justify-between rounded-xl border p-3 ${getRankStyle(index + 1)}`}
            >
              <div className="flex items-center gap-3">
                {getRankIcon(index + 1)}
                <div>
                  <p className="font-medium text-white">
                    {entry.collaborator_id.slice(0, 8)}...
                  </p>
                  <p className="text-xs text-gray-500">
                    {entry.jobs_completed} jobs | {entry.delays} atrasos
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-violet-300">{entry.score.toFixed(1)}</p>
                <p className="text-xs text-gray-500">pontos</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
