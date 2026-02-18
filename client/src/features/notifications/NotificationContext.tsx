import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSSE } from '@/lib/hooks/useSSE';
import api from '@/lib/axios';
import { tokenStorage } from '@/features/auth/tokenStorage';
import type { Notification } from './types';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Obter token via tokenStorage (chave: 'access_token')
  const token = tokenStorage.getAccessToken();

  // Carregar notificacoes do servidor
  const refreshNotifications = useCallback(async () => {
    try {
      const [notificationsRes, statsRes] = await Promise.all([
        api.get<Notification[]>('/api/notifications?limit=50'),
        api.get<{ unread_count: number }>('/api/notifications/stats'),
      ]);

      setNotifications(notificationsRes.data ?? []);
      setUnreadCount(statsRes.data.unread_count ?? 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  // Refs estaveis para callbacks do SSE (evita reconexoes em loop)
  const refreshRef = useRef(refreshNotifications);
  refreshRef.current = refreshNotifications;

  const handleSSEMessage = useCallback((notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);
    if (!notification.is_read) {
      setUnreadCount((prev) => prev + 1);
    }
  }, []);

  const handleSSEConnect = useCallback(() => {
    refreshRef.current();
  }, []);

  const handleSSEError = useCallback((err: Event) => {
    console.error('SSE error:', err);
  }, []);

  // Conectar ao SSE stream
  const { isConnected } = useSSE<Notification>({
    url: 'http://localhost:8080/api/notifications/stream',
    token: token || '',
    enabled: !!token,
    onMessage: handleSSEMessage,
    onConnect: handleSSEConnect,
    onError: handleSSEError,
  });

  // Marcar notificacoes como lidas
  const markAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      await api.post('/api/notifications/mark-read', {
        notification_ids: notificationIds,
      });

      setNotifications((prev) =>
        prev.map((n) =>
          notificationIds.includes(n.id)
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );

      setUnreadCount((prev) => Math.max(0, prev - notificationIds.length));
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
      throw err;
    }
  }, []);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    try {
      await api.post('/api/notifications/mark-all-read');

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      throw err;
    }
  }, []);

  // Carregar notificacoes ao montar (fallback caso SSE nao conecte)
  useEffect(() => {
    if (token) {
      refreshNotifications();
    }
  }, [token, refreshNotifications]);

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
