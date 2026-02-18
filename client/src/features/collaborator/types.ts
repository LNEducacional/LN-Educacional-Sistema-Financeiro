export type OrderStatus =
  | 'NOVO'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_REVISAO'
  | 'ENVIADO_VISUALIZACAO'
  | 'AGUARDANDO_APROVACAO'
  | 'APROVADO'
  | 'REVISAO_SOLICITADA'
  | 'ENTREGUE'
  | 'CONCLUIDO'
  | 'ATRASADO'
  | 'CANCELADO';

export type PaymentStatus = 'LOCKED' | 'RELEASED' | 'REFUNDED';

export interface WalletSummary {
  available: number;
  locked: number;
}

export interface CollaboratorOrder {
  id: string;
  student_name: string;
  service_name: string;
  my_share: number;
  total_value: number;
  company_percent: number;
  collab_percent: number;
  company_value: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  due_date: string;
  revision_count: number;
}

export interface DashboardResponse {
  wallet: WalletSummary;
  orders: CollaboratorOrder[];
}

export interface Delivery {
  id: string;
  order_id: string;
  file_path: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

export interface OrderRevision {
  id: string;
  order_id: string;
  reason: string;
  created_at: string;
}
