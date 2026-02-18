import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  Mail,
  MailOpen,
} from 'lucide-react';
import { formatDistanceToNow } from '@/lib/formatters';
import { useNotificationsPage } from './hooks/use-notifications-page';
import type { Notification, NotificationType } from './types';

/** Mapa de tipos para labels legiveis */
const TYPE_LABELS: Record<NotificationType, string> = {
  ORDER_CREATED: 'Pedido Criado',
  ORDER_STATUS_CHANGED: 'Status Alterado',
  DELIVERY_UPLOADED: 'Entrega Enviada',
  PAYMENT_RELEASED: 'Pagamento Liberado',
  DISPUTE_OPENED: 'Disputa Aberta',
  DISPUTE_MESSAGE: 'Mensagem de Disputa',
  DISPUTE_RESOLVED: 'Disputa Resolvida',
  REVISION_REQUESTED: 'Revisao Solicitada',
  APPROVAL_RECEIVED: 'Aprovacao Recebida',
  DEADLINE_APPROACHING: 'Prazo Proximo',
  PAYMENT_PENDING: 'Pagamento Pendente',
};

/** Cores do badge por tipo */
const TYPE_COLORS: Record<string, string> = {
  ORDER_CREATED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  ORDER_STATUS_CHANGED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  DELIVERY_UPLOADED: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  PAYMENT_RELEASED: 'bg-green-500/20 text-green-300 border-green-500/30',
  DISPUTE_OPENED: 'bg-red-500/20 text-red-300 border-red-500/30',
  DISPUTE_MESSAGE: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  DISPUTE_RESOLVED: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  REVISION_REQUESTED: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  APPROVAL_RECEIVED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  DEADLINE_APPROACHING: 'bg-red-500/20 text-red-300 border-red-500/30',
  PAYMENT_PENDING: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

const ALL_TYPES = Object.keys(TYPE_LABELS) as NotificationType[];

export function NotificationsPage() {
  const {
    notifications,
    isLoading,
    filterMode,
    selectedType,
    page,
    hasMore,
    selectedIds,
    unreadCount,
    setFilterMode,
    setSelectedType,
    setPage,
    toggleSelection,
    toggleSelectAll,
    markSelectedAsRead,
    handleMarkAllAsRead,
    markOneAsRead,
  } = useNotificationsPage();

  const allSelected = notifications.length > 0 && selectedIds.size === notifications.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400/80" />
          <span>Central de notificacoes</span>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
            <Bell className="h-7 w-7 text-violet-400" />
            Notificacoes
            {unreadCount > 0 && (
              <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-sm font-medium text-violet-300 border border-violet-500/30">
                {unreadCount} nao lidas
              </span>
            )}
          </h1>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 font-medium py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/10"
            >
              <CheckCheck className="w-4 h-4" />
              Marcar todas como lidas
            </button>
          )}
        </div>
      </header>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Filtro: todas / nao lidas */}
        <div className="flex rounded-xl border border-white/10 bg-black/30 p-1">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filterMode === 'all'
                ? 'bg-violet-500/20 text-violet-300'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Todas
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('unread')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filterMode === 'unread'
                ? 'bg-violet-500/20 text-violet-300'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MailOpen className="w-3.5 h-3.5" />
            Nao lidas
          </button>
        </div>

        {/* Filtro: por tipo */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={selectedType ?? ''}
            onChange={(e) => setSelectedType((e.target.value || null) as NotificationType | null)}
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
          >
            <option value="">Todos os tipos</option>
            {ALL_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Barra de acoes em massa */}
      {someSelected && (
        <div className="flex items-center gap-3 rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-2">
          <span className="text-sm text-violet-300">
            {selectedIds.size} selecionada{selectedIds.size > 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={markSelectedAsRead}
            className="text-sm font-medium text-violet-400 hover:text-violet-300 transition"
          >
            Marcar como lidas
          </button>
        </div>
      )}

      {/* Lista */}
      <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm overflow-hidden">
        {/* Header da lista com checkbox */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-white/20 bg-transparent text-violet-500 focus:ring-violet-500/50 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-xs text-gray-500">Selecionar todas</span>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-violet-400 rounded-full animate-spin mx-auto" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && notifications.length === 0 && (
          <div className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <Bell className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-400">
              {filterMode === 'unread'
                ? 'Nenhuma notificacao nao lida'
                : selectedType
                  ? 'Nenhuma notificacao deste tipo'
                  : 'Nenhuma notificacao'}
            </p>
          </div>
        )}

        {/* Items */}
        {!isLoading && notifications.length > 0 && (
          <ul className="divide-y divide-white/5">
            {notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                isSelected={selectedIds.has(notification.id)}
                onToggleSelect={() => toggleSelection(notification.id)}
                onMarkAsRead={() => markOneAsRead(notification.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Paginacao */}
      {(page > 0 || hasMore) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>
          <span className="text-sm text-gray-500">
            Pagina {page + 1}
          </span>
          <button
            type="button"
            onClick={() => setPage(page + 1)}
            disabled={!hasMore}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            Proxima
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Linha de notificacao individual */
interface NotificationRowProps {
  notification: Notification;
  isSelected: boolean;
  onToggleSelect: () => void;
  onMarkAsRead: () => void;
}

function NotificationRow({
  notification,
  isSelected,
  onToggleSelect,
  onMarkAsRead,
}: NotificationRowProps) {
  const typeLabel = TYPE_LABELS[notification.type] ?? notification.type;
  const typeColor = TYPE_COLORS[notification.type] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30';

  return (
    <li
      className={`flex items-start gap-3 px-5 py-4 transition ${
        !notification.is_read
          ? 'bg-violet-500/5 hover:bg-violet-500/10'
          : 'hover:bg-white/5'
      }`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-violet-500 focus:ring-violet-500/50 focus:ring-offset-0 cursor-pointer flex-shrink-0"
      />

      {/* Indicador de nao lida */}
      <div className="flex-shrink-0 mt-1.5">
        {!notification.is_read ? (
          <span className="block h-2 w-2 rounded-full bg-violet-400" />
        ) : (
          <span className="block h-2 w-2" />
        )}
      </div>

      {/* Conteudo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${typeColor}`}>
            {typeLabel}
          </span>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(notification.created_at)}
          </span>
        </div>
        <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-100' : 'font-medium text-gray-300'}`}>
          {notification.title}
        </p>
        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
          {notification.message}
        </p>
      </div>

      {/* Acao: marcar como lida */}
      {!notification.is_read && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMarkAsRead();
          }}
          title="Marcar como lida"
          className="flex-shrink-0 mt-1 p-1.5 rounded-lg text-gray-500 hover:text-violet-400 hover:bg-white/5 transition"
        >
          <CheckCheck className="w-4 h-4" />
        </button>
      )}
    </li>
  );
}
