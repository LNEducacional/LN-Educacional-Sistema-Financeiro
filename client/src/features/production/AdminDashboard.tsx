import { useState, useEffect } from 'react';
import {
  Target,
  Filter,
  Briefcase,
  AlertTriangle,
  Clock,
  CheckCircle,
  Activity,
  X,
} from 'lucide-react';
import { useProductionJobs, useDelayedJobs, useFinancialSummary, useCollaboratorRanking } from './api';
import api from '../../lib/axios';
import { FinancialWidget } from './components/FinancialWidget';
import { JobsTable } from './components/JobsTable';
import { JobDetailModal } from './components/JobDetailModal';
import { ChangeStatusModal } from './components/ChangeStatusModal';
import { RankingWidget } from './components/RankingWidget';
import { AlertsWidget } from '../admin/components/AlertsWidget';
import { ProductivityStatsWidget } from '../admin/components/ProductivityStats';
import { ComplaintsWidget } from '../admin/components/ComplaintsWidget';
import { RevisionsWidget } from '../admin/components/RevisionsWidget';
import { FullRankingWidget } from '../admin/components/FullRankingWidget';
import type { ProductionJob, ProductionJobStatus } from './types';
import { Select } from '@/components/ui';

const JOB_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos os Status' },
  { value: 'NOVO', label: 'Novo' },
  { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
  { value: 'AGUARDANDO_REVISAO', label: 'Aguardando Revisao' },
  { value: 'ENVIADO_VISUALIZACAO', label: 'Enviado p/ Visualizacao' },
  { value: 'AGUARDANDO_APROVACAO', label: 'Aguardando Aprovacao' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'NAO_APROVADO', label: 'Nao Aprovado' },
  { value: 'CONCLUIDO', label: 'Concluido' },
];

export function AdminDashboard() {
  const { data: jobs, isLoading: jobsLoading, isError, error } = useProductionJobs();
  const { data: delayedJobs } = useDelayedJobs();
  const { data: financialData, isLoading: financialLoading } = useFinancialSummary();
  const { data: rankings, isLoading: rankingsLoading } = useCollaboratorRanking();

  const [selectedJob, setSelectedJob] = useState<ProductionJob | null>(null);
  const [statusModalJob, setStatusModalJob] = useState<ProductionJob | null>(null);
  const [statusModalAction, setStatusModalAction] = useState<'approve' | 'reject'>('approve');

  const [statusFilter, setStatusFilter] = useState<ProductionJobStatus | 'ALL'>('ALL');
  const [showOnlyDelayed, setShowOnlyDelayed] = useState(false);

  // Track delinquent students
  const [delinquentStudents, setDelinquentStudents] = useState<Set<string>>(new Set());

  // Check delinquency for all unique students in jobs
  useEffect(() => {
    if (!jobs || jobs.length === 0) return;

    const studentIds = [...new Set(jobs.map((j) => j.student_id))];

    const checkDelinquency = async () => {
      const delinquent = new Set<string>();

      // Check each student's delinquency status in parallel
      const results = await Promise.allSettled(
        studentIds.map(async (studentId) => {
          const response = await api.get(`/api/production/student/${studentId}/delinquency`);
          return { studentId, isDelinquent: response.data?.is_delinquent ?? false };
        })
      );

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.isDelinquent) {
          delinquent.add(result.value.studentId);
        }
      });

      setDelinquentStudents(delinquent);
    };

    checkDelinquency();
  }, [jobs]);

  const filteredJobs = jobs?.filter((job) => {
    if (showOnlyDelayed) {
      const isDelayed = delayedJobs?.some((d) => d.id === job.id);
      if (!isDelayed) return false;
    }
    if (statusFilter !== 'ALL' && job.status !== statusFilter) return false;
    return true;
  }) ?? [];

  const handleApprove = (job: ProductionJob) => {
    setStatusModalJob(job);
    setStatusModalAction('approve');
  };

  const handleReject = (job: ProductionJob) => {
    setStatusModalJob(job);
    setStatusModalAction('reject');
  };

  const handleStatusModalClose = () => {
    setStatusModalJob(null);
  };

  const handleStatusModalSuccess = () => {
    setStatusModalJob(null);
  };

  const hasActiveFilters = statusFilter !== 'ALL' || showOnlyDelayed;

  const clearFilters = () => {
    setStatusFilter('ALL');
    setShowOnlyDelayed(false);
  };

  // Calculate stats
  const totalJobs = jobs?.length ?? 0;
  const delayedCount = delayedJobs?.length ?? 0;
  const pendingApproval = jobs?.filter((j) => j.status === 'AGUARDANDO_APROVACAO').length ?? 0;
  const activeJobs = jobs?.filter((j) => j.status === 'EM_ANDAMENTO').length ?? 0;

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-6 text-red-300 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5" />
        Erro ao carregar dados: {(error as Error)?.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400/80" />
            <span>Gestao de producao</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
            <Target className="h-7 w-7 text-violet-400" />
            Cockpit de Producao
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-10 inline-flex items-center rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 px-4 text-sm font-medium text-gray-100">
            <Briefcase className="h-4 w-4 mr-2 text-violet-400" />
            {totalJobs} jobs
          </span>
          <span className="h-10 inline-flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 text-sm font-medium text-emerald-300">
            <Activity className="h-4 w-4" />
            {activeJobs} em andamento
          </span>
          {delayedCount > 0 && (
            <span className="h-10 inline-flex items-center gap-2 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 text-sm font-medium text-red-300">
              <AlertTriangle className="h-4 w-4" />
              {delayedCount} atrasados
            </span>
          )}
        </div>
      </div>

      {/* Financial Summary */}
      <FinancialWidget
        data={financialData}
        isLoading={financialLoading}
        variant="admin"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Briefcase className="h-3.5 w-3.5" />
            Total de Jobs
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">{totalJobs}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-sm p-5">
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <Activity className="h-3.5 w-3.5" />
            Em Andamento
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-300">{activeJobs}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 backdrop-blur-sm p-5">
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            Aguardando Aprovacao
          </div>
          <p className="mt-2 text-3xl font-bold text-amber-300">{pendingApproval}</p>
        </div>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 backdrop-blur-sm p-5">
          <div className="flex items-center gap-2 text-xs text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Atrasados
          </div>
          <p className="mt-2 text-3xl font-bold text-red-300">{delayedCount}</p>
        </div>
      </div>

      {/* Alerts and Productivity Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <AlertsWidget />
        <ProductivityStatsWidget />
        <RevisionsWidget />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Jobs Table - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters */}
          <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as ProductionJobStatus | 'ALL')}
                  options={JOB_STATUS_OPTIONS}
                  placeholder="Todos os Status"
                />
              </div>

              <button
                onClick={() => setShowOnlyDelayed(!showOnlyDelayed)}
                className={`h-10 inline-flex items-center gap-2 rounded-2xl backdrop-blur-xl px-4 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
                  showOnlyDelayed
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : 'bg-black/30 text-gray-100 border border-white/10 hover:bg-black/50 hover:border-white/30'
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                Somente Atrasados
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="h-10 inline-flex items-center gap-2 rounded-2xl bg-black/30 backdrop-blur-xl text-gray-100 border border-white/10 px-4 text-sm font-medium transition-all duration-200 hover:bg-black/50 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <X className="h-4 w-4" />
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          <JobsTable
            jobs={filteredJobs}
            isLoading={jobsLoading}
            onViewDetails={setSelectedJob}
            onApprove={handleApprove}
            onReject={handleReject}
            showStudentColumn={true}
            showCollaboratorColumn={true}
            showActions={true}
            delinquentStudents={delinquentStudents}
          />

          {/* Complaints Widget below the table */}
          <ComplaintsWidget />
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          <RankingWidget rankings={rankings ?? []} isLoading={rankingsLoading} />

          {/* Weekly Payable Widget */}
          <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
              <CheckCircle className="h-3.5 w-3.5" />
              Total a Pagar na Semana
            </div>
            <p className="text-3xl font-bold text-violet-300">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(financialData?.weekly_payable ?? 0)}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {jobs?.filter((j) => j.status === 'APROVADO').length ?? 0} jobs a liberar
            </p>
          </div>
        </div>
      </div>

      {/* Full Rankings Section */}
      <FullRankingWidget />

      {/* Job Detail Modal */}
      {selectedJob && (
        <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}

      {/* Change Status Modal */}
      {statusModalJob && (
        <ChangeStatusModal
          job={statusModalJob}
          action={statusModalAction}
          onClose={handleStatusModalClose}
          onSuccess={handleStatusModalSuccess}
        />
      )}
    </div>
  );
}
