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

export interface StudentOrder {
  id: string;
  collaborator_name: string;
  service_name: string;
  total_value: number;
  status: OrderStatus;
  due_date: string;
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

export interface Order {
  id: string;
  student_id: string;
  collaborator_id: string;
  service_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total_value: number;
  company_percent: number;
  collab_percent: number;
  collab_value: number;
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceInfo {
  id: string;
  name: string;
}

export interface CollaboratorInfo {
  id: string;
  name: string;
}

export interface OrderDetailsResponse {
  order: Order;
  service: ServiceInfo;
  collaborator: CollaboratorInfo;
  deliveries: Delivery[];
  revisions: OrderRevision[];
}

// Types for creating an order
export interface ServiceForSelection {
  id: string;
  name: string;
  area: string;
  work_type: string | null;
  total_value: number;
  company_percent: number;
  collaborator_percent: number;
}

export interface CollaboratorForSelection {
  id: string;
  name: string;
  specialty: string | null;
  avg_rating: number;
}

export interface CreateOrderRequest {
  service_id: string;
  collaborator_id: string;
  due_date: string; // RFC3339 format
}

export interface CreateOrderPaymentInfo {
  invoice_url: string;
  pix_qr_code?: string;
  pix_payload?: string;
  bank_slip_url?: string;
  due_date: string;
  status: string;
}

export interface CreateOrderResponse {
  order: Order;
  payment_info?: CreateOrderPaymentInfo;
}

// ----- Student Charges (Payments Page) -----

export type ChargeStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'RECEIVED'
  | 'OVERDUE'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'CANCELLED';

export type BillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD';

export interface StudentCharge {
  id: string;
  order_id: string;
  service_name: string;
  status: ChargeStatus;
  billing_type: BillingType;
  value: number;
  invoice_url?: string;
  pix_qr_code?: string;
  pix_payload?: string;
  bank_slip_url?: string;
  due_date: string;
  paid_at?: string;
  created_at: string;
}

export interface StudentChargeListResponse {
  charges: StudentCharge[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
