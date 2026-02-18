import { useMemo } from 'react';
import { Trophy, DollarSign, Clock, Medal } from 'lucide-react';
import { CardSkeleton } from '@/components/ui';
import { formatCurrency } from '@/lib/formatters';
import type { CollaboratorSummary } from '../types';

interface CollaboratorsRankingProps {
  data?: CollaboratorSummary[];
  isLoading: boolean;
}

const MAX_RANKING = 5;

const MEDAL_COLORS = ['text-yellow-400', 'text-gray-400', 'text-amber-500', 'text-gray-600', 'text-gray-600'];

interface RankingListProps {
  title: string;
  icon: React.ReactNode;
  collaborators: CollaboratorSummary[];
  valueKey: 'total_earnings' | 'on_time_delivery_pct';
  formatValue: (value: number) => string;
}

const RankingList = ({ title, icon, collaborators, valueKey, formatValue }: RankingListProps) => (
  <div>
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h4 className="text-sm font-medium text-gray-400">{title}</h4>
    </div>
    <div className="space-y-2">
      {collaborators.map((collab, index) => (
        <div key={collab.id} className="flex items-center gap-3 p-2 bg-white/5 border border-white/10 rounded-xl">
          <Medal className={`h-4 w-4 ${MEDAL_COLORS[index] ?? 'text-gray-600'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{collab.name}</p>
          </div>
          <span className="text-sm font-semibold text-gray-300">{formatValue(collab[valueKey])}</span>
        </div>
      ))}
    </div>
  </div>
);

export const CollaboratorsRanking = ({ data, isLoading }: CollaboratorsRankingProps) => {
  const rankings = useMemo(() => {
    if (!data || data.length === 0) {
      return { byEarnings: [], byOnTime: [] };
    }

    const byEarnings = [...data].sort((a, b) => b.total_earnings - a.total_earnings).slice(0, MAX_RANKING);

    const byOnTime = [...data]
      .filter((c) => c.completed_jobs > 0)
      .sort((a, b) => b.on_time_delivery_pct - a.on_time_delivery_pct)
      .slice(0, MAX_RANKING);

    return { byEarnings, byOnTime };
  }, [data]);

  if (isLoading) {
    return <CardSkeleton lines={5} />;
  }

  const hasData = rankings.byEarnings.length > 0 || rankings.byOnTime.length > 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-yellow-400" />
        <h3 className="text-lg font-semibold text-white">Ranking Colaboradores</h3>
      </div>

      {!hasData ? (
        <div className="text-center py-6">
          <Trophy className="h-8 w-8 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500">Nenhum colaborador encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RankingList
            title="Top Faturamento"
            icon={<DollarSign className="h-4 w-4 text-emerald-400" />}
            collaborators={rankings.byEarnings}
            valueKey="total_earnings"
            formatValue={(v) => formatCurrency(v, true)}
          />
          <RankingList
            title="Top Pontualidade"
            icon={<Clock className="h-4 w-4 text-blue-400" />}
            collaborators={rankings.byOnTime}
            valueKey="on_time_delivery_pct"
            formatValue={(v) => `${v.toFixed(0)}%`}
          />
        </div>
      )}
    </div>
  );
};
