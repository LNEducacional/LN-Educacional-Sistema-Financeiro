export type ProductionJobStatus =
  | 'NOVO'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_REVISAO'
  | 'ENVIADO_VISUALIZACAO'
  | 'AGUARDANDO_APROVACAO'
  | 'APROVADO'
  | 'NAO_APROVADO'
  | 'CONCLUIDO';

export interface ProductionJob {
  id: string;
  title: string;
  description?: string;
  price: number;
  deadline: string;
  status: ProductionJobStatus;
  student_id: string;
  collaborator_id?: string;
  financial_transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export interface JobHistory {
  id: string;
  job_id: string;
  previous_status?: ProductionJobStatus;
  new_status: ProductionJobStatus;
  changed_by_user_id: string;
  comments?: string;
  created_at: string;
}

export interface CollaboratorRanking {
  collaborator_id: string;
  jobs_completed: number;
  delays: number;
  complaints: number;
  score: number;
}

export interface FinancialSummary {
  total_approved: number;
  total_completed: number;
  total_pending: number;
  weekly_payable: number;
  jobs_count: number;
}

export interface DelinquencyStatus {
  student_id: string;
  is_delinquent: boolean;
}

export interface CreateJobRequest {
  title: string;
  description?: string;
  price: number;
  deadline: string;
  student_id: string;
  collaborator_id?: string;
}

export interface ChangeStatusRequest {
  new_status: ProductionJobStatus;
  comment?: string;
}

export interface AssignCollaboratorRequest {
  collaborator_id: string;
}
