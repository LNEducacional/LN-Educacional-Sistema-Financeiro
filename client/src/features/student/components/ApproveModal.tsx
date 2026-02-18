import { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Star, DollarSign } from 'lucide-react';
import { useApproveOrder } from '../api';
import { useRateOrder } from '@/features/ranking';

interface ApproveModalProps {
  orderId: string;
  serviceName: string;
  totalValue: number;
  collaboratorName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

type Step = 'confirm' | 'success' | 'rating' | 'done';

export const ApproveModal = ({
  orderId,
  serviceName,
  totalValue,
  collaboratorName,
  isOpen,
  onClose,
  onSuccess,
}: ApproveModalProps) => {
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('confirm');
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [comment, setComment] = useState('');
  const approveMutation = useApproveOrder();
  const rateMutation = useRateOrder();

  const handleSubmit = async () => {
    setError(null);

    try {
      await approveMutation.mutateAsync(orderId);
      setStep('success');
      setTimeout(() => {
        setStep('rating');
      }, 1500);
    } catch {
      setError('Erro ao aprovar pedido. Tente novamente.');
    }
  };

  const handleRatingSubmit = async () => {
    if (score === 0) {
      setError('Selecione uma nota de 1 a 5 estrelas');
      return;
    }

    setError(null);

    try {
      await rateMutation.mutateAsync({
        orderId,
        score,
        comment: comment.trim() || undefined,
      });
      setStep('done');
      setTimeout(() => {
        resetAndClose();
        onSuccess?.();
      }, 1500);
    } catch {
      setError('Erro ao enviar avaliacao. Tente novamente.');
    }
  };

  const handleSkipRating = () => {
    resetAndClose();
    onSuccess?.();
  };

  const resetAndClose = () => {
    setError(null);
    setStep('confirm');
    setScore(0);
    setHoverScore(0);
    setComment('');
    onClose();
  };

  const handleClose = () => {
    if (approveMutation.isPending || rateMutation.isPending) return;
    resetAndClose();
  };

  if (!isOpen) return null;

  const renderContent = () => {
    switch (step) {
      case 'success':
        return (
          <div className="text-center py-8">
            <CheckCircle className="mx-auto h-16 w-16 text-emerald-400" />
            <h2 className="mt-4 text-xl font-semibold text-emerald-300">
              Pagamento Liberado com Sucesso!
            </h2>
            <p className="mt-2 text-gray-400">
              O valor foi liberado para o colaborador.
            </p>
          </div>
        );

      case 'rating':
        return (
          <>
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400/80" />
                <span>Avaliacao</span>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
                <Star className="h-6 w-6 text-yellow-400" />
                Avalie o Colaborador
              </h2>
            </div>

            <p className="text-sm text-gray-400 mb-6">
              Como foi sua experiencia com <strong className="text-gray-200">{collaboratorName}</strong>?
            </p>

            {/* Stars */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((value) => {
                const isFilled = value <= (hoverScore || score);
                return (
                  <button
                    key={value}
                    onClick={() => setScore(value)}
                    onMouseEnter={() => setHoverScore(value)}
                    onMouseLeave={() => setHoverScore(0)}
                    className="p-1 transition-transform hover:scale-110"
                    disabled={rateMutation.isPending}
                  >
                    <Star
                      className={`h-10 w-10 transition-colors ${
                        isFilled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label htmlFor="approve-comment" className="block text-xs font-medium text-gray-300 mb-1.5 pl-2.5">
                Comentario (opcional)
              </label>
              <textarea
                id="approve-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={rateMutation.isPending}
                placeholder="Conte como foi sua experiencia..."
                className="w-full rounded-2xl bg-black/30 text-gray-100 placeholder-gray-500/60 border border-white/10 focus:border-white/30 focus:outline-none transition px-4 py-3 text-sm resize-none disabled:opacity-50"
                rows={3}
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={handleSkipRating}
                disabled={rateMutation.isPending}
                className="rounded-2xl px-4 py-2.5 text-sm text-gray-500 hover:text-gray-300 transition disabled:opacity-50"
              >
                Pular
              </button>
              <button
                onClick={handleRatingSubmit}
                disabled={rateMutation.isPending || score === 0}
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl text-sm py-2.5 px-5 font-medium bg-gradient-to-r from-yellow-600 via-amber-600 to-yellow-500 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rateMutation.isPending ? (
                  <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Star className="h-4 w-4" />
                )}
                Enviar Avaliacao
              </button>
            </div>
          </>
        );

      case 'done':
        return (
          <div className="text-center py-8">
            <CheckCircle className="mx-auto h-16 w-16 text-emerald-400" />
            <h2 className="mt-4 text-xl font-semibold text-emerald-300">
              Avaliacao Enviada!
            </h2>
            <p className="mt-2 text-gray-400">
              Obrigado pelo seu feedback.
            </p>
          </div>
        );

      default:
        return (
          <>
            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                  <span>Pagamento</span>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
                  <DollarSign className="h-6 w-6 text-emerald-400" />
                  Confirmar Pagamento
                </h2>
              </div>
              <button
                onClick={handleClose}
                disabled={approveMutation.isPending}
                className="rounded-xl p-2 text-gray-400 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Warning banner */}
            <div className="mb-5 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-300">
                    Ao aprovar, o valor de{' '}
                    <strong className="text-amber-200">
                      {formatCurrency(totalValue)}
                    </strong>{' '}
                    sera liberado <strong>IMEDIATAMENTE</strong> para o colaborador.
                  </p>
                  <p className="mt-2 text-sm font-medium text-amber-200">
                    Esta acao nao pode ser desfeita.
                  </p>
                </div>
              </div>
            </div>

            {/* Order details */}
            <div className="mb-6 rounded-xl bg-white/5 border border-white/10 p-4">
              <p className="text-sm text-gray-400">
                Servico: <strong className="text-gray-200">{serviceName}</strong>
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Valor: <strong className="text-emerald-400">{formatCurrency(totalValue)}</strong>
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleClose}
                disabled={approveMutation.isPending}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-gray-300 transition hover:bg-white/5 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={approveMutation.isPending}
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl text-sm py-2.5 px-5 font-medium bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-500 text-white transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {approveMutation.isPending ? (
                  <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Confirmar Liberacao
              </button>
            </div>
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div className="w-full max-w-md mx-4 rounded-2xl border border-white/10 backdrop-blur-xl bg-black/50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 sm:p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
