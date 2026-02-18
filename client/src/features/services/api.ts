import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type {
  Service,
  ServiceStats,
  ServicesListResponse,
  CreateServiceRequest,
  UpdateServiceRequest,
} from './types';

const SERVICES_KEY = ['services'];
const SERVICES_STATS_KEY = ['services-stats'];

/** Configuracao de staleTime por tipo de dado (em ms) */
const STALE_TIME = {
  LIST: 5 * 60 * 1000, // 5 min
  STATS: 10 * 60 * 1000, // 10 min
  DETAIL: 5 * 60 * 1000, // 5 min
} as const;

/** Hook para listar servicos com paginacao e filtros */
export const useServices = (
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  area?: string,
  includeInactive: boolean = true
) => {
  return useQuery({
    queryKey: [...SERVICES_KEY, 'list', page, pageSize, search, area, includeInactive],
    queryFn: async (): Promise<ServicesListResponse> => {
      const response = await api.get('/admin/services', {
        params: {
          page,
          page_size: pageSize,
          ...(search && { search }),
          ...(area && { area }),
          include_inactive: includeInactive,
        },
      });
      return response.data;
    },
    staleTime: STALE_TIME.LIST,
  });
};

/** Hook para listar todos servicos ativos (sem paginacao) */
export const useActiveServices = () => {
  return useQuery({
    queryKey: [...SERVICES_KEY, 'active'],
    queryFn: async (): Promise<Service[]> => {
      const response = await api.get('/admin/services');
      return response.data;
    },
    staleTime: STALE_TIME.LIST,
  });
};

/** Hook para buscar servico por ID */
export const useService = (id: string) => {
  return useQuery({
    queryKey: [...SERVICES_KEY, id],
    queryFn: async (): Promise<Service> => {
      const response = await api.get(`/admin/services/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: STALE_TIME.DETAIL,
  });
};

/** Hook para buscar estatisticas de servicos */
export const useServiceStats = () => {
  return useQuery({
    queryKey: SERVICES_STATS_KEY,
    queryFn: async (): Promise<ServiceStats> => {
      const response = await api.get('/admin/services/stats');
      return response.data;
    },
    staleTime: STALE_TIME.STATS,
  });
};

/** Hook para criar servico */
export const useCreateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateServiceRequest): Promise<Service> => {
      const response = await api.post('/admin/services/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICES_KEY });
      queryClient.invalidateQueries({ queryKey: SERVICES_STATS_KEY });
    },
  });
};

/** Hook para atualizar servico */
export const useUpdateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateServiceRequest }): Promise<Service> => {
      const response = await api.put(`/admin/services/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SERVICES_KEY });
      queryClient.invalidateQueries({ queryKey: [...SERVICES_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: SERVICES_STATS_KEY });
    },
  });
};

/** Hook para deletar servico (soft delete) */
export const useDeleteService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/admin/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICES_KEY });
      queryClient.invalidateQueries({ queryKey: SERVICES_STATS_KEY });
    },
  });
};

/** Hook para toggle ativo/inativo */
export const useToggleServiceActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<Service> => {
      const response = await api.patch(`/admin/services/${id}/toggle`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: SERVICES_KEY });
      queryClient.invalidateQueries({ queryKey: [...SERVICES_KEY, id] });
      queryClient.invalidateQueries({ queryKey: SERVICES_STATS_KEY });
    },
  });
};
