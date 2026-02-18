import { useState } from 'react';
import { X, RotateCcw, AlertCircle } from 'lucide-react';
import { useRejectOrder } from '../api';

interface RevisionModalProps {
  orderId: string;
  serviceName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const MIN_REASON_LENGTH = 10;

export const RevisionModal = ({
  orderId,
  serviceName,
  isOpen,
  onClose,
  onSuccess,
}: RevisionModalProps) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const rejectMutation = useRejectOrder();

  const handleSubmit = async () => {
    setError(null);

    if (reason.trim().length < MIN_REASON_LENGTH) {
      setError(`O motivo deve ter pelo menos ${MIN_REASON_LENGTH} caracteres.`);
      return;
    }

    try {
      await rejectMutation.mutateAsync({ orderId, reason: reason.trim() });
      setReason('');
      onClose();
      onSuccess?.();
    } catch {
      setError('Erro ao solicitar revisao. Tente novamente.');
    }
  };

  const handleClose = () => {
    if (rejectMutation.isPending) return;
    setReason('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div className="w-full max-w-md mx-4 rounded-2xl border border-white/10 backdrop-blur-xl bg-black/50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
                <span>Revisao</span>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
                <RotateCcw className="h-6 w-6 text-amber-400" />
                Solicitar Revisao
              </h2>
            </div>
            <button
              onClick={handleClose}
              disabled={rejectMutation.isPending}
              className="rounded-xl p-2 text-gray-400 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Info banner */}
          <div className="mb-5 rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-300">
                O trabalho sera devolvido ao colaborador para ajustes.
                O pagamento permanece retido ate a aprovacao final.
              </p>
            </div>
          </div>

          <p className="mb-4 text-sm text-gray-400">
            Servico: <strong className="text-gray-200">{serviceName}</strong>
          </p>

          {/* Textarea */}
          <div className="mb-4">
            <label
              htmlFor="reason"
              className="block text-xs font-medium text-gray-300 mb-1.5 pl-2.5"
            >
              Motivo da revisao <span className="text-red-400">*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o que precisa ser ajustado..."
              rows={4}
              className="w-full rounded-2xl bg-black/30 text-gray-100 placeholder-gray-500/60 border border-white/10 focus:border-white/30 focus:outline-none transition px-4 py-3 text-sm resize-none"
            />
            <p className="mt-1.5 text-xs text-gray-500 pl-2.5">
              {reason.length}/{MIN_REASON_LENGTH} caracteres minimos
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={rejectMutation.isPending}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-gray-300 transition hover:bg-white/5 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={reason.trim().length < MIN_REASON_LENGTH || rejectMutation.isPending}
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl text-sm py-2.5 px-5 font-medium bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 text-white transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rejectMutation.isPending ? (
                <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Enviar para o Colaborador
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
