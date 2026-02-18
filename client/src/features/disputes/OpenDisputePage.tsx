/**
 * OpenDisputePage - Página para aluno abrir uma nova disputa relacionada a um pedido
 * Acessível via /orders/:orderId/dispute
 */

import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, AlertTriangle, FileWarning, Info, Send } from 'lucide-react';
import { useCreateDispute } from './api';
import { createDisputeSchema, type CreateDisputeFormData } from './schemas';

export function OpenDisputePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const createMutation = useCreateDispute();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateDisputeFormData>({
    resolver: zodResolver(createDisputeSchema),
    defaultValues: {
      order_id: orderId || '',
    },
  });

  const onSubmit = async (data: CreateDisputeFormData) => {
    try {
      const dispute = await createMutation.mutateAsync(data);
      navigate(`/disputes/${dispute.id}`);
    } catch (error) {
      console.error('Erro ao criar disputa:', error);
    }
  };

  if (!orderId) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/20 mb-4">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <p className="text-red-300 text-lg font-medium">ID do pedido nao encontrado.</p>
        <button
          onClick={() => navigate('/student/orders')}
          className="mt-4 text-violet-400 hover:text-violet-300 transition-colors"
        >
          Voltar para meus pedidos
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        to={`/student/orders/${orderId}`}
        className="group inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-all duration-300"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-300" />
        Voltar para detalhes do pedido
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-gradient-to-br from-red-500/10 via-black/30 to-orange-500/5 backdrop-blur-xl p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative flex items-start gap-5">
          <div className="flex-shrink-0 h-16 w-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/20">
            <FileWarning className="h-8 w-8 text-white" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Abrir Disputa</h1>
            <p className="text-gray-400">
              Relate um problema com este pedido. Nossa equipe ira analisar e mediar a situacao.
            </p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-600/5 backdrop-blur-sm p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-2 rounded-xl bg-amber-500/20">
            <Info className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-300 mb-2">Importante:</h3>
            <ul className="text-sm text-amber-200/80 space-y-1.5">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400/60" />
                Descreva o problema de forma clara e detalhada
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400/60" />
                Forneca evidencias quando possivel (capturas de tela, documentos, etc.)
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400/60" />
                Disputas sao analisadas por nossa equipe em ate 48 horas
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400/60" />
                Voce sera notificado de todas as atualizacoes
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-6 space-y-5">
          {/* Subject Field */}
          <div>
            <label
              htmlFor="subject"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Assunto da Disputa <span className="text-red-400">*</span>
            </label>
            <input
              {...register('subject')}
              type="text"
              id="subject"
              maxLength={255}
              className={`w-full h-12 rounded-2xl bg-black/30 backdrop-blur-xl text-gray-100 placeholder-gray-500/60 border focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 px-4 text-sm ${
                errors.subject
                  ? 'border-red-500/50 focus:border-red-500/70'
                  : 'border-white/10 focus:border-white/30'
              }`}
              placeholder="Ex: Entrega nao corresponde ao solicitado"
            />
            {errors.subject && (
              <p className="mt-2 text-sm text-red-400">{errors.subject.message}</p>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Descricao Detalhada <span className="text-red-400">*</span>
            </label>
            <textarea
              {...register('description')}
              id="description"
              rows={8}
              maxLength={2000}
              className={`w-full rounded-2xl bg-black/30 backdrop-blur-xl text-gray-100 placeholder-gray-500/60 border focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 px-4 py-3 text-sm resize-none ${
                errors.description
                  ? 'border-red-500/50 focus:border-red-500/70'
                  : 'border-white/10 focus:border-white/30'
              }`}
              placeholder="Descreva detalhadamente o problema, incluindo datas, fatos especificos e impactos..."
            />
            {errors.description && (
              <p className="mt-2 text-sm text-red-400">{errors.description.message}</p>
            )}
            <p className="mt-2 text-xs text-gray-500 text-right">
              Minimo 20 caracteres
            </p>
          </div>

          {/* Error Message */}
          {createMutation.isError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">
                Erro ao criar disputa. Verifique os dados e tente novamente.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate(`/student/orders/${orderId}`)}
            className="h-11 inline-flex items-center gap-2 rounded-2xl bg-black/30 backdrop-blur-xl text-gray-100 border border-white/10 px-5 text-sm font-medium transition-all duration-200 hover:bg-black/50 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            className="h-11 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 px-6 text-sm font-semibold text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {createMutation.isPending ? (
              <>
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Abrir Disputa
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
