import { BarChart3, AlertTriangle } from 'lucide-react';
import { KPICards, OrderStats } from './components/KPICards';
import { FinancialChart } from './components/FinancialChart';
import { DelinquentsTable } from './components/DelinquentsTable';
import { RefundsWidget } from './components/RefundsWidget';
import { RevisionsWidget } from './components/RevisionsWidget';
import { AlertsWidget } from './components/AlertsWidget';
import { ActiveJobsTable } from './components/ActiveJobsTable';
import { ComplaintsWidget } from './components/ComplaintsWidget';
import { ProductivityStatsWidget } from './components/ProductivityStats';
import { CollaboratorsRanking } from './components/CollaboratorsRanking';
import { PendingWithdrawalsWidget } from './components/PendingWithdrawalsWidget';
import { OpenChargesWidget } from './components/OpenChargesWidget';
import { useReportsDashboard } from './hooks';

/**
 * Dashboard de relatorios administrativos
 *
 * Componente de orquestracao - toda logica de dados no hook useReportsDashboard.
 * O hook dispara todas as queries em paralelo e os dados sao passados como props
 * para os widgets, evitando waterfall de requisicoes.
 */
export const ReportsDashboard = () => {
  const {
    kpis,
    chart,
    delinquents,
    alerts,
    revisions,
    productivity,
    complaints,
    collaborators,
    refunds,
    pendingWithdrawals,
    openCharges,
  } = useReportsDashboard();

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400/80" />
            <span>Relatorios e metricas</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-violet-400" />
            Dashboard Financeiro
          </h1>
        </div>
        {alerts.count > 0 && (
          <span className="h-10 inline-flex items-center gap-2 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 text-sm font-medium text-red-300">
            <AlertTriangle className="h-4 w-4" />
            {alerts.count} alertas pendentes
          </span>
        )}
      </header>

      {/* KPIs principais */}
      <KPICards data={kpis.data} isLoading={kpis.isLoading} />

      {/* Saques pendentes e cobrancas em aberto */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PendingWithdrawalsWidget data={pendingWithdrawals.data} isLoading={pendingWithdrawals.isLoading} />
        <OpenChargesWidget data={openCharges.data} isLoading={openCharges.isLoading} />
      </section>

      {/* Widgets de estatisticas */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <OrderStats data={kpis.data} isLoading={kpis.isLoading} />
        <RevisionsWidget data={revisions.data} isLoading={revisions.isLoading} />
        <AlertsWidget data={alerts.data} isLoading={alerts.isLoading} />
      </section>

      {/* Grafico financeiro */}
      <FinancialChart
        monthlyData={chart.monthly}
        weeklyData={chart.weekly}
        quarterlyData={chart.quarterly}
        yearlyData={chart.yearly}
        isLoadingMonthly={chart.isLoadingMonthly}
        isLoadingWeekly={chart.isLoadingWeekly}
        isLoadingQuarterly={chart.isLoadingQuarterly}
        isLoadingYearly={chart.isLoadingYearly}
      />

      {/* Produtividade e ranking */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProductivityStatsWidget data={productivity.data} isLoading={productivity.isLoading} />
        <CollaboratorsRanking data={collaborators.data} isLoading={collaborators.isLoading} />
      </section>

      {/* Trabalhos ativos - mantem query interna por ter paginacao */}
      <ActiveJobsTable />

      {/* Reclamacoes e inadimplentes */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComplaintsWidget data={complaints.data} isLoading={complaints.isLoading} />
        <DelinquentsTable data={delinquents.data} isLoading={delinquents.isLoading} />
      </section>

      {/* Reembolsos */}
      <RefundsWidget data={refunds.data} isLoading={refunds.isLoading} />
    </div>
  );
};
