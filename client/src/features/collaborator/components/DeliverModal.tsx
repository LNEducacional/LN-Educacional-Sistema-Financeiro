import { useState, useRef } from 'react';
import { X, Upload, FileUp } from 'lucide-react';
import { useDeliverOrder } from '../api';

interface DeliverModalProps {
  orderId: string;
  serviceName: string;
  isOpen: boolean;
  onClose: () => void;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-zip-compressed',
];

export const DeliverModal = ({
  orderId,
  serviceName,
  isOpen,
  onClose,
}: DeliverModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deliverMutation = useDeliverOrder();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Tipo de arquivo nao permitido. Use PDF, DOCX ou ZIP.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Maximo: 10MB.');
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    try {
      await deliverMutation.mutateAsync({ orderId, file: selectedFile });
      setSelectedFile(null);
      onClose();
    } catch {
      setError('Erro ao enviar arquivo. Tente novamente.');
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div className="w-full max-w-md mx-4 rounded-2xl border border-white/10 backdrop-blur-xl bg-black/50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                <span>Entrega</span>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
                <FileUp className="h-6 w-6 text-emerald-400" />
                Entregar Trabalho
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="rounded-xl p-2 text-gray-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="mb-5 text-sm text-gray-400">
            Servico: <strong className="text-gray-200">{serviceName}</strong>
          </p>

          {/* Drop zone */}
          <div
            className={`mb-5 rounded-2xl border-2 border-dashed p-6 text-center transition ${
              selectedFile
                ? 'border-emerald-500/50 bg-emerald-500/10'
                : 'border-white/10 hover:border-white/20 bg-black/20'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.zip"
              onChange={handleFileChange}
              className="hidden"
            />

            {selectedFile ? (
              <div>
                <FileUp className="mx-auto h-10 w-10 text-emerald-400 mb-2" />
                <p className="font-medium text-emerald-300">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-sm text-emerald-400 hover:text-emerald-300 transition"
                >
                  Trocar arquivo
                </button>
              </div>
            ) : (
              <div>
                <Upload className="mx-auto h-10 w-10 text-gray-500 mb-2" />
                <p className="text-sm text-gray-400">
                  Arraste um arquivo ou{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-violet-400 hover:text-violet-300 transition"
                  >
                    clique para selecionar
                  </button>
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  PDF, DOCX ou ZIP (max. 10MB)
                </p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-gray-300 transition hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedFile || deliverMutation.isPending}
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl text-sm py-2.5 px-5 font-medium bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-500 text-white transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deliverMutation.isPending ? (
                <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Confirmar Entrega
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
