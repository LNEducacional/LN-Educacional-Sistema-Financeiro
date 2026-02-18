// ============ ORDER STATUS ============
export const ORDER_STATUS_LABELS: Record<string, string> = {
  NOVO: 'Novo Pedido',
  EM_ANDAMENTO: 'Em Andamento',
  AGUARDANDO_REVISAO: 'Aguardando Revisão Interna',
  ENVIADO_VISUALIZACAO: 'Enviado para Visualização',
  AGUARDANDO_APROVACAO: 'Aguardando Aprovação do Cliente',
  APROVADO: 'Aprovado',
  REVISAO_SOLICITADA: 'Revisão Solicitada pelo Cliente',
  CONCLUIDO: 'Concluído',
  ATRASADO: 'Atrasado',
  CANCELADO: 'Cancelado',
  ENTREGUE: 'Entregue', // deprecated
} as const;

export const ORDER_STATUS_ACTION_LABELS: Record<string, string> = {
  EM_ANDAMENTO: 'Iniciar Trabalho',
  AGUARDANDO_REVISAO: 'Solicitar Revisão Interna',
  ENVIADO_VISUALIZACAO: 'Enviar para Cliente',
  AGUARDANDO_APROVACAO: 'Aguardando Aprovação',
  APROVADO: 'Aprovar',
  REVISAO_SOLICITADA: 'Solicitar Revisão',
  CONCLUIDO: 'Concluir',
  CANCELADO: 'Cancelar',
  ATRASADO: 'Marcar como Atrasado',
} as const;

// ============ DISPUTE STATUS ============
export const DISPUTE_STATUS_LABELS: Record<string, string> = {
  ABERTA: 'Aberta',
  EM_ANALISE: 'Em Análise',
  AGUARDANDO_RESPOSTA: 'Aguardando Resposta',
  RESOLVIDA: 'Resolvida',
  CANCELADA: 'Cancelada',
} as const;

export const DISPUTE_RESOLUTION_LABELS: Record<string, string> = {
  FAVOR_ALUNO: 'A Favor do Aluno',
  FAVOR_COLABORADOR: 'A Favor do Colaborador',
  ACORDO: 'Acordo Entre Partes',
  PARCIAL: 'Resolução Parcial',
} as const;

// ============ USER ROLES ============
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  COLLABORATOR: 'Colaborador',
  STUDENT: 'Aluno',
  FINANCEIRO: 'Financeiro',
} as const;

// ============ PAYMENT STATUS ============
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  LOCKED: 'Retido',
  RELEASED: 'Liberado',
  REFUNDED: 'Reembolsado',
  ON_HOLD: 'Em Disputa',
} as const;

// ============ BADGE VARIANTS ============
export type BadgeVariant = 'default' | 'info' | 'warning' | 'success' | 'error' | 'secondary';

export const ORDER_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  NOVO: 'info',
  EM_ANDAMENTO: 'warning',
  AGUARDANDO_REVISAO: 'secondary',
  ENVIADO_VISUALIZACAO: 'info',
  AGUARDANDO_APROVACAO: 'warning',
  APROVADO: 'success',
  REVISAO_SOLICITADA: 'error',
  ATRASADO: 'error',
  ENTREGUE: 'secondary',
  CONCLUIDO: 'success',
  CANCELADO: 'default',
} as const;

export const DISPUTE_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  ABERTA: 'error',
  EM_ANALISE: 'warning',
  AGUARDANDO_EVIDENCIAS: 'info',
  RESOLVIDA_FAVOR_ALUNO: 'success',
  RESOLVIDA_FAVOR_COLABORADOR: 'success',
  RESOLVIDA_ACORDO: 'success',
  FECHADA: 'default',
  CANCELADA: 'secondary',
} as const;

export const PAYMENT_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  PENDING: 'warning',
  LOCKED: 'info',
  RELEASED: 'success',
  REFUNDED: 'error',
  ON_HOLD: 'warning',
} as const;

// ============ PRODUCTION JOB STATUS (deprecated - migrating to orders) ============
export const PRODUCTION_STATUS_LABELS: Record<string, string> = {
  AGUARDANDO_ATRIBUICAO: 'Aguardando Atribuição',
  EM_ANDAMENTO: 'Em Andamento',
  AGUARDANDO_REVISAO: 'Aguardando Revisão',
  NAO_APROVADO: 'Não Aprovado',
  APROVADO: 'Aprovado',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
} as const;

export const PRODUCTION_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  AGUARDANDO_ATRIBUICAO: 'warning',
  EM_ANDAMENTO: 'info',
  AGUARDANDO_REVISAO: 'secondary',
  NAO_APROVADO: 'error',
  APROVADO: 'success',
  CONCLUIDO: 'success',
  CANCELADO: 'default',
} as const;
