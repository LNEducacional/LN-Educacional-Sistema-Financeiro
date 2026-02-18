import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  AlertCircle,
  Calendar,
  DollarSign,
  User,
  Search,
  Filter,
  X,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
} from 'lucide-react';
import { useStudentOrders } from './api';
import { StatusBadge } from './components/StatusBadge';
import { CreateOrderModal } from './components/CreateOrderModal';
import { Select } from '@/components/ui';
import type { StudentOrder, OrderStatus } from './types';

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

const requiresAction = (status: OrderStatus): boolean => {
  return status === 'ENTREGUE';
};

const isOverdue = (dueDate: string, status: OrderStatus): boolean => {
  if (status === 'CONCLUIDO' || status === 'CANCELADO') return false;
  return new Date(dueDate) < new Date();
};

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'NOVO', label: 'Novo' },
  { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
  { value: 'ENTREGUE', label: 'Entregue' },
  { value: 'CONCLUIDO', label: 'Concluido' },
  { value: 'ATRASADO', label: 'Atrasado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

interface OrderCardProps {
  order: StudentOrder;
}

function OrderCard({ order }: OrderCardProps) {
  const needsAction = requiresAction(order.status);
  const overdue = isOverdue(order.due_date, order.status);

  const getStatusIcon = () => {
    switch (order.status) {
      case 'NOVO':
        return <FileText className="h-5 w-5 text-blue-400" />;
      case 'EM_ANDAMENTO':
        return <Clock className="h-5 w-5 text-amber-400" />;
      case 'ENTREGUE':
        return <AlertCircle className="h-5 w-5 text-violet-400" />;
      case 'CONCLUIDO':
        return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
      case 'ATRASADO':
        return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case 'CANCELADO':
        return <XCircle className="h-5 w-5 text-gray-400" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <Link
      to={`/student/orders/${order.id}`}
      className={`group block rounded-2xl border backdrop-blur-sm p-5 transition-all duration-300 hover:shadow-lg ${
        needsAction
          ? 'border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/15 hover:border-violet-500/50 hover:shadow-violet-500/10'
          : 'border-white/10 bg-black/30 hover:bg-black/40 hover:border-white/20 hover:shadow-purple-500/10'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`rounded-xl p-3 ${
              needsAction
                ? 'bg-violet-500/20 border border-violet-500/30'
                : 'bg-white/5 border border-white/10'
            }`}
          >
            {getStatusIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white group-hover:text-violet-300 transition-colors">
                {order.service_name}
              </h3>
              {needsAction && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 text-xs font-medium text-violet-300">
                  <AlertCircle className="h-3 w-3" />
                  Acao necessaria
                </span>
              )}
              {overdue && order.status !== 'ATRASADO' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 border border-red-500/30 px-2 py-0.5 text-xs font-medium text-red-300">
                  <AlertTriangle className="h-3 w-3" />
                  Atrasado
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-400">
              <User className="h-3.5 w-3.5" />
              {order.collaborator_name}
            </div>
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Calendar className="h-3.5 w-3.5" />
            Prazo
          </div>
          <p
            className={`mt-1 text-lg font-bold ${
              overdue && order.status !== 'CONCLUIDO' && order.status !== 'CANCELADO'
                ? 'text-red-300'
                : 'text-white'
            }`}
          >
            {formatDate(order.due_date)}
          </p>
        </div>

        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <DollarSign className="h-3.5 w-3.5" />
            Valor Total
          </div>
          <p className="mt-1 text-lg font-bold text-emerald-300">
            {formatCurrency(order.total_value)}
          </p>
        </div>
      </div>
    </Link>
  );
}

export const OrdersListPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: orders, isLoading, error, refetch } = useStudentOrders();

  const filteredOrders = useMemo(() => {
    if (!orders) return [];

    let filtered = orders;

    if (statusFilter) {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.service_name.toLowerCase().includes(term) ||
          o.collaborator_name.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [orders, searchTerm, statusFilter]);

  const pendingAction = useMemo(
    () => filteredOrders.filter((o) => requiresAction(o.status)),
    [filteredOrders]
  );

  const otherOrders = useMemo(
    () => filteredOrders.filter((o) => !requiresAction(o.status)),
    [filteredOrders]
  );

  const totalPendingAction = useMemo(
    () => orders?.filter((o) => requiresAction(o.status)).length || 0,
    [orders]
  );

  const hasActiveFilters = statusFilter || searchTerm;

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-6 text-red-300 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5" />
        Erro ao carregar pedidos
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
            <span>Meus trabalhos</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
            <FileText className="h-7 w-7 text-violet-400" />
            Meus Pedidos
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-10 inline-flex items-center rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 px-4 text-sm font-medium text-gray-100">
            {orders?.length || 0} pedidos
          </span>
          {totalPendingAction > 0 && (
            <span className="h-10 inline-flex items-center gap-2 rounded-2xl bg-violet-500/10 border border-violet-500/20 px-4 text-sm font-medium text-violet-300">
              <AlertCircle className="h-4 w-4" />
              {totalPendingAction} aguardando acao
            </span>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="h-10 inline-flex items-center gap-2 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white px-4 text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Pedido
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Buscar por servico ou colaborador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-2xl bg-black/30 backdrop-blur-xl text-gray-100 placeholder-gray-500/60 border border-white/10 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 pl-10 pr-4 text-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={STATUS_OPTIONS}
              placeholder="Todos os status"
            />
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="h-10 inline-flex items-center gap-2 rounded-2xl bg-black/30 backdrop-blur-xl text-gray-100 border border-white/10 px-4 text-sm font-medium transition-all duration-200 hover:bg-black/50 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <X className="h-4 w-4" />
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-8 text-center">
          <FileText className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">
            {orders?.length === 0
              ? 'Voce ainda nao possui pedidos.'
              : 'Nenhum pedido encontrado com os filtros aplicados.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending Action Section */}
          {pendingAction.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-violet-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">
                  Aguardando sua acao
                </h2>
                <span className="ml-2 inline-flex items-center rounded-full bg-violet-500/20 border border-violet-500/30 px-2.5 py-0.5 text-xs font-medium text-violet-300">
                  {pendingAction.length}
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {pendingAction.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </div>
          )}

          {/* Other Orders Section */}
          {otherOrders.length > 0 && (
            <div>
              {pendingAction.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-gray-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">
                    Outros pedidos
                  </h2>
                  <span className="ml-2 inline-flex items-center rounded-full bg-white/10 border border-white/20 px-2.5 py-0.5 text-xs font-medium text-gray-300">
                    {otherOrders.length}
                  </span>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {otherOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <CreateOrderModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
};
