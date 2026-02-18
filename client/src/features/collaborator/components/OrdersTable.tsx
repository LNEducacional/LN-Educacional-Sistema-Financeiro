import { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import type { CollaboratorOrder } from '../types';
import { Badge } from '@/components/ui/Badge';
import { getOrderStatusBadgeProps, getPaymentStatusBadgeProps } from '@/components/ui/badge-helpers';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { DeliverModal } from './DeliverModal';
import { RevisionsModal } from './RevisionsModal';

interface OrdersTableProps {
  orders: CollaboratorOrder[];
}

const canDeliver = (status: string): boolean => {
  return ['NOVO', 'EM_ANDAMENTO', 'ATRASADO'].includes(status);
};

export const OrdersTable = ({ orders }: OrdersTableProps) => {
  const [selectedOrder, setSelectedOrder] = useState<CollaboratorOrder | null>(null);
  const [revisionsOrder, setRevisionsOrder] = useState<CollaboratorOrder | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Servico
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Aluno
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Prazo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Valor Total
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Minha Comissao
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Empresa
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Pagamento
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Acoes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-sm text-gray-400"
                >
                  Nenhum pedido encontrado
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-white/5 transition-colors">
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-white">
                    {order.service_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-300">
                    {order.student_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-300">
                    {formatDate(order.due_date)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-100">
                    {formatCurrency(order.total_value)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-emerald-300">
                    {formatCurrency(order.my_share)}
                    <span className="ml-1 text-xs text-gray-500">
                      ({order.collab_percent}%)
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-300">
                    {formatCurrency(order.company_value)}
                    <span className="ml-1 text-xs text-gray-500">
                      ({order.company_percent}%)
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <Badge {...getOrderStatusBadgeProps(order.status)} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <Badge {...getPaymentStatusBadgeProps(order.payment_status)} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="flex items-center gap-2">
                      {canDeliver(order.status) && (
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="flex items-center gap-1 rounded-xl bg-violet-500/20 border border-violet-500/30 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-500/30 hover:border-violet-500/40 transition-all duration-200"
                        >
                          <Upload className="h-3 w-3" />
                          Entregar
                        </button>
                      )}
                      {order.revision_count > 0 && (
                        <button
                          onClick={() => setRevisionsOrder(order)}
                          className="flex items-center gap-1 rounded-xl bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/30 hover:border-amber-500/40 transition-all duration-200"
                          title="Ver revisoes"
                        >
                          <FileText className="h-3 w-3" />
                          {order.revision_count}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <DeliverModal
          orderId={selectedOrder.id}
          serviceName={selectedOrder.service_name}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {revisionsOrder && (
        <RevisionsModal
          orderId={revisionsOrder.id}
          serviceName={revisionsOrder.service_name}
          isOpen={!!revisionsOrder}
          onClose={() => setRevisionsOrder(null)}
        />
      )}
    </>
  );
};
