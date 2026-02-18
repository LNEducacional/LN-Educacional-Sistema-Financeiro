import { RotateCcw } from 'lucide-react';
import { CardSkeleton } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { RefundReport } from '../types';

interface RefundsWidgetProps {
  data?: RefundReport;
  isLoading: boolean;
}

const MAX_DISPLAY = 3;

export function RefundsWidget({ data, isLoading }: RefundsWidgetProps) {
  if (isLoading) {
    return <CardSkeleton lines={3} />;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-red-400" />
          <h3 className="font-semibold text-white">Reembolsos</h3>
        </div>
        <span className="rounded-full bg-red-500/20 px-2 py-1 text-xs font-medium text-red-300 border border-red-500/30">
          {data.total_count} total
        </span>
      </div>

      {/* Total */}
      <div className="mt-4">
        <p className="text-2xl font-bold text-red-300">{formatCurrency(data.total_refunded)}</p>
        <p className="text-sm text-gray-500">total reembolsado</p>
      </div>

      {/* Ultimos reembolsos */}
      {data.refunds.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium uppercase text-gray-500">Ultimos reembolsos</p>
          {data.refunds.slice(0, MAX_DISPLAY).map((refund) => (
            <div
              key={refund.id}
              className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2"
            >
              <div className="text-sm">
                <p className="font-medium text-white">{refund.student_name}</p>
                <p className="text-xs text-gray-500">{formatDate(refund.refunded_at)}</p>
              </div>
              <span className="text-sm font-semibold text-red-300">{formatCurrency(refund.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
