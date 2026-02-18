import { Pencil, Trash2, Package } from 'lucide-react';
import { useDeleteService, useToggleServiceActive } from '../api';
import type { Service, ServiceWithUsage } from '../types';

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const areaLabels: Record<string, string> = {
  DIREITO: 'Direito',
  PEDAGOGIA: 'Pedagogia',
  CONTABILIDADE: 'Contabilidade',
  ENFERMAGEM: 'Enfermagem',
  OUTROS: 'Outros',
};

interface ServiceListProps {
  services?: ServiceWithUsage[];
  onEdit?: (service: Service) => void;
  showUsage?: boolean;
  showToggle?: boolean;
}

export function ServiceList({ services, onEdit, showUsage, showToggle }: ServiceListProps) {
  const deleteMutation = useDeleteService();
  const toggleMutation = useToggleServiceActive();

  if (!services || services.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-8 text-center">
        <Package className="h-12 w-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">Nenhum servico cadastrado</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
              Nome
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
              Area
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
              Valor Total
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
              Split
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
              Empresa
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
              Colaborador
            </th>
            {showUsage && (
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Pedidos
              </th>
            )}
            {showToggle && (
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Status
              </th>
            )}
            <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
              Acoes
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {services.map((service) => {
            const companyValue =
              (service.total_value * service.company_percent) / 100;
            const collaboratorValue =
              (service.total_value * service.collaborator_percent) / 100;

            return (
              <tr
                key={service.id}
                className={`transition-colors hover:bg-white/5 ${!service.active ? 'opacity-50' : ''}`}
              >
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="font-medium text-white">{service.name}</div>
                  {service.work_type && (
                    <div className="text-sm text-gray-500">
                      {service.work_type}
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="inline-flex rounded-full bg-violet-500/20 border border-violet-500/30 px-2.5 py-0.5 text-xs font-medium text-violet-300">
                    {areaLabels[service.area] || service.area}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-white">
                  {formatCurrency(service.total_value)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-400">
                  {service.company_percent}% / {service.collaborator_percent}%
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-blue-400">
                  {formatCurrency(companyValue)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-emerald-400">
                  {formatCurrency(collaboratorValue)}
                </td>
                {showUsage && (
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span className="inline-flex items-center rounded-full bg-white/10 border border-white/10 px-2.5 py-0.5 text-xs font-medium text-gray-300">
                      {service.orders_count}
                    </span>
                  </td>
                )}
                {showToggle && (
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <button
                      onClick={() => toggleMutation.mutate(service.id)}
                      disabled={toggleMutation.isPending}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        service.active
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30'
                      } disabled:opacity-50`}
                    >
                      {service.active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                )}
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit?.(service)}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Pencil className="h-3 w-3" />
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir?')) {
                          deleteMutation.mutate(service.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
