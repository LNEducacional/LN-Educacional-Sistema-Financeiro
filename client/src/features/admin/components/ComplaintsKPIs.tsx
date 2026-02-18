import { AlertTriangle, Clock, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import type { ComplaintStats } from '../types';

interface ComplaintsKPIsProps {
  stats: ComplaintStats | undefined;
  isLoading: boolean;
}

export function ComplaintsKPIs({ stats, isLoading }: ComplaintsKPIsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl bg-white/5 border border-white/10"
          />
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const trend = stats.resolved_this_month - stats.resolved_last_month;
  const trendPercent = stats.resolved_last_month > 0
    ? Math.round((trend / stats.resolved_last_month) * 100)
    : 0;

  const kpis = [
    {
      label: 'Aguardando Revisao',
      value: stats.total_aguardando_revisao,
      icon: Clock,
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      textColor: 'text-amber-300',
      iconColor: 'text-amber-400',
    },
    {
      label: 'Nao Aprovados',
      value: stats.total_nao_aprovado,
      icon: AlertTriangle,
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      textColor: 'text-red-300',
      iconColor: 'text-red-400',
    },
    {
      label: 'Resolvidos este Mes',
      value: stats.resolved_this_month,
      icon: CheckCircle,
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      textColor: 'text-emerald-300',
      iconColor: 'text-emerald-400',
      trend: trend !== 0 ? {
        value: trendPercent,
        isPositive: trend > 0,
      } : undefined,
    },
    {
      label: 'Media Dias Pendente',
      value: stats.avg_days_pending.toFixed(1),
      icon: Clock,
      bgColor: 'bg-violet-500/10',
      borderColor: 'border-violet-500/20',
      textColor: 'text-violet-300',
      iconColor: 'text-violet-400',
      suffix: 'dias',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.label}
            className={`rounded-2xl border ${kpi.borderColor} ${kpi.bgColor} backdrop-blur-sm p-4`}
          >
            <div className="flex items-center justify-between">
              <Icon className={`h-5 w-5 ${kpi.iconColor}`} />
              {kpi.trend && (
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${
                    kpi.trend.isPositive ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {kpi.trend.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(kpi.trend.value)}%
                </div>
              )}
            </div>
            <div className="mt-2">
              <p className={`text-2xl font-bold ${kpi.textColor}`}>
                {kpi.value}
                {kpi.suffix && (
                  <span className="ml-1 text-sm font-normal opacity-75">
                    {kpi.suffix}
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-400">{kpi.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
