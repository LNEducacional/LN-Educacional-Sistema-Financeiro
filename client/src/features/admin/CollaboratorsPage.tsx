import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCollaboratorsPaginated } from './api';
import { AddCollaboratorModal } from './components/AddCollaboratorModal';
import type { CollaboratorSummary } from './types';
import {
  Users,
  Star,
  Clock,
  DollarSign,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  UserPlus,
  Search,
  AlertTriangle,
  Activity,
  Trophy,
} from 'lucide-react';
import { Select } from '@/components/ui';

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

const PAGE_SIZE_OPTIONS = [
  { value: '12', label: '12 por pagina' },
  { value: '24', label: '24 por pagina' },
  { value: '48', label: '48 por pagina' },
];
const MIN_RATING_OPTIONS = [
  { value: '0', label: 'Todas as avaliacoes' },
  { value: '3', label: '3+ estrelas' },
  { value: '4', label: '4+ estrelas' },
  { value: '4.5', label: '4.5+ estrelas' },
];

interface CollaboratorCardProps {
  collaborator: CollaboratorSummary;
}

function CollaboratorCard({ collaborator }: CollaboratorCardProps) {
  const isActive = collaborator.pending_jobs > 0;

  return (
    <Link
      to={`/admin/collaborators/${collaborator.id}`}
      className="group block rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5 transition-all duration-300 hover:bg-black/40 hover:border-white/20 hover:shadow-lg hover:shadow-purple-500/10"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white group-hover:text-violet-300 transition-colors">
              {collaborator.name}
            </h3>
            {isActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-xs font-medium text-emerald-300">
                <Activity className="h-3 w-3" />
                Ativo
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">{collaborator.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {collaborator.specialty && (
              <span className="inline-block rounded-full bg-violet-500/20 border border-violet-500/30 px-3 py-1 text-xs font-medium text-violet-300">
                {collaborator.specialty}
              </span>
            )}
            {collaborator.internal_ranking > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-1 text-xs font-medium text-amber-300">
                <Trophy className="h-3 w-3" />
                {collaborator.internal_ranking.toFixed(1)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-yellow-500/20 border border-yellow-500/30 px-2.5 py-1.5">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="font-semibold text-yellow-300">
            {collaborator.avg_rating.toFixed(1)}
          </span>
          <span className="text-xs text-yellow-400/70">
            ({collaborator.total_ratings})
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <TrendingUp className="h-3.5 w-3.5" />
            Trabalhos
          </div>
          <p className="mt-1 text-xl font-bold text-white">
            {collaborator.total_jobs}
          </p>
          <p className="text-xs text-gray-500">
            {collaborator.completed_jobs} concluidos
          </p>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            Pontualidade
          </div>
          <p className="mt-1 text-xl font-bold text-white">
            {formatPercent(collaborator.on_time_delivery_pct)}
          </p>
        </div>

        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <DollarSign className="h-3.5 w-3.5" />
            Ganhos Totais
          </div>
          <p className="mt-1 text-xl font-bold text-emerald-300">
            {formatCurrency(collaborator.total_earnings)}
          </p>
        </div>

        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <DollarSign className="h-3.5 w-3.5" />
            Pendente
          </div>
          <p className="mt-1 text-xl font-bold text-amber-300">
            {formatCurrency(collaborator.pending_earnings)}
          </p>
        </div>
      </div>

      {collaborator.delayed_jobs > 0 && (
        <div className="mt-4 rounded-xl bg-red-500/20 border border-red-500/30 px-3 py-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <p className="text-sm text-red-300">
            {collaborator.delayed_jobs} trabalho(s) atrasado(s)
          </p>
        </div>
      )}
    </Link>
  );
}

export function CollaboratorsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [specialty, setSpecialty] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  const { data, isLoading, error } = useCollaboratorsPaginated(
    page,
    pageSize,
    specialty || undefined,
    minRating || undefined
  );

  // Client-side search and active filter (name/email)
  const filteredCollaborators = useMemo(() => {
    if (!data?.collaborators) return [];

    let filtered = data.collaborators;

    // Filter by active (has pending jobs)
    if (showOnlyActive) {
      filtered = filtered.filter((c) => c.pending_jobs > 0);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [data?.collaborators, searchTerm, showOnlyActive]);

  // Count active collaborators
  const activeCount = useMemo(() => {
    if (!data?.collaborators) return 0;
    return data.collaborators.filter((c) => c.pending_jobs > 0).length;
  }, [data?.collaborators]);

  // Extract unique specialties from current page for filter options
  const specialtyOptions = useMemo(() => {
    const specialties = new Set<string>();
    data?.collaborators?.forEach((c) => {
      if (c.specialty) specialties.add(c.specialty);
    });
    return Array.from(specialties).sort();
  }, [data?.collaborators]);

  const hasActiveFilters = specialty || minRating > 0 || showOnlyActive;

  const clearFilters = () => {
    setSpecialty('');
    setMinRating(0);
    setShowOnlyActive(false);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-6 text-red-300 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5" />
        Erro ao carregar colaboradores
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
            <span>Gestao de equipe</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
            <Users className="h-7 w-7 text-violet-400" />
            Colaboradores
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-10 inline-flex items-center rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 px-4 text-sm font-medium text-gray-100">
            {data?.total || 0} colaboradores
          </span>
          <span className="h-10 inline-flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 text-sm font-medium text-emerald-300">
            <Activity className="h-4 w-4" />
            {activeCount} ativos
          </span>
          <button
            onClick={() => setShowAddModal(true)}
            className="h-10 inline-flex items-center gap-2 rounded-2xl bg-black/30 backdrop-blur-xl text-gray-100 border border-white/10 px-4 text-sm font-medium transition-all duration-200 hover:bg-black/50 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <UserPlus className="h-4 w-4" />
            <span>Novo Colaborador</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-2xl bg-black/30 backdrop-blur-xl text-gray-100 placeholder-gray-500/60 border border-white/10 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 pl-10 pr-4 text-sm"
            />
          </div>

          {/* Specialty Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <Select
              value={specialty}
              onValueChange={(value) => {
                setSpecialty(value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'Todas especialidades' },
                ...specialtyOptions.map((s) => ({ value: s, label: s })),
              ]}
              placeholder="Todas especialidades"
            />
          </div>

          {/* Min Rating Filter */}
          <Select
            value={String(minRating)}
            onValueChange={(value) => {
              setMinRating(Number(value));
              setPage(1);
            }}
            options={MIN_RATING_OPTIONS}
            placeholder="Todas as avaliacoes"
          />

          {/* Active Filter Toggle */}
          <button
            onClick={() => {
              setShowOnlyActive(!showOnlyActive);
              setPage(1);
            }}
            className={`h-10 inline-flex items-center gap-2 rounded-2xl backdrop-blur-xl px-4 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
              showOnlyActive
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-black/30 text-gray-100 border border-white/10 hover:bg-black/50 hover:border-white/30'
            }`}
          >
            <Activity className="h-4 w-4" />
            Somente Ativos
          </button>

          {/* Page Size */}
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPage(1);
            }}
            options={PAGE_SIZE_OPTIONS}
            placeholder="12 por pagina"
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

      {/* Loading overlay */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="h-6 w-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Grid */}
      {filteredCollaborators.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredCollaborators.map((collaborator) => (
            <CollaboratorCard key={collaborator.id} collaborator={collaborator} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-8 text-center">
          <Users className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Nenhum colaborador encontrado</p>
        </div>
      )}

      {/* Pagination */}
      {data && data.total_pages > 1 && (
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
              disabled={page >= (data?.total_pages || 1)}
              className="h-10 inline-flex items-center gap-2 rounded-2xl bg-black/30 backdrop-blur-xl text-gray-100 border border-white/10 px-4 text-sm font-medium transition-all duration-200 hover:bg-black/50 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Proximo
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add Collaborator Modal */}
      {showAddModal && (
        <AddCollaboratorModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
