import { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  History,
} from 'lucide-react';
import { useJobHistory, useUpdateJobStatus } from '../api';
import type { ComplaintWithSplit, JobHistoryEntry } from '../types';

interface ComplaintDetailModalProps {
  complaint: ComplaintWithSplit;
  onClose: () => void;
  onStatusChange?: () => void;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

const formatDateTime = (dateStr: string): string => {
  return new Date(dateStr).toLocaleString('pt-BR');
};

const statusColors: Record<string, string> = {
  NOVO: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  EM_ANDAMENTO: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  AGUARDANDO_REVISAO: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  ENVIADO_VISUALIZACAO: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  AGUARDANDO_APROVACAO: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  APROVADO: 'bg-green-500/20 text-green-300 border-green-500/30',
  NAO_APROVADO: 'bg-red-500/20 text-red-300 border-red-500/30',
  CONCLUIDO: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
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

const priorityColors: Record<string, string> = {
  HIGH: 'bg-red-500/20 text-red-300 border border-red-500/30',
  MEDIUM: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  LOW: 'bg-green-500/20 text-green-300 border border-green-500/30',
};

const priorityLabels: Record<string, string> = {
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baixa',
};

export function ComplaintDetailModal({
  complaint,
  onClose,
  onStatusChange,
}: ComplaintDetailModalProps) {
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [comments, setComments] = useState('');

  const { data: history, isLoading: isLoadingHistory } = useJobHistory(complaint.id);
  const updateStatusMutation = useUpdateJobStatus();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleStatusChange = () => {
    if (!newStatus) return;

    updateStatusMutation.mutate(
      {
        jobId: complaint.id,
        data: { status: newStatus, comments: comments || undefined },
      },
      {
        onSuccess: () => {
          setShowStatusForm(false);
          setNewStatus('');
          setComments('');
          onStatusChange?.();
          onClose();
        },
      }
    );
  };

  const renderHistoryItem = (entry: JobHistoryEntry) => (
    <div
      key={entry.id}
      className="relative border-l-2 border-white/10 pb-4 pl-4 last:pb-0"
    >
      <div className="absolute -left-1.5 top-0 h-3 w-3 rounded-full bg-violet-500" />
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            {entry.previous_status && (
              <>
                <span
                  className={`rounded-lg border px-2 py-0.5 text-xs font-medium ${
                    statusColors[entry.previous_status] || 'bg-gray-500/20 text-gray-300'
                  }`}
                >
                  {statusLabels[entry.previous_status] || entry.previous_status}
                </span>
                <span className="text-gray-600">→</span>
              </>
            )}
            <span
              className={`rounded-lg border px-2 py-0.5 text-xs font-medium ${
                statusColors[entry.new_status] || 'bg-gray-500/20 text-gray-300'
              }`}
            >
              {statusLabels[entry.new_status] || entry.new_status}
            </span>
          </div>
          {entry.comments && (
            <p className="mt-1 text-sm text-gray-400">{entry.comments}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            por {entry.changed_by_name} ({entry.changed_by_role})
          </p>
        </div>
        <span className="text-xs text-gray-600">
          {formatDateTime(entry.created_at)}
        </span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl mx-4 overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl bg-black/50 shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 sm:p-8 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
              <span>Reclamacao</span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Detalhes da Reclamacao
            </h2>
            <p className="text-sm text-gray-400 mt-1">{complaint.service_name}</p>
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
          {/* Status and Priority */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-lg border px-3 py-1 text-sm font-medium ${
                statusColors[complaint.status] || 'bg-gray-500/20 text-gray-300'
              }`}
            >
              {statusLabels[complaint.status] || complaint.status}
            </span>
            <span
              className={`rounded-lg px-3 py-1 text-sm font-medium ${
                priorityColors[complaint.priority]
              }`}
            >
              Prioridade: {priorityLabels[complaint.priority]}
            </span>
            {complaint.days_pending > 0 && (
              <span className="rounded-lg bg-orange-500/20 border border-orange-500/30 px-3 py-1 text-sm font-medium text-orange-300">
                {complaint.days_pending} dias pendente
              </span>
            )}
          </div>

          {/* Info Grid */}
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <h4 className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500">
                <User className="h-4 w-4" />
                Aluno
              </h4>
              <p className="font-medium text-gray-200">{complaint.student_name}</p>
              <p className="flex items-center gap-1 text-sm text-gray-500">
                <Mail className="h-3 w-3" />
                {complaint.student_email}
              </p>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <h4 className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500">
                <User className="h-4 w-4" />
                Colaborador
              </h4>
              <p className="font-medium text-gray-200">{complaint.collaborator_name}</p>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <h4 className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500">
                <DollarSign className="h-4 w-4" />
                Valores
              </h4>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-gray-500">Total:</span>{' '}
                  <span className="font-medium text-gray-200">{formatCurrency(complaint.total_value)}</span>
                </p>
                <p>
                  <span className="text-gray-500">Colaborador:</span>{' '}
                  <span className="font-medium text-emerald-400">
                    {formatCurrency(complaint.collab_value)}
                  </span>
                </p>
                <p>
                  <span className="text-gray-500">Empresa:</span>{' '}
                  <span className="font-medium text-blue-400">
                    {formatCurrency(complaint.company_value)}
                  </span>
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <h4 className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500">
                <Clock className="h-4 w-4" />
                Datas
              </h4>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-gray-500">Entrega:</span>{' '}
                  <span className="font-medium text-gray-200">{formatDate(complaint.due_date)}</span>
                </p>
                {complaint.latest_revision_at && (
                  <p>
                    <span className="text-gray-500">Ultima revisao:</span>{' '}
                    <span className="font-medium text-gray-200">
                      {formatDateTime(complaint.latest_revision_at)}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Latest Reason */}
          {complaint.latest_reason && (
            <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
              <h4 className="mb-2 flex items-center gap-2 text-xs font-medium text-red-400">
                <AlertTriangle className="h-4 w-4" />
                Motivo da Ultima Revisao
              </h4>
              <p className="text-sm text-red-300">{complaint.latest_reason}</p>
            </div>
          )}

          {/* Actions */}
          {!showStatusForm ? (
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setNewStatus('EM_ANDAMENTO');
                  setShowStatusForm(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
              >
                <RefreshCw className="h-4 w-4" />
                Enviar para Revisao
              </button>
              <button
                onClick={() => {
                  setNewStatus('APROVADO');
                  setShowStatusForm(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600"
              >
                <CheckCircle className="h-4 w-4" />
                Aprovar
              </button>
            </div>
          ) : (
            <div className="mb-6 rounded-xl bg-white/5 border border-white/10 p-4">
              <h4 className="mb-3 text-sm font-medium text-gray-200">
                Alterar Status para:{' '}
                <span className={`rounded-lg border px-2 py-0.5 text-xs ${statusColors[newStatus] || ''}`}>
                  {statusLabels[newStatus]}
                </span>
              </h4>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Comentario (opcional)"
                className="mb-3 w-full rounded-2xl bg-black/30 text-gray-100 placeholder-gray-500/60 border border-white/10 focus:border-white/30 focus:outline-none transition px-4 py-3 text-sm resize-none"
                rows={3}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleStatusChange}
                  disabled={updateStatusMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 px-4 py-2 text-sm font-medium text-white transition hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50"
                >
                  {updateStatusMutation.isPending ? (
                    <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : null}
                  {updateStatusMutation.isPending ? 'Salvando...' : 'Confirmar'}
                </button>
                <button
                  onClick={() => {
                    setShowStatusForm(false);
                    setNewStatus('');
                    setComments('');
                  }}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/5"
                >
                  Cancelar
                </button>
              </div>
              {updateStatusMutation.error && (
                <div className="mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                  <p className="text-xs text-red-400">
                    Erro ao atualizar status. Tente novamente.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* History */}
          <div>
            <h4 className="mb-4 flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
              <History className="h-4 w-4" />
              Historico de Alteracoes ({history?.length || 0})
            </h4>
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
              </div>
            ) : history && history.length > 0 ? (
              <div className="space-y-4">{history.map(renderHistoryItem)}</div>
            ) : (
              <p className="text-center text-sm text-gray-500">
                Nenhum historico disponivel
              </p>
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
