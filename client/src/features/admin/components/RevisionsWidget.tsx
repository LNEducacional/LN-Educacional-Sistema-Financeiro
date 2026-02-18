import { RotateCcw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { CardSkeleton } from '@/components/ui';
import type { RevisionSummary } from '../types';

interface RevisionsWidgetProps {
  data?: RevisionSummary;
  isLoading: boolean;
}

const MAX_REASONS = 3;

export const RevisionsWidget = ({ data, isLoading }: RevisionsWidgetProps) => {
  if (isLoading) {
    return <CardSkeleton lines={4} />;
  }

  const thisMonth = data?.this_month ?? 0;
  const lastMonth = data?.last_month ?? 0;
  const trend = thisMonth - lastMonth;
  const trendPercent = lastMonth > 0 ? Math.round((trend / lastMonth) * 100) : 0;

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-red-400' : trend < 0 ? 'text-emerald-400' : 'text-gray-500';

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <RotateCcw className="h-5 w-5 text-amber-400" />
        <h3 className="text-lg font-semibold text-white">Revisoes</h3>
      </div>

      <div className="space-y-4">
        {/* Total */}
        <div>
          <p className="text-2xl sm:text-3xl font-bold text-white">{data?.total_revisions ?? 0}</p>
          <p className="text-sm text-gray-500">Total de revisoes</p>
        </div>

        {/* Metricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-lg font-semibold text-white">{data?.avg_per_order?.toFixed(1) ?? '0.0'}</p>
            <p className="text-xs text-gray-500">Media por pedido</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1">
              <p className="text-lg font-semibold text-white">{thisMonth}</p>
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
            </div>
            <p className="text-xs text-gray-500">
              Este mes{' '}
              {trendPercent !== 0 && (
                <span className={trendColor}>
                  ({trend > 0 ? '+' : ''}
                  {trendPercent}%)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Principais motivos */}
        {data?.top_reasons && data.top_reasons.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-400 mb-2">Principais motivos</p>
            <div className="space-y-2">
              {data.top_reasons.slice(0, MAX_REASONS).map((reason, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 truncate max-w-[180px]">{reason.reason}</span>
                  <span className="text-gray-500 font-medium">{reason.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
