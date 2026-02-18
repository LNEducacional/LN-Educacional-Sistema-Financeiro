import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from './NotificationContext';
import { NotificationDropdown } from './NotificationDropdown';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount, isConnected } = useNotifications();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notificacoes"
      >
        <Bell className="w-6 h-6" />

        {/* Badge de contagem */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Indicador de conexao SSE */}
        <span
          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white ${
            isConnected ? 'bg-green-500' : 'bg-gray-400'
          }`}
          title={isConnected ? 'Conectado' : 'Desconectado'}
        />
      </button>

      {/* Modal */}
      {isOpen && <NotificationDropdown onClose={() => setIsOpen(false)} />}
    </>
  );
}
