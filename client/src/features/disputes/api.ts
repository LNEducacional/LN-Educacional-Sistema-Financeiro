import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type {
  Dispute,
  DisputeWithDetails,
  CreateDisputeRequest,
  AddCommentRequest,
  ResolveDisputeRequest,
} from './types';

// Hook: Criar disputa
export const useCreateDispute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDisputeRequest) => {
      const response = await api.post<Dispute>('/api/disputes', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
    },
  });
};

// Hook: Buscar disputas de um pedido
export const useOrderDisputes = (orderID: string) => {
  return useQuery<Dispute[]>({
    queryKey: ['disputes', 'order', orderID],
    queryFn: async () => {
      const response = await api.get(`/api/disputes/order/${orderID}`);
      return response.data;
    },
    enabled: !!orderID,
  });
};

// Hook: Buscar detalhes de uma disputa
export const useDisputeDetails = (disputeID: string) => {
  return useQuery<DisputeWithDetails>({
    queryKey: ['dispute-details', disputeID],
    queryFn: async () => {
      const response = await api.get(`/api/disputes/${disputeID}`);
      return response.data;
    },
    enabled: !!disputeID,
  });
};

// Hook: Adicionar comentário
export const useAddComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ disputeID, data }: { disputeID: string; data: AddCommentRequest }) => {
      const response = await api.post(`/api/disputes/${disputeID}/comments`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dispute-details', variables.disputeID] });
    },
  });
};

// Hook: Resolver disputa (admin)
export const useResolveDispute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ disputeID, data }: { disputeID: string; data: ResolveDisputeRequest }) => {
      const response = await api.post(`/api/disputes/${disputeID}/resolve`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dispute-details', variables.disputeID] });
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
    },
  });
};

// Hook: Listar todas as disputas (admin)
export const useAllDisputes = (status?: string) => {
  return useQuery<Dispute[]>({
    queryKey: ['disputes', 'all', status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : '';
      const response = await api.get(`/api/disputes${params}`);
      return response.data;
    },
  });
};

// Hook: Upload de evidência
export const useUploadEvidence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ disputeId, formData }: { disputeId: string; formData: FormData }) => {
      const response = await api.post(`/api/disputes/${disputeId}/evidence`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dispute-details', variables.disputeId] });
    },
  });
};
