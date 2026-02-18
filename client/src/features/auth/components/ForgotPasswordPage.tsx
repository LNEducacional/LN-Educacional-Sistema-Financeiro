import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { forgotPasswordSchema } from '../schemas';
import type { ForgotPasswordSchema } from '../schemas';
import { requestPasswordReset } from '../api';

const getErrorMessage = (error: Error): string => {
  const message = error.message?.toLowerCase() || '';

  if (message.includes('network') || message.includes('fetch')) {
    return 'Erro de conexao. Verifique sua internet e tente novamente.';
  }
  if (message.includes('503') || message.includes('service unavailable')) {
    return 'Servico de email temporariamente indisponivel. Tente novamente mais tarde.';
  }
  if (message.includes('429') || message.includes('too many')) {
    return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
  }

  return 'Ocorreu um erro inesperado. Tente novamente.';
};

export function ForgotPasswordPage() {
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: ForgotPasswordSchema) => requestPasswordReset(data.email),
    onSuccess: () => {
      setEmailSent(true);
    },
  });

  const onSubmit = (data: ForgotPasswordSchema) => {
    setSubmittedEmail(data.email);
    mutation.mutate(data);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Background Image */}
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/auth-image.png')" }}
        />

        {/* Success Card - Glass Dark */}
        <section className="relative z-10 w-full max-w-md lg:max-w-lg px-4">
          <div className="rounded-2xl border border-white/10 backdrop-blur-xl bg-black/50">
            <div className="p-6 sm:p-8 lg:p-10">
              {/* Header */}
              <div className="mb-8 text-center">
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                  <span>Email enviado</span>
                </div>

                {/* Success Icon */}
                <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>

                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Verifique seu email</h2>
                <p className="text-sm text-gray-400 mt-3 leading-relaxed">
                  Enviamos um link de redefinicao de senha para{' '}
                  <span className="text-white font-medium">{submittedEmail}</span>
                </p>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl mb-6">
                <p className="text-xs text-gray-400 leading-relaxed">
                  O link expira em <span className="text-white">15 minutos</span>. Se nao encontrar o email, verifique sua pasta de spam.
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setEmailSent(false);
                    mutation.reset();
                  }}
                  className="group w-full inline-flex items-center justify-center gap-2 relative overflow-hidden font-medium rounded-2xl text-sm py-2.5 bg-transparent text-gray-300 border border-white/20 transition-all duration-300 cursor-pointer hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-purple-500/25"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="relative z-10">Reenviar email</span>
                </button>

                <Link
                  to="/login"
                  className="block w-full text-center text-sm text-gray-400 hover:text-white transition-colors py-2"
                >
                  Voltar para o login
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/auth-image.png')" }}
      />

      {/* Forgot Password Card - Glass Dark */}
      <section className="relative z-10 w-full max-w-md lg:max-w-lg px-4">
        <div className="rounded-2xl border border-white/10 backdrop-blur-xl bg-black/50">
          <div className="p-6 sm:p-8 lg:p-10">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                <span>Recuperacao de conta</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Esqueci minha senha</h2>
              <p className="text-sm text-gray-400 mt-1.5">Digite seu email para receber um link de redefinicao.</p>
            </div>

            {/* Form */}
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-gray-300 mb-1.5 pl-[10px]">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register('email')}
                    className="w-full rounded-2xl bg-black/30 text-gray-100 placeholder-gray-500/60 border border-white/10 focus:border-white/30 focus:outline-none transition px-10 py-2.5 text-sm"
                    placeholder="nome@exemplo.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-400 mt-1.5 pl-[10px]">{errors.email.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={mutation.isPending}
                className="group w-full inline-flex items-center justify-center gap-2 relative overflow-hidden font-medium rounded-2xl text-sm py-2.5 mt-4 bg-transparent text-gray-300 border border-white/20 transition-all duration-300 cursor-pointer hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <span className="relative z-10 transition-all duration-300 group-hover:opacity-0">
                  {mutation.isPending ? 'Enviando...' : 'Enviar link de redefinicao'}
                </span>

                {/* Circulo expandivel com icone */}
                <span className="absolute left-[0.3em] z-10 flex items-center justify-center h-[2.2em] w-[2.2em] rounded-[0.7em] bg-white/10 transition-all duration-300 group-hover:bg-white/20 group-hover:w-[calc(100%-0.6em)]">
                  {mutation.isPending ? (
                    <div className="w-[1.1em] h-[1.1em] border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg
                      className="w-[1.1em] h-[1.1em] text-gray-300 transition-all duration-300 group-hover:text-white group-hover:scale-110"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                </span>
              </button>

              {/* Error Message */}
              {mutation.isError && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                  <p className="text-xs text-red-400">{getErrorMessage(mutation.error)}</p>
                </div>
              )}

              {/* Back to Login */}
              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Voltar para o login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
