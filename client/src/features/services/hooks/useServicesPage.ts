import { useState, useCallback, useMemo } from 'react';
import { useServices, useServiceStats, useCreateService, useUpdateService, useDeleteService, useToggleServiceActive } from '../api';
import type { Service, ServiceWithUsage, CreateServiceRequest, UpdateServiceRequest, ServiceArea } from '../types';

interface UseServicesPageReturn {
  // Data
  services: ServiceWithUsage[];
  stats: ReturnType<typeof useServiceStats>['data'];
  isLoading: boolean;
  isStatsLoading: boolean;
  error: Error | null;

  // Pagination
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Filters
  search: string;
  setSearch: (search: string) => void;
  areaFilter: string;
  setAreaFilter: (area: string) => void;
  includeInactive: boolean;
  setIncludeInactive: (include: boolean) => void;

  // Modal state
  isModalOpen: boolean;
  editingService: Service | null;
  openCreateModal: () => void;
  openEditModal: (service: Service) => void;
  closeModal: () => void;

  // Delete confirmation
  deleteConfirmService: ServiceWithUsage | null;
  openDeleteConfirm: (service: ServiceWithUsage) => void;
  closeDeleteConfirm: () => void;

  // Mutations
  createService: (data: CreateServiceRequest) => Promise<void>;
  updateService: (id: string, data: UpdateServiceRequest) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isToggling: boolean;

  // Computed
  companyValue: (totalValue: number, companyPercent: number) => number;
  collaboratorValue: (totalValue: number, collaboratorPercent: number) => number;
}

export function useServicesPage(): UseServicesPageReturn {
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filter state
  const [search, setSearchState] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Delete confirmation state
  const [deleteConfirmService, setDeleteConfirmService] = useState<ServiceWithUsage | null>(null);

  // Debounced search
  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setPage(1); // Reset to first page on search
  }, []);

  // Queries
  const {
    data: servicesData,
    isLoading,
    error,
  } = useServices(page, pageSize, search || undefined, areaFilter || undefined, includeInactive);

  const { data: stats, isLoading: isStatsLoading } = useServiceStats();

  // Mutations
  const createMutation = useCreateService();
  const updateMutation = useUpdateService();
  const deleteMutation = useDeleteService();
  const toggleMutation = useToggleServiceActive();

  // Modal handlers
  const openCreateModal = useCallback(() => {
    setEditingService(null);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((service: Service) => {
    setEditingService(service);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingService(null);
  }, []);

  // Delete confirmation handlers
  const openDeleteConfirm = useCallback((service: ServiceWithUsage) => {
    setDeleteConfirmService(service);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirmService(null);
  }, []);

  // Mutation handlers
  const createService = useCallback(
    async (data: CreateServiceRequest) => {
      await createMutation.mutateAsync(data);
      closeModal();
    },
    [createMutation, closeModal]
  );

  const updateService = useCallback(
    async (id: string, data: UpdateServiceRequest) => {
      await updateMutation.mutateAsync({ id, data });
      closeModal();
    },
    [updateMutation, closeModal]
  );

  const deleteService = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
      closeDeleteConfirm();
    },
    [deleteMutation, closeDeleteConfirm]
  );

  const toggleActive = useCallback(
    async (id: string) => {
      await toggleMutation.mutateAsync(id);
    },
    [toggleMutation]
  );

  // Computed values
  const companyValue = useCallback((totalValue: number, companyPercent: number) => {
    return totalValue * (companyPercent / 100);
  }, []);

  const collaboratorValue = useCallback((totalValue: number, collaboratorPercent: number) => {
    return totalValue * (collaboratorPercent / 100);
  }, []);

  // Memoized services list
  const services = useMemo(() => servicesData?.services ?? [], [servicesData]);

  return {
    // Data
    services,
    stats,
    isLoading,
    isStatsLoading,
    error: error as Error | null,

    // Pagination
    page,
    pageSize,
    totalPages: servicesData?.total_pages ?? 1,
    total: servicesData?.total ?? 0,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },

    // Filters
    search,
    setSearch,
    areaFilter,
    setAreaFilter: (area: string) => {
      setAreaFilter(area);
      setPage(1);
    },
    includeInactive,
    setIncludeInactive: (include: boolean) => {
      setIncludeInactive(include);
      setPage(1);
    },

    // Modal state
    isModalOpen,
    editingService,
    openCreateModal,
    openEditModal,
    closeModal,

    // Delete confirmation
    deleteConfirmService,
    openDeleteConfirm,
    closeDeleteConfirm,

    // Mutations
    createService,
    updateService,
    deleteService,
    toggleActive,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isToggling: toggleMutation.isPending,

    // Computed
    companyValue,
    collaboratorValue,
  };
}
