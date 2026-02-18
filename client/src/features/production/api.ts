import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import type {
  ProductionJob,
  JobHistory,
  CollaboratorRanking,
  FinancialSummary,
  DelinquencyStatus,
  CreateJobRequest,
  ChangeStatusRequest,
  AssignCollaboratorRequest,
} from './types';

// Query Keys
const JOBS_KEY = ['production-jobs'];
const MY_JOBS_KEY = ['production-my-jobs'];
const DELAYED_JOBS_KEY = ['production-delayed'];
const RANKING_KEY = ['production-ranking'];
const MY_RANKING_KEY = ['production-my-ranking'];
const FINANCIAL_SUMMARY_KEY = ['production-financial-summary'];

// List all jobs (Admin)
export const useProductionJobs = () => {
  return useQuery({
    queryKey: JOBS_KEY,
    queryFn: async (): Promise<ProductionJob[]> => {
      const response = await api.get('/api/production');
      return response.data ?? [];
    },
  });
};

// List my jobs (by role)
export const useMyProductionJobs = () => {
  return useQuery({
    queryKey: MY_JOBS_KEY,
    queryFn: async (): Promise<ProductionJob[]> => {
      const response = await api.get('/api/production/my');
      return response.data ?? [];
    },
  });
};

// Get job by ID
export const useProductionJob = (id: string) => {
  return useQuery({
    queryKey: [...JOBS_KEY, id],
    queryFn: async (): Promise<ProductionJob> => {
      const response = await api.get(`/api/production/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

// Get job history
export const useJobHistory = (jobId: string) => {
  return useQuery({
    queryKey: [...JOBS_KEY, jobId, 'history'],
    queryFn: async (): Promise<JobHistory[]> => {
      const response = await api.get(`/api/production/${jobId}/history`);
      return response.data ?? [];
    },
    enabled: !!jobId,
  });
};

// Get delayed jobs (Admin)
export const useDelayedJobs = () => {
  return useQuery({
    queryKey: DELAYED_JOBS_KEY,
    queryFn: async (): Promise<ProductionJob[]> => {
      const response = await api.get('/api/production/delayed');
      return response.data ?? [];
    },
  });
};

// Get all collaborators ranking (Admin)
export const useCollaboratorRanking = () => {
  return useQuery({
    queryKey: RANKING_KEY,
    queryFn: async (): Promise<CollaboratorRanking[]> => {
      const response = await api.get('/api/production/ranking');
      return response.data ?? [];
    },
  });
};

// Get my ranking (Collaborator)
export const useMyRanking = () => {
  return useQuery({
    queryKey: MY_RANKING_KEY,
    queryFn: async (): Promise<CollaboratorRanking> => {
      const response = await api.get('/api/production/ranking/my');
      return response.data;
    },
  });
};

// Get financial summary
export const useFinancialSummary = () => {
  return useQuery({
    queryKey: FINANCIAL_SUMMARY_KEY,
    queryFn: async (): Promise<FinancialSummary> => {
      const response = await api.get('/api/production/financial/summary');
      return response.data;
    },
  });
};

// Check student delinquency
export const useCheckDelinquency = (studentId: string) => {
  return useQuery({
    queryKey: ['delinquency', studentId],
    queryFn: async (): Promise<DelinquencyStatus> => {
      const response = await api.get(`/api/production/student/${studentId}/delinquency`);
      return response.data;
    },
    enabled: !!studentId,
  });
};

// Create job mutation
export const useCreateJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateJobRequest): Promise<ProductionJob> => {
      const response = await api.post('/api/production', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOBS_KEY });
      queryClient.invalidateQueries({ queryKey: MY_JOBS_KEY });
      queryClient.invalidateQueries({ queryKey: FINANCIAL_SUMMARY_KEY });
    },
  });
};

// Change status mutation
export const useChangeStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      data,
    }: {
      jobId: string;
      data: ChangeStatusRequest;
    }): Promise<ProductionJob> => {
      const response = await api.post(`/api/production/${jobId}/status`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOBS_KEY });
      queryClient.invalidateQueries({ queryKey: MY_JOBS_KEY });
      queryClient.invalidateQueries({ queryKey: DELAYED_JOBS_KEY });
      queryClient.invalidateQueries({ queryKey: FINANCIAL_SUMMARY_KEY });
      queryClient.invalidateQueries({ queryKey: MY_RANKING_KEY });
    },
  });
};

// Assign collaborator mutation
export const useAssignCollaborator = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      data,
    }: {
      jobId: string;
      data: AssignCollaboratorRequest;
    }): Promise<ProductionJob> => {
      const response = await api.post(`/api/production/${jobId}/assign`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOBS_KEY });
      queryClient.invalidateQueries({ queryKey: MY_JOBS_KEY });
    },
  });
};
