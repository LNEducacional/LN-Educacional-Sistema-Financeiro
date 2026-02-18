import { useState } from 'react';
import { X, CheckCircle, XCircle } from 'lucide-react';
import type { ProductionJob } from '../types';
import { useChangeStatus } from '../api';

interface ChangeStatusModalProps {
  job: ProductionJob;
  action: 'approve' | 'reject';
  onClose: () => void;
  onSuccess: () => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

type Step = 'confirm' | 'comment' | 'success';

export function ChangeStatusModal({ job, action, onClose, onSuccess }: ChangeStatusModalProps) {
  const [step, setStep] = useState<Step>(action === 'reject' ? 'comment' : 'confirm');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const changeStatus = useChangeStatus();

  const handleApprove = async () => {
    try {
      await changeStatus.mutateAsync({
        jobId: job.id,
        data: { new_status: 'APROVADO' },
      });
      setStep('success');
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch {
      setError('Erro ao aprovar trabalho. Tente novamente.');
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      setError('O motivo da reprovacao e obrigatorio.');
      return;
    }

    try {
      await changeStatus.mutateAsync({
        jobId: job.id,
        data: { new_status: 'NAO_APROVADO', comment },
      });
      onSuccess();
    } catch {
      setError('Erro ao reprovar trabalho. Tente novamente.');
    }
  };

  const isApprove = action === 'approve';

  const renderContent = () => {
    switch (step) {
      case 'confirm':
        return (
          <>
            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                  <span>Aprovacao</span>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-emerald-400" />
                  Aprovar Trabalho?
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Details */}
            <div className="mb-6 rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
              <p className="text-sm text-gray-400">
                Job: <strong className="text-gray-200">{job.title}</strong>
              </p>
              <p className="text-sm text-gray-400">
                Valor: <strong className="text-emerald-400">{formatCurrency(job.price)}</strong>
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-gray-300 transition hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleApprove}
                disabled={changeStatus.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl text-sm py-2.5 font-medium bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-500 text-white transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50"
              >
                {changeStatus.isPending ? (
                  <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Aprovar
              </button>
            </div>
          </>
        );

      case 'comment':
        return (
          <>
            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400/80" />
                  <span>Reprovacao</span>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
                  <XCircle className="h-6 w-6 text-red-400" />
                  Motivo da Reprovacao
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Informe o motivo para o colaborador poder corrigir.
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Job info */}
            <div className="mb-4 rounded-xl bg-white/5 border border-white/10 p-4">
              <p className="text-sm text-gray-400">
                Job: <strong className="text-gray-200">{job.title}</strong>
              </p>
            </div>

            <textarea
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                setError('');
              }}
              placeholder="Digite o feedback para o colaborador..."
              className="w-full rounded-2xl bg-black/30 text-gray-100 placeholder-gray-500/60 border border-white/10 focus:border-white/30 focus:outline-none transition px-4 py-3 text-sm resize-none mb-4"
              rows={4}
            />

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-gray-300 transition hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={changeStatus.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl text-sm py-2.5 font-medium bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white transition-all duration-300 hover:shadow-lg hover:shadow-red-500/25 disabled:opacity-50"
              >
                {changeStatus.isPending ? (
                  <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Confirmar Reprovacao
              </button>
            </div>
          </>
        );

      case 'success':
        return (
          <div className="py-8 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-emerald-400" />
            <h3 className="mt-4 text-xl font-semibold text-emerald-300">
              Pagamento Liberado com Sucesso!
            </h3>
            <p className="mt-2 text-gray-400">
              Valor: <strong className="text-emerald-400">{formatCurrency(job.price)}</strong>
            </p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md mx-4 rounded-2xl border border-white/10 backdrop-blur-xl bg-black/50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 sm:p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
