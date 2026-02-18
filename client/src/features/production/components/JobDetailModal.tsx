import { X, Clock, MessageSquare, Briefcase } from 'lucide-react';
import type { ProductionJob, JobHistory } from '../types';
import { StatusBadge } from './StatusBadge';
import { useJobHistory } from '../api';

interface JobDetailModalProps {
  job: ProductionJob;
  onClose: () => void;
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('pt-BR');
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function JobDetailModal({ job, onClose }: JobDetailModalProps) {
  const { data: history, isLoading: historyLoading } = useJobHistory(job.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl mx-4 rounded-2xl border border-white/10 backdrop-blur-xl bg-black/50 shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 sm:p-8 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400/80" />
              <span>Detalhes do job</span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-violet-400" />
              {job.title}
            </h2>
            <div className="mt-2 flex items-center gap-3">
              <StatusBadge status={job.status} />
              <span className="text-sm text-gray-400">{formatCurrency(job.price)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-6">
          {/* Description */}
          {job.description && (
            <div className="mb-6">
              <h3 className="mb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Descricao</h3>
              <p className="text-sm text-gray-300">{job.description}</p>
            </div>
          )}

          {/* Details grid */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <h3 className="text-xs font-medium text-gray-500 mb-1">Deadline</h3>
              <p className="text-sm text-gray-300">{formatDateTime(job.deadline)}</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <h3 className="text-xs font-medium text-gray-500 mb-1">Criado em</h3>
              <p className="text-sm text-gray-300">{formatDateTime(job.created_at)}</p>
            </div>
          </div>

          {/* Rejection reason */}
          {job.status === 'NAO_APROVADO' && (
            <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-medium text-red-400">
                <MessageSquare className="h-4 w-4" />
                Motivo da Reprovacao
              </h3>
              <p className="text-sm text-red-300">
                {history?.find((h) => h.new_status === 'NAO_APROVADO')?.comments ||
                  'Nenhum motivo informado'}
              </p>
            </div>
          )}

          {/* Timeline */}
          <div>
            <h3 className="mb-4 flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
              <Clock className="h-4 w-4" />
              Historico de Alteracoes
            </h3>

            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
              </div>
            ) : history && history.length > 0 ? (
              <div className="space-y-3">
                {history.map((entry, index) => (
                  <TimelineEntry key={entry.id} entry={entry} isLast={index === history.length - 1} />
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-gray-500">Nenhum historico disponivel</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 sm:px-8 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-gray-300 transition hover:bg-white/5"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function TimelineEntry({ entry, isLast }: { entry: JobHistory; isLast: boolean }) {
  return (
    <div className="relative flex gap-4">
      {/* Line */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 h-full w-0.5 bg-white/10" />
      )}

      {/* Dot */}
      <div className="relative z-10 mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-violet-500" />

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2">
          {entry.previous_status && (
            <>
              <StatusBadge status={entry.previous_status} />
              <span className="text-gray-600">→</span>
            </>
          )}
          <StatusBadge status={entry.new_status} />
        </div>
        <p className="mt-1 text-xs text-gray-500">{formatDateTime(entry.created_at)}</p>
        {entry.comments && (
          <p className="mt-2 rounded-xl bg-white/5 border border-white/10 p-2.5 text-sm text-gray-400">{entry.comments}</p>
        )}
      </div>
    </div>
  );
}
