import { DollarSign, TrendingUp, Lock, ArrowUpRight, Package } from 'lucide-react';
import { KPICardSkeleton, CardSkeleton } from '@/components/ui';
import { formatCurrency } from '@/lib/formatters';
import type { FinancialKPIs } from '../types';

interface KPICardsProps {
  data?: FinancialKPIs;
  isLoading: boolean;
}

interface KPICardConfig {
  label: string;
  getValue: (data: FinancialKPIs) => number;
  icon: React.ElementType;
  borderColor: string;
  bgColor: string;
  textColor: string;
  labelColor: string;
}

const KPI_CONFIGS: KPICardConfig[] = [
  {
    label: 'GMV (Volume Total)',
    getValue: (data) => data.gmv,
    icon: DollarSign,
    borderColor: 'border-white/10',
    bgColor: 'bg-black/30',
    textColor: 'text-white',
    labelColor: 'text-gray-400',
  },
  {
    label: 'Receita Liquida',
    getValue: (data) => data.net_revenue,
    icon: TrendingUp,
    borderColor: 'border-emerald-500/20',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-300',
    labelColor: 'text-emerald-400',
  },
  {
    label: 'Escrow (Retido)',
    getValue: (data) => data.escrow,
    icon: Lock,
    borderColor: 'border-amber-500/20',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-300',
    labelColor: 'text-amber-400',
  },
  {
    label: 'Total Repassado',
    getValue: (data) => data.transferred,
    icon: ArrowUpRight,
    borderColor: 'border-violet-500/20',
    bgColor: 'bg-violet-500/10',
    textColor: 'text-violet-300',
    labelColor: 'text-violet-400',
  },
];

const KPICard = ({
  config,
  data,
  isLoading,
}: {
  config: KPICardConfig;
  data?: FinancialKPIs;
  isLoading: boolean;
}) => {
  const Icon = config.icon;

  if (isLoading) {
    return <KPICardSkeleton />;
  }

  return (
    <div className={`rounded-2xl border ${config.borderColor} ${config.bgColor} backdrop-blur-sm p-5`}>
      <div className="flex items-center justify-between">
        <div>
          <div className={`flex items-center gap-2 text-xs ${config.labelColor}`}>
            <Icon className="h-3.5 w-3.5" />
            {config.label}
          </div>
          <p className={`mt-2 text-2xl font-bold ${config.textColor}`}>
            {data ? formatCurrency(config.getValue(data)) : '-'}
          </p>
        </div>
      </div>
    </div>
  );
};

export const KPICards = ({ data, isLoading }: KPICardsProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {KPI_CONFIGS.map((config) => (
      <KPICard key={config.label} config={config} data={data} isLoading={isLoading} />
    ))}
  </div>
);

export const OrderStats = ({
  data,
  isLoading,
}: {
  data?: FinancialKPIs;
  isLoading: boolean;
}) => {
  if (isLoading) {
    return <CardSkeleton lines={4} />;
  }

  const total = data?.total_orders ?? 0;
  const pending = data?.pending_orders ?? 0;
  const completed = total - pending;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5 text-violet-400" />
        <h3 className="text-lg font-semibold text-white">Pedidos</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-white">{total}</p>
            <p className="text-sm text-gray-500">Total de pedidos</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-300">{completionRate}%</p>
            <p className="text-xs text-emerald-400">concluidos</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Progresso</span>
            <span>
              {completed} de {total}
            </span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-amber-300">{pending}</p>
            <p className="text-xs text-amber-400">Pendentes</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-emerald-300">{completed}</p>
            <p className="text-xs text-emerald-400">Concluidos</p>
          </div>
        </div>
      </div>
    </div>
  );
};
