export type RankingCriteria = 'productivity' | 'revenue' | 'punctuality' | 'satisfaction' | 'quality';
export type RankingPeriod = 'this_month' | 'all_time';

export interface RankingEntry {
  position: number;
  collaborator_id: string;
  name: string;
  value: number;
  orders_count: number;
}

export interface RankingResponse {
  criteria: RankingCriteria;
  period: RankingPeriod;
  top_ten: RankingEntry[] | null;
  current_user?: RankingEntry;
  total_users: number;
}

export interface RatingInput {
  score: number;
  comment?: string;
}

export interface RankingSummaryEntry {
  criteria: RankingCriteria;
  position: number;
  value: number;
  total_users: number;
  orders_count: number;
}

export interface RankingSummaryResponse {
  entries: RankingSummaryEntry[];
}
