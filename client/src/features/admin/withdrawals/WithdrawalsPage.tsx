import {
	AlertCircle,
	Check,
	ChevronLeft,
	ChevronRight,
	Clock,
	Search,
	Wallet,
	X,
} from "lucide-react";
import { Select } from "@/components/ui";
import { formatCurrency } from "@/lib/formatters";
import type { WithdrawalStatus } from "./types";
import { useWithdrawalsPage } from "./use-withdrawals-page";

const STATUS_OPTIONS = [
	{ value: "", label: "Todos os status" },
	{ value: "PENDING", label: "Pendente" },
	{ value: "APPROVED", label: "Aprovado" },
	{ value: "REJECTED", label: "Rejeitado" },
	{ value: "PROCESSING", label: "Processando" },
	{ value: "DONE", label: "Concluido" },
	{ value: "FAILED", label: "Falhou" },
	{ value: "CANCELLED", label: "Cancelado" },
];

const PAGE_SIZE_OPTIONS = [
	{ value: "10", label: "10 por pagina" },
	{ value: "20", label: "20 por pagina" },
	{ value: "50", label: "50 por pagina" },
];

const STATUS_BADGE_CLASSES: Record<WithdrawalStatus, string> = {
	PENDING: "bg-amber-500/20 border-amber-500/30 text-amber-300",
	APPROVED: "bg-blue-500/20 border-blue-500/30 text-blue-300",
	REJECTED: "bg-red-500/20 border-red-500/30 text-red-300",
	PROCESSING: "bg-cyan-500/20 border-cyan-500/30 text-cyan-300",
	DONE: "bg-emerald-500/20 border-emerald-500/30 text-emerald-300",
	FAILED: "bg-red-500/20 border-red-500/30 text-red-300",
	CANCELLED: "bg-gray-500/20 border-gray-500/30 text-gray-300",
};

const STATUS_LABELS: Record<WithdrawalStatus, string> = {
	PENDING: "Pendente",
	APPROVED: "Aprovado",
	REJECTED: "Rejeitado",
	PROCESSING: "Processando",
	DONE: "Concluido",
	FAILED: "Falhou",
	CANCELLED: "Cancelado",
};

function StatusBadge({ status }: { status: WithdrawalStatus }) {
	return (
		<span
			className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[status]}`}
		>
			{STATUS_LABELS[status]}
		</span>
	);
}

function formatDate(dateStr: string): string {
	return new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(dateStr));
}

function maskPixKey(key: string): string {
	if (key.length <= 8) return key;
	return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export function WithdrawalsPage() {
	const {
		withdrawals,
		total,
		totalPages,
		pendingCount,
		isLoading,
		isError,
		page,
		pageSize,
		setPage,
		statusFilter,
		searchTerm,
		setSearchTerm,
		handleStatusFilterChange,
		handlePageSizeChange,
		approveId,
		openApproveModal,
		closeApproveModal,
		handleApprove,
		isApproving,
		rejectId,
		rejectReason,
		setRejectReason,
		openRejectModal,
		closeRejectModal,
		handleReject,
		isRejecting,
	} = useWithdrawalsPage();

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 border border-violet-500/30">
						<Wallet className="h-5 w-5 text-violet-400" />
					</div>
					<div>
						<h1 className="text-2xl font-bold text-white">Saques</h1>
						<p className="text-sm text-gray-400">
							{total} saques no total
							{pendingCount > 0 && (
								<span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-xs font-medium text-amber-300">
									<Clock className="h-3 w-3" />
									{pendingCount} pendentes
								</span>
							)}
						</p>
					</div>
				</div>
			</div>

			{/* Filters */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
					<input
						type="text"
						placeholder="Buscar por colaborador..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
					/>
				</div>
				<div className="flex gap-2">
					<Select
						value={statusFilter}
						onChange={handleStatusFilterChange}
						options={STATUS_OPTIONS}
					/>
					<Select
						value={String(pageSize)}
						onChange={handlePageSizeChange}
						options={PAGE_SIZE_OPTIONS}
					/>
				</div>
			</div>

			{/* Content */}
			{isLoading ? (
				<div className="flex items-center justify-center py-20">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
				</div>
			) : isError ? (
				<div className="flex flex-col items-center justify-center py-20 text-gray-400">
					<AlertCircle className="mb-2 h-8 w-8" />
					<p>Erro ao carregar saques</p>
				</div>
			) : withdrawals.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-20 text-gray-400">
					<Wallet className="mb-2 h-8 w-8" />
					<p>Nenhum saque encontrado</p>
				</div>
			) : (
				<>
					{/* Table */}
					<div className="overflow-x-auto rounded-xl border border-white/10">
						<table className="w-full">
							<thead>
								<tr className="border-b border-white/10 bg-black/40">
									<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
										Colaborador
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
										Valor
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
										Chave PIX
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
										Data
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
										Status
									</th>
									<th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
										Acoes
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5">
								{withdrawals.map((w) => (
									<tr key={w.id} className="transition-colors hover:bg-white/5">
										<td className="whitespace-nowrap px-4 py-3">
											<span className="font-medium text-white">
												{w.collaborator_name}
											</span>
										</td>
										<td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-emerald-300">
											{formatCurrency(w.value)}
										</td>
										<td className="whitespace-nowrap px-4 py-3 text-sm text-gray-300">
											<span className="mr-1 text-xs text-gray-500">
												{w.pix_key_type}
											</span>
											{maskPixKey(w.pix_key)}
										</td>
										<td className="whitespace-nowrap px-4 py-3 text-sm text-gray-400">
											{formatDate(w.requested_at)}
										</td>
										<td className="whitespace-nowrap px-4 py-3">
											<StatusBadge status={w.status} />
											{w.rejection_reason && (
												<p
													className="mt-1 max-w-[200px] truncate text-xs text-red-400"
													title={w.rejection_reason}
												>
													{w.rejection_reason}
												</p>
											)}
										</td>
										<td className="whitespace-nowrap px-4 py-3 text-right">
											{w.status === "PENDING" && (
												<div className="flex items-center justify-end gap-2">
													<button
														type="button"
														onClick={() => openApproveModal(w.id)}
														className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30"
													>
														<Check className="h-3.5 w-3.5" />
														Aprovar
													</button>
													<button
														type="button"
														onClick={() => openRejectModal(w.id)}
														className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/30"
													>
														<X className="h-3.5 w-3.5" />
														Rejeitar
													</button>
												</div>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between">
							<p className="text-sm text-gray-400">
								Pagina {page} de {totalPages} ({total} resultados)
							</p>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => setPage(page - 1)}
									disabled={page <= 1}
									className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
								>
									<ChevronLeft className="h-4 w-4" />
									Anterior
								</button>
								<button
									type="button"
									onClick={() => setPage(page + 1)}
									disabled={page >= totalPages}
									className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
								>
									Proximo
									<ChevronRight className="h-4 w-4" />
								</button>
							</div>
						</div>
					)}
				</>
			)}

			{/* Approve Modal */}
			{approveId && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeApproveModal}>
					<div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
						<h2 className="text-lg font-semibold text-white">
							Confirmar aprovacao
						</h2>
						<p className="mt-2 text-sm text-gray-400">
							Tem certeza que deseja aprovar este saque? O valor sera enviado ao
							colaborador na proxima execucao do processamento automatico.
						</p>
						<div className="mt-6 flex justify-end gap-3">
							<button
								type="button"
								onClick={closeApproveModal}
								disabled={isApproving}
								className="rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5"
							>
								Cancelar
							</button>
							<button
								type="button"
								onClick={handleApprove}
								disabled={isApproving}
								className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
							>
								{isApproving ? (
									<div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
								) : (
									<Check className="h-4 w-4" />
								)}
								Aprovar saque
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Reject Modal */}
			{rejectId && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeRejectModal}>
					<div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
						<h2 className="text-lg font-semibold text-white">Rejeitar saque</h2>
						<p className="mt-2 text-sm text-gray-400">
							Informe o motivo da rejeicao. O saldo sera devolvido ao
							colaborador.
						</p>
						<textarea
							value={rejectReason}
							onChange={(e) => setRejectReason(e.target.value)}
							placeholder="Motivo da rejeicao..."
							rows={3}
							className="mt-4 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
						/>
						<div className="mt-6 flex justify-end gap-3">
							<button
								type="button"
								onClick={closeRejectModal}
								disabled={isRejecting}
								className="rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5"
							>
								Cancelar
							</button>
							<button
								type="button"
								onClick={handleReject}
								disabled={isRejecting || !rejectReason.trim()}
								className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
							>
								{isRejecting ? (
									<div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
								) : (
									<X className="h-4 w-4" />
								)}
								Rejeitar saque
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
