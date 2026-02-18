import { Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CardSkeleton } from '@/components/ui';
import { formatCurrency } from '@/lib/formatters';
import type { PendingWithdrawalsSummary } from '../types';

interface PendingWithdrawalsWidgetProps {
  data?: PendingWithdrawalsSummary;
  isLoading: boolean;
}

const STATUS_ROWS = [
  { key: 'pending', label: 'Aguardando Aprovacao', color: 'amber' },
  { key: 'approved', label: 'Aprovados', color: 'blue' },
  { key: 'processing', label: 'Em Processamento', color: 'violet' },
] as const;

const COLOR_MAP = {
  amber: {
    dot: 'bg-amber-400',
    text: 'text-amber-300',
  },
  blue: {
    dot: 'bg-blue-400',
    text: 'text-blue-300',
  },
  violet: {
    dot: 'bg-violet-400',
    text: 'text-violet-300',
  },
} as const;

export function PendingWithdrawalsWidget({ data, isLoading }: PendingWithdrawalsWidgetProps) {
  if (isLoading) {
    return <CardSkeleton lines={4} />;
  }

  if (!data) {
    return null;
  }

  const totalCount = data.pending_count + data.approved_count + data.processing_count;

  const getCountAndAmount = (key: string): { count: number; amount: number } => {
    switch (key) {
      case 'pending':
        return { count: data.pending_count, amount: data.pending_amount };
      case 'approved':
        return { count: data.approved_count, amount: data.approved_amount };
      case 'processing':
        return { count: data.processing_count, amount: data.processing_amount };
      default:
        return { count: 0, amount: 0 };
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-amber-400" />
          <h3 className="font-semibold text-white">Saques Pendentes</h3>
        </div>
        <span className="rounded-full bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-300 border border-amber-500/30">
          {totalCount} total
        </span>
      </div>

      {/* Status rows */}
      <div className="mt-4 space-y-2">
        {STATUS_ROWS.map((row) => {
          const { count, amount } = getCountAndAmount(row.key);
          const colors = COLOR_MAP[row.color];

          return (
            <div
              key={row.key}
              className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                <span className="text-sm text-gray-300">{row.label}</span>
                <span className="text-xs text-gray-500">({count})</span>
              </div>
              <span className={`text-sm font-semibold ${colors.text}`}>
                {formatCurrency(amount)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Link */}
      <div className="mt-4 text-right">
        <Link
          to="/admin/withdrawals"
          className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
        >
          Ver todos &rarr;
        </Link>
      </div>
    </div>
  );
}
