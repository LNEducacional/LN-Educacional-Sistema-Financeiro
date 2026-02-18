import { Activity, Users, Clock, Star, CheckCircle2 } from 'lucide-react';
import { StatsWidgetSkeleton } from '@/components/ui';
import type { ProductivityStats } from '../types';

interface ProductivityStatsWidgetProps {
  data?: ProductivityStats;
  isLoading: boolean;
}

const ProgressBar = ({ value, color }: { value: number; color: string }) => {
  const percentage = Math.min(value, 100);
  return (
    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percentage}%` }} />
    </div>
  );
};

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`}
      />
    ))}
  </div>
);

export const ProductivityStatsWidget = ({ data, isLoading }: ProductivityStatsWidgetProps) => {
  if (isLoading) {
    return <StatsWidgetSkeleton items={6} />;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-emerald-400" />
        <h3 className="text-lg font-semibold text-white">Produtividade</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Colaboradores */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-gray-400">Colaboradores</span>
          </div>
          <p className="text-xl font-bold text-white">
            {data?.active_collaborators ?? 0}
            <span className="text-sm font-normal text-gray-500">/{data?.total_collaborators ?? 0}</span>
          </p>
          <p className="text-xs text-gray-500">ativos</p>
        </div>

        {/* Concluidos no mes */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-gray-400">Concluidos (mes)</span>
          </div>
          <p className="text-xl font-bold text-white">{data?.total_completed_month ?? 0}</p>
          <p className="text-xs text-gray-500">trabalhos</p>
        </div>

        {/* Media por colaborador */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-violet-400" />
            <span className="text-xs text-gray-400">Media/colaborador</span>
          </div>
          <p className="text-xl font-bold text-white">{data?.avg_jobs_per_collab?.toFixed(1) ?? '0.0'}</p>
          <p className="text-xs text-gray-500">trabalhos</p>
        </div>

        {/* Avaliacao media */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Star className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-gray-400">Avaliacao media</span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold text-white">{data?.avg_rating?.toFixed(1) ?? '0.0'}</p>
            <StarRating rating={data?.avg_rating ?? 0} />
          </div>
        </div>

        {/* Taxa de pontualidade */}
        <div className="col-span-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-emerald-400">Taxa de pontualidade</span>
            </div>
            <span className="text-sm font-bold text-emerald-300">{data?.avg_on_time_delivery?.toFixed(0) ?? 0}%</span>
          </div>
          <ProgressBar value={data?.avg_on_time_delivery ?? 0} color="bg-emerald-500" />
        </div>
      </div>
    </div>
  );
};
