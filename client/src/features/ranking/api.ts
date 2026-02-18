import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { RankingCriteria, RankingPeriod, RankingResponse, RankingSummaryResponse, RatingInput } from './types';

const RANKING_KEY = ['ranking'];

export const useRanking = (criteria: RankingCriteria, period: RankingPeriod) => {
  return useQuery({
    queryKey: [...RANKING_KEY, criteria, period],
    queryFn: async (): Promise<RankingResponse> => {
      const response = await api.get('/api/ranking', {
        params: { criteria, period },
      });
      return response.data;
    },
  });
};

export const useRankingSummary = () => {
  return useQuery({
    queryKey: [...RANKING_KEY, 'summary'],
    queryFn: async (): Promise<RankingSummaryResponse> => {
      const response = await api.get('/api/ranking/summary');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useRateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      score,
      comment,
    }: { orderId: string } & RatingInput): Promise<{ status: string }> => {
      const response = await api.post(`/api/orders/${orderId}/rate`, {
        score,
        comment,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RANKING_KEY });
    },
  });
};
