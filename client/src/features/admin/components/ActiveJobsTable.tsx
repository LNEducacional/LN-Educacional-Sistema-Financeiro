import { useState, useCallback } from 'react';
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Filter,
  X,
} from 'lucide-react';
import { TableSkeleton, Select } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useActiveJobs } from '../api';
import type { ActiveJob } from '../types';

type SortField = 'service_name' | 'student_name' | 'collaborator_name' | 'status' | 'due_date' | 'total_value';
type SortDirection = 'asc' | 'desc';

const STATUS_STYLES: Record<string, string> = {
  NOVO: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  EM_ANDAMENTO: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  AGUARDANDO_REVISAO: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  ENVIADO_VISUALIZACAO: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  AGUARDANDO_APROVACAO: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  NAO_APROVADO: 'bg-red-500/20 text-red-300 border-red-500/30',
  ATRASADO: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  NOVO: 'Novo',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_REVISAO: 'Aguardando revisao',
  ENVIADO_VISUALIZACAO: 'Enviado',
  AGUARDANDO_APROVACAO: 'Aguardando aprovacao',
  NAO_APROVADO: 'Nao aprovado',
  ATRASADO: 'Atrasado',
};

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'NOVO', label: 'Novo' },
  { value: 'EM_ANDAMENTO', label: 'Em andamento' },
  { value: 'AGUARDANDO_REVISAO', label: 'Aguardando revisao' },
  { value: 'ENVIADO_VISUALIZACAO', label: 'Enviado' },
  { value: 'AGUARDANDO_APROVACAO', label: 'Aguardando aprovacao' },
  { value: 'NAO_APROVADO', label: 'Nao aprovado' },
];

const COLUMNS: { field: SortField; label: string; align?: 'right' }[] = [
  { field: 'service_name', label: 'Servico' },
  { field: 'student_name', label: 'Aluno' },
  { field: 'collaborator_name', label: 'Colaborador' },
  { field: 'status', label: 'Status' },
  { field: 'due_date', label: 'Entrega' },
  { field: 'total_value', label: 'Valor', align: 'right' },
];

const getDaysColor = (days: number): string => {
  if (days < 0) return 'text-red-400 font-semibold';
  if (days === 0) return 'text-amber-400 font-semibold';
  if (days <= 2) return 'text-amber-300';
  return 'text-gray-400';
};

const getDaysText = (days: number): string => {
  if (days < 0) return `${Math.abs(days)} dias atrasado`;
  if (days === 0) return 'Vence hoje';
  return `${days} dias restantes`;
};

const SortIcon = ({
  field,
  sortField,
  sortDirection,
}: {
  field: SortField;
  sortField: SortField | null;
  sortDirection: SortDirection;
}) => {
  if (sortField !== field) {
    return <ChevronsUpDown className="h-4 w-4 opacity-50" />;
  }
  return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
};

export const ActiveJobsTable = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { data, isLoading } = useActiveJobs(
    page,
    10,
    status || undefined,
    undefined,
    sortField || undefined,
    sortField ? sortDirection : undefined
  );

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
      setPage(1);
    },
    [sortField]
  );

  if (isLoading && !data) {
    return <TableSkeleton rows={5} />;
  }

  const jobs = data?.jobs ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm">
      {/* Header */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Trabalhos Ativos</h3>
            <span className="bg-blue-500/20 text-blue-300 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
              {total}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`h-10 inline-flex items-center gap-1.5 px-4 rounded-2xl text-sm font-medium cursor-pointer transition-all duration-200 ${
              showFilters || status
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'bg-black/30 text-gray-100 border border-white/10 hover:bg-black/50 hover:border-white/30'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filtros
            {status && <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">1</span>}
          </button>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Status:</label>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
                options={STATUS_OPTIONS}
                placeholder="Todos os status"
              />
            </div>
            {status && (
              <button
                type="button"
                onClick={() => {
                  setStatus('');
                  setPage(1);
                }}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto custom-scrollbar-dark">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              {COLUMNS.map(({ field, label, align }) => (
                <th
                  key={field}
                  onClick={() => handleSort(field)}
                  className={`px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-200 transition-colors ${
                    align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
                    {label}
                    <SortIcon field={field} sortField={sortField} sortDirection={sortDirection} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  Nenhum trabalho ativo encontrado
                </td>
              </tr>
            ) : (
              jobs.map((job: ActiveJob) => (
                <tr key={job.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-white truncate max-w-[200px]">{job.service_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-400 truncate max-w-[150px]">{job.student_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-400 truncate max-w-[150px]">{job.collaborator_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${
                        STATUS_STYLES[job.status] ?? 'bg-white/10 text-gray-300 border-white/20'
                      }`}
                    >
                      {STATUS_LABELS[job.status] ?? job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-gray-400">{formatDate(job.due_date)}</p>
                      <p className={`text-xs ${getDaysColor(job.days_until_due)}`}>{getDaysText(job.days_until_due)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-medium text-white">{formatCurrency(job.total_value)}</p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginacao */}
      <div className="px-4 sm:px-6 py-4 border-t border-white/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          Pagina {page} de {totalPages || 1} ({total} trabalhos)
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="p-2 rounded-xl border border-white/10 text-gray-400 cursor-pointer hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Primeira pagina"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 rounded-xl border border-white/10 text-gray-400 cursor-pointer hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Pagina anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages || 1, page + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="p-2 rounded-xl border border-white/10 text-gray-400 cursor-pointer hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Proxima pagina"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPage(totalPages || 1)}
            disabled={page === totalPages || totalPages === 0}
            className="p-2 rounded-xl border border-white/10 text-gray-400 cursor-pointer hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Ultima pagina"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
