import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useNotifications } from '../NotificationContext';
import type { Notification, NotificationType } from '../types';

type FilterMode = 'all' | 'unread';

const PAGE_SIZE = 20;

const NOTIFICATIONS_PAGE_KEY = ['notifications-page'];

interface UseNotificationsPageReturn {
  /** Lista de notificacoes da pagina atual */
  notifications: Notification[];
  /** Carregando dados */
  isLoading: boolean;
  /** Filtro ativo: todas ou nao lidas */
  filterMode: FilterMode;
  /** Tipo de notificacao selecionado (null = todos) */
  selectedType: NotificationType | null;
  /** Pagina atual (0-indexed internamente, 1-indexed para UI) */
  page: number;
  /** Total de paginas */
  hasMore: boolean;
  /** IDs selecionados para acao em massa */
  selectedIds: Set<string>;
  /** Contagem de nao lidas (do contexto global) */
  unreadCount: number;
  /** Alterna filtro all/unread */
  setFilterMode: (mode: FilterMode) => void;
  /** Seleciona tipo de notificacao */
  setSelectedType: (type: NotificationType | null) => void;
  /** Ir para pagina */
  setPage: (page: number) => void;
  /** Toggle selecao de um ID */
  toggleSelection: (id: string) => void;
  /** Selecionar/deselecionar todos da pagina */
  toggleSelectAll: () => void;
  /** Marcar selecionados como lidos */
  markSelectedAsRead: () => Promise<void>;
  /** Marcar todas como lidas */
  handleMarkAllAsRead: () => Promise<void>;
  /** Marcar uma notificacao como lida */
  markOneAsRead: (id: string) => Promise<void>;
}

export function useNotificationsPage(): UseNotificationsPageReturn {
  const { unreadCount, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();

  const [filterMode, setFilterModeInternal] = useState<FilterMode>('all');
  const [selectedType, setSelectedTypeInternal] = useState<NotificationType | null>(null);
  const [page, setPageInternal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const queryKey = [
    ...NOTIFICATIONS_PAGE_KEY,
    filterMode,
    selectedType,
    page,
  ];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<Notification[]> => {
      const params: Record<string, string | number> = {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      };
      if (filterMode === 'unread') {
        params.unread_only = 'true';
      }
      if (selectedType) {
        params.type = selectedType;
      }
      const response = await api.get<Notification[]>('/api/notifications', { params });
      return response.data;
    },
    staleTime: 30_000,
  });

  const notifications = data ?? [];
  const hasMore = notifications.length === PAGE_SIZE;

  const setFilterMode = useCallback((mode: FilterMode) => {
    setFilterModeInternal(mode);
    setPageInternal(0);
    setSelectedIds(new Set());
  }, []);

  const setSelectedType = useCallback((type: NotificationType | null) => {
    setSelectedTypeInternal(type);
    setPageInternal(0);
    setSelectedIds(new Set());
  }, []);

  const setPage = useCallback((p: number) => {
    setPageInternal(p);
    setSelectedIds(new Set());
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === notifications.length && notifications.length > 0) {
        return new Set();
      }
      return new Set(notifications.map((n) => n.id));
    });
  }, [notifications]);

  const markSelectedAsRead = useCallback(async () => {
    const unreadSelected = notifications
      .filter((n) => selectedIds.has(n.id) && !n.is_read)
      .map((n) => n.id);

    if (unreadSelected.length === 0) return;

    await markAsRead(unreadSelected);
    setSelectedIds(new Set());
    await refreshNotifications();
  }, [selectedIds, notifications, markAsRead, refreshNotifications]);

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
    setSelectedIds(new Set());
    await refreshNotifications();
  }, [markAllAsRead, refreshNotifications]);

  const markOneAsRead = useCallback(async (id: string) => {
    await markAsRead([id]);
    await refreshNotifications();
  }, [markAsRead, refreshNotifications]);

  return {
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
  };
}
