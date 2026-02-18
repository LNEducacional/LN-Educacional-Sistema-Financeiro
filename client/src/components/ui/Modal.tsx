import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Props do componente Modal
 */
interface ModalProps {
  /** Controla se o modal está visível */
  isOpen: boolean;
  /** Callback executado ao fechar o modal */
  onClose: () => void;
  /** Título do modal */
  title: string;
  /** Subtítulo opcional */
  subtitle?: string;
  /** Tamanho do modal */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Conteúdo do modal */
  children: React.ReactNode;
  /** Footer opcional com ações */
  footer?: React.ReactNode;
}

/**
 * Componente Modal reutilizável
 * Implementa acessibilidade (ARIA), escape key handling e foco
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
}: ModalProps) => {
  // Escape key handling centralizado
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      // Previne scroll do body quando modal aberto
      document.body.style.overflow = 'hidden';

      return () => {
        window.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-3xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        className={`w-full ${sizeClasses[size]} rounded-2xl border border-white/10 backdrop-blur-xl bg-black/50 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-6 sm:px-8 sm:py-8 pb-4">
          <div>
            <h2 id="modal-title" className="text-2xl font-semibold tracking-tight text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:text-white hover:bg-white/10 transition"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto px-6 sm:px-8">
          {children}
        </div>

        {/* Footer (opcional) */}
        {footer && (
          <div className="flex justify-end gap-2 px-6 py-4 sm:px-8 sm:py-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
