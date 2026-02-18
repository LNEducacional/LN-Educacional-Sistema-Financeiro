import { useCallback, useMemo, useState } from "react";
import {
	useApproveWithdrawal,
	useRejectWithdrawal,
	useWithdrawals,
} from "./api";

export function useWithdrawalsPage() {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [searchTerm, setSearchTerm] = useState("");

	// Modal state
	const [approveId, setApproveId] = useState<string | null>(null);
	const [rejectId, setRejectId] = useState<string | null>(null);
	const [rejectReason, setRejectReason] = useState("");

	const { data, isLoading, isError } = useWithdrawals(
		page,
		pageSize,
		statusFilter || undefined,
	);
	const approveMutation = useApproveWithdrawal();
	const rejectMutation = useRejectWithdrawal();

	const filteredWithdrawals = useMemo(() => {
		if (!data?.withdrawals) return [];
		if (!searchTerm.trim()) return data.withdrawals;
		const term = searchTerm.toLowerCase();
		return data.withdrawals.filter((w) =>
			w.collaborator_name.toLowerCase().includes(term),
		);
	}, [data?.withdrawals, searchTerm]);

	const pendingCount = useMemo(() => {
		if (!data?.withdrawals) return 0;
		return data.withdrawals.filter((w) => w.status === "PENDING").length;
	}, [data?.withdrawals]);

	const handleApprove = useCallback(async () => {
		if (!approveId) return;
		await approveMutation.mutateAsync(approveId);
		setApproveId(null);
	}, [approveId, approveMutation]);

	const handleReject = useCallback(async () => {
		if (!rejectId || !rejectReason.trim()) return;
		await rejectMutation.mutateAsync({ id: rejectId, reason: rejectReason });
		setRejectId(null);
		setRejectReason("");
	}, [rejectId, rejectReason, rejectMutation]);

	const handleStatusFilterChange = useCallback((value: string) => {
		setStatusFilter(value);
		setPage(1);
	}, []);

	const handlePageSizeChange = useCallback((value: string) => {
		setPageSize(Number(value));
		setPage(1);
	}, []);

	const openApproveModal = useCallback((id: string) => {
		setApproveId(id);
	}, []);

	const closeApproveModal = useCallback(() => {
		setApproveId(null);
	}, []);

	const openRejectModal = useCallback((id: string) => {
		setRejectId(id);
		setRejectReason("");
	}, []);

	const closeRejectModal = useCallback(() => {
		setRejectId(null);
		setRejectReason("");
	}, []);

	return {
		// Data
		withdrawals: filteredWithdrawals,
		total: data?.total ?? 0,
		totalPages: data?.total_pages ?? 0,
		pendingCount,
		isLoading,
		isError,

		// Pagination
		page,
		pageSize,
		setPage,

		// Filters
		statusFilter,
		searchTerm,
		setSearchTerm,
		handleStatusFilterChange,
		handlePageSizeChange,

		// Approve modal
		approveId,
		openApproveModal,
		closeApproveModal,
		handleApprove,
		isApproving: approveMutation.isPending,

		// Reject modal
		rejectId,
		rejectReason,
		setRejectReason,
		openRejectModal,
		closeRejectModal,
		handleReject,
		isRejecting: rejectMutation.isPending,
	};
}
