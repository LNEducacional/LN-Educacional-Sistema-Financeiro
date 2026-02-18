export type DisputeStatus =
  | 'ABERTA'
  | 'EM_ANALISE'
  | 'AGUARDANDO_RESPOSTA'
  | 'RESOLVIDA'
  | 'CANCELADA';

export type DisputeResolution =
  | 'FAVOR_ALUNO'
  | 'FAVOR_COLABORADOR'
  | 'ACORDO'
  | 'PARCIAL';

export interface Dispute {
  id: string;
  order_id: string;
  opened_by_user_id: string;
  opened_by_role: 'ADMIN' | 'COLLABORATOR' | 'STUDENT';
  status: DisputeStatus;
  title: string;
  description: string;
  resolution?: DisputeResolution;
  resolution_notes?: string;
  resolved_by_admin_id?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DisputeComment {
  id: string;
  dispute_id: string;
  user_id: string;
  user_role: 'ADMIN' | 'COLLABORATOR' | 'STUDENT';
  comment: string;
  is_internal: boolean;
  created_at: string;
}

export interface DisputeEvidence {
  id: string;
  dispute_id: string;
  uploaded_by_user_id: string;
  uploaded_by_role: 'ADMIN' | 'COLLABORATOR' | 'STUDENT';
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  description?: string;
  created_at: string;
}

export interface DisputeWithDetails {
  dispute: Dispute;
  comments: DisputeComment[];
  evidence: DisputeEvidence[];
}

export interface CreateDisputeRequest {
  order_id: string;
  title: string;
  description: string;
}

export interface AddCommentRequest {
  comment: string;
  is_internal?: boolean;
}

export interface ResolveDisputeRequest {
  resolution: DisputeResolution;
  resolution_notes: string;
}
