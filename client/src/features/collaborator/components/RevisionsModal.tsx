import { FileText, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime } from '@/lib/formatters';
import { useOrderRevisions } from '../api';

interface RevisionsModalProps {
  orderId: string;
  serviceName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const RevisionsModal = ({
  orderId,
  serviceName,
  isOpen,
  onClose,
}: RevisionsModalProps) => {
  const { data: revisions, isLoading } = useOrderRevisions(isOpen ? orderId : null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Histórico de Revisões"
      subtitle={serviceName}
      size="lg"
      footer={
        <button
          onClick={onClose}
          className="group w-full inline-flex items-center justify-center gap-2 relative overflow-hidden font-medium rounded-2xl text-sm py-2.5 bg-transparent text-gray-300 border border-white/20 transition-all duration-300 hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-amber-500/25"
        >
          {/* Gradient background - hidden by default, visible on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <span className="relative z-10 transition-all duration-300 group-hover:opacity-0">
            Fechar
          </span>

          {/* Circulo expandivel com icone */}
          <span className="absolute right-[0.3em] z-10 flex items-center justify-center h-[2.2em] w-[2.2em] rounded-[0.7em] bg-white/10 transition-all duration-300 group-hover:bg-white/20 group-hover:w-[calc(100%-0.6em)]">
            <X className="w-[1.1em] h-[1.1em] text-gray-300 transition-all duration-300 group-hover:text-white group-hover:scale-110" />
          </span>
        </button>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
        </div>
      ) : revisions && revisions.length > 0 ? (
        <div className="space-y-3">
          {revisions.map((revision, index) => (
            <div
              key={revision.id}
              className="rounded-2xl border border-white/10 bg-black/30 p-4 hover:border-white/20 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded-lg bg-white/10 px-2 py-0.5 text-xs text-gray-300">
                      Revisão #{revisions.length - index}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">{revision.reason}</p>
                </div>
                <span className="whitespace-nowrap text-xs text-gray-500">
                  {formatDateTime(revision.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <FileText className="mb-2 h-8 w-8" />
          <p className="text-sm">Nenhuma revisão solicitada</p>
        </div>
      )}
    </Modal>
  );
};
