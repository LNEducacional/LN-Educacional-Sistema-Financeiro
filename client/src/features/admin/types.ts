export interface FinancialKPIs {
  gmv: number;
  net_revenue: number;
  escrow: number;
  transferred: number;
  pending_orders: number;
  total_orders: number;
}

export interface MonthlyFinancial {
  month: string;
  income: number;
  payouts: number;
  gmv: number;
}

export interface DelinquentUser {
  id: string;
  name: string;
  email: string;
  total_owed: number;
  oldest_due_date: string;
  days_overdue: number;
  overdue_orders: number;
  delinquent_since: string;
}

export interface DelinquencyConfig {
  grace_period_days: number;
}

export interface DelinquencyCheckResult {
  checked: number;
  new_delinquents: number;
  cleared: number;
  run_at: string;
}

export interface CollaboratorSummary {
  id: string;
  name: string;
  email: string;
  specialty: string | null;
  internal_ranking: number;
  total_jobs: number;
  completed_jobs: number;
  pending_jobs: number;
  delayed_jobs: number;
  total_earnings: number;
  pending_earnings: number;
  avg_rating: number;
  total_ratings: number;
  on_time_delivery_pct: number;
}

export interface CollaboratorJob {
  id: string;
  student_name: string;
  service_name: string;
  status: string;
  payment_status: string;
  total_value: number;
  collab_value: number;
  due_date: string;
  created_at: string;
}

export interface CollaboratorRevision {
  id: string;
  order_id: string;
  student_name: string;
  reason: string;
  created_at: string;
}

export interface CollaboratorDetail extends CollaboratorSummary {
  pix_key: string | null;
  balance_available: number;
  balance_locked: number;
  created_at: string;
  total_revisions_count: number;
  total_refunds_count: number;
  total_refunds_amount: number;
  recent_jobs: CollaboratorJob[];
  recent_revisions: CollaboratorRevision[];
}

export interface ComplaintItem {
  id: string;
  student_name: string;
  student_email: string;
  collaborator_name: string;
  service_name: string;
  status: string;
  total_value: number;
  due_date: string;
  revision_count: number;
  latest_reason: string | null;
  latest_revision_at: string | null;
}

export interface RefundItem {
  id: string;
  order_id: string;
  student_name: string;
  collaborator_name: string;
  amount: number;
  refunded_at: string;
}

export interface RefundReport {
  total_refunded: number;
  total_count: number;
  refunds: RefundItem[];
}

export interface WeeklyFinancial {
  week: string;
  income: number;
  payouts: number;
  gmv: number;
}

export interface ReasonCount {
  reason: string;
  count: number;
}

export interface RevisionSummary {
  total_revisions: number;
  avg_per_order: number;
  this_month: number;
  last_month: number;
  top_reasons: ReasonCount[];
}

export interface ActiveJob {
  id: string;
  student_name: string;
  collaborator_name: string;
  service_name: string;
  status: string;
  payment_status: string;
  due_date: string;
  days_until_due: number;
  total_value: number;
  created_at: string;
}

export interface ActiveJobsResponse {
  jobs: ActiveJob[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AlertItem {
  id: string;
  type: 'OVERDUE' | 'DUE_TODAY' | 'DUE_TOMORROW' | 'COMPLAINT';
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface AlertsResponse {
  overdue_count: number;
  due_today_count: number;
  due_tomorrow_count: number;
  complaints_count: number;
  total_count: number;
  items: AlertItem[];
}

export interface ProductivityStats {
  total_collaborators: number;
  active_collaborators: number;
  avg_jobs_per_collab: number;
  avg_on_time_delivery: number;
  total_completed_month: number;
  avg_rating: number;
}

export type RankingType = 'production' | 'revenue' | 'punctuality' | 'satisfaction' | 'quality';

export interface RankingEntry {
  position: number;
  collaborator_id: string;
  name: string;
  specialty: string | null;
  value: number;
  secondary_value: number | null;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface RankingResponse {
  type: RankingType;
  title: string;
  description: string;
  unit: string;
  entries: RankingEntry[];
  updated_at: string;
}

export interface FullRankingResponse {
  production: RankingResponse;
  revenue: RankingResponse;
  punctuality: RankingResponse;
  satisfaction: RankingResponse;
  quality: RankingResponse;
}

export interface UpdateCollaboratorRequest {
  specialty?: string;
  pix_key?: string;
  internal_ranking?: number;
}

export interface CreateCollaboratorRequest {
  name: string;
  email: string;
  password: string;
  specialty?: string;
  pix_key?: string;
  internal_ranking?: number;
}

export interface CollaboratorEarningPeriod {
  period: string;
  earned: number;
  refunded: number;
  jobs: number;
}

export interface CollaboratorsListResponse {
  collaborators: CollaboratorSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CollaboratorRevisionsResponse {
  revisions: CollaboratorRevision[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ComplaintWithSplit {
  id: string;
  student_name: string;
  student_email: string;
  collaborator_id: string;
  collaborator_name: string;
  service_name: string;
  status: string;
  total_value: number;
  collab_value: number;
  company_value: number;
  due_date: string;
  revision_count: number;
  latest_reason: string | null;
  latest_revision_at: string | null;
  days_pending: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ComplaintStats {
  total_aguardando_revisao: number;
  total_nao_aprovado: number;
  total_complaints: number;
  avg_days_pending: number;
  resolved_this_month: number;
  resolved_last_month: number;
}

export interface ComplaintsListResponse {
  complaints: ComplaintWithSplit[];
  stats: ComplaintStats;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface JobHistoryEntry {
  id: string;
  previous_status: string | null;
  new_status: string;
  comments: string | null;
  changed_by_id: string;
  changed_by_name: string;
  changed_by_role: string;
  created_at: string;
}

export interface UpdateJobStatusRequest {
  status: string;
  comments?: string;
}

// Ranking position for a single ranking type
export interface RankingPosition {
  position: number;
  value: number;
  total: number;
}

// Collaborator's positions in all 5 rankings
export interface CollaboratorRankingPositions {
  collaborator_id: string;
  production: RankingPosition | null;
  revenue: RankingPosition | null;
  punctuality: RankingPosition | null;
  satisfaction: RankingPosition | null;
  quality: RankingPosition | null;
}

// Delinquent student for a collaborator
export interface CollaboratorDelinquent {
  student_id: string;
  student_name: string;
  student_email: string;
  total_owed: number;
  days_overdue: number;
  overdue_orders: number;
  oldest_due_date: string;
}

// Response for collaborator delinquents
export interface CollaboratorDelinquentsResponse {
  delinquents: CollaboratorDelinquent[];
  total_count: number;
  total_owed: number;
}

// ----- Settings Types -----

export interface SettingResponse {
  key: string;
  value: string;
  description?: string;
  is_secret: boolean;
  is_configured: boolean;
  updated_at: string;
}

export interface AsaasSettingsResponse {
  api_key: SettingResponse;
  webhook_token: SettingResponse;
  is_configured: boolean;
  api_url: string;
  sandbox: boolean;
}

export interface UpdateSettingRequest {
  value: string;
}

export interface TestAsaasResponse {
  success: boolean;
  message: string;
  balance?: string;
}

// ----- Pending Financials Types -----

export interface StatusBreakdown {
  count: number;
  amount: number;
}

export interface PendingFinancialsReport {
  total_pending_count: number;
  total_pending_amount: number;
  by_payment_status: Record<string, StatusBreakdown>;
  by_order_status: Record<string, StatusBreakdown>;
}

// ----- Delinquency History Types -----

export interface DelinquencyHistoryEntry {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  total_owed_at_start: number;
  total_owed_at_end: number | null;
  triggering_order_ids: string[];
  resolution_type: string | null;
  notes: string | null;
  duration_days: number;
  created_at: string;
}

export interface DelinquencyHistoryResponse {
  user_id: string;
  user_name: string;
  user_email: string;
  is_currently_delinquent: boolean;
  total_periods: number;
  total_days_delinquent: number;
  history: DelinquencyHistoryEntry[];
}

export interface DelinquentUserWithHistory extends DelinquentUser {
  cpf: string | null;
  phone: string | null;
  previous_periods: number;
  total_days_ever: number;
}

// ----- Pending Withdrawals Summary -----

export interface PendingWithdrawalsSummary {
  pending_count: number;
  pending_amount: number;
  approved_count: number;
  approved_amount: number;
  processing_count: number;
  processing_amount: number;
}

// ----- Open Charges Summary -----

export interface OpenChargesSummary {
  pending_count: number;
  pending_amount: number;
  overdue_count: number;
  overdue_amount: number;
  confirmed_count: number;
  confirmed_amount: number;
  total_open_count: number;
  total_open_amount: number;
}

export interface WithdrawalLimitsConfig {
  min_amount: number;
  max_amount: number;
  daily_limit: number;
  charge_min_amount: number;
}
