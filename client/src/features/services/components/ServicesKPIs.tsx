import { Package, DollarSign, Users, TrendingUp } from 'lucide-react';
import type { ServiceStats } from '../types';

interface ServicesKPIsProps {
  stats: ServiceStats | undefined;
  isLoading: boolean;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const areaLabels: Record<string, string> = {
  DIREITO: 'Direito',
  PEDAGOGIA: 'Pedagogia',
  CONTABILIDADE: 'Contabilidade',
  ENFERMAGEM: 'Enfermagem',
  OUTROS: 'Outros',
};

export function ServicesKPIs({ stats, isLoading }: ServicesKPIsProps) {
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

  const kpis = [
    {
      label: 'Servicos Ativos',
      value: stats.total_active,
      icon: Package,
      bgColor: 'bg-violet-500/10',
      borderColor: 'border-violet-500/20',
      textColor: 'text-violet-300',
      iconColor: 'text-violet-400',
      suffix: stats.total_inactive > 0 ? `(${stats.total_inactive} inativos)` : undefined,
    },
    {
      label: 'Valor Medio',
      value: formatCurrency(stats.avg_value),
      icon: DollarSign,
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      textColor: 'text-emerald-300',
      iconColor: 'text-emerald-400',
    },
    {
      label: 'Split Medio Colaborador',
      value: `${stats.avg_collab_pct.toFixed(0)}%`,
      icon: Users,
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      textColor: 'text-purple-300',
      iconColor: 'text-purple-400',
      suffix: `Empresa: ${stats.avg_company_pct.toFixed(0)}%`,
    },
    {
      label: 'Total de Pedidos',
      value: stats.total_orders,
      icon: TrendingUp,
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      textColor: 'text-amber-300',
      iconColor: 'text-amber-400',
    },
  ];

  return (
    <div className="space-y-4">
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
              </div>
              <div className="mt-2">
                <p className={`text-2xl font-bold ${kpi.textColor}`}>{kpi.value}</p>
                <p className="text-sm text-gray-400">{kpi.label}</p>
                {kpi.suffix && (
                  <p className="mt-1 text-xs text-gray-500">{kpi.suffix}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {stats.by_area.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-300">
            Distribuicao por Area
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.by_area.map((item) => (
              <span
                key={item.area}
                className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-sm"
              >
                <span className="font-medium text-gray-200">{areaLabels[item.area] || item.area}</span>
                <span className="text-gray-400">({item.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {stats.top_used.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-300">
            Servicos Mais Utilizados
          </h3>
          <div className="space-y-2">
            {stats.top_used.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 border border-violet-500/30 text-xs font-medium text-violet-300">
                    {index + 1}
                  </span>
                  <span className="text-gray-200">{item.name}</span>
                </div>
                <div className="flex items-center gap-4 text-gray-400">
                  <span>{item.orders_count} pedidos</span>
                  <span className="font-medium text-emerald-300">
                    {formatCurrency(item.total_value)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
