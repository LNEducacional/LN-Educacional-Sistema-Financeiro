import type { OrderStatus } from '../types';

interface StatusBadgeProps {
  status: OrderStatus;
}

const statusConfig: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  NOVO: {
    label: 'Novo',
    className: 'bg-blue-500/20 border border-blue-500/30 text-blue-300',
  },
  EM_ANDAMENTO: {
    label: 'Em Andamento',
    className: 'bg-amber-500/20 border border-amber-500/30 text-amber-300',
  },
  AGUARDANDO_REVISAO: {
    label: 'Aguardando Revisão',
    className: 'bg-purple-500/20 border border-purple-500/30 text-purple-300',
  },
  ENVIADO_VISUALIZACAO: {
    label: 'Enviado p/ Visualização',
    className: 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300',
  },
  AGUARDANDO_APROVACAO: {
    label: 'Aguardando Aprovação',
    className: 'bg-orange-500/20 border border-orange-500/30 text-orange-300',
  },
  APROVADO: {
    label: 'Aprovado',
    className: 'bg-green-500/20 border border-green-500/30 text-green-300',
  },
  REVISAO_SOLICITADA: {
    label: 'Revisão Solicitada',
    className: 'bg-pink-500/20 border border-pink-500/30 text-pink-300',
  },
  ATRASADO: {
    label: 'Atrasado',
    className: 'bg-red-500/20 border border-red-500/30 text-red-300',
  },
  ENTREGUE: {
    label: 'Entregue',
    className: 'bg-violet-500/20 border border-violet-500/30 text-violet-300',
  },
  CONCLUIDO: {
    label: 'Concluido',
    className: 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300',
  },
  CANCELADO: {
    label: 'Cancelado',
    className: 'bg-gray-500/20 border border-gray-500/30 text-gray-400',
  },
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status] ?? { label: status, className: 'bg-gray-500/20 border border-gray-500/30 text-gray-400' };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
};
