/**
 * DisputeDetailPage - Página de detalhes de uma disputa
 * Mostra informações, timeline de comentários, evidências e formulários de interação
 * Acessível por Admin, Student (se for parte) e Collaborator (se for parte)
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  MessageSquare,
  Paperclip,
} from 'lucide-react';
import { useDisputeDetails, useAddComment } from './api';
import { addCommentSchema, type AddCommentFormData } from './schemas';
import { Badge } from '@/components/ui/Badge';
import { getDisputeStatusBadgeProps } from '@/components/ui/badge-helpers';
import { formatDate } from '@/lib/formatters';
import { DisputeTimeline } from './components/DisputeTimeline';
import { EvidenceUploader } from './components/EvidenceUploader';
import { useAuth } from '@/features/auth';

export function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: details, isLoading, error, refetch } = useDisputeDetails(id || '');
  const addCommentMutation = useAddComment();

  const [showCommentForm, setShowCommentForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddCommentFormData>({
    resolver: zodResolver(addCommentSchema),
    defaultValues: {
      is_internal: false,
    },
  });

  const onSubmitComment = async (data: AddCommentFormData) => {
    if (!id) return;

    try {
      await addCommentMutation.mutateAsync({
        disputeID: id,
        data,
      });
      reset();
      setShowCommentForm(false);
      refetch();
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <p className="text-red-600">Erro ao carregar detalhes da disputa.</p>
        <button
          onClick={() => navigate('/disputes')}
          className="mt-4 text-blue-600 hover:underline"
        >
          Voltar para lista
        </button>
      </div>
    );
  }

  const { dispute, comments, evidence } = details;
  const badgeProps = getDisputeStatusBadgeProps(dispute.status);

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'FINANCEIRO';

  return (
    <div className="max-w-5xl mx-auto">
      <Link
        to="/disputes"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para disputas
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-600 flex-shrink-0" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{dispute.subject}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <Link
                    to={`/student/orders/${dispute.order_id}`}
                    className="text-blue-600 hover:underline"
                  >
                    Ver pedido relacionado
                  </Link>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Criada em {formatDate(dispute.created_at)}
                </div>
              </div>
            </div>
          </div>
          <Badge {...badgeProps} />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500 mb-2">Descrição</h2>
          <p className="text-gray-900 whitespace-pre-wrap">{dispute.description}</p>
        </div>
      </div>

      {/* Status Info */}
      {dispute.resolved_at && (
        <div className="mb-6 rounded-lg border border-green-300 bg-green-50 p-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-800">Disputa Resolvida</h3>
              <p className="text-sm text-green-700">
                Resolvida em {formatDate(dispute.resolved_at)}
                {dispute.resolution && ` - Resolução: ${dispute.resolution}`}
              </p>
              {dispute.admin_notes && (
                <p className="mt-2 text-sm text-green-700 italic">
                  Notas: {dispute.admin_notes}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline de Comentários */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <MessageSquare className="h-5 w-5" />
                Comentários ({comments.length})
              </h2>
              {!showCommentForm && (
                <button
                  onClick={() => setShowCommentForm(true)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Adicionar comentário
                </button>
              )}
            </div>

            {showCommentForm && (
              <form
                onSubmit={handleSubmit(onSubmitComment)}
                className="mb-6 rounded-lg border border-gray-200 bg-white p-4"
              >
                <textarea
                  {...register('content')}
                  rows={4}
                  maxLength={2000}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.content ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Digite seu comentário..."
                />
                {errors.content && (
                  <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
                )}

                {isAdmin && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      {...register('is_internal')}
                      type="checkbox"
                      id="is_internal"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_internal" className="text-sm text-gray-700">
                      Comentário interno (visível apenas para admins)
                    </label>
                  </div>
                )}

                <div className="mt-3 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCommentForm(false);
                      reset();
                    }}
                    className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={addCommentMutation.isPending}
                    className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addCommentMutation.isPending ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </form>
            )}

            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <DisputeTimeline
                comments={comments}
                showInternalComments={isAdmin}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Evidências */}
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <Paperclip className="h-5 w-5" />
              Evidências
            </h2>
            <EvidenceUploader
              disputeId={dispute.id}
              existingEvidence={evidence}
              onUploadSuccess={refetch}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
