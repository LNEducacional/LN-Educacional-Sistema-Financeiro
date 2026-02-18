import {
  CreditCard,
  AlertTriangle,
  ExternalLink,
  QrCode,
  FileText,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { usePaymentsPage } from './use-payments-page';
import type { ChargeStatus, BillingType, StudentCharge } from './types';

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

interface StatusConfig {
  label: string;
  className: string;
}

const STATUS_CONFIG: Record<ChargeStatus, StatusConfig> = {
  PENDING: {
    label: 'Pendente',
    className: 'bg-amber-500/20 border-amber-500/30 text-amber-300',
  },
  CONFIRMED: {
    label: 'Confirmado',
    className: 'bg-blue-500/20 border-blue-500/30 text-blue-300',
  },
  RECEIVED: {
    label: 'Recebido',
    className: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
  },
  OVERDUE: {
    label: 'Vencido',
    className: 'bg-red-500/20 border-red-500/30 text-red-300',
  },
  REFUNDED: {
    label: 'Reembolsado',
    className: 'bg-gray-500/20 border-gray-500/30 text-gray-300',
  },
  PARTIALLY_REFUNDED: {
    label: 'Reembolso Parcial',
    className: 'bg-gray-500/20 border-gray-500/30 text-gray-300',
  },
  CANCELLED: {
    label: 'Cancelado',
    className: 'bg-gray-500/20 border-gray-500/30 text-gray-300',
  },
};

const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartao',
};

function ChargeStatusBadge({ status }: { status: ChargeStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function ChargeActions({
  charge,
  onOpenPixModal,
}: {
  charge: StudentCharge;
  onOpenPixModal: (charge: StudentCharge) => void;
}) {
  const hasPixData = charge.pix_qr_code || charge.pix_payload;
  const isPending = charge.status === 'PENDING' || charge.status === 'OVERDUE';

  return (
    <div className="flex items-center gap-2">
      {isPending && hasPixData && (
        <button
          onClick={() => onOpenPixModal(charge)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-violet-500/20 border border-violet-500/30 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-500/30 transition-colors"
          title="Ver QR Code PIX"
        >
          <QrCode className="h-3.5 w-3.5" />
          PIX
        </button>
      )}
      {isPending && charge.bank_slip_url && (
        <a
          href={charge.bank_slip_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500/30 transition-colors"
          title="Ver Boleto"
        >
          <FileText className="h-3.5 w-3.5" />
          Boleto
        </a>
      )}
      {charge.invoice_url && (
        <a
          href={charge.invoice_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/10 transition-colors"
          title="Ver Fatura"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Fatura
        </a>
      )}
    </div>
  );
}

function PixModal({
  charge,
  onClose,
}: {
  charge: StudentCharge;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!charge.pix_payload) return;
    try {
      await navigator.clipboard.writeText(charge.pix_payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silencioso
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="QR Code PIX"
    >
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-xl bg-violet-500/20">
            <QrCode className="h-6 w-6 text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Pagamento PIX</h3>
            <p className="text-sm text-gray-400">{charge.service_name}</p>
          </div>
        </div>

        {/* Value */}
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 mb-5 text-center">
          <p className="text-sm text-emerald-400">Valor</p>
          <p className="text-2xl font-bold text-emerald-300">
            {formatCurrency(charge.value)}
          </p>
        </div>

        {/* QR Code Image */}
        {charge.pix_qr_code && (
          <div className="flex justify-center mb-5">
            <div className="rounded-xl bg-white p-4">
              <img
                src={`data:image/png;base64,${charge.pix_qr_code}`}
                alt="QR Code PIX"
                className="h-48 w-48"
              />
            </div>
          </div>
        )}

        {/* Pix Payload (copy-paste) */}
        {charge.pix_payload && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-400">PIX Copia e Cola</p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={charge.pix_payload}
                className="flex-1 rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-gray-300 truncate"
              />
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-500/20 border border-violet-500/30 px-4 py-2 text-sm font-medium text-violet-300 hover:bg-violet-500/30 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="inline-flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="h-4 w-4" />
        Anterior
      </button>
      <span className="px-4 py-2 text-sm text-gray-400">
        {page} de {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Proximo
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function PaymentsPage() {
  const {
    charges,
    total,
    page,
    totalPages,
    isLoading,
    error,
    pixModalCharge,
    openPixModal,
    closePixModal,
    goToPage,
  } = usePaymentsPage();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-6 text-red-300 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5" />
        Erro ao carregar pagamentos
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
            <span>Financeiro</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
            <CreditCard className="h-7 w-7 text-violet-400" />
            Pagamentos
          </h1>
        </div>
        <span className="h-10 inline-flex items-center rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 px-4 text-sm font-medium text-gray-100">
          {total} {total === 1 ? 'fatura' : 'faturas'}
        </span>
      </div>

      {/* Content */}
      {charges.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-8 text-center">
          <CreditCard className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Voce ainda nao possui faturas.</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Servico
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Vencimento
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Acoes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {charges.map((charge) => (
                    <tr
                      key={charge.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-white">
                          {charge.service_name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDate(charge.created_at)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-300">
                          {BILLING_TYPE_LABELS[charge.billing_type] ?? charge.billing_type}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium text-emerald-300">
                          {formatCurrency(charge.value)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-300">
                          {formatDate(charge.due_date)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <ChargeStatusBadge status={charge.status} />
                      </td>
                      <td className="px-5 py-4">
                        <ChargeActions
                          charge={charge}
                          onOpenPixModal={openPixModal}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="border-t border-white/10 px-5 py-3">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={goToPage}
              />
            </div>
          </div>
        </>
      )}

      {/* PIX Modal */}
      {pixModalCharge && (
        <PixModal charge={pixModalCharge} onClose={closePixModal} />
      )}
    </div>
  );
}
