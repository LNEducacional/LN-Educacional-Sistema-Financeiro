/** Enum de areas disponiveis para servicos */
export type ServiceArea = 'DIREITO' | 'PEDAGOGIA' | 'CONTABILIDADE' | 'ENFERMAGEM' | 'OUTROS';

/** Labels amigaveis para cada area */
export const SERVICE_AREA_LABELS: Record<ServiceArea, string> = {
  DIREITO: 'Direito',
  PEDAGOGIA: 'Pedagogia',
  CONTABILIDADE: 'Contabilidade',
  ENFERMAGEM: 'Enfermagem',
  OUTROS: 'Outros',
};

/** Lista de areas para selects */
export const SERVICE_AREAS: ServiceArea[] = ['DIREITO', 'PEDAGOGIA', 'CONTABILIDADE', 'ENFERMAGEM', 'OUTROS'];

/** Tipos de trabalho predefinidos */
export const WORK_TYPES = [
  'Monografia',
  'TCC',
  'Artigo',
  'Dissertacao',
  'Tese',
  'Relatorio',
  'Fichamento',
  'Resenha',
  'Projeto',
  'Outro',
] as const;

export type WorkType = (typeof WORK_TYPES)[number];

/** Modelo de servico retornado pela API */
export interface Service {
  id: string;
  name: string;
  area: ServiceArea;
  work_type: string | null;
  total_value: number;
  company_percent: number;
  collaborator_percent: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** Servico com contagem de uso */
export interface ServiceWithUsage extends Service {
  orders_count: number;
}

/** Resposta paginada de servicos */
export interface ServicesListResponse {
  services: ServiceWithUsage[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** Estatisticas de servicos */
export interface ServiceAreaCount {
  area: ServiceArea;
  count: number;
}

export interface ServiceUsageRank {
  id: string;
  name: string;
  orders_count: number;
  total_value: number;
}

export interface ServiceStats {
  total_active: number;
  total_inactive: number;
  avg_value: number;
  avg_company_pct: number;
  avg_collab_pct: number;
  total_orders: number;
  by_area: ServiceAreaCount[];
  top_used: ServiceUsageRank[];
}

/** Request para criar servico */
export interface CreateServiceRequest {
  name: string;
  area: ServiceArea;
  work_type?: string;
  total_value: number;
  company_percent: number;
  collaborator_percent: number;
}

/** Request para atualizar servico */
export interface UpdateServiceRequest {
  name?: string;
  area?: ServiceArea;
  work_type?: string;
  total_value?: number;
  company_percent?: number;
  collaborator_percent?: number;
  active?: boolean;
}
