import { useMemo } from 'react';
import { TrendingUp, DollarSign, Briefcase, ArrowDownCircle } from 'lucide-react';
import type { CollaboratorEarningPeriod } from '../types';

interface CollaboratorEarningsChartProps {
  data?: CollaboratorEarningPeriod[];
  isLoading: boolean;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

const formatPeriod = (period: string): string => {
  const [year, month] = period.split('-');
  const monthNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ];
  return `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`;
};

const Skeleton = () => (
  <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-6">
    <div className="animate-pulse">
      <div className="mb-6 h-6 w-48 rounded-lg bg-white/10"></div>
      <div className="flex h-48 items-end justify-between gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex flex-1 flex-col gap-2">
            <div
              className="rounded-lg bg-white/10"
              style={{ height: `${Math.random() * 60 + 40}%` }}
            />
            <div className="mx-auto h-4 w-12 rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export function CollaboratorEarningsChart({
  data,
  isLoading,
}: CollaboratorEarningsChartProps) {
  const { maxValue, totals } = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        maxValue: 0,
        totals: { earned: 0, refunded: 0, jobs: 0 },
      };
    }
    const max = Math.max(...data.map((d) => d.earned));
    const totals = data.reduce(
      (acc, d) => ({
        earned: acc.earned + d.earned,
        refunded: acc.refunded + d.refunded,
        jobs: acc.jobs + d.jobs,
      }),
      { earned: 0, refunded: 0, jobs: 0 }
    );
    return { maxValue: max || 1, totals };
  }, [data]);

  if (isLoading) {
    return <Skeleton />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          Evolucao de Ganhos
        </h3>
        <div className="flex h-48 items-center justify-center text-gray-500">
          Nenhum dado disponivel
        </div>
      </div>
    );
  }

  const avgPerMonth = totals.jobs > 0 ? totals.earned / data.length : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          Evolucao de Ganhos
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-emerald-500" />
            <span className="text-sm text-gray-400">Ganhos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-red-500" />
            <span className="text-sm text-gray-400">Reembolsos</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-4 flex h-48 items-end justify-between gap-2 border-b border-white/10 pb-2">
        {data.map((item) => {
          const earnedHeight = (item.earned / maxValue) * 100;
          const refundedHeight = maxValue > 0 ? (item.refunded / maxValue) * 100 : 0;

          return (
            <div
              key={item.period}
              className="flex flex-1 flex-col items-center"
            >
              <div className="flex h-40 w-full items-end justify-center gap-1">
                <div
                  className="w-5 rounded-t bg-emerald-500/80 transition-all duration-300 hover:bg-emerald-500"
                  style={{ height: `${Math.max(earnedHeight, 2)}%` }}
                  title={`Ganhos: ${formatCurrency(item.earned)}`}
                />
                {item.refunded > 0 && (
                  <div
                    className="w-5 rounded-t bg-red-500/80 transition-all duration-300 hover:bg-red-500"
                    style={{ height: `${Math.max(refundedHeight, 2)}%` }}
                    title={`Reembolsos: ${formatCurrency(item.refunded)}`}
                  />
                )}
              </div>
              <div className="mt-2 text-center">
                <span className="text-xs text-gray-500">
                  {formatPeriod(item.period)}
                </span>
                <span className="block text-xs font-medium text-gray-400">
                  {item.jobs} jobs
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
          <div className="mb-1 flex items-center justify-center gap-1 text-sm text-emerald-400">
            <DollarSign className="h-4 w-4" />
            Total Ganhos
          </div>
          <p className="text-lg font-bold text-emerald-300">
            {formatCurrency(totals.earned)}
          </p>
        </div>
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-center">
          <div className="mb-1 flex items-center justify-center gap-1 text-sm text-red-400">
            <ArrowDownCircle className="h-4 w-4" />
            Reembolsado
          </div>
          <p className="text-lg font-bold text-red-300">
            {formatCurrency(totals.refunded)}
          </p>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
          <div className="mb-1 flex items-center justify-center gap-1 text-sm text-gray-400">
            <Briefcase className="h-4 w-4" />
            Total Jobs
          </div>
          <p className="text-lg font-bold text-white">{totals.jobs}</p>
        </div>
        <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
          <div className="mb-1 flex items-center justify-center gap-1 text-sm text-blue-400">
            <TrendingUp className="h-4 w-4" />
            Media/Mes
          </div>
          <p className="text-lg font-bold text-blue-300">
            {formatCurrency(avgPerMonth)}
          </p>
        </div>
      </div>
    </div>
  );
}
