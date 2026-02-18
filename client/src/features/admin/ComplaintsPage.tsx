import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  MessageSquare,
  Clock,
  DollarSign,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  User,
  Building2,
  X,
} from 'lucide-react';
import { useComplaintsPaginated, useComplaintStats, useCollaborators } from './api';
import { ComplaintsKPIs } from './components/ComplaintsKPIs';
import { ComplaintDetailModal } from './components/ComplaintDetailModal';
import type { ComplaintWithSplit } from './types';
import { Select } from '@/components/ui';

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('pt-BR');
};

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  NOVO: { bg: 'bg-gray-500/20', border: 'border-gray-500/30', text: 'text-gray-300' },
  EM_ANDAMENTO: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-300' },
  AGUARDANDO_REVISAO: { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-300' },
  ENVIADO_VISUALIZACAO: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-300' },
  AGUARDANDO_APROVACAO: { bg: 'bg-indigo-500/20', border: 'border-indigo-500/30', text: 'text-indigo-300' },
  APROVADO: { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-300' },
  NAO_APROVADO: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-300' },
  CONCLUIDO: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-300' },
};

const statusLabels: Record<string, string> = {
  NOVO: 'Novo',
  EM_ANDAMENTO: 'Em Andamento',
  AGUARDANDO_REVISAO: 'Aguardando Revisao',
  ENVIADO_VISUALIZACAO: 'Enviado para Visualizacao',
  AGUARDANDO_APROVACAO: 'Aguardando Aprovacao',
  APROVADO: 'Aprovado',
  NAO_APROVADO: 'Nao Aprovado',
  CONCLUIDO: 'Concluido',
};

const priorityColors: Record<string, { bg: string; border: string; text: string }> = {
  HIGH: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-300' },
  MEDIUM: { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-300' },
  LOW: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-300' },
};

const priorityLabels: Record<string, string> = {
  HIGH: 'Urgente',
  MEDIUM: 'Medio',
  LOW: 'Baixo',
};

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10 por pagina' },
  { value: '20', label: '20 por pagina' },
  { value: '50', label: '50 por pagina' },
];

interface ComplaintCardProps {
  complaint: ComplaintWithSplit;
  onViewDetails: (complaint: ComplaintWithSplit) => void;
}

function ComplaintCard({ complaint, onViewDetails }: ComplaintCardProps) {
  const statusStyle = statusColors[complaint.status] || statusColors.NOVO;
  const priorityStyle = priorityColors[complaint.priority] || priorityColors.MEDIUM;

  return (
    <div className="group rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5 transition-all duration-300 hover:bg-black/40 hover:border-white/20 hover:shadow-lg hover:shadow-purple-500/10">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header Row */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-white group-hover:text-violet-300 transition-colors">
              {complaint.service_name}
            </h3>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium border ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}
            >
              {statusLabels[complaint.status] || complaint.status}
            </span>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium border ${priorityStyle.bg} ${priorityStyle.border} ${priorityStyle.text}`}
            >
              {priorityLabels[complaint.priority]}
            </span>
          </div>

          {/* Badges Row */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {complaint.revision_count > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 border border-red-500/30 px-2 py-1 text-xs font-medium text-red-300">
                <MessageSquare className="h-3 w-3" />
                {complaint.revision_count} revisao(oes)
              </span>
            )}
            {complaint.days_pending > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/20 border border-orange-500/30 px-2 py-1 text-xs font-medium text-orange-300">
                <Clock className="h-3 w-3" />
                {complaint.days_pending} dias pendente
              </span>
            )}
          </div>

          {/* Info Grid */}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <User className="h-3.5 w-3.5" />
                Aluno
              </div>
              <p className="mt-1 text-sm font-medium text-white truncate">
                {complaint.student_name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {complaint.student_email}
              </p>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Building2 className="h-3.5 w-3.5" />
                Colaborador
              </div>
              <p className="mt-1 text-sm font-medium text-white truncate">
                {complaint.collaborator_name}
              </p>
            </div>
          </div>

          {/* Value Split */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                <DollarSign className="h-3 w-3" />
                Total
              </div>
              <p className="mt-1 text-sm font-bold text-white">
                {formatCurrency(complaint.total_value)}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-emerald-400">
                <User className="h-3 w-3" />
                Colab
              </div>
              <p className="mt-1 text-sm font-bold text-emerald-300">
                {formatCurrency(complaint.collab_value)}
              </p>
            </div>
            <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-violet-400">
                <Building2 className="h-3 w-3" />
                Empresa
              </div>
              <p className="mt-1 text-sm font-bold text-violet-300">
                {formatCurrency(complaint.company_value)}
              </p>
            </div>
          </div>

          {/* Latest Reason */}
          {complaint.latest_reason && (
            <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-xs font-medium text-red-400">
                Motivo da ultima revisao:
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-red-300">
                {complaint.latest_reason}
              </p>
              {complaint.latest_revision_at && (
                <p className="mt-2 text-xs text-red-400/70">
                  Solicitado em: {formatDateTime(complaint.latest_revision_at)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Side - Actions */}
        <div className="ml-4 flex flex-col items-end gap-3">
          <div className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            {formatDate(complaint.due_date)}
          </div>
          <button
            onClick={() => onViewDetails(complaint)}
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-500/20 border border-violet-500/30 px-4 py-2 text-sm font-medium text-violet-300 transition-all duration-200 hover:bg-violet-500/30 hover:border-violet-500/40 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <Eye className="h-4 w-4" />
            Detalhes
          </button>
        </div>
      </div>
    </div>
  );
}

export function ComplaintsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [collaboratorFilter, setCollaboratorFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintWithSplit | null>(null);

  // Debounce search
  useMemo(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data, isLoading, error } = useComplaintsPaginated(
    page,
    pageSize,
    statusFilter || undefined,
    collaboratorFilter || undefined,
    debouncedSearch || undefined
  );

  const { data: stats, isLoading: isLoadingStats } = useComplaintStats();
  const { data: collaborators } = useCollaborators();

  const hasActiveFilters = statusFilter || collaboratorFilter;

  const clearFilters = () => {
    setStatusFilter('');
    setCollaboratorFilter('');
    setPage(1);
  };

  const handleStatusChange = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-complaints'] });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && (!data || newPage <= data.total_pages)) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-6 text-red-300 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5" />
        Erro ao carregar reclamacoes
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400/80" />
            <span>Gestao de qualidade</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-orange-400" />
            Reclamacoes e Revisoes
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-10 inline-flex items-center rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 px-4 text-sm font-medium text-gray-100">
            {data?.total || 0} itens
          </span>
          {stats && stats.total_aguardando_revisao > 0 && (
            <span className="h-10 inline-flex items-center gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 px-4 text-sm font-medium text-amber-300">
              <Clock className="h-4 w-4" />
              {stats.total_aguardando_revisao} aguardando
            </span>
          )}
        </div>
      </div>

      {/* KPIs */}
      <ComplaintsKPIs stats={stats} isLoading={isLoadingStats} />

      {/* Filters */}
      <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Buscar por aluno ou servico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-2xl bg-black/30 backdrop-blur-xl text-gray-100 placeholder-gray-500/60 border border-white/10 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 pl-10 pr-4 text-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'Todos os Status' },
                { value: 'AGUARDANDO_REVISAO', label: 'Aguardando Revisao' },
                { value: 'NAO_APROVADO', label: 'Nao Aprovado' },
              ]}
              placeholder="Todos os Status"
            />
          </div>

          {/* Collaborator Filter */}
          <Select
            value={collaboratorFilter}
            onValueChange={(value) => {
              setCollaboratorFilter(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Todos os Colaboradores' },
              ...(collaborators?.map((collab) => ({
                value: collab.id,
                label: collab.name,
              })) || []),
            ]}
            placeholder="Todos os Colaboradores"
          />

          {/* Page Size */}
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPage(1);
            }}
            options={PAGE_SIZE_OPTIONS}
            placeholder="10 por pagina"
          />

          {/* Clear Filters */}
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

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="h-6 w-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Complaints List */}
      {!isLoading && data && data.complaints.length > 0 ? (
        <>
          <div className="space-y-4">
            {data.complaints.map((complaint) => (
              <ComplaintCard
                key={complaint.id}
                complaint={complaint}
                onViewDetails={setSelectedComplaint}
              />
            ))}
          </div>

          {/* Pagination */}
          {data.total_pages > 1 && (
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm px-5 py-4">
              <div className="text-sm text-gray-400">
                Pagina <span className="text-white font-medium">{data.page}</span> de{' '}
                <span className="text-white font-medium">{data.total_pages}</span>{' '}
                <span className="text-gray-500">({data.total} total)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="h-10 inline-flex items-center gap-2 rounded-2xl bg-black/30 backdrop-blur-xl text-gray-100 border border-white/10 px-4 text-sm font-medium transition-all duration-200 hover:bg-black/50 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, data.total_pages) }, (_, i) => {
                    let pageNum: number;
                    if (data.total_pages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= data.total_pages - 2) {
                      pageNum = data.total_pages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`h-10 w-10 rounded-2xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
                          page === pageNum
                            ? 'bg-black/50 backdrop-blur-xl text-white border border-white/30'
                            : 'bg-black/30 backdrop-blur-xl text-gray-100 border border-white/10 hover:bg-black/50 hover:border-white/30'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= data.total_pages}
                  className="h-10 inline-flex items-center gap-2 rounded-2xl bg-black/30 backdrop-blur-xl text-gray-100 border border-white/10 px-4 text-sm font-medium transition-all duration-200 hover:bg-black/50 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Proximo
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : !isLoading ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-emerald-500/50 mx-auto mb-3" />
          <p className="text-lg font-medium text-white">
            Nenhuma reclamacao ou revisao pendente
          </p>
          <p className="mt-2 text-sm text-gray-400">
            Todos os trabalhos estao em dia
          </p>
        </div>
      ) : null}

      {/* Detail Modal */}
      {selectedComplaint && (
        <ComplaintDetailModal
          complaint={selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
