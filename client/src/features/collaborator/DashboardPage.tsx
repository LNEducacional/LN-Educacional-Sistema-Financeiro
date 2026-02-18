import { useState } from 'react';
import { useCollaboratorDashboard } from './api';
import { StatCard } from './components/StatCard';
import { OrdersTable } from './components/OrdersTable';
import { WithdrawalForm } from './components/WithdrawalForm';
import { WithdrawalHistory } from './components/WithdrawalHistory';
import { RankingPositionWidget } from '@/features/ranking/components/RankingPositionWidget';
import { LayoutDashboard, Wallet, ClipboardList, AlertTriangle, ArrowDownRight } from 'lucide-react';

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-6">
    <div className="grid gap-5 md:grid-cols-2">
      <div className="h-32 rounded-2xl bg-white/5 border border-white/10" />
      <div className="h-32 rounded-2xl bg-white/5 border border-white/10" />
    </div>
    <div className="h-96 rounded-2xl bg-white/5 border border-white/10" />
  </div>
);

export const CollaboratorDashboardPage = () => {
  const [showWithdrawalHistory, setShowWithdrawalHistory] = useState(false);
  const { data, isLoading, isError, error } = useCollaboratorDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400/80" />
            <span>Painel do Colaborador</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
            <LayoutDashboard className="h-7 w-7 text-violet-400" />
            Meu Painel
          </h1>
        </div>

        <LoadingSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400/80" />
            <span>Painel do Colaborador</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
            <LayoutDashboard className="h-7 w-7 text-violet-400" />
            Meu Painel
          </h1>
        </div>

        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-6 text-red-300 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <p className="font-medium">Erro ao carregar dados</p>
            <p className="text-sm text-red-400/80 mt-1">
              {(error as Error)?.message || 'Erro desconhecido'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400/80" />
          <span>Painel do Colaborador</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
          <LayoutDashboard className="h-7 w-7 text-violet-400" />
          Meu Painel
        </h1>
      </div>

      {/* Ranking Widget */}
      <RankingPositionWidget />

      {/* Wallet Cards */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-white">Minha Carteira</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <StatCard
            label="Saldo Disponivel"
            value={data?.wallet.available ?? 0}
            variant="available"
          />
          <StatCard
            label="Saldo Bloqueado (A Receber)"
            value={data?.wallet.locked ?? 0}
            variant="locked"
          />
        </div>
      </div>

      {/* Withdrawal Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ArrowDownRight className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Saques</h2>
          </div>
          <button
            onClick={() => setShowWithdrawalHistory(!showWithdrawalHistory)}
            className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            {showWithdrawalHistory ? 'Solicitar saque' : 'Ver historico'}
          </button>
        </div>
        {showWithdrawalHistory ? (
          <WithdrawalHistory />
        ) : (
          <WithdrawalForm
            availableBalance={data?.wallet.available ?? 0}
            onSuccess={() => setShowWithdrawalHistory(true)}
          />
        )}
      </div>

      {/* Orders Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-white">Meus Pedidos</h2>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Gerencie seus trabalhos e faça entregas
            </p>
          </div>
          <span className="h-10 inline-flex items-center rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 px-4 text-sm font-medium text-gray-100">
            {data?.orders?.length || 0} pedidos
          </span>
        </div>

        <OrdersTable orders={data?.orders ?? []} />
      </div>
    </div>
  );
};
