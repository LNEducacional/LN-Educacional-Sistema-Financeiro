import { useState } from 'react';
import { Bell, AlertTriangle, Clock, Calendar, MessageSquareWarning, ChevronDown, ChevronUp } from 'lucide-react';
import { CardSkeleton } from '@/components/ui';
import type { AlertItem, AlertsResponse } from '../types';

interface AlertsWidgetProps {
  data?: AlertsResponse;
  isLoading: boolean;
}

const ALERT_ICONS: Record<AlertItem['type'], React.ReactNode> = {
  OVERDUE: <AlertTriangle className="h-4 w-4 text-red-400" />,
  DUE_TODAY: <Clock className="h-4 w-4 text-amber-400" />,
  DUE_TOMORROW: <Calendar className="h-4 w-4 text-blue-400" />,
  COMPLAINT: <MessageSquareWarning className="h-4 w-4 text-purple-400" />,
};

const ALERT_LABELS: Record<AlertItem['type'], string> = {
  OVERDUE: 'Atrasado',
  DUE_TODAY: 'Vence hoje',
  DUE_TOMORROW: 'Vence amanha',
  COMPLAINT: 'Reclamacao',
};

const PRIORITY_STYLES: Record<AlertItem['priority'], string> = {
  HIGH: 'bg-red-500/10 border-red-500/20',
  MEDIUM: 'bg-amber-500/10 border-amber-500/20',
  LOW: 'bg-blue-500/10 border-blue-500/20',
};

const INITIAL_DISPLAY_COUNT = 3;

export const AlertsWidget = ({ data, isLoading }: AlertsWidgetProps) => {
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return <CardSkeleton lines={3} />;
  }

  const hasAlerts = data && data.total_count > 0;
  const displayItems = expanded ? data?.items : data?.items?.slice(0, INITIAL_DISPLAY_COUNT);
  const hiddenCount = (data?.items?.length ?? 0) - INITIAL_DISPLAY_COUNT;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-red-400" />
          <h3 className="text-lg font-semibold text-white">Alertas</h3>
          {hasAlerts && (
            <span className="bg-red-500/20 text-red-300 text-xs font-bold px-2 py-0.5 rounded-full border border-red-500/30">
              {data.total_count}
            </span>
          )}
        </div>
      </div>

      {!hasAlerts ? (
        <div className="text-center py-6">
          <Bell className="h-8 w-8 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500">Nenhum alerta no momento</p>
        </div>
      ) : (
        <>
          {/* KPIs resumidos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2 text-center">
              <p className="text-lg font-bold text-red-300">{data.overdue_count}</p>
              <p className="text-xs text-red-400">Atrasados</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 text-center">
              <p className="text-lg font-bold text-amber-300">{data.due_today_count}</p>
              <p className="text-xs text-amber-400">Hoje</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-2 text-center">
              <p className="text-lg font-bold text-blue-300">{data.due_tomorrow_count}</p>
              <p className="text-xs text-blue-400">Amanha</p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-2 text-center">
              <p className="text-lg font-bold text-purple-300">{data.complaints_count}</p>
              <p className="text-xs text-purple-400">Reclamacoes</p>
            </div>
          </div>

          {/* Lista de alertas */}
          <div className="space-y-2">
            {displayItems?.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-xl border ${PRIORITY_STYLES[item.priority] ?? 'bg-white/5 border-white/10'}`}
              >
                {ALERT_ICONS[item.type] ?? <Bell className="h-4 w-4 text-gray-400" />}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-gray-400">{ALERT_LABELS[item.type] ?? item.type}</span>
                  <p className="text-sm font-medium text-white truncate">{item.title}</p>
                  <p className="text-xs text-gray-500 truncate">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Botao expandir */}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-center gap-1 w-full mt-3 py-2 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Ver mais {hiddenCount} alertas
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
};
