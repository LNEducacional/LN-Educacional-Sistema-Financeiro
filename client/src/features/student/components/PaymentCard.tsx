import { useState } from 'react';
import { Copy, Check, ExternalLink, QrCode, CreditCard, FileText } from 'lucide-react';

interface PaymentInfo {
  invoice_url: string;
  pix_qr_code?: string;
  pix_payload?: string;
  bank_slip_url?: string;
  due_date: string;
  status: string;
}

interface PaymentCardProps {
  paymentInfo: PaymentInfo;
  totalValue: number;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: 'Aguardando Pagamento',
    className: 'bg-amber-500/20 border border-amber-500/30 text-amber-300',
  },
  CONFIRMED: {
    label: 'Confirmado',
    className: 'bg-blue-500/20 border border-blue-500/30 text-blue-300',
  },
  RECEIVED: {
    label: 'Pago',
    className: 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300',
  },
  OVERDUE: {
    label: 'Vencido',
    className: 'bg-red-500/20 border border-red-500/30 text-red-300',
  },
  REFUNDED: {
    label: 'Estornado',
    className: 'bg-gray-500/20 border border-gray-500/30 text-gray-400',
  },
};

export const PaymentCard = ({ paymentInfo, totalValue }: PaymentCardProps) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(true);

  const handleCopyPix = async () => {
    if (paymentInfo.pix_payload) {
      await navigator.clipboard.writeText(paymentInfo.pix_payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const status = statusConfig[paymentInfo.status] || statusConfig.PENDING;
  const isPending = paymentInfo.status === 'PENDING';

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-100">Pagamento</h3>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-zinc-400">Valor Total</span>
          <span className="text-xl font-bold text-emerald-400">
            {formatCurrency(totalValue)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-zinc-400">Vencimento</span>
          <span className="text-zinc-200">{formatDate(paymentInfo.due_date)}</span>
        </div>

        {isPending && (
          <>
            <div className="border-t border-zinc-800 pt-4">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setShowQR(true)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showQR
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  PIX
                </button>
                <button
                  onClick={() => setShowQR(false)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !showQR
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Outros
                </button>
              </div>

              {showQR && paymentInfo.pix_qr_code && (
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-white p-4 rounded-lg">
                    <img
                      src={`data:image/png;base64,${paymentInfo.pix_qr_code}`}
                      alt="QR Code PIX"
                      className="w-48 h-48"
                    />
                  </div>

                  {paymentInfo.pix_payload && (
                    <button
                      onClick={handleCopyPix}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar codigo PIX</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {!showQR && (
                <div className="space-y-3">
                  <a
                    href={paymentInfo.invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Pagar com Cartao
                  </a>

                  {paymentInfo.bank_slip_url && (
                    <a
                      href={paymentInfo.bank_slip_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Ver Boleto
                    </a>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
