import { useState } from 'react';
import { Eye, ChevronUp, ChevronDown, Briefcase } from 'lucide-react';
import type { ProductionJob } from '../types';
import { StatusBadge } from './StatusBadge';
import { DelinquencyAlert } from './DelinquencyAlert';

interface JobsTableProps {
  jobs: ProductionJob[];
  isLoading?: boolean;
  onViewDetails: (job: ProductionJob) => void;
  onApprove?: (job: ProductionJob) => void;
  onReject?: (job: ProductionJob) => void;
  showStudentColumn?: boolean;
  showCollaboratorColumn?: boolean;
  showActions?: boolean;
  delinquentStudents?: Set<string>;
}

type SortField = 'title' | 'price' | 'deadline' | 'status';
type SortDirection = 'asc' | 'desc';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR');
}

function isOverdue(deadline: string, status: string): boolean {
  if (status === 'CONCLUIDO' || status === 'NAO_APROVADO') return false;
  return new Date(deadline) < new Date();
}

export function JobsTable({
  jobs,
  isLoading,
  onViewDetails,
  onApprove,
  onReject,
  showStudentColumn = false,
  showCollaboratorColumn = false,
  showActions = false,
  delinquentStudents = new Set(),
}: JobsTableProps) {
  const [sortField, setSortField] = useState<SortField>('deadline');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedJobs = [...jobs].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'price':
        comparison = a.price - b.price;
        break;
      case 'deadline':
        comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 inline h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 inline h-4 w-4" />
    );
  };

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm overflow-hidden">
        <div className="h-12 bg-white/5" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 border-t border-white/5 bg-white/[0.02]" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-8 text-center">
        <Briefcase className="h-12 w-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">Nenhum trabalho encontrado</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm">
      <table className="min-w-full divide-y divide-white/5">
        <thead className="bg-white/5">
          <tr>
            <th
              className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 hover:text-gray-200 transition-colors"
              onClick={() => handleSort('title')}
            >
              Titulo <SortIcon field="title" />
            </th>
            {showStudentColumn && (
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Aluno
              </th>
            )}
            {showCollaboratorColumn && (
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Colaborador
              </th>
            )}
            <th
              className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 hover:text-gray-200 transition-colors"
              onClick={() => handleSort('price')}
            >
              Valor <SortIcon field="price" />
            </th>
            <th
              className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 hover:text-gray-200 transition-colors"
              onClick={() => handleSort('status')}
            >
              Status <SortIcon field="status" />
            </th>
            <th
              className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 hover:text-gray-200 transition-colors"
              onClick={() => handleSort('deadline')}
            >
              Deadline <SortIcon field="deadline" />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
              Acoes
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {sortedJobs.map((job) => {
            const overdue = isOverdue(job.deadline, job.status);
            const isDelinquent = delinquentStudents.has(job.student_id);

            return (
              <tr key={job.id} className="hover:bg-white/5 transition-colors">
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="font-medium text-white">{job.title}</span>
                </td>
                {showStudentColumn && (
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-1">
                      <DelinquencyAlert isDelinquent={isDelinquent} />
                      <span className="text-gray-400">{job.student_id.slice(0, 8)}...</span>
                    </div>
                  </td>
                )}
                {showCollaboratorColumn && (
                  <td className="whitespace-nowrap px-6 py-4 text-gray-400">
                    {job.collaborator_id ? `${job.collaborator_id.slice(0, 8)}...` : '-'}
                  </td>
                )}
                <td className="whitespace-nowrap px-6 py-4 text-gray-300">
                  {formatCurrency(job.price)}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <StatusBadge status={job.status} />
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className={overdue ? 'font-medium text-red-400' : 'text-gray-400'}>
                    {formatDate(job.deadline)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewDetails(job)}
                      className="rounded-xl p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                      title="Ver detalhes"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    {showActions && job.status === 'AGUARDANDO_APROVACAO' && (
                      <>
                        <button
                          onClick={() => onApprove?.(job)}
                          className="rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => onReject?.(job)}
                          className="rounded-xl bg-red-500/20 border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/30 transition-colors"
                        >
                          Reprovar
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
