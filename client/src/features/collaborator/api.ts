import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { DashboardResponse, Delivery, OrderRevision } from './types';

const DASHBOARD_KEY = ['collaborator-dashboard'];

export const useCollaboratorDashboard = () => {
  return useQuery({
    queryKey: DASHBOARD_KEY,
    queryFn: async (): Promise<DashboardResponse> => {
      const response = await api.get('/api/collaborator/dashboard');
      return response.data;
    },
  });
};

export const useDeliverOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      file,
    }: {
      orderId: string;
      file: File;
    }): Promise<Delivery> => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(
        `/api/collaborator/orders/${orderId}/deliver`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
    },
  });
};

export const useOrderRevisions = (orderId: string | null) => {
  return useQuery({
    queryKey: ['collaborator', 'revisions', orderId],
    queryFn: async (): Promise<OrderRevision[]> => {
      const response = await api.get(`/api/collaborator/orders/${orderId}/revisions`);
      return response.data;
    },
    enabled: !!orderId,
  });
};

// Withdrawal types
export interface Withdrawal {
  id: string;
  value: number;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'CANCELLED' | 'FAILED';
  pix_key: string;
  pix_key_type: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
  error_message?: string;
  requested_at: string;
  processed_at?: string;
  completed_at?: string;
}

export interface WithdrawalRequest {
  amount: number;
  pix_key: string;
  pix_key_type: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
}

export const useWithdrawals = () => {
  return useQuery({
    queryKey: ['withdrawals'],
    queryFn: async (): Promise<Withdrawal[]> => {
      const response = await api.get('/api/payment/withdrawals');
      return response.data;
    },
  });
};

export const useRequestWithdrawal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: WithdrawalRequest): Promise<Withdrawal> => {
      const response = await api.post('/api/payment/withdrawals', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
      queryClient.invalidateQueries({ queryKey: ['withdrawal-limits'] });
    },
  });
};

// Withdrawal limits response
export interface WithdrawalLimits {
  min_amount: number;
  max_amount: number;
  daily_limit: number;
  daily_used: number;
}

export const useWithdrawalLimits = () => {
  return useQuery({
    queryKey: ['withdrawal-limits'],
    queryFn: async (): Promise<WithdrawalLimits> => {
      const response = await api.get('/api/payment/withdrawals/limits');
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
};
