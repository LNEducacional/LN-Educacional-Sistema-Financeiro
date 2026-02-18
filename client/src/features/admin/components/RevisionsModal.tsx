import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, AlertCircle, History } from 'lucide-react';
import { useCollaboratorRevisions } from '../api';
import type { CollaboratorRevision } from '../types';

interface RevisionsModalProps {
  collaboratorId: string;
  collaboratorName: string;
  totalRevisions: number;
  onClose: () => void;
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function RevisionsModal({
  collaboratorId,
  collaboratorName,
  totalRevisions,
  onClose,
}: RevisionsModalProps) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, error } = useCollaboratorRevisions(
    collaboratorId,
    page,
    pageSize
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl mx-4 overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl bg-black/50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
                <span>Histórico</span>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
                <History className="h-6 w-6 text-amber-400" />
                Histórico de Revisões
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {collaboratorName} - {totalRevisions} revisões no total
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-gray-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[50vh] overflow-y-auto -mx-6 px-6 sm:-mx-8 sm:px-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-red-500/20 border border-red-500/30 p-4 text-red-400">
                <AlertCircle className="h-5 w-5" />
                Erro ao carregar revisões
              </div>
            ) : data?.revisions && data.revisions.length > 0 ? (
              <div className="space-y-3">
                {data.revisions.map((revision: CollaboratorRevision) => (
                  <div
                    key={revision.id}
                    className="rounded-2xl border border-white/10 bg-black/30 p-4 hover:border-white/20 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-100">
                            {revision.student_name}
                          </span>
                          <span className="rounded-lg bg-white/10 px-2 py-0.5 text-xs text-gray-300">
                            Pedido #{revision.order_id.slice(0, 8)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-300">
                          {revision.reason}
                        </p>
                      </div>
                      <span className="whitespace-nowrap text-xs text-gray-500">
                        {formatDate(revision.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-gray-500">
                Nenhuma revisão encontrada
              </div>
            )}
          </div>

          {/* Pagination */}
          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-6">
              <div className="text-sm text-gray-400">
                Página {data.page} de {data.total_pages} ({data.total} total)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition disabled:cursor-not-allowed disabled:opacity-50"
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
                        className={`h-8 w-8 rounded-lg text-sm font-medium transition ${
                          page === pageNum
                            ? 'bg-amber-600 text-white'
                            : 'text-gray-400 hover:bg-white/10 hover:text-white'
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
                  className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="group w-full inline-flex items-center justify-center gap-2 relative overflow-hidden font-medium rounded-2xl text-sm py-2.5 mt-4 bg-transparent text-gray-300 border border-white/20 transition-all duration-300 hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-amber-500/25"
          >
            {/* Gradient background - hidden by default, visible on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            <span className="relative z-10 transition-all duration-300 group-hover:opacity-0">
              Fechar
            </span>

            {/* Circulo expandivel com icone */}
            <span className="absolute right-[0.3em] z-10 flex items-center justify-center h-[2.2em] w-[2.2em] rounded-[0.7em] bg-white/10 transition-all duration-300 group-hover:bg-white/20 group-hover:w-[calc(100%-0.6em)]">
              <X className="w-[1.1em] h-[1.1em] text-gray-300 transition-all duration-300 group-hover:text-white group-hover:scale-110" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
