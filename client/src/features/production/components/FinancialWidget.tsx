import { DollarSign, Clock, CheckCircle, Briefcase } from 'lucide-react';
import type { FinancialSummary } from '../types';

interface FinancialWidgetProps {
  data?: FinancialSummary;
  isLoading?: boolean;
  variant?: 'collaborator' | 'admin';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function FinancialWidget({ data, isLoading, variant = 'collaborator' }: FinancialWidgetProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
            <div className="h-4 w-20 rounded bg-white/10" />
            <div className="mt-2 h-6 w-24 rounded bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const cards =
    variant === 'collaborator'
      ? [
          {
            label: 'Aprovados',
            value: formatCurrency(data.total_approved),
            icon: CheckCircle,
            borderColor: 'border-emerald-500/20',
            bgColor: 'bg-emerald-500/10',
            textColor: 'text-emerald-300',
            labelColor: 'text-emerald-400',
          },
          {
            label: 'Concluidos',
            value: formatCurrency(data.total_completed),
            icon: DollarSign,
            borderColor: 'border-violet-500/20',
            bgColor: 'bg-violet-500/10',
            textColor: 'text-violet-300',
            labelColor: 'text-violet-400',
          },
          {
            label: 'Pendentes',
            value: formatCurrency(data.total_pending),
            icon: Clock,
            borderColor: 'border-amber-500/20',
            bgColor: 'bg-amber-500/10',
            textColor: 'text-amber-300',
            labelColor: 'text-amber-400',
          },
          {
            label: 'Total Jobs',
            value: data.jobs_count.toString(),
            icon: Briefcase,
            borderColor: 'border-white/10',
            bgColor: 'bg-black/30',
            textColor: 'text-white',
            labelColor: 'text-gray-400',
          },
        ]
      : [
          {
            label: 'Total Jobs',
            value: data.jobs_count.toString(),
            icon: Briefcase,
            borderColor: 'border-white/10',
            bgColor: 'bg-black/30',
            textColor: 'text-white',
            labelColor: 'text-gray-400',
          },
          {
            label: 'Pendentes',
            value: formatCurrency(data.total_pending),
            icon: Clock,
            borderColor: 'border-amber-500/20',
            bgColor: 'bg-amber-500/10',
            textColor: 'text-amber-300',
            labelColor: 'text-amber-400',
          },
          {
            label: 'Aprovados',
            value: formatCurrency(data.total_approved),
            icon: CheckCircle,
            borderColor: 'border-emerald-500/20',
            bgColor: 'bg-emerald-500/10',
            textColor: 'text-emerald-300',
            labelColor: 'text-emerald-400',
          },
          {
            label: 'A Pagar na Semana',
            value: formatCurrency(data.weekly_payable),
            icon: DollarSign,
            borderColor: 'border-violet-500/20',
            bgColor: 'bg-violet-500/10',
            textColor: 'text-violet-300',
            labelColor: 'text-violet-400',
          },
        ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-2xl border ${card.borderColor} ${card.bgColor} backdrop-blur-sm p-5`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className={`flex items-center gap-2 text-xs ${card.labelColor}`}>
                <card.icon className="h-3.5 w-3.5" />
                {card.label}
              </div>
              <p className={`mt-2 text-2xl font-bold ${card.textColor}`}>{card.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
