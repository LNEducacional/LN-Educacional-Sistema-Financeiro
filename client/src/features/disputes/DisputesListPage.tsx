/**
 * DisputesListPage - Página de listagem de disputas para Admin
 * Mostra todas as disputas com filtros por status
 * Acessível apenas por usuários com role ADMIN
 */

import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Filter,
  X,
  Search,
  FileWarning,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAllDisputes } from './api';
import { DisputeCard } from './components/DisputeCard';
import { DISPUTE_STATUS_LABELS } from '@/lib/constants';
import { Select } from '@/components/ui';

const STATUS_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'ABERTA', label: DISPUTE_STATUS_LABELS.ABERTA },
  { value: 'EM_ANALISE', label: DISPUTE_STATUS_LABELS.EM_ANALISE },
  { value: 'AGUARDANDO_RESPOSTA', label: DISPUTE_STATUS_LABELS.AGUARDANDO_RESPOSTA },
  { value: 'RESOLVIDA', label: DISPUTE_STATUS_LABELS.RESOLVIDA },
  { value: 'CANCELADA', label: DISPUTE_STATUS_LABELS.CANCELADA },
];

export function DisputesListPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const { data, isLoading, error } = useAllDisputes(statusFilter || undefined);

  const disputes = useMemo(() => data ?? [], [data]);

  // Client-side search filter
  const filteredDisputes = useMemo(() => {
    if (!searchTerm) return disputes;

    const term = searchTerm.toLowerCase();
    return disputes.filter(
      (d) =>
        d.title.toLowerCase().includes(term) ||
        d.description.toLowerCase().includes(term) ||
        d.order_id.toLowerCase().includes(term)
    );
  }, [disputes, searchTerm]);

  // Count by status
  const statusCounts = useMemo(() => {
    return {
      open: disputes.filter((d) => d.status === 'ABERTA').length,
      inAnalysis: disputes.filter((d) => d.status === 'EM_ANALISE').length,
      resolved: disputes.filter((d) => d.status === 'RESOLVIDA').length,
    };
  }, [disputes]);

  const hasActiveFilters = statusFilter || searchTerm;

  const clearFilters = () => {
    setStatusFilter('');
    setSearchTerm('');
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
        Erro ao carregar disputas
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400/80" />
            <span>Gerenciamento de conflitos</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-red-400" />
            Disputas
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-10 inline-flex items-center rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 px-4 text-sm font-medium text-gray-100">
            {disputes.length} {disputes.length === 1 ? 'disputa' : 'disputas'}
          </span>
          <span className="h-10 inline-flex items-center gap-2 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 text-sm font-medium text-red-300">
            <FileWarning className="h-4 w-4" />
            {statusCounts.open} abertas
          </span>
          <span className="h-10 inline-flex items-center gap-2 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 px-4 text-sm font-medium text-yellow-300">
            <Clock className="h-4 w-4" />
            {statusCounts.inAnalysis} em análise
          </span>
          <span className="h-10 inline-flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 text-sm font-medium text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            {statusCounts.resolved} resolvidas
          </span>
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
              placeholder="Buscar por título, descrição ou pedido..."
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
              onValueChange={(value) => setStatusFilter(value)}
              options={STATUS_FILTERS}
              placeholder="Todas"
            />
          </div>

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
      {filteredDisputes.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredDisputes.map((dispute) => (
            <DisputeCard key={dispute.id} dispute={dispute} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">
            {hasActiveFilters
              ? 'Nenhuma disputa encontrada com os filtros aplicados'
              : 'Nenhuma disputa registrada no sistema'}
          </p>
        </div>
      )}
    </div>
  );
}
