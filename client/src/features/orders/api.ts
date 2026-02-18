import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type {
  OrderStatusHistory,
  ChangeStatusRequest,
  InternalReviewRequest
} from './types';

// Hook: Mudar status do pedido
export const useChangeOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: ChangeStatusRequest }) => {
      const response = await api.patch(`/api/orders/${orderId}/status`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-details'] });
      queryClient.invalidateQueries({ queryKey: ['order-status-history'] });
    },
  });
};

// Hook: Solicitar revisão interna
export const useRequestInternalReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: InternalReviewRequest }) => {
      const response = await api.post(`/api/orders/${orderId}/request-internal-review`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-details'] });
    },
  });
};

// Hook: Obter histórico de status
export const useOrderStatusHistory = (orderId: string) => {
  return useQuery<OrderStatusHistory[]>({
    queryKey: ['order-status-history', orderId],
    queryFn: async () => {
      const response = await api.get(`/api/orders/${orderId}/status-history`);
      return response.data;
    },
    enabled: !!orderId,
  });
};
