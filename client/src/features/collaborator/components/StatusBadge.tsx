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
    className: 'bg-blue-100 text-blue-700',
  },
  EM_ANDAMENTO: {
    label: 'Em Andamento',
    className: 'bg-yellow-100 text-yellow-700',
  },
  AGUARDANDO_REVISAO: {
    label: 'Aguardando Revisão',
    className: 'bg-purple-100 text-purple-700',
  },
  ENVIADO_VISUALIZACAO: {
    label: 'Enviado p/ Visualização',
    className: 'bg-indigo-100 text-indigo-700',
  },
  AGUARDANDO_APROVACAO: {
    label: 'Aguardando Aprovação',
    className: 'bg-orange-100 text-orange-700',
  },
  APROVADO: {
    label: 'Aprovado',
    className: 'bg-green-100 text-green-700',
  },
  REVISAO_SOLICITADA: {
    label: 'Revisão Solicitada',
    className: 'bg-pink-100 text-pink-700',
  },
  ATRASADO: {
    label: 'Atrasado',
    className: 'bg-red-100 text-red-700',
  },
  ENTREGUE: {
    label: 'Entregue',
    className: 'bg-purple-100 text-purple-700',
  },
  CONCLUIDO: {
    label: 'Concluído',
    className: 'bg-green-100 text-green-700',
  },
  CANCELADO: {
    label: 'Cancelado',
    className: 'bg-gray-100 text-gray-700',
  },
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
};
