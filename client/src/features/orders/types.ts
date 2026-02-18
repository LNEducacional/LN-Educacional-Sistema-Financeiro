// Expandir OrderStatus para incluir novos estados
export type OrderStatus =
  | 'NOVO'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_REVISAO'
  | 'ENVIADO_VISUALIZACAO'
  | 'AGUARDANDO_APROVACAO'
  | 'APROVADO'
  | 'REVISAO_SOLICITADA'
  | 'ENTREGUE' // deprecated
  | 'CONCLUIDO'
  | 'ATRASADO'
  | 'CANCELADO';

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  previous_status?: OrderStatus;
  new_status: OrderStatus;
  changed_by_user_id: string;
  changed_by_role: 'ADMIN' | 'COLLABORATOR' | 'STUDENT';
  comments?: string;
  created_at: string;
}

export interface ChangeStatusRequest {
  new_status: OrderStatus;
  comments?: string;
}

export interface InternalReviewRequest {
  order_id: string;
  notes?: string;
}

// Transições válidas (sync com backend)
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NOVO: ['EM_ANDAMENTO', 'CANCELADO', 'ATRASADO'],
  EM_ANDAMENTO: ['AGUARDANDO_REVISAO', 'ENVIADO_VISUALIZACAO', 'ATRASADO', 'CANCELADO'],
  AGUARDANDO_REVISAO: ['EM_ANDAMENTO', 'ENVIADO_VISUALIZACAO', 'ATRASADO', 'CANCELADO'],
  ENVIADO_VISUALIZACAO: ['AGUARDANDO_APROVACAO', 'CANCELADO'],
  AGUARDANDO_APROVACAO: ['APROVADO', 'REVISAO_SOLICITADA', 'CANCELADO'],
  REVISAO_SOLICITADA: ['EM_ANDAMENTO', 'CANCELADO'],
  APROVADO: ['CONCLUIDO'],
  ATRASADO: ['EM_ANDAMENTO', 'CANCELADO'],
  ENTREGUE: [], // deprecated
  CONCLUIDO: [],
  CANCELADO: [],
};

// Helper: Verificar se transição é válida
export const isValidTransition = (from: OrderStatus, to: OrderStatus): boolean => {
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
};

// Helper: Obter próximos status válidos
export const getValidNextStatuses = (currentStatus: OrderStatus): OrderStatus[] => {
  return ORDER_STATUS_TRANSITIONS[currentStatus] ?? [];
};
