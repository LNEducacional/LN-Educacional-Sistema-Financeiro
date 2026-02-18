import { z } from 'zod';

export const serviceAreaOptions = [
  { value: 'DIREITO', label: 'Direito' },
  { value: 'PEDAGOGIA', label: 'Pedagogia' },
  { value: 'CONTABILIDADE', label: 'Contabilidade' },
  { value: 'ENFERMAGEM', label: 'Enfermagem' },
  { value: 'OUTROS', label: 'Outros' },
] as const;

export const createServiceSchema = z
  .object({
    name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    area: z.enum(['DIREITO', 'PEDAGOGIA', 'CONTABILIDADE', 'ENFERMAGEM', 'OUTROS'], {
      errorMap: () => ({ message: 'Selecione uma area' }),
    }),
    work_type: z.string().optional(),
    total_value: z.coerce.number().positive('Valor deve ser positivo'),
    company_percent: z.coerce.number().min(0).max(100),
    collaborator_percent: z.coerce.number().min(0).max(100),
  })
  .refine((data) => data.company_percent + data.collaborator_percent === 100, {
    message: 'A soma das porcentagens deve ser 100%',
    path: ['collaborator_percent'],
  });

export type CreateServiceSchema = z.infer<typeof createServiceSchema>;
