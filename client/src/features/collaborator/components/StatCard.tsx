import { CheckCircle, Lock, DollarSign } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  variant: 'available' | 'locked';
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const StatCard = ({ label, value, variant }: StatCardProps) => {
  const isAvailable = variant === 'available';

  return (
    <div
      className={`rounded-2xl border p-5 backdrop-blur-sm transition-all duration-300 hover:shadow-lg ${
        isAvailable
          ? 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:shadow-emerald-500/10'
          : 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15 hover:border-amber-500/30 hover:shadow-amber-500/10'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div
            className={`flex items-center gap-2 text-xs ${
              isAvailable ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            {label}
          </div>
          <p
            className={`mt-2 text-3xl font-bold ${
              isAvailable ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {formatCurrency(value)}
          </p>
        </div>
        <div
          className={`rounded-xl p-2.5 ${
            isAvailable
              ? 'bg-emerald-500/20 border border-emerald-500/30'
              : 'bg-amber-500/20 border border-amber-500/30'
          }`}
        >
          {isAvailable ? (
            <CheckCircle className={`h-5 w-5 text-emerald-300`} />
          ) : (
            <Lock className={`h-5 w-5 text-amber-300`} />
          )}
        </div>
      </div>
    </div>
  );
};
