import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  History,
  AlertTriangle,
  FileText,
  DollarSign,
  Calendar,
  User,
  Sparkles,
  Download,
  Lock,
  Unlock,
  RefreshCw,
} from 'lucide-react';
import { useOrderDetails, useOrderPayment } from './api';
import { StatusBadge } from './components/StatusBadge';
import { DeliveryCard } from './components/DeliveryCard';
import { ApproveModal } from './components/ApproveModal';
import { RevisionModal } from './components/RevisionModal';
import { PaymentCard } from './components/PaymentCard';
import { useOrderStatusHistory } from '@/features/orders/api';
import { StatusTimeline } from '@/features/orders/components/StatusTimeline';
import { useOrderDisputes } from '@/features/disputes/api';
import { DisputeCard } from '@/features/disputes/components/DisputeCard';

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

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getPaymentStatusConfig = (status: string) => {
  switch (status) {
    case 'LOCKED':
      return {
        label: 'Retido',
        icon: Lock,
        className: 'bg-amber-500/20 border-amber-500/30 text-amber-300',
        iconColor: 'text-amber-400',
      };
    case 'RELEASED':
      return {
        label: 'Liberado',
        icon: Unlock,
        className: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
        iconColor: 'text-emerald-400',
      };
    case 'REFUNDED':
      return {
        label: 'Reembolsado',
        icon: RefreshCw,
        className: 'bg-red-500/20 border-red-500/30 text-red-300',
        iconColor: 'text-red-400',
      };
    default:
      return {
        label: status,
        icon: DollarSign,
        className: 'bg-gray-500/20 border-gray-500/30 text-gray-300',
        iconColor: 'text-gray-400',
      };
  }
};

export const OrderDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: details, isLoading, error, refetch } = useOrderDetails(id || '');
  const { data: statusHistory = [] } = useOrderStatusHistory(id || '');
  const { data: disputesData } = useOrderDisputes(id || '');
  const { data: paymentInfo } = useOrderPayment(id || '');
  const disputes = disputesData ?? [];

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-violet-400 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="space-y-4">
        <Link
          to="/student/orders"
          className="group inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-300" />
          Voltar
        </Link>
        <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-600/5 backdrop-blur-sm p-8 text-red-300 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-500/20">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Erro ao carregar pedido</h3>
            <p className="text-red-400/70 text-sm mt-1">
              O pedido solicitado nao existe ou ocorreu um erro.
            </p>
            <button
              onClick={() => navigate('/student/orders')}
              className="mt-3 text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              Voltar para lista
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { order, service, collaborator, deliveries, revisions } = details;
  // Student can approve/reject when order is AGUARDANDO_APROVACAO (new pipeline) or ENTREGUE (legacy)
  const canTakeAction = order.status === 'AGUARDANDO_APROVACAO' || order.status === 'ENTREGUE';
  const paymentConfig = getPaymentStatusConfig(order.payment_status);
  const PaymentIcon = paymentConfig.icon;

  const canOpenDispute =
    (order.status === 'ENTREGUE' ||
     order.status === 'CONCLUIDO' ||
     order.status === 'AGUARDANDO_APROVACAO' ||
     order.status === 'REVISAO_SOLICITADA') &&
    disputes.length === 0;

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        to="/student/orders"
        className="group inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-all duration-300"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-300" />
        <span>Voltar para meus pedidos</span>
      </Link>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-black/40 via-black/30 to-violet-900/10 backdrop-blur-xl p-4 sm:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-violet-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="flex items-start gap-6">
            <div className="relative flex-shrink-0 h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <FileText className="h-10 w-10 text-white" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  {service.name}
                </h1>
                <StatusBadge status={order.status} />
              </div>

              <div className="flex items-center gap-2 text-gray-400">
                <User className="h-4 w-4" />
                <span>Colaborador: {collaborator.name}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 text-sm text-gray-400">
                  <Calendar className="h-3.5 w-3.5" />
                  Criado em {formatDate(order.created_at)}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium ${paymentConfig.className}`}
                >
                  <PaymentIcon className={`h-3.5 w-3.5 ${paymentConfig.iconColor}`} />
                  {paymentConfig.label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 flex flex-col justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 border border-emerald-500/30 px-8 py-6 shadow-lg shadow-emerald-500/10">
            <DollarSign className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            <span className="text-4xl font-bold text-emerald-300 text-center">
              {formatCurrency(order.total_value)}
            </span>
            <span className="text-sm text-emerald-400/70 mt-2 text-center">
              Valor Total
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 backdrop-blur-sm p-5 hover:border-emerald-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <DollarSign className="h-4 w-4" />
              Valor Total
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {formatCurrency(order.total_value)}
            </p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm p-5 hover:border-blue-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm text-blue-400">
              <Calendar className="h-4 w-4" />
              Prazo de Entrega
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {formatDate(order.due_date)}
            </p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/10 to-violet-600/5 backdrop-blur-sm p-5 hover:border-violet-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-colors" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm text-violet-400">
              <Clock className="h-4 w-4" />
              Criado em
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {formatDate(order.created_at)}
            </p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/10 to-amber-600/5 backdrop-blur-sm p-5 hover:border-amber-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <PaymentIcon className="h-4 w-4" />
              Status Pagamento
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {paymentConfig.label}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Section */}
      {paymentInfo && (
        <div className="grid gap-6 lg:grid-cols-2">
          <PaymentCard paymentInfo={paymentInfo} totalValue={order.total_value} />
        </div>
      )}

      {/* Action Required Section */}
      {canTakeAction && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-purple-500/10 backdrop-blur-sm p-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-violet-500/20">
                <AlertTriangle className="h-5 w-5 text-violet-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">
                Acao Necessaria
              </h2>
            </div>
            <p className="text-gray-400 mb-5">
              O colaborador entregou o trabalho. Por favor, revise o arquivo e tome uma decisao.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowApproveModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] transition-all duration-300"
              >
                <CheckCircle className="h-5 w-5" />
                Aprovar Pagamento
              </button>
              <button
                onClick={() => setShowRevisionModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-red-500/20 border border-red-500/30 px-6 py-3 font-semibold text-red-300 hover:bg-red-500/30 hover:border-red-500/50 transition-all duration-300"
              >
                <XCircle className="h-5 w-5" />
                Solicitar Revisao
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Message */}
      {order.status === 'CONCLUIDO' && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 backdrop-blur-sm p-6">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/20">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Pedido Concluido
              </h2>
              <p className="text-emerald-400/70 mt-1">
                O pagamento foi liberado para o colaborador em{' '}
                {formatDateTime(order.updated_at)}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Deliveries Section */}
      {deliveries.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-sm p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Download className="h-5 w-5 text-blue-400" />
            </div>
            Entregas
            <span className="ml-2 rounded-full bg-blue-500/20 border border-blue-500/30 px-3 py-1 text-sm font-medium text-blue-300">
              {deliveries.length}
            </span>
          </h2>
          <div className="space-y-3">
            {deliveries.map((delivery, index) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                isLatest={index === 0 && canTakeAction}
              />
            ))}
          </div>
        </div>
      )}

      {/* Disputes Section */}
      {disputes.length > 0 && (
        <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-red-600/5 backdrop-blur-sm p-6">
          <h2 className="mb-5 flex items-center gap-3 text-lg font-semibold text-white">
            <div className="p-2 rounded-lg bg-red-500/20">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            Disputas Relacionadas
            <span className="rounded-full bg-red-500/20 border border-red-500/30 px-3 py-1 text-sm font-medium text-red-300">
              {disputes.length}
            </span>
          </h2>
          <div className="space-y-3">
            {disputes.map((dispute) => (
              <DisputeCard key={dispute.id} dispute={dispute} showOrderLink={false} />
            ))}
          </div>
        </div>
      )}

      {/* Open Dispute Button */}
      {canOpenDispute && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-red-500/30 bg-gradient-to-br from-red-500/10 via-red-500/5 to-orange-500/10 backdrop-blur-sm p-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">
                Problemas com o Pedido?
              </h2>
            </div>
            <p className="text-gray-400 mb-5">
              Se voce encontrou algum problema com a entrega ou com o colaborador,
              pode abrir uma disputa para analise da nossa equipe.
            </p>
            <Link
              to={`/orders/${order.id}/dispute`}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 font-semibold text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-[1.02] transition-all duration-300"
            >
              <AlertTriangle className="h-5 w-5" />
              Abrir Disputa
            </Link>
          </div>
        </div>
      )}

      {/* Status History */}
      {statusHistory.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-sm p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white">
            <div className="p-2 rounded-lg bg-violet-500/20">
              <History className="h-5 w-5 text-violet-400" />
            </div>
            Historico de Status
          </h2>
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <StatusTimeline history={statusHistory} />
          </div>
        </div>
      )}

      {/* Revision History */}
      {revisions.length > 0 && (
        <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-red-600/5 backdrop-blur-sm p-6">
          <h2 className="mb-5 flex items-center gap-3 text-lg font-semibold text-white">
            <div className="p-2 rounded-lg bg-red-500/20">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            Historico de Revisoes
            <span className="rounded-full bg-red-500/20 border border-red-500/30 px-3 py-1 text-sm font-medium text-red-300">
              {revisions.length}
            </span>
          </h2>
          <div className="space-y-3">
            {revisions.map((revision) => (
              <div
                key={revision.id}
                className="rounded-xl border border-red-500/20 bg-gradient-to-r from-red-500/5 to-transparent p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDateTime(revision.created_at)}
                    </div>
                    <p className="text-white mt-2">{revision.reason}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <ApproveModal
        orderId={order.id}
        serviceName={service.name}
        totalValue={order.total_value}
        collaboratorName={collaborator.name}
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        onSuccess={() => refetch()}
      />

      <RevisionModal
        orderId={order.id}
        serviceName={service.name}
        isOpen={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
