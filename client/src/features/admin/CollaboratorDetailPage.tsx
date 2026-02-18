import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useCollaboratorDetail,
  useCollaboratorEarnings,
  useCollaboratorRankings,
  useCollaboratorDelinquents,
  useActiveJobs,
  useComplaintsPaginated,
} from './api';
import { EditCollaboratorModal } from './components/EditCollaboratorModal';
import { CollaboratorEarningsChart } from './components/CollaboratorEarningsChart';
import { RevisionsModal } from './components/RevisionsModal';
import {
  ArrowLeft,
  Star,
  Clock,
  DollarSign,
  Wallet,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pencil,
  Trophy,
  TrendingUp,
  ThumbsUp,
  Award,
  Activity,
  UserX,
  MessageSquareWarning,
  Calendar,
  Mail,
  Sparkles,
  Target,
  Zap,
  Briefcase,
} from 'lucide-react';

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

const statusColors: Record<string, string> = {
  NOVO: 'bg-blue-500/20 border border-blue-500/30 text-blue-300',
  EM_ANDAMENTO: 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-300',
  ENTREGUE: 'bg-purple-500/20 border border-purple-500/30 text-purple-300',
  CONCLUIDO: 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300',
  ATRASADO: 'bg-red-500/20 border border-red-500/30 text-red-300',
  CANCELADO: 'bg-gray-500/20 border border-gray-500/30 text-gray-300',
  AGUARDANDO_REVISAO: 'bg-orange-500/20 border border-orange-500/30 text-orange-300',
  NAO_APROVADO: 'bg-red-500/20 border border-red-500/30 text-red-300',
};

const paymentStatusColors: Record<string, string> = {
  LOCKED: 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-300',
  RELEASED: 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300',
  REFUNDED: 'bg-red-500/20 border border-red-500/30 text-red-300',
};

const paymentStatusLabels: Record<string, string> = {
  LOCKED: 'Bloqueado',
  RELEASED: 'Liberado',
  REFUNDED: 'Reembolsado',
};

// Generate initials from name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

// Generate a consistent color based on name
const getAvatarGradient = (name: string): string => {
  const gradients = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-indigo-500 to-blue-600',
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
  return gradients[index];
};

export function CollaboratorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: collaborator, isLoading, error, refetch } = useCollaboratorDetail(id || '');
  const { data: earningsData, isLoading: isLoadingEarnings } = useCollaboratorEarnings(id || '', 6);
  const { data: rankingsData } = useCollaboratorRankings(id || '');
  const { data: delinquentsData } = useCollaboratorDelinquents(id || '');
  const { data: activeJobsData } = useActiveJobs(1, 10, undefined, id);
  const { data: complaintsData } = useComplaintsPaginated(1, 10, undefined, id);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRevisionsModalOpen, setIsRevisionsModalOpen] = useState(false);

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

  if (error || !collaborator) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/collaborators"
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
            <h3 className="font-semibold text-lg">Colaborador nao encontrado</h3>
            <p className="text-red-400/70 text-sm mt-1">O colaborador solicitado nao existe ou foi removido.</p>
          </div>
        </div>
      </div>
    );
  }

  const avatarGradient = getAvatarGradient(collaborator.name);
  const initials = getInitials(collaborator.name);

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        to="/admin/collaborators"
        className="group inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-all duration-300"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-300" />
        <span>Voltar</span>
      </Link>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-black/40 via-black/30 to-violet-900/10 backdrop-blur-xl p-4 sm:p-8">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-violet-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex flex-col md:flex-row items-stretch justify-between gap-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className={`relative flex-shrink-0 h-24 w-24 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center shadow-lg shadow-violet-500/20`}>
              <span className="text-2xl sm:text-3xl font-bold text-white">{initials}</span>
              {collaborator.pending_jobs > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 rounded-full bg-emerald-500 items-center justify-center">
                  <Zap className="h-3 w-3 text-white" />
                </span>
              )}
            </div>

            {/* Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-white">{collaborator.name}</h1>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-white/10 hover:border-violet-500/30 hover:text-violet-300 transition-all duration-300"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
              </div>

              <div className="flex items-center gap-2 text-gray-400">
                <Mail className="h-4 w-4" />
                <span>{collaborator.email}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {collaborator.specialty && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 px-4 py-1.5 text-sm font-medium text-violet-300">
                    <Target className="h-3.5 w-3.5" />
                    {collaborator.specialty}
                  </span>
                )}
                {collaborator.pix_key && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 text-sm text-gray-400">
                    <DollarSign className="h-3.5 w-3.5" />
                    PIX: {collaborator.pix_key}
                  </span>
                )}
                {collaborator.pending_jobs > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-4 py-1.5 text-sm font-medium text-emerald-300">
                    <Activity className="h-3.5 w-3.5" />
                    Ativo
                  </span>
                )}
              </div>

              <p className="flex items-center gap-1.5 text-sm text-gray-500">
                <Calendar className="h-3.5 w-3.5" />
                Membro desde {formatDate(collaborator.created_at)}
              </p>
            </div>
          </div>

          {/* Rating Card */}
          <div className="flex-shrink-0 flex flex-col justify-center rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border border-yellow-500/30 px-8 py-6 shadow-lg shadow-yellow-500/10">
            <Star className="h-10 w-10 fill-yellow-400 text-yellow-400 mx-auto mb-2" />
            <span className="text-5xl font-bold text-yellow-300 text-center">
              {collaborator.avg_rating.toFixed(1)}
            </span>
            <span className="text-sm text-yellow-400/70 mt-2 text-center">
              {collaborator.total_ratings} avaliacoes
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
              <CheckCircle className="h-4 w-4" />
              Trabalhos Concluidos
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">
              {collaborator.completed_jobs}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              de {collaborator.total_jobs} total
            </p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm p-5 hover:border-blue-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm text-blue-400">
              <Clock className="h-4 w-4" />
              Pontualidade
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">
              {collaborator.on_time_delivery_pct.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500 mt-1">entregas no prazo</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/10 to-amber-600/5 backdrop-blur-sm p-5 hover:border-amber-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Pendentes / Atrasados
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">
              {collaborator.pending_jobs}
              {collaborator.delayed_jobs > 0 && (
                <span className="ml-2 text-lg text-red-400">
                  ({collaborator.delayed_jobs} atrasados)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-sm p-5 hover:border-purple-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm text-purple-400">
              <Trophy className="h-4 w-4" />
              Ranking Interno
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">
              {collaborator.internal_ranking.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">de 5.00</p>
          </div>
        </div>
      </div>

      {/* Ranking Positions */}
      {rankingsData && (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-black/40 to-amber-900/5 backdrop-blur-sm p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Trophy className="h-5 w-5 text-amber-400" />
            </div>
            Posicoes no Ranking
          </h2>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            {/* Production */}
            <div className="group rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 p-4 text-center hover:border-blue-500/40 transition-all duration-300">
              <div className="flex items-center justify-center gap-1.5 text-blue-400">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Producao</span>
              </div>
              {rankingsData.production ? (
                <>
                  <p className="mt-3 text-4xl font-bold text-blue-300">
                    #{rankingsData.production.position}
                  </p>
                  <p className="text-xs text-blue-400/70 mt-2">
                    de {rankingsData.production.total} | {rankingsData.production.value} jobs
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-gray-500">N/A</p>
              )}
            </div>

            {/* Revenue */}
            <div className="group rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 p-4 text-center hover:border-emerald-500/40 transition-all duration-300">
              <div className="flex items-center justify-center gap-1.5 text-emerald-400">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm font-medium">Faturamento</span>
              </div>
              {rankingsData.revenue ? (
                <>
                  <p className="mt-3 text-4xl font-bold text-emerald-300">
                    #{rankingsData.revenue.position}
                  </p>
                  <p className="text-xs text-emerald-400/70 mt-2">
                    de {rankingsData.revenue.total} | {formatCurrency(rankingsData.revenue.value)}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-gray-500">N/A</p>
              )}
            </div>

            {/* Punctuality */}
            <div className="group rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 p-4 text-center hover:border-purple-500/40 transition-all duration-300">
              <div className="flex items-center justify-center gap-1.5 text-purple-400">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Pontualidade</span>
              </div>
              {rankingsData.punctuality ? (
                <>
                  <p className="mt-3 text-4xl font-bold text-purple-300">
                    #{rankingsData.punctuality.position}
                  </p>
                  <p className="text-xs text-purple-400/70 mt-2">
                    de {rankingsData.punctuality.total} | {rankingsData.punctuality.value.toFixed(1)}%
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-gray-500">N/A</p>
              )}
            </div>

            {/* Satisfaction */}
            <div className="group rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 p-4 text-center hover:border-yellow-500/40 transition-all duration-300">
              <div className="flex items-center justify-center gap-1.5 text-yellow-400">
                <ThumbsUp className="h-4 w-4" />
                <span className="text-sm font-medium">Satisfacao</span>
              </div>
              {rankingsData.satisfaction ? (
                <>
                  <p className="mt-3 text-4xl font-bold text-yellow-300">
                    #{rankingsData.satisfaction.position}
                  </p>
                  <p className="text-xs text-yellow-400/70 mt-2">
                    de {rankingsData.satisfaction.total} | {rankingsData.satisfaction.value.toFixed(1)}/5
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-gray-500">N/A</p>
              )}
            </div>

            {/* Quality */}
            <div className="group rounded-xl bg-gradient-to-br from-rose-500/10 to-rose-600/5 border border-rose-500/20 p-4 text-center hover:border-rose-500/40 transition-all duration-300">
              <div className="flex items-center justify-center gap-1.5 text-rose-400">
                <Award className="h-4 w-4" />
                <span className="text-sm font-medium">Qualidade</span>
              </div>
              {rankingsData.quality ? (
                <>
                  <p className="mt-3 text-4xl font-bold text-rose-300">
                    #{rankingsData.quality.position}
                  </p>
                  <p className="text-xs text-rose-400/70 mt-2">
                    de {rankingsData.quality.total} | {rankingsData.quality.value.toFixed(1)}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-gray-500">N/A</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-black/40 to-violet-900/5 backdrop-blur-sm p-6">
        <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white">
          <div className="p-2 rounded-lg bg-violet-500/20">
            <Wallet className="h-5 w-5 text-violet-400" />
          </div>
          Resumo Financeiro
        </h2>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <div className="rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/20 p-5">
            <p className="text-sm text-emerald-400 font-medium">Ganhos Totais</p>
            <p className="mt-2 text-2xl font-bold text-emerald-300">
              {formatCurrency(collaborator.total_earnings)}
            </p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/20 p-5">
            <p className="text-sm text-amber-400 font-medium">Pendente de Liberacao</p>
            <p className="mt-2 text-2xl font-bold text-amber-300">
              {formatCurrency(collaborator.pending_earnings)}
            </p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-600/5 border border-blue-500/20 p-5">
            <p className="text-sm text-blue-400 font-medium">Saldo Disponivel</p>
            <p className="mt-2 text-2xl font-bold text-blue-300">
              {formatCurrency(collaborator.balance_available)}
            </p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-gray-500/15 to-gray-600/5 border border-white/10 p-5">
            <p className="text-sm text-gray-400 font-medium">Saldo Bloqueado</p>
            <p className="mt-2 text-2xl font-bold text-gray-300">
              {formatCurrency(collaborator.balance_locked)}
            </p>
          </div>
        </div>
      </div>

      {/* Earnings Chart */}
      <CollaboratorEarningsChart
        data={earningsData}
        isLoading={isLoadingEarnings}
      />

      {/* Active Jobs */}
      {activeJobsData && activeJobsData.jobs.length > 0 && (
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 backdrop-blur-sm p-6">
          <h2 className="mb-5 flex items-center gap-3 text-lg font-semibold text-white">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <Activity className="h-5 w-5 text-emerald-400" />
            </div>
            Trabalhos Ativos
            <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-sm font-medium text-emerald-300">
              {activeJobsData.total}
            </span>
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Aluno
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Servico
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Entrega
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeJobsData.jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-white/5 transition-colors duration-200">
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-white">
                      {job.student_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-400">
                      {job.service_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          statusColors[job.status] || 'bg-gray-500/20 border border-gray-500/30 text-gray-300'
                        }`}
                      >
                        {job.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium text-white">
                      {formatCurrency(job.total_value)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      <span className={job.days_until_due < 0 ? 'text-red-400 font-medium' : 'text-gray-400'}>
                        {formatDate(job.due_date)}
                        {job.days_until_due < 0 && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-red-500/20 border border-red-500/30 px-2 py-0.5 text-xs text-red-300">
                            {Math.abs(job.days_until_due)}d atrasado
                          </span>
                        )}
                        {job.days_until_due === 0 && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-xs text-amber-300">
                            Hoje
                          </span>
                        )}
                        {job.days_until_due > 0 && (
                          <span className="ml-2 text-gray-500">({job.days_until_due}d)</span>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activeJobsData.total > 10 && (
            <p className="mt-4 text-center text-sm text-emerald-400/70">
              Mostrando 10 de {activeJobsData.total} trabalhos ativos
            </p>
          )}
        </div>
      )}

      {/* Recent Jobs */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-sm p-6">
        <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white">
          <div className="p-2 rounded-lg bg-white/10">
            <Briefcase className="h-5 w-5 text-gray-400" />
          </div>
          Trabalhos Recentes
        </h2>
        {collaborator.recent_jobs && collaborator.recent_jobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Aluno
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Servico
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Pagamento
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                    Valor Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                    Comissao
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">
                    %
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Entrega
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {collaborator.recent_jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-white/5 transition-colors duration-200">
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-white">
                      {job.student_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-400">
                      {job.service_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          statusColors[job.status] || 'bg-gray-500/20 border border-gray-500/30 text-gray-300'
                        }`}
                      >
                        {job.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          paymentStatusColors[job.payment_status] ||
                          'bg-gray-500/20 border border-gray-500/30 text-gray-300'
                        }`}
                      >
                        {paymentStatusLabels[job.payment_status] || job.payment_status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium text-white">
                      {formatCurrency(job.total_value)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-emerald-400">
                      {formatCurrency(job.collab_value)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-sm">
                      <span className="rounded-full bg-violet-500/20 border border-violet-500/30 px-2.5 py-1 text-xs font-semibold text-violet-300">
                        {job.total_value > 0 ? Math.round((job.collab_value / job.total_value) * 100) : 0}%
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-400">
                      {formatDate(job.due_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Briefcase className="h-12 w-12 mb-3 opacity-50" />
            <p>Nenhum trabalho encontrado</p>
          </div>
        )}
      </div>

      {/* Refunds Summary */}
      {collaborator.total_refunds_count > 0 && (
        <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-red-600/5 backdrop-blur-sm p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white">
            <div className="p-2 rounded-lg bg-red-500/20">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            Reembolsos Efetuados
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 p-5">
              <p className="text-sm text-red-400 font-medium">Total de Reembolsos</p>
              <p className="mt-2 text-3xl font-bold text-red-300">
                {collaborator.total_refunds_count}
              </p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 p-5">
              <p className="text-sm text-red-400 font-medium">Valor Total Reembolsado</p>
              <p className="mt-2 text-3xl font-bold text-red-300">
                {formatCurrency(collaborator.total_refunds_amount)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Complaints */}
      {complaintsData && complaintsData.complaints.length > 0 && (
        <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-orange-600/5 backdrop-blur-sm p-6">
          <h2 className="mb-5 flex items-center gap-3 text-lg font-semibold text-white">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <MessageSquareWarning className="h-5 w-5 text-orange-400" />
            </div>
            Reclamacoes Vinculadas
            <span className="rounded-full bg-orange-500/20 border border-orange-500/30 px-3 py-1 text-sm font-medium text-orange-300">
              {complaintsData.total}
            </span>
          </h2>
          <div className="space-y-3">
            {complaintsData.complaints.map((complaint) => (
              <div
                key={complaint.id}
                className="rounded-xl border border-white/10 bg-black/20 p-5 hover:border-orange-500/20 transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-white">{complaint.student_name}</p>
                    <p className="text-sm text-gray-400">{complaint.service_name}</p>
                    {complaint.latest_reason && (
                      <p className="mt-2 text-sm text-orange-300/80 bg-orange-500/10 rounded-lg px-3 py-2">
                        {complaint.latest_reason}
                      </p>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        complaint.priority === 'HIGH'
                          ? 'bg-red-500/20 border border-red-500/30 text-red-300'
                          : complaint.priority === 'MEDIUM'
                          ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-300'
                          : 'bg-gray-500/20 border border-gray-500/30 text-gray-300'
                      }`}
                    >
                      {complaint.status.replace(/_/g, ' ')}
                    </span>
                    <p className="text-xs text-gray-500">
                      {complaint.revision_count} revisoes | {complaint.days_pending}d pendente
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {complaintsData.total > 10 && (
            <p className="mt-4 text-center text-sm text-orange-400/70">
              Mostrando 10 de {complaintsData.total} reclamacoes
            </p>
          )}
        </div>
      )}

      {/* Recent Revisions */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-sm p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <div className="p-2 rounded-lg bg-red-500/20">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            Revisoes
          </h2>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-red-500/20 border border-red-500/30 px-3 py-1 text-sm font-medium text-red-300">
              {collaborator.total_revisions_count} total
            </span>
            {collaborator.total_revisions_count > 0 && (
              <button
                onClick={() => setIsRevisionsModalOpen(true)}
                className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 hover:border-violet-500/30 hover:text-violet-300 transition-all duration-300"
              >
                Ver todas
              </button>
            )}
          </div>
        </div>
        {collaborator.recent_revisions && collaborator.recent_revisions.length > 0 ? (
          <div className="space-y-3">
            {collaborator.recent_revisions.map((revision) => (
              <div
                key={revision.id}
                className="rounded-xl border border-red-500/20 bg-gradient-to-r from-red-500/5 to-transparent p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-white">
                      {revision.student_name}
                    </p>
                    <p className="text-sm text-gray-400">{revision.reason}</p>
                  </div>
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    {formatDate(revision.created_at)}
                  </span>
                </div>
              </div>
            ))}
            {collaborator.total_revisions_count > 10 && (
              <button
                onClick={() => setIsRevisionsModalOpen(true)}
                className="w-full text-center text-sm text-violet-400 hover:text-violet-300 transition-colors py-2"
              >
                Mostrando ultimas 10 de {collaborator.total_revisions_count} revisoes - Ver todas
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <CheckCircle className="h-12 w-12 mb-3 opacity-50" />
            <p>Nenhuma revisao registrada</p>
          </div>
        )}
      </div>

      {/* Delinquent Students */}
      {delinquentsData && delinquentsData.delinquents.length > 0 && (
        <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-red-600/5 backdrop-blur-sm p-6">
          <h2 className="mb-5 flex items-center gap-3 text-lg font-semibold text-white">
            <div className="p-2 rounded-lg bg-red-500/20">
              <UserX className="h-5 w-5 text-red-400" />
            </div>
            Alunos Inadimplentes
            <span className="rounded-full bg-red-500/20 border border-red-500/30 px-3 py-1 text-sm font-medium text-red-300">
              {delinquentsData.total_count}
            </span>
            <span className="text-sm font-normal text-red-400/70">
              Total: {formatCurrency(delinquentsData.total_owed)}
            </span>
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Aluno
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    Email
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                    Valor Devido
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">
                    Pedidos
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">
                    Dias Atrasado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {delinquentsData.delinquents.map((d) => (
                  <tr key={d.student_id} className="hover:bg-white/5 transition-colors duration-200">
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-white">
                      {d.student_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-400">
                      {d.student_email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-red-400">
                      {formatCurrency(d.total_owed)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-white">
                      {d.overdue_orders}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center">
                      <span className="inline-flex rounded-full bg-red-500/20 border border-red-500/30 px-3 py-1 text-xs font-semibold text-red-300">
                        {d.days_overdue}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <EditCollaboratorModal
          collaborator={collaborator}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => refetch()}
        />
      )}

      {/* Revisions Modal */}
      {isRevisionsModalOpen && id && (
        <RevisionsModal
          collaboratorId={id}
          collaboratorName={collaborator.name}
          totalRevisions={collaborator.total_revisions_count}
          onClose={() => setIsRevisionsModalOpen(false)}
        />
      )}
    </div>
  );
}
