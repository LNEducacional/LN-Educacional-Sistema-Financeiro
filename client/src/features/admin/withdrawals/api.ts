import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { WithdrawalsListResponse } from "./types";

const WITHDRAWALS_KEY = ["admin-withdrawals"];

const STALE_TIME = 3 * 60 * 1000; // 3 min

export const useWithdrawals = (
	page: number = 1,
	pageSize: number = 20,
	status?: string,
) => {
	return useQuery({
		queryKey: [...WITHDRAWALS_KEY, page, pageSize, status],
		queryFn: async (): Promise<WithdrawalsListResponse> => {
			const response = await api.get("/admin/withdrawals", {
				params: {
					page,
					page_size: pageSize,
					...(status && { status }),
				},
			});
			return response.data;
		},
		staleTime: STALE_TIME,
	});
};

export const useApproveWithdrawal = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			await api.put(`/admin/withdrawals/${id}/approve`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: WITHDRAWALS_KEY });
		},
	});
};

export const useRejectWithdrawal = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			reason,
		}: {
			id: string;
			reason: string;
		}): Promise<void> => {
			await api.put(`/admin/withdrawals/${id}/reject`, { reason });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: WITHDRAWALS_KEY });
		},
	});
};
