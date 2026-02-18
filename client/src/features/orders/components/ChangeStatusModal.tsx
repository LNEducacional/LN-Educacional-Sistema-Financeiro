import { useState, useMemo } from 'react';
import { Modal, Select } from '@/components/ui';
import { useChangeOrderStatus } from '../api';
import { getValidNextStatuses, type OrderStatus } from '../types';
import { ORDER_STATUS_ACTION_LABELS } from '@/lib/constants';

interface ChangeStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  currentStatus: OrderStatus;
}

export function ChangeStatusModal({
  isOpen,
  onClose,
  orderId,
  currentStatus,
}: ChangeStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');
  const [comments, setComments] = useState('');
  const changeStatusMutation = useChangeOrderStatus();

  const validNextStatuses = getValidNextStatuses(currentStatus);

  const statusOptions = useMemo(() =>
    validNextStatuses.map((status) => ({
      value: status,
      label: ORDER_STATUS_ACTION_LABELS[status] || status,
    })),
    [validNextStatuses]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus) return;

    try {
      await changeStatusMutation.mutateAsync({
        orderId,
        data: {
          new_status: selectedStatus as OrderStatus,
          comments: comments || undefined,
        },
      });
      onClose();
      setSelectedStatus('');
      setComments('');
    } catch (error) {
      console.error('Failed to change status:', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Alterar Status do Pedido"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="change-status-form"
            disabled={!selectedStatus || changeStatusMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {changeStatusMutation.isPending ? 'Alterando...' : 'Alterar Status'}
          </button>
        </div>
      }
    >
      <form id="change-status-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-status" className="block text-sm font-medium text-gray-700 mb-1">
            Novo Status
          </label>
          <Select
            value={selectedStatus}
            onValueChange={(value) => setSelectedStatus(value as OrderStatus)}
            options={statusOptions}
            placeholder="Selecione um status"
          />
        </div>

        <div>
          <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-1">
            Comentários (opcional)
          </label>
          <textarea
            id="comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Adicione um comentário sobre a mudança de status..."
          />
        </div>

        {changeStatusMutation.isError && (
          <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            Erro ao alterar status. Tente novamente.
          </div>
        )}
      </form>
    </Modal>
  );
}
