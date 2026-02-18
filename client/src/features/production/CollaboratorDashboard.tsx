import { useState } from 'react';
import { Briefcase } from 'lucide-react';
import { useMyProductionJobs, useFinancialSummary } from './api';
import { FinancialWidget } from './components/FinancialWidget';
import { JobsTable } from './components/JobsTable';
import { JobDetailModal } from './components/JobDetailModal';
import type { ProductionJob, ProductionJobStatus } from './types';
import { Select } from '@/components/ui';

const JOB_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'NOVO', label: 'Novo' },
  { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
  { value: 'AGUARDANDO_REVISAO', label: 'Aguardando Revisao' },
  { value: 'ENVIADO_VISUALIZACAO', label: 'Enviado p/ Visualizacao' },
  { value: 'AGUARDANDO_APROVACAO', label: 'Aguardando Aprovacao' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'NAO_APROVADO', label: 'Nao Aprovado' },
  { value: 'CONCLUIDO', label: 'Concluido' },
];

export function CollaboratorDashboard() {
  const { data: jobs, isLoading: jobsLoading, isError, error } = useMyProductionJobs();
  const { data: financialData, isLoading: financialLoading } = useFinancialSummary();

  const [selectedJob, setSelectedJob] = useState<ProductionJob | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProductionJobStatus | 'ALL'>('ALL');

  const filteredJobs = jobs?.filter((job) => {
    if (statusFilter === 'ALL') return true;
    return job.status === statusFilter;
  }) ?? [];

  if (isError) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-700">
        Erro ao carregar dados: {(error as Error)?.message}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <Briefcase className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Minha Producao</h1>
          <p className="text-slate-500">Acompanhe seus trabalhos e ganhos</p>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="mb-8">
        <FinancialWidget
          data={financialData}
          isLoading={financialLoading}
          variant="collaborator"
        />
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <label className="text-sm font-medium text-gray-700">Filtrar por status:</label>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as ProductionJobStatus | 'ALL')}
          options={JOB_STATUS_OPTIONS}
          placeholder="Todos"
        />
      </div>

      {/* Jobs Table */}
      <JobsTable
        jobs={filteredJobs}
        isLoading={jobsLoading}
        onViewDetails={setSelectedJob}
        showStudentColumn={false}
        showCollaboratorColumn={false}
        showActions={false}
      />

      {/* Job Detail Modal */}
      {selectedJob && (
        <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}
