/**
 * DisputeCard - Card resumido para lista de disputas
 * Exibe informações principais: title, status, order_id, datas
 */

import { Link } from 'react-router-dom';
import { Calendar, FileText, User, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import type { Dispute } from '../types';

interface DisputeCardProps {
  dispute: Dispute;
  showOrderLink?: boolean;
}

const getStatusBadgeClasses = (status: string) => {
  switch (status) {
    case 'ABERTA':
      return 'bg-red-500/20 border-red-500/30 text-red-300';
    case 'EM_ANALISE':
      return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300';
    case 'AGUARDANDO_RESPOSTA':
      return 'bg-blue-500/20 border-blue-500/30 text-blue-300';
    case 'RESOLVIDA':
      return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300';
    case 'CANCELADA':
      return 'bg-gray-500/20 border-gray-500/30 text-gray-300';
    default:
      return 'bg-white/10 border-white/20 text-white';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'ABERTA':
      return <AlertTriangle className="h-3.5 w-3.5" />;
    case 'EM_ANALISE':
      return <Clock className="h-3.5 w-3.5" />;
    case 'AGUARDANDO_RESPOSTA':
      return <Clock className="h-3.5 w-3.5" />;
    case 'RESOLVIDA':
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    default:
      return <FileText className="h-3.5 w-3.5" />;
  }
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    ABERTA: 'Aberta',
    EM_ANALISE: 'Em Análise',
    AGUARDANDO_RESPOSTA: 'Aguardando Resposta',
    RESOLVIDA: 'Resolvida',
    CANCELADA: 'Cancelada',
  };
  return labels[status] || status;
};

export function DisputeCard({ dispute, showOrderLink = true }: DisputeCardProps) {
  const isOpen = dispute.status === 'ABERTA';

  return (
    <Link
      to={`/disputes/${dispute.id}`}
      className="group block rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5 transition-all duration-300 hover:bg-black/40 hover:border-white/20 hover:shadow-lg hover:shadow-purple-500/10"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white group-hover:text-violet-300 transition-colors truncate">
              {dispute.title}
            </h3>
          </div>
          <p className="mt-2 text-sm text-gray-400 line-clamp-2">
            {dispute.description}
          </p>
        </div>

        <div className={`flex-shrink-0 ml-3 inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 ${getStatusBadgeClasses(dispute.status)}`}>
          {getStatusIcon(dispute.status)}
          <span className="text-xs font-medium">
            {getStatusLabel(dispute.status)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {showOrderLink && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <FileText className="h-3.5 w-3.5" />
              Pedido
            </div>
            <p className="mt-1 text-sm font-semibold text-white truncate">
              #{dispute.order_id.slice(0, 8)}
            </p>
          </div>
        )}

        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Calendar className="h-3.5 w-3.5" />
            Criada em
          </div>
          <p className="mt-1 text-sm font-semibold text-white">
            {formatDate(dispute.created_at)}
          </p>
        </div>

        {dispute.resolved_by_admin_id && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <User className="h-3.5 w-3.5" />
              Atribuída
            </div>
            <p className="mt-1 text-sm font-semibold text-emerald-300">
              Sim
            </p>
          </div>
        )}

        {dispute.resolved_at && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Resolvida em
            </div>
            <p className="mt-1 text-sm font-semibold text-emerald-300">
              {formatDate(dispute.resolved_at)}
            </p>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="mt-4 rounded-xl bg-red-500/20 border border-red-500/30 px-3 py-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <p className="text-sm text-red-300">
            Aguardando análise da equipe
          </p>
        </div>
      )}
    </Link>
  );
}
