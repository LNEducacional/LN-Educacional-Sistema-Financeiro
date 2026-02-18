import { useQuery } from '@tanstack/react-query';
import { Clock, CheckCircle, XCircle, Loader2, ArrowDownRight, RefreshCw } from 'lucide-react';
import axios from '@/lib/axios';

interface Withdrawal {
  id: string;
  value: number;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'CANCELLED' | 'FAILED';
  pix_key: string;
  pix_key_type: string;
  error_message?: string;
  requested_at: string;
  processed_at?: string;
  completed_at?: string;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  PENDING: {
    label: 'Pendente',
    icon: Clock,
    className: 'bg-amber-500/20 border-amber-500/30 text-amber-300',
  },
  PROCESSING: {
    label: 'Processando',
    icon: Loader2,
    className: 'bg-blue-500/20 border-blue-500/30 text-blue-300',
  },
  DONE: {
    label: 'Concluido',
    icon: CheckCircle,
    className: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
  },
  CANCELLED: {
    label: 'Cancelado',
    icon: XCircle,
    className: 'bg-zinc-500/20 border-zinc-500/30 text-zinc-400',
  },
  FAILED: {
    label: 'Falhou',
    icon: XCircle,
    className: 'bg-red-500/20 border-red-500/30 text-red-300',
  },
};

export const WithdrawalHistory = () => {
  const { data: withdrawals, isLoading, error, refetch } = useQuery<Withdrawal[]>({
    queryKey: ['withdrawals'],
    queryFn: async () => {
      const response = await axios.get('/api/payment/withdrawals');
      return response.data;
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const maskPixKey = (key: string, type: string) => {
    if (type === 'CPF' && key.length === 11) {
      return `***.***.${key.slice(6, 9)}-**`;
    }
    if (type === 'EMAIL' && key.includes('@')) {
      const [local, domain] = key.split('@');
      return `${local.slice(0, 2)}***@${domain}`;
    }
    if (type === 'PHONE') {
      return `****${key.slice(-4)}`;
    }
    return `${key.slice(0, 8)}***`;
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">Erro ao carregar historico</p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-zinc-100">Historico de Saques</h3>
        <button
          onClick={() => refetch()}
          className="p-2 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {!withdrawals || withdrawals.length === 0 ? (
        <div className="text-center py-8">
          <ArrowDownRight className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400">Nenhum saque realizado ainda</p>
          <p className="text-sm text-zinc-500 mt-1">
            Seus saques aparecerão aqui
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {withdrawals.map((withdrawal) => {
            const status = statusConfig[withdrawal.status] || statusConfig.PENDING;
            const StatusIcon = status.icon;

            return (
              <div
                key={withdrawal.id}
                className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${status.className}`}>
                    <StatusIcon className={`h-5 w-5 ${withdrawal.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-100">
                      {formatCurrency(withdrawal.value)}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {maskPixKey(withdrawal.pix_key, withdrawal.pix_key_type)} ({withdrawal.pix_key_type})
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${status.className}`}>
                    {status.label}
                  </span>
                  <p className="text-xs text-zinc-500 mt-1">
                    {formatDate(withdrawal.requested_at)}
                  </p>
                  {withdrawal.error_message && (
                    <p className="text-xs text-red-400 mt-1 max-w-[200px] truncate" title={withdrawal.error_message}>
                      {withdrawal.error_message}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
