import type { PaymentStatus } from '../types';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

const statusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  LOCKED: {
    label: 'Bloqueado',
    className: 'bg-yellow-100 text-yellow-800',
  },
  RELEASED: {
    label: 'Liberado',
    className: 'bg-green-100 text-green-800',
  },
  REFUNDED: {
    label: 'Reembolsado',
    className: 'bg-red-100 text-red-800',
  },
};

export const PaymentStatusBadge = ({ status }: PaymentStatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.LOCKED;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
};
