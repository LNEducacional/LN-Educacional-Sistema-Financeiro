import { Download, FileText, Clock, Sparkles } from 'lucide-react';
import type { Delivery } from '../types';

interface DeliveryCardProps {
  delivery: Delivery;
  isLatest?: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const DeliveryCard = ({ delivery, isLatest = false }: DeliveryCardProps) => {
  const downloadUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/${delivery.file_path}`;

  return (
    <div
      className={`group rounded-2xl border p-5 transition-all duration-300 ${
        isLatest
          ? 'border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-purple-500/5 backdrop-blur-sm hover:border-violet-500/50'
          : 'border-white/10 bg-black/30 backdrop-blur-sm hover:bg-black/40 hover:border-white/20'
      }`}
    >
      {isLatest && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 border border-violet-500/30 px-3 py-1 text-xs font-medium text-violet-300">
            <Sparkles className="h-3 w-3" />
            Nova entrega disponivel
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`rounded-xl p-3 ${
            isLatest
              ? 'bg-violet-500/20 border border-violet-500/30'
              : 'bg-white/5 border border-white/10'
          }`}>
            <FileText className={`h-6 w-6 ${isLatest ? 'text-violet-400' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="font-medium text-white group-hover:text-violet-300 transition-colors">
              {delivery.original_name}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2.5 py-1">
                {formatFileSize(delivery.file_size)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-1">
                <Clock className="h-3 w-3" />
                {formatDate(delivery.created_at)}
              </span>
            </div>
          </div>
        </div>

        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-300 ${
            isLatest
              ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02]'
              : 'bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 hover:border-blue-500/50'
          }`}
        >
          <Download className="h-4 w-4" />
          Baixar
        </a>
      </div>
    </div>
  );
};
