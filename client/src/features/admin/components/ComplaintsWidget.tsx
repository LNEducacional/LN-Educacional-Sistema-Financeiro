import { MessageSquareWarning } from 'lucide-react';
import { CardSkeleton } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { ComplaintItem } from '../types';

interface ComplaintsWidgetProps {
  data?: ComplaintItem[];
  isLoading: boolean;
}

const MAX_DISPLAY = 5;

const STATUS_STYLES: Record<string, string> = {
  AGUARDANDO_REVISAO: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  NAO_APROVADO: 'bg-red-500/20 text-red-300 border border-red-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  AGUARDANDO_REVISAO: 'Aguardando revisao',
  NAO_APROVADO: 'Nao aprovado',
};

const ComplaintCard = ({ complaint }: { complaint: ComplaintItem }) => (
  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
    {/* Header */}
    <div className="flex items-start justify-between gap-2 mb-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{complaint.service_name}</p>
        <p className="text-xs text-gray-500">
          {complaint.student_name} - {complaint.collaborator_name}
        </p>
      </div>
      <span
        className={`shrink-0 inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
          STATUS_STYLES[complaint.status] ?? 'bg-white/10 text-gray-300 border border-white/20'
        }`}
      >
        {STATUS_LABELS[complaint.status] ?? complaint.status}
      </span>
    </div>

    {/* Info */}
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-3">
        <span className="text-gray-500">
          Revisoes: <span className="font-medium text-gray-300">{complaint.revision_count}</span>
        </span>
        <span className="text-gray-500">Entrega: {formatDate(complaint.due_date)}</span>
      </div>
      <span className="font-medium text-gray-300">{formatCurrency(complaint.total_value)}</span>
    </div>

    {/* Motivo */}
    {complaint.latest_reason && (
      <p className="mt-2 text-xs text-gray-400 bg-white/5 p-2 rounded-lg border border-white/5 line-clamp-2">
        "{complaint.latest_reason}"
      </p>
    )}
  </div>
);

export const ComplaintsWidget = ({ data, isLoading }: ComplaintsWidgetProps) => {
  if (isLoading) {
    return <CardSkeleton lines={4} />;
  }

  const complaints = data ?? [];
  const hasComplaints = complaints.length > 0;
  const hiddenCount = complaints.length - MAX_DISPLAY;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquareWarning className="h-5 w-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Reclamacoes</h3>
          {hasComplaints && (
            <span className="bg-purple-500/20 text-purple-300 text-xs font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
              {complaints.length}
            </span>
          )}
        </div>
      </div>

      {!hasComplaints ? (
        <div className="text-center py-6">
          <MessageSquareWarning className="h-8 w-8 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500">Nenhuma reclamacao pendente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.slice(0, MAX_DISPLAY).map((complaint) => (
            <ComplaintCard key={complaint.id} complaint={complaint} />
          ))}

          {hiddenCount > 0 && <p className="text-center text-sm text-gray-500">+ {hiddenCount} mais reclamacoes</p>}
        </div>
      )}
    </div>
  );
};
