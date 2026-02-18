import type { ProductionJobStatus } from '../types';

interface StatusBadgeProps {
  status: ProductionJobStatus;
}

const statusConfig: Record<ProductionJobStatus, { label: string; className: string }> = {
  NOVO: { label: 'Novo', className: 'bg-blue-100 text-blue-700' },
  EM_ANDAMENTO: { label: 'Em Andamento', className: 'bg-yellow-100 text-yellow-700' },
  AGUARDANDO_REVISAO: { label: 'Aguardando Revisao', className: 'bg-purple-100 text-purple-700' },
  ENVIADO_VISUALIZACAO: { label: 'Enviado p/ Visualizacao', className: 'bg-indigo-100 text-indigo-700' },
  AGUARDANDO_APROVACAO: { label: 'Aguardando Aprovacao', className: 'bg-orange-100 text-orange-700' },
  APROVADO: { label: 'Aprovado', className: 'bg-green-100 text-green-700' },
  NAO_APROVADO: { label: 'Nao Aprovado', className: 'bg-red-100 text-red-700' },
  CONCLUIDO: { label: 'Concluido', className: 'bg-emerald-100 text-emerald-700' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
