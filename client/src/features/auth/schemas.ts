import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email e obrigatorio' })
    .min(1, 'Email e obrigatorio')
    .email('Email invalido'),
  password: z
    .string({ required_error: 'Senha e obrigatoria' })
    .min(6, 'Senha deve ter no minimo 6 caracteres'),
});

export type LoginSchema = z.infer<typeof loginSchema>;

export const tokenPairSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
});

export type TokenPairSchema = z.infer<typeof tokenPairSchema>;

export const refreshRequestSchema = z.object({
  refresh_token: z.string(),
});

export type RefreshRequestSchema = z.infer<typeof refreshRequestSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email e obrigatorio' })
    .min(1, 'Email e obrigatorio')
    .email('Email invalido'),
});

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string({ required_error: 'Senha e obrigatoria' })
      .min(6, 'Senha deve ter no minimo 6 caracteres'),
    confirmPassword: z
      .string({ required_error: 'Confirmacao de senha e obrigatoria' })
      .min(1, 'Confirmacao de senha e obrigatoria'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas nao conferem',
    path: ['confirmPassword'],
  });

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
