export type WithdrawalStatus =
	| "PENDING"
	| "APPROVED"
	| "REJECTED"
	| "PROCESSING"
	| "DONE"
	| "FAILED"
	| "CANCELLED";

export interface Withdrawal {
	id: string;
	collaborator_id: string;
	collaborator_name: string;
	status: WithdrawalStatus;
	value: number;
	pix_key: string;
	pix_key_type: string;
	rejection_reason?: string;
	requested_at: string;
	reviewed_at?: string;
	completed_at?: string;
}

export interface WithdrawalsListResponse {
	withdrawals: Withdrawal[];
	total: number;
	page: number;
	page_size: number;
	total_pages: number;
}
