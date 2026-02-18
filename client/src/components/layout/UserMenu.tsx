import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { ChevronDown, LogOut, User } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  ADMIN: 'Administrador',
  student: 'Estudante',
  STUDENT: 'Estudante',
  collaborator: 'Colaborador',
  COLLABORATOR: 'Colaborador',
  financeiro: 'Financeiro',
  FINANCEIRO: 'Financeiro',
};

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  const roleLabel = ROLE_LABELS[user.role] || user.role;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-10 pl-3 pr-2 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 text-gray-100 transition-all duration-200 hover:bg-black/50 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-violet-500/20 border border-violet-500/30">
          <User className="h-4 w-4 text-violet-400" />
        </div>
        <span className="text-sm font-medium text-white">{roleLabel}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-full rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/50 overflow-hidden z-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4 text-red-400" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
