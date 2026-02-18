import { CreditCard } from 'lucide-react';
import { CardSkeleton } from '@/components/ui';
import { formatCurrency } from '@/lib/formatters';
import type { OpenChargesSummary } from '../types';

interface OpenChargesWidgetProps {
  data?: OpenChargesSummary;
  isLoading: boolean;
}

const STATUS_ROWS = [
  { key: 'pending', label: 'Pendentes', color: 'amber' },
  { key: 'overdue', label: 'Vencidas', color: 'red' },
  { key: 'confirmed', label: 'Confirmadas', color: 'blue' },
] as const;

const COLOR_MAP = {
  amber: {
    dot: 'bg-amber-400',
    text: 'text-amber-300',
  },
  red: {
    dot: 'bg-red-400',
    text: 'text-red-300',
  },
  blue: {
    dot: 'bg-blue-400',
    text: 'text-blue-300',
  },
} as const;

export function OpenChargesWidget({ data, isLoading }: OpenChargesWidgetProps) {
  if (isLoading) {
    return <CardSkeleton lines={4} />;
  }

  if (!data) {
    return null;
  }

  const getCountAndAmount = (key: string): { count: number; amount: number } => {
    switch (key) {
      case 'pending':
        return { count: data.pending_count, amount: data.pending_amount };
      case 'overdue':
        return { count: data.overdue_count, amount: data.overdue_amount };
      case 'confirmed':
        return { count: data.confirmed_count, amount: data.confirmed_amount };
      default:
        return { count: 0, amount: 0 };
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-400" />
          <h3 className="font-semibold text-white">Cobrancas em Aberto</h3>
        </div>
        <span className="rounded-full bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-300 border border-blue-500/30">
          {data.total_open_count} total
        </span>
      </div>

      {/* Total amount */}
      <div className="mt-4">
        <p className="text-2xl font-bold text-blue-300">{formatCurrency(data.total_open_amount)}</p>
        <p className="text-sm text-gray-500">valor total em aberto</p>
      </div>

      {/* Status rows */}
      <div className="mt-4 space-y-2">
        {STATUS_ROWS.map((row) => {
          const { count, amount } = getCountAndAmount(row.key);
          const colors = COLOR_MAP[row.color];
          const isOverdue = row.key === 'overdue';

          return (
            <div
              key={row.key}
              className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                isOverdue && count > 0
                  ? 'bg-red-500/10 border border-red-500/20'
                  : 'bg-white/5 border border-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                <span className={`text-sm ${isOverdue && count > 0 ? 'font-medium text-red-300' : 'text-gray-300'}`}>
                  {row.label}
                </span>
                <span className="text-xs text-gray-500">({count})</span>
              </div>
              <span className={`text-sm font-semibold ${colors.text}`}>
                {formatCurrency(amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
