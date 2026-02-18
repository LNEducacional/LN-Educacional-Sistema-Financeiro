import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type {
  StudentOrder,
  OrderDetailsResponse,
  ServiceForSelection,
  CollaboratorForSelection,
  CreateOrderRequest,
  CreateOrderResponse,
  StudentChargeListResponse,
} from './types';

const STUDENT_ORDERS_KEY = ['student-orders'];

export const useStudentOrders = () => {
  return useQuery({
    queryKey: STUDENT_ORDERS_KEY,
    queryFn: async (): Promise<StudentOrder[]> => {
      const response = await api.get('/api/orders/student');
      return response.data;
    },
  });
};

export const useOrderDetails = (orderId: string) => {
  return useQuery({
    queryKey: ['order', orderId, 'details'],
    queryFn: async (): Promise<OrderDetailsResponse> => {
      const response = await api.get(`/api/orders/${orderId}/details`);
      return response.data;
    },
    enabled: !!orderId,
  });
};

export const useApproveOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string): Promise<{ status: string; payment: string }> => {
      const response = await api.post(`/api/orders/${orderId}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_ORDERS_KEY });
      queryClient.invalidateQueries({ queryKey: ['order'] });
    },
  });
};

export const useRejectOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      reason,
    }: {
      orderId: string;
      reason: string;
    }): Promise<{ status: string }> => {
      const response = await api.post(`/api/orders/${orderId}/reject`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_ORDERS_KEY });
      queryClient.invalidateQueries({ queryKey: ['order'] });
    },
  });
};

// Fetch services for order creation
export const useServicesForSelection = () => {
  return useQuery({
    queryKey: ['services-for-selection'],
    queryFn: async (): Promise<ServiceForSelection[]> => {
      const response = await api.get('/api/services');
      return response.data;
    },
  });
};

// Fetch collaborators for order creation
export const useCollaboratorsForSelection = () => {
  return useQuery({
    queryKey: ['collaborators-for-selection'],
    queryFn: async (): Promise<CollaboratorForSelection[]> => {
      const response = await api.get('/api/collaborators');
      return response.data;
    },
  });
};

// Create a new order
export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOrderRequest): Promise<CreateOrderResponse> => {
      const response = await api.post('/api/orders', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_ORDERS_KEY });
      queryClient.invalidateQueries({ queryKey: ['student-charges'] });
    },
  });
};

// Student charges (Payments page)
export const useMyCharges = (page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: ['student-charges', page, pageSize],
    queryFn: async (): Promise<StudentChargeListResponse> => {
      const response = await api.get('/api/payment/my-charges', {
        params: { page, page_size: pageSize },
      });
      return response.data;
    },
  });
};

// Payment info types
export interface PaymentInfo {
  invoice_url: string;
  pix_qr_code?: string;
  pix_payload?: string;
  bank_slip_url?: string;
  due_date: string;
  status: 'PENDING' | 'CONFIRMED' | 'RECEIVED' | 'OVERDUE' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'CANCELLED';
}

// Get payment/charge info for an order
export const useOrderPayment = (orderId: string) => {
  return useQuery({
    queryKey: ['order-payment', orderId],
    queryFn: async (): Promise<PaymentInfo> => {
      const response = await api.get(`/api/payment/charges/${orderId}`);
      return response.data;
    },
    enabled: !!orderId,
    retry: false,
  });
};
