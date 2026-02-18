import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from './NotificationContext';
import { formatDistanceToNow } from '@/lib/formatters';
import { Bell, CheckCheck, X } from 'lucide-react';
import type { Notification } from './types';

interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  // Fechar com ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead([notification.id]);
    }

    // Navegar para a entidade relacionada (se houver)
    if (notification.related_entity_type && notification.related_entity_id) {
      const path = getEntityPath(notification.related_entity_type, notification.related_entity_id);
      if (path) {
        window.location.href = path;
      }
    }

    onClose();
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount > 0) {
      await markAllAsRead();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md mx-4 rounded-2xl border border-white/10 backdrop-blur-xl bg-black/50 shadow-2xl max-h-[600px] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                <span>{unreadCount > 0 ? `${unreadCount} nao lidas` : 'Todas lidas'}</span>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
                <Bell className="h-6 w-6 text-violet-400" />
                Notificacoes
              </h2>
              <p className="text-sm text-gray-400 mt-1">Acompanhe suas atualizacoes.</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-gray-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Marcar todas como lidas */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="w-full mb-4 flex items-center justify-center gap-2 text-sm text-violet-400 hover:text-violet-300 font-medium py-2 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/10"
            >
              <CheckCheck className="w-4 h-4" />
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* Lista de notificacoes */}
        <div className="overflow-y-auto flex-1 px-6 sm:px-8">
          {notifications.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <Bell className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400">Nenhuma notificacao</p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-4 border-t border-white/10 text-center">
            <Link
              to="/notifications"
              className="text-sm text-violet-400 hover:text-violet-300 font-medium transition"
              onClick={onClose}
            >
              Ver todas as notificacoes
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
}

function NotificationItem({ notification, onClick }: NotificationItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 text-left rounded-xl transition-all ${
        !notification.is_read
          ? 'bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20'
          : 'bg-white/5 border border-white/10 hover:bg-white/10'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Indicador de nao lida */}
        {!notification.is_read && (
          <div className="flex-shrink-0 w-2 h-2 mt-2 bg-violet-400 rounded-full" />
        )}

        <div className="flex-1 min-w-0">
          <p className={`text-sm text-gray-100 ${!notification.is_read ? 'font-semibold' : 'font-medium'}`}>
            {notification.title}
          </p>
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {formatDistanceToNow(notification.created_at)}
          </p>
        </div>
      </div>
    </button>
  );
}

// Helper: gerar path para entidade relacionada
function getEntityPath(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case 'order':
      return `/orders/${entityId}`;
    case 'dispute':
      return `/disputes/${entityId}`;
    case 'payment':
      return `/wallet`;
    default:
      return null;
  }
}
