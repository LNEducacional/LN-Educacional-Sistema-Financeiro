import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type {
  FinancialKPIs,
  MonthlyFinancial,
  DelinquentUser,
  DelinquencyConfig,
  DelinquencyCheckResult,
  CollaboratorSummary,
  CollaboratorDetail,
  ComplaintItem,
  RefundReport,
  WeeklyFinancial,
  RevisionSummary,
  ActiveJobsResponse,
  AlertsResponse,
  ProductivityStats,
  RankingType,
  RankingResponse,
  FullRankingResponse,
  UpdateCollaboratorRequest,
  CreateCollaboratorRequest,
  CollaboratorEarningPeriod,
  CollaboratorsListResponse,
  CollaboratorRevisionsResponse,
  ComplaintsListResponse,
  ComplaintStats,
  JobHistoryEntry,
  UpdateJobStatusRequest,
  CollaboratorRankingPositions,
  CollaboratorDelinquentsResponse,
  AsaasSettingsResponse,
  UpdateSettingRequest,
  TestAsaasResponse,
  PendingFinancialsReport,
  DelinquencyHistoryResponse,
  PendingWithdrawalsSummary,
  OpenChargesSummary,
  WithdrawalLimitsConfig,
} from './types';

const KPIS_KEY = ['admin-kpis'];
const MONTHLY_KEY = ['admin-monthly-financials'];
const DELINQUENTS_KEY = ['admin-delinquents'];

/** Configuracao de staleTime por tipo de dado (em ms) */
const STALE_TIME = {
  KPIS: 5 * 60 * 1000, // 5 min
  FINANCIALS: 10 * 60 * 1000, // 10 min
  ALERTS: 2 * 60 * 1000, // 2 min
  DELINQUENTS: 5 * 60 * 1000, // 5 min
  COLLABORATORS: 5 * 60 * 1000, // 5 min
  COMPLAINTS: 3 * 60 * 1000, // 3 min
  REFUNDS: 10 * 60 * 1000, // 10 min
  PRODUCTIVITY: 5 * 60 * 1000, // 5 min
  RANKINGS: 10 * 60 * 1000, // 10 min
} as const;

export const useFinancialKPIs = () => {
  return useQuery({
    queryKey: KPIS_KEY,
    queryFn: async (): Promise<FinancialKPIs> => {
      const response = await api.get('/admin/reports/kpis');
      return response.data;
    },
    staleTime: STALE_TIME.KPIS,
  });
};

export const useMonthlyFinancials = (months: number = 6) => {
  return useQuery({
    queryKey: [...MONTHLY_KEY, months],
    queryFn: async (): Promise<MonthlyFinancial[]> => {
      const response = await api.get('/admin/reports/financials/monthly', {
        params: { months },
      });
      return response.data;
    },
    staleTime: STALE_TIME.FINANCIALS,
  });
};

export const useDelinquentUsers = () => {
  return useQuery({
    queryKey: DELINQUENTS_KEY,
    queryFn: async (): Promise<DelinquentUser[]> => {
      const response = await api.get('/admin/reports/delinquents');
      return response.data;
    },
    staleTime: STALE_TIME.DELINQUENTS,
  });
};

export const useDelinquencyConfig = () => {
  return useQuery({
    queryKey: ['admin-delinquency-config'],
    queryFn: async (): Promise<DelinquencyConfig> => {
      const response = await api.get('/admin/reports/delinquency/config');
      return response.data;
    },
  });
};

export const useRunDelinquencyCheck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<DelinquencyCheckResult> => {
      const response = await api.post('/admin/reports/delinquency/check');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DELINQUENTS_KEY });
      queryClient.invalidateQueries({ queryKey: KPIS_KEY });
    },
  });
};

export const exportDelinquentsCSV = (): void => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    console.error('No access token found');
    return;
  }

  const url = `${api.defaults.baseURL}/admin/reports/delinquents/export`;

  const xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  xhr.responseType = 'blob';

  xhr.onload = () => {
    if (xhr.status === 200) {
      const blob = xhr.response;
      const downloadUrl = window.URL.createObjectURL(blob);
      const contentDisposition = xhr.getResponseHeader('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `inadimplentes_${new Date().toISOString().split('T')[0]}.csv`;

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } else {
      console.error('Failed to export CSV:', xhr.status, xhr.statusText);
    }
  };

  xhr.onerror = () => {
    console.error('Network error while exporting CSV');
  };

  xhr.send();
};

// Collaborators API
const COLLABORATORS_KEY = ['admin-collaborators'];

export const useCollaborators = () => {
  return useQuery({
    queryKey: COLLABORATORS_KEY,
    queryFn: async (): Promise<CollaboratorSummary[]> => {
      const response = await api.get('/admin/collaborators');
      // Backend returns paginated response, extract the array
      return response.data.collaborators || response.data;
    },
    staleTime: STALE_TIME.COLLABORATORS,
  });
};

export const useCollaboratorDetail = (id: string) => {
  return useQuery({
    queryKey: [...COLLABORATORS_KEY, id],
    queryFn: async (): Promise<CollaboratorDetail> => {
      const response = await api.get(`/admin/collaborators/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

// Complaints API
const COMPLAINTS_KEY = ['admin-complaints'];

export const useComplaints = () => {
  return useQuery({
    queryKey: COMPLAINTS_KEY,
    queryFn: async (): Promise<ComplaintItem[]> => {
      const response = await api.get('/admin/reports/complaints');
      return response.data;
    },
    staleTime: STALE_TIME.COMPLAINTS,
  });
};

// Refunds API
const REFUNDS_KEY = ['admin-refunds'];

export const useRefunds = () => {
  return useQuery({
    queryKey: REFUNDS_KEY,
    queryFn: async (): Promise<RefundReport> => {
      const response = await api.get('/admin/reports/refunds');
      return response.data;
    },
    staleTime: STALE_TIME.REFUNDS,
  });
};

// Weekly Financials API
const WEEKLY_KEY = ['admin-weekly-financials'];

export const useWeeklyFinancials = (weeks: number = 8) => {
  return useQuery({
    queryKey: [...WEEKLY_KEY, weeks],
    queryFn: async (): Promise<WeeklyFinancial[]> => {
      const response = await api.get('/admin/reports/financials/weekly', {
        params: { weeks },
      });
      return response.data;
    },
    staleTime: STALE_TIME.FINANCIALS,
  });
};

// Revisions API
const REVISIONS_KEY = ['admin-revisions'];

export const useRevisionSummary = () => {
  return useQuery({
    queryKey: REVISIONS_KEY,
    queryFn: async (): Promise<RevisionSummary> => {
      const response = await api.get('/admin/reports/revisions/summary');
      return response.data;
    },
    staleTime: STALE_TIME.COMPLAINTS,
  });
};

// Active Jobs API
const ACTIVE_JOBS_KEY = ['admin-active-jobs'];

export const useActiveJobs = (
  page: number = 1,
  pageSize: number = 20,
  status?: string,
  collaborator?: string,
  sortBy?: string,
  sortDir?: 'asc' | 'desc'
) => {
  return useQuery({
    queryKey: [...ACTIVE_JOBS_KEY, page, pageSize, status, collaborator, sortBy, sortDir],
    queryFn: async (): Promise<ActiveJobsResponse> => {
      const response = await api.get('/admin/reports/active-jobs', {
        params: {
          page,
          page_size: pageSize,
          ...(status && { status }),
          ...(collaborator && { collaborator }),
          ...(sortBy && { sort_by: sortBy }),
          ...(sortDir && { sort_dir: sortDir }),
        },
      });
      return response.data;
    },
  });
};

// Alerts API
const ALERTS_KEY = ['admin-alerts'];

export const useAlerts = () => {
  return useQuery({
    queryKey: ALERTS_KEY,
    queryFn: async (): Promise<AlertsResponse> => {
      const response = await api.get('/admin/reports/alerts');
      return response.data;
    },
    staleTime: STALE_TIME.ALERTS,
  });
};

// Productivity API
const PRODUCTIVITY_KEY = ['admin-productivity'];

export const useProductivityStats = () => {
  return useQuery({
    queryKey: PRODUCTIVITY_KEY,
    queryFn: async (): Promise<ProductivityStats> => {
      const response = await api.get('/admin/reports/productivity');
      return response.data;
    },
    staleTime: STALE_TIME.PRODUCTIVITY,
  });
};

// Rankings API
const RANKINGS_KEY = ['admin-rankings'];

export const useFullRankings = (limit: number = 10) => {
  return useQuery({
    queryKey: [...RANKINGS_KEY, 'all', limit],
    queryFn: async (): Promise<FullRankingResponse> => {
      const response = await api.get('/admin/reports/rankings', {
        params: { limit },
      });
      return response.data;
    },
    staleTime: STALE_TIME.RANKINGS,
  });
};

export const useRanking = (type: RankingType, limit: number = 10) => {
  return useQuery({
    queryKey: [...RANKINGS_KEY, type, limit],
    queryFn: async (): Promise<RankingResponse> => {
      const response = await api.get(`/admin/reports/ranking/${type}`, {
        params: { limit },
      });
      return response.data;
    },
    enabled: !!type,
  });
};

// Paginated collaborators list
export const useCollaboratorsPaginated = (
  page: number = 1,
  pageSize: number = 20,
  specialty?: string,
  minRating?: number
) => {
  return useQuery({
    queryKey: [...COLLABORATORS_KEY, 'paginated', page, pageSize, specialty, minRating],
    queryFn: async (): Promise<CollaboratorsListResponse> => {
      const response = await api.get('/admin/collaborators', {
        params: {
          page,
          page_size: pageSize,
          ...(specialty && { specialty }),
          ...(minRating && { min_rating: minRating }),
        },
      });
      return response.data;
    },
  });
};

// Update collaborator mutation
export const useUpdateCollaborator = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCollaboratorRequest }): Promise<CollaboratorDetail> => {
      const response = await api.patch(`/admin/collaborators/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: COLLABORATORS_KEY });
      queryClient.invalidateQueries({ queryKey: [...COLLABORATORS_KEY, variables.id] });
    },
  });
};

// Create collaborator mutation
export const useCreateCollaborator = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCollaboratorRequest): Promise<CollaboratorDetail> => {
      const response = await api.post('/admin/collaborators', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COLLABORATORS_KEY });
    },
  });
};

// Collaborator earnings by period
export const useCollaboratorEarnings = (id: string, months: number = 6) => {
  return useQuery({
    queryKey: [...COLLABORATORS_KEY, id, 'earnings', months],
    queryFn: async (): Promise<CollaboratorEarningPeriod[]> => {
      const response = await api.get(`/admin/collaborators/${id}/earnings`, {
        params: { months },
      });
      return response.data;
    },
    enabled: !!id,
  });
};

// Collaborator revisions paginated
export const useCollaboratorRevisions = (id: string, page: number = 1, pageSize: number = 20) => {
  return useQuery({
    queryKey: [...COLLABORATORS_KEY, id, 'revisions', page, pageSize],
    queryFn: async (): Promise<CollaboratorRevisionsResponse> => {
      const response = await api.get(`/admin/collaborators/${id}/revisions`, {
        params: { page, page_size: pageSize },
      });
      return response.data;
    },
    enabled: !!id,
  });
};

// Complaints paginated with filters
export const useComplaintsPaginated = (
  page: number = 1,
  pageSize: number = 20,
  status?: string,
  collaboratorId?: string,
  search?: string
) => {
  return useQuery({
    queryKey: [...COMPLAINTS_KEY, 'paginated', page, pageSize, status, collaboratorId, search],
    queryFn: async (): Promise<ComplaintsListResponse> => {
      const response = await api.get('/admin/reports/complaints', {
        params: {
          page,
          page_size: pageSize,
          ...(status && { status }),
          ...(collaboratorId && { collaborator_id: collaboratorId }),
          ...(search && { search }),
        },
      });
      return response.data;
    },
  });
};

// Complaint stats only
export const useComplaintStats = () => {
  return useQuery({
    queryKey: [...COMPLAINTS_KEY, 'stats'],
    queryFn: async (): Promise<ComplaintStats> => {
      const response = await api.get('/admin/reports/complaints/stats');
      return response.data;
    },
  });
};

// Job history
const JOBS_KEY = ['admin-jobs'];

export const useJobHistory = (jobId: string) => {
  return useQuery({
    queryKey: [...JOBS_KEY, jobId, 'history'],
    queryFn: async (): Promise<JobHistoryEntry[]> => {
      const response = await api.get(`/admin/reports/jobs/${jobId}/history`);
      return response.data;
    },
    enabled: !!jobId,
  });
};

// Update job status mutation
export const useUpdateJobStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, data }: { jobId: string; data: UpdateJobStatusRequest }): Promise<void> => {
      await api.patch(`/admin/reports/jobs/${jobId}/status`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: COMPLAINTS_KEY });
      queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, variables.jobId] });
      queryClient.invalidateQueries({ queryKey: ALERTS_KEY });
    },
  });
};

// Collaborator ranking positions
export const useCollaboratorRankings = (id: string) => {
  return useQuery({
    queryKey: [...COLLABORATORS_KEY, id, 'rankings'],
    queryFn: async (): Promise<CollaboratorRankingPositions> => {
      const response = await api.get(`/admin/collaborators/${id}/rankings`);
      return response.data;
    },
    enabled: !!id,
  });
};

// Collaborator delinquent students
export const useCollaboratorDelinquents = (id: string) => {
  return useQuery({
    queryKey: [...COLLABORATORS_KEY, id, 'delinquents'],
    queryFn: async (): Promise<CollaboratorDelinquentsResponse> => {
      const response = await api.get(`/admin/collaborators/${id}/delinquents`);
      return response.data;
    },
    enabled: !!id,
  });
};

// ----- Settings -----

const SETTINGS_KEY = ['admin-settings'];

export const useAsaasSettings = () => {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async (): Promise<AsaasSettingsResponse> => {
      const response = await api.get('/admin/settings');
      return response.data;
    },
  });
};

export const useUpdateSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }): Promise<{ success: boolean; message: string }> => {
      const response = await api.patch(`/admin/settings/${key}`, { value } as UpdateSettingRequest);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });
};

export const useTestAsaasConnection = () => {
  return useMutation({
    mutationFn: async (): Promise<TestAsaasResponse> => {
      const response = await api.post('/admin/settings/test-asaas');
      return response.data;
    },
  });
};

// ----- Pending Financials -----

const PENDING_FINANCIALS_KEY = ['admin-pending-financials'];

export const usePendingFinancials = () => {
  return useQuery({
    queryKey: PENDING_FINANCIALS_KEY,
    queryFn: async (): Promise<PendingFinancialsReport> => {
      const response = await api.get('/admin/reports/pending-financials');
      return response.data;
    },
  });
};

// ----- Delinquency History -----

const DELINQUENCY_HISTORY_KEY = ['admin-delinquency-history'];

export const useDelinquencyHistory = (userId: string) => {
  return useQuery({
    queryKey: [...DELINQUENCY_HISTORY_KEY, userId],
    queryFn: async (): Promise<DelinquencyHistoryResponse> => {
      const response = await api.get(`/admin/reports/delinquency/history/${userId}`);
      return response.data;
    },
    enabled: !!userId,
  });
};

// ----- Pending Withdrawals -----

const PENDING_WITHDRAWALS_KEY = ['admin-pending-withdrawals'];

export const usePendingWithdrawalsSummary = () => {
  return useQuery({
    queryKey: PENDING_WITHDRAWALS_KEY,
    queryFn: async (): Promise<PendingWithdrawalsSummary> => {
      const response = await api.get('/admin/reports/pending-withdrawals');
      return response.data;
    },
    staleTime: STALE_TIME.ALERTS,
  });
};

// ----- Open Charges -----

const OPEN_CHARGES_KEY = ['admin-open-charges'];

export const useOpenChargesSummary = () => {
  return useQuery({
    queryKey: OPEN_CHARGES_KEY,
    queryFn: async (): Promise<OpenChargesSummary> => {
      const response = await api.get('/admin/reports/open-charges');
      return response.data;
    },
    staleTime: STALE_TIME.ALERTS,
  });
};

// ----- Withdrawal Limits -----

const WITHDRAWAL_LIMITS_KEY = ['admin-withdrawal-limits'];

export const useWithdrawalLimitsConfig = () => {
  return useQuery({
    queryKey: WITHDRAWAL_LIMITS_KEY,
    queryFn: async (): Promise<WithdrawalLimitsConfig> => {
      const response = await api.get('/admin/settings/withdrawal-limits');
      return response.data;
    },
    staleTime: STALE_TIME.ALERTS,
  });
};

export const useUpdateWithdrawalLimit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }): Promise<{ success: boolean; message: string }> => {
      const response = await api.patch(`/admin/settings/${key}`, { value });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WITHDRAWAL_LIMITS_KEY });
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });
};

// Enhanced CSV export with CPF, phone and history
export const exportDelinquentsEnhancedCSV = (): void => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    console.error('No access token found');
    return;
  }

  const url = `${api.defaults.baseURL}/admin/reports/delinquents/export-enhanced`;

  const xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  xhr.responseType = 'blob';

  xhr.onload = () => {
    if (xhr.status === 200) {
      const blob = xhr.response;
      const downloadUrl = window.URL.createObjectURL(blob);
      const contentDisposition = xhr.getResponseHeader('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `inadimplentes_completo_${new Date().toISOString().split('T')[0]}.csv`;

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } else {
      console.error('Failed to export CSV:', xhr.status, xhr.statusText);
    }
  };

  xhr.onerror = () => {
    console.error('Network error while exporting CSV');
  };

  xhr.send();
};
