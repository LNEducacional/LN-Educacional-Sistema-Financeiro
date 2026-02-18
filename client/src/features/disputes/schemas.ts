/**
 * Schemas de validação Zod para o módulo de Disputas
 * Sincronizado com backend/internal/modules/disputes/models.go
 */

import { z } from 'zod';

/**
 * Schema para criar uma nova disputa
 * Campos: order_id, subject, description
 */
export const createDisputeSchema = z.object({
  order_id: z.string().uuid('ID do pedido inválido'),
  subject: z
    .string()
    .min(5, 'O assunto deve ter pelo menos 5 caracteres')
    .max(255, 'O assunto deve ter no máximo 255 caracteres'),
  description: z
    .string()
    .min(20, 'A descrição deve ter pelo menos 20 caracteres')
    .max(2000, 'A descrição deve ter no máximo 2000 caracteres'),
});

export type CreateDisputeFormData = z.infer<typeof createDisputeSchema>;

/**
 * Schema para adicionar comentário em uma disputa
 * Campos: content, is_internal (apenas admin pode marcar como interno)
 */
export const addCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'O comentário não pode estar vazio')
    .max(2000, 'O comentário deve ter no máximo 2000 caracteres'),
  is_internal: z.boolean().default(false),
});

export type AddCommentFormData = z.infer<typeof addCommentSchema>;

/**
 * Schema para resolver uma disputa (apenas admin)
 * Campos: resolution, admin_notes
 */
export const resolveDisputeSchema = z.object({
  resolution: z.enum(
    ['FAVOR_ALUNO', 'FAVOR_COLABORADOR', 'ACORDO', 'PARCIAL'],
    {
      errorMap: () => ({ message: 'Selecione um tipo de resolução válido' }),
    }
  ),
  admin_notes: z
    .string()
    .min(10, 'As notas administrativas devem ter pelo menos 10 caracteres')
    .max(2000, 'As notas administrativas devem ter no máximo 2000 caracteres'),
});

export type ResolveDisputeFormData = z.infer<typeof resolveDisputeSchema>;

/**
 * Schema para upload de evidência
 * Campos: description (opcional), file
 */
export const uploadEvidenceSchema = z.object({
  description: z
    .string()
    .max(500, 'A descrição deve ter no máximo 500 caracteres')
    .optional(),
  file: z
    .instanceof(File, { message: 'Arquivo é obrigatório' })
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: 'O arquivo deve ter no máximo 10MB',
    })
    .refine(
      (file) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ];
        return allowedTypes.includes(file.type);
      },
      {
        message: 'Tipo de arquivo não permitido. Use: JPG, PNG, GIF, PDF, DOC, DOCX, TXT',
      }
    ),
});

export type UploadEvidenceFormData = z.infer<typeof uploadEvidenceSchema>;

/**
 * Schema para atualizar status da disputa (admin)
 */
export const updateDisputeStatusSchema = z.object({
  new_status: z.enum(
    ['ABERTA', 'EM_ANALISE', 'AGUARDANDO_RESPOSTA', 'RESOLVIDA', 'CANCELADA'],
    {
      errorMap: () => ({ message: 'Selecione um status válido' }),
    }
  ),
});

export type UpdateDisputeStatusFormData = z.infer<typeof updateDisputeStatusSchema>;
