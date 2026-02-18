import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Settings,
  Plus,
  X,
  AlertTriangle,
  Package,
  Activity,
} from 'lucide-react';
import { ServiceForm } from './ServiceForm';
import { ServiceList } from './ServiceList';
import { ServicesKPIs } from './ServicesKPIs';
import { useServices, useServiceStats } from '../api';
import { serviceAreaOptions } from '../schemas';
import type { Service } from '../types';
import { Select } from '@/components/ui';

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10 por pagina' },
  { value: '20', label: '20 por pagina' },
  { value: '50', label: '50 por pagina' },
];

export function ServicesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Debounce search
  useMemo(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data, isLoading, error } = useServices(
    page,
    pageSize,
    debouncedSearch || undefined,
    areaFilter || undefined,
    includeInactive
  );

  const { data: stats, isLoading: isLoadingStats } = useServiceStats();

  const handleNewService = () => {
    setEditingService(null);
    setShowForm(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingService(null);
    setShowForm(false);
  };

  const handleSuccess = () => {
    setEditingService(null);
    setShowForm(false);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && (!data || newPage <= data.total_pages)) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const hasActiveFilters = areaFilter || includeInactive;

  const clearFilters = () => {
    setAreaFilter('');
    setIncludeInactive(false);
    setPage(1);
  };

  const isEditing = editingService !== null;

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
        Erro ao carregar servicos
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
            <span>Configuracao de sistema</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
            <Settings className="h-7 w-7 text-violet-400" />
            Servicos
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-10 inline-flex items-center rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 px-4 text-sm font-medium text-gray-100">
            <Package className="h-4 w-4 mr-2 text-gray-400" />
            {data?.total || 0} servicos
          </span>
          {stats && (
            <span className="h-10 inline-flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 text-sm font-medium text-emerald-300">
              <Activity className="h-4 w-4" />
              {stats.total_active} ativos
            </span>
          )}
          {!showForm ? (
            <button
              onClick={handleNewService}
              className="h-10 inline-flex items-center gap-2 rounded-2xl bg-black/30 backdrop-blur-xl text-gray-100 border border-white/10 px-4 text-sm font-medium transition-all duration-200 hover:bg-black/50 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Servico</span>
            </button>
          ) : (
            <button
              onClick={handleCancel}
              className="h-10 inline-flex items-center gap-2 rounded-2xl bg-black/30 backdrop-blur-xl text-gray-100 border border-white/10 px-4 text-sm font-medium transition-all duration-200 hover:bg-black/50 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <X className="h-4 w-4" />
              <span>Cancelar</span>
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <ServicesKPIs stats={stats} isLoading={isLoadingStats} />

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-6">
          <h2 className="mb-4 text-lg font-medium text-white">
            {isEditing ? 'Editar Servico' : 'Novo Servico'}
          </h2>
          <ServiceForm
            onSuccess={handleSuccess}
            initialData={editingService ?? undefined}
          />
        </div>
      )}

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
              placeholder="Buscar por nome ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-2xl bg-black/30 backdrop-blur-xl text-gray-100 placeholder-gray-500/60 border border-white/10 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 pl-10 pr-4 text-sm"
            />
          </div>

          {/* Area Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <Select
              value={areaFilter}
              onValueChange={(value) => {
                setAreaFilter(value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'Todas as Areas' },
                ...serviceAreaOptions,
              ]}
              placeholder="Todas as Areas"
            />
          </div>

          {/* Include Inactive Toggle */}
          <button
            onClick={() => {
              setIncludeInactive(!includeInactive);
              setPage(1);
            }}
            className={`h-10 inline-flex items-center gap-2 rounded-2xl backdrop-blur-xl px-4 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
              includeInactive
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-black/30 text-gray-100 border border-white/10 hover:bg-black/50 hover:border-white/30'
            }`}
          >
            <Package className="h-4 w-4" />
            Mostrar Inativos
          </button>

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

      {/* Loading overlay */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="h-6 w-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Services List */}
      {data && data.services.length > 0 ? (
        <>
          <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm overflow-hidden">
            <ServiceList
              services={data.services}
              onEdit={handleEdit}
              showUsage
              showToggle
            />
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
                  disabled={page >= (data?.total_pages || 1)}
                  className="h-10 inline-flex items-center gap-2 rounded-2xl bg-black/30 backdrop-blur-xl text-gray-100 border border-white/10 px-4 text-sm font-medium transition-all duration-200 hover:bg-black/50 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Proximo
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-8 text-center">
          <Settings className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">
            {searchTerm || areaFilter
              ? 'Nenhum servico encontrado com os filtros aplicados'
              : 'Nenhum servico cadastrado'}
          </p>
        </div>
      )}
    </div>
  );
}
