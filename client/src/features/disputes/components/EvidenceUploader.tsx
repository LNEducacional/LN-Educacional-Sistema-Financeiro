/**
 * EvidenceUploader - Componente para upload de evidências em disputas
 * Permite anexar arquivos (PDF, imagens, documentos) com descrição opcional
 */

import { useState, useRef } from 'react';
import { Upload, File, X, Loader2, CheckCircle } from 'lucide-react';
import { useUploadEvidence } from '../api';
import { uploadEvidenceSchema } from '../schemas';
import { formatFileSize } from '@/lib/formatters';
import type { DisputeEvidence } from '../types';

interface EvidenceUploaderProps {
  disputeId: string;
  existingEvidence: DisputeEvidence[];
  onUploadSuccess?: () => void;
}

export function EvidenceUploader({
  disputeId,
  existingEvidence,
  onUploadSuccess
}: EvidenceUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadEvidence();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar arquivo com Zod
    const validation = uploadEvidenceSchema.safeParse({ file, description });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      setSelectedFile(null);
      return;
    }

    setError('');
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    // Validar novamente antes de enviar
    const validation = uploadEvidenceSchema.safeParse({ file: selectedFile, description });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (description) {
      formData.append('description', description);
    }

    try {
      await uploadMutation.mutateAsync({ disputeId, formData });

      // Limpar campos após sucesso
      setSelectedFile(null);
      setDescription('');
      setError('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onUploadSuccess?.();
    } catch (err) {
      setError('Erro ao fazer upload do arquivo. Tente novamente.');
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setDescription('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-6">
        <div className="flex flex-col items-center justify-center gap-3">
          {!selectedFile ? (
            <>
              <Upload className="h-10 w-10 text-gray-400" />
              <div className="text-center">
                <label
                  htmlFor="evidence-file"
                  className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Escolher arquivo
                </label>
                <input
                  ref={fileInputRef}
                  id="evidence-file"
                  type="file"
                  onChange={handleFileSelect}
                  accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt"
                  className="hidden"
                />
                <p className="mt-1 text-xs text-gray-500">
                  PDF, Imagens, DOC, TXT (máx. 10MB)
                </p>
              </div>
            </>
          ) : (
            <div className="w-full">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <File className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-3">
                <label
                  htmlFor="evidence-description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Descrição (opcional)
                </label>
                <textarea
                  id="evidence-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Adicione uma descrição para esta evidência..."
                />
                <p className="mt-1 text-xs text-gray-500 text-right">
                  {description.length}/500
                </p>
              </div>

              <button
                type="button"
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Enviar Evidência
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}
      </div>

      {/* Existing Evidence List */}
      {existingEvidence.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Evidências Anexadas ({existingEvidence.length})
          </h3>
          <div className="space-y-2">
            {existingEvidence.map((evidence) => (
              <div
                key={evidence.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-white"
              >
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <a
                      href={evidence.file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:underline truncate"
                    >
                      {evidence.file_name}
                    </a>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      ({formatFileSize(evidence.file_size)})
                    </span>
                  </div>
                  {evidence.description && (
                    <p className="mt-1 text-xs text-gray-600">{evidence.description}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    Enviado em {new Date(evidence.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
