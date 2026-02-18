import { useMemo } from 'react';
import {
  useFinancialKPIs,
  useMonthlyFinancials,
  useWeeklyFinancials,
  useDelinquentUsers,
  useAlerts,
  useRevisionSummary,
  useProductivityStats,
  useComplaints,
  useCollaborators,
  useRefunds,
  usePendingWithdrawalsSummary,
  useOpenChargesSummary,
} from '../api';
import type {
  MonthlyFinancial,
  WeeklyFinancial,
  DelinquentUser,
  FinancialKPIs,
  AlertsResponse,
  RevisionSummary,
  ProductivityStats,
  ComplaintItem,
  CollaboratorSummary,
  RefundReport,
  PendingWithdrawalsSummary,
  OpenChargesSummary,
} from '../types';

interface ChartData {
  monthly: MonthlyFinancial[] | undefined;
  weekly: WeeklyFinancial[] | undefined;
  quarterly: MonthlyFinancial[] | undefined;
  yearly: MonthlyFinancial[] | undefined;
  isLoadingMonthly: boolean;
  isLoadingWeekly: boolean;
  isLoadingQuarterly: boolean;
  isLoadingYearly: boolean;
}

interface QueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
}

interface ReportsDashboardData {
  /** Dados dos KPIs */
  kpis: QueryResult<FinancialKPIs>;
  /** Dados para o grafico financeiro */
  chart: ChartData;
  /** Dados de usuarios inadimplentes */
  delinquents: QueryResult<DelinquentUser[]>;
  /** Dados de alertas */
  alerts: QueryResult<AlertsResponse> & { count: number };
  /** Dados de revisoes */
  revisions: QueryResult<RevisionSummary>;
  /** Dados de produtividade */
  productivity: QueryResult<ProductivityStats>;
  /** Dados de reclamacoes */
  complaints: QueryResult<ComplaintItem[]>;
  /** Dados de colaboradores */
  collaborators: QueryResult<CollaboratorSummary[]>;
  /** Dados de reembolsos */
  refunds: QueryResult<RefundReport>;
  /** Dados de saques pendentes */
  pendingWithdrawals: QueryResult<PendingWithdrawalsSummary>;
  /** Dados de cobrancas em aberto */
  openCharges: QueryResult<OpenChargesSummary>;
  /** Estado geral de carregamento inicial */
  isInitialLoading: boolean;
}

/**
 * Hook que centraliza toda a logica de dados do ReportsDashboard
 *
 * Todas as queries sao disparadas em paralelo para evitar waterfall.
 * Os dados sao passados como props para os widgets, que nao precisam
 * fazer suas proprias queries.
 */
export const useReportsDashboard = (): ReportsDashboardData => {
  // === QUERIES CRITICAS (acima do fold) ===
  // Disparadas primeiro e mostram skeleton se pendentes

  // KPIs principais
  const kpisQuery = useFinancialKPIs();

  // Alertas do sistema
  const alertsQuery = useAlerts();

  // === QUERIES DO GRAFICO ===
  // Monthly 6 meses para visualizacao mensal
  const monthlyQuery = useMonthlyFinancials(6);
  // Weekly 8 semanas para visualizacao semanal
  const weeklyQuery = useWeeklyFinancials(8);
  // 12 meses para agregacao trimestral
  const quarterlyQuery = useMonthlyFinancials(12);
  // 36 meses para agregacao anual
  const yearlyQuery = useMonthlyFinancials(36);

  // === QUERIES DE WIDGETS ===
  // Todas disparadas em paralelo para carregamento rapido

  // Revisoes
  const revisionsQuery = useRevisionSummary();

  // Produtividade
  const productivityQuery = useProductivityStats();

  // Reclamacoes
  const complaintsQuery = useComplaints();

  // Colaboradores (para ranking)
  const collaboratorsQuery = useCollaborators();

  // Inadimplentes
  const delinquentsQuery = useDelinquentUsers();

  // Reembolsos
  const refundsQuery = useRefunds();

  // Saques pendentes
  const pendingWithdrawalsQuery = usePendingWithdrawalsSummary();

  // Cobrancas em aberto
  const openChargesQuery = useOpenChargesSummary();

  // Contagem de alertas derivada
  const alertCount = useMemo(() => alertsQuery.data?.total_count ?? 0, [alertsQuery.data?.total_count]);

  // Estado de carregamento inicial (KPIs e alertas sao mais importantes)
  const isInitialLoading = useMemo(
    () => kpisQuery.isLoading && alertsQuery.isLoading,
    [kpisQuery.isLoading, alertsQuery.isLoading]
  );

  return {
    kpis: {
      data: kpisQuery.data,
      isLoading: kpisQuery.isLoading,
    },
    chart: {
      monthly: monthlyQuery.data,
      weekly: weeklyQuery.data,
      quarterly: quarterlyQuery.data,
      yearly: yearlyQuery.data,
      isLoadingMonthly: monthlyQuery.isLoading,
      isLoadingWeekly: weeklyQuery.isLoading,
      isLoadingQuarterly: quarterlyQuery.isLoading,
      isLoadingYearly: yearlyQuery.isLoading,
    },
    delinquents: {
      data: delinquentsQuery.data,
      isLoading: delinquentsQuery.isLoading,
    },
    alerts: {
      data: alertsQuery.data,
      isLoading: alertsQuery.isLoading,
      count: alertCount,
    },
    revisions: {
      data: revisionsQuery.data,
      isLoading: revisionsQuery.isLoading,
    },
    productivity: {
      data: productivityQuery.data,
      isLoading: productivityQuery.isLoading,
    },
    complaints: {
      data: complaintsQuery.data,
      isLoading: complaintsQuery.isLoading,
    },
    collaborators: {
      data: collaboratorsQuery.data,
      isLoading: collaboratorsQuery.isLoading,
    },
    refunds: {
      data: refundsQuery.data,
      isLoading: refundsQuery.isLoading,
    },
    pendingWithdrawals: {
      data: pendingWithdrawalsQuery.data,
      isLoading: pendingWithdrawalsQuery.isLoading,
    },
    openCharges: {
      data: openChargesQuery.data,
      isLoading: openChargesQuery.isLoading,
    },
    isInitialLoading,
  };
};
