import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { resetPasswordSchema } from '../schemas';
import type { ResetPasswordSchema } from '../schemas';
import { validateResetToken, resetPassword } from '../api';

type TokenStatus = 'loading' | 'valid' | 'invalid' | 'expired' | 'used';

const getErrorMessage = (error: Error): string => {
  const message = error.message?.toLowerCase() || '';

  if (message.includes('network') || message.includes('fetch')) {
    return 'Erro de conexao. Verifique sua internet e tente novamente.';
  }
  if (message.includes('410') || message.includes('gone')) {
    return 'Este link ja foi utilizado ou expirou.';
  }
  if (message.includes('401') || message.includes('unauthorized')) {
    return 'Link invalido. Solicite um novo link de redefinicao.';
  }

  return 'Ocorreu um erro inesperado. Tente novamente.';
};

export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>('loading');
  const [resetSuccess, setResetSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // Validate token on mount
  const tokenQuery = useQuery({
    queryKey: ['validateResetToken', token],
    queryFn: () => validateResetToken(token || ''),
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (tokenQuery.isSuccess) {
      setTokenStatus('valid');
    } else if (tokenQuery.isError) {
      const error = tokenQuery.error as Error;
      const message = error.message?.toLowerCase() || '';
      if (message.includes('410') || message.includes('already been used')) {
        setTokenStatus('used');
      } else if (message.includes('expired')) {
        setTokenStatus('expired');
      } else {
        setTokenStatus('invalid');
      }
    }
  }, [tokenQuery.isSuccess, tokenQuery.isError, tokenQuery.error]);

  const mutation = useMutation({
    mutationFn: (data: ResetPasswordSchema) => resetPassword(token || '', data.password),
    onSuccess: () => {
      setResetSuccess(true);
    },
  });

  const onSubmit = (data: ResetPasswordSchema) => {
    mutation.mutate(data);
  };

  // Loading state
  if (tokenStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/auth-image.png')" }}
        />
        <div className="relative z-10">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Invalid/Expired/Used token state
  if (tokenStatus !== 'valid' && !resetSuccess) {
    const statusConfig = {
      invalid: {
        icon: (
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
        title: 'Link invalido',
        description: 'Este link de redefinicao de senha e invalido. Por favor, solicite um novo link.',
        color: 'from-red-600 via-red-500 to-orange-500',
      },
      expired: {
        icon: (
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        title: 'Link expirado',
        description: 'Este link de redefinicao expirou. Por motivos de seguranca, os links expiram em 15 minutos.',
        color: 'from-amber-600 via-orange-500 to-red-500',
      },
      used: {
        icon: (
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        title: 'Link ja utilizado',
        description: 'Este link de redefinicao ja foi utilizado. Cada link so pode ser usado uma vez.',
        color: 'from-gray-600 via-gray-500 to-gray-400',
      },
    };

    const config = statusConfig[tokenStatus as keyof typeof statusConfig] || statusConfig.invalid;

    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/auth-image.png')" }}
        />

        <section className="relative z-10 w-full max-w-md lg:max-w-lg px-4">
          <div className="rounded-2xl border border-white/10 backdrop-blur-xl bg-black/50">
            <div className="p-6 sm:p-8 lg:p-10 text-center">
              <div className={`mx-auto w-16 h-16 mb-4 rounded-full bg-gradient-to-r ${config.color} flex items-center justify-center`}>
                {config.icon}
              </div>

              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-3">
                {config.title}
              </h2>
              <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                {config.description}
              </p>

              <div className="space-y-3">
                <Link
                  to="/forgot-password"
                  className="group w-full inline-flex items-center justify-center gap-2 relative overflow-hidden font-medium rounded-2xl text-sm py-2.5 bg-transparent text-gray-300 border border-white/20 transition-all duration-300 cursor-pointer hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-purple-500/25"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="relative z-10">Solicitar novo link</span>
                </Link>

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

  // Success state
  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/auth-image.png')" }}
        />

        <section className="relative z-10 w-full max-w-md lg:max-w-lg px-4">
          <div className="rounded-2xl border border-white/10 backdrop-blur-xl bg-black/50">
            <div className="p-6 sm:p-8 lg:p-10 text-center">
              <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-3">
                Senha redefinida
              </h2>
              <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                Sua senha foi alterada com sucesso. Voce ja pode fazer login com sua nova senha.
              </p>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="group w-full inline-flex items-center justify-center gap-2 relative overflow-hidden font-medium rounded-2xl text-sm py-2.5 bg-transparent text-gray-300 border border-white/20 transition-all duration-300 cursor-pointer hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-purple-500/25"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <span className="relative z-10 transition-all duration-300 group-hover:opacity-0">
                  Ir para o login
                </span>

                <span className="absolute left-[0.3em] z-10 flex items-center justify-center h-[2.2em] w-[2.2em] rounded-[0.7em] bg-white/10 transition-all duration-300 group-hover:bg-white/20 group-hover:w-[calc(100%-0.6em)]">
                  <svg
                    className="w-[1.1em] h-[1.1em] text-gray-300 transition-all duration-300 group-hover:text-white group-hover:scale-110"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M8 7.86859V7.34663C8 5.90823 9.02094 4.67225 10.4335 4.40061L17.4335 3.05446C19.2836 2.69866 21 4.1164 21 6.00048V17.9995C21 19.8836 19.2836 21.3013 17.4335 20.9455L10.4335 19.5994C9.02094 19.3278 8 18.0918 8 16.6534V16.1314" />
                    <path d="M13 14.9995L16 11.9995L13 8.99953M15.5 11.9995H3" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/auth-image.png')" }}
      />

      <section className="relative z-10 w-full max-w-md lg:max-w-lg px-4">
        <div className="rounded-2xl border border-white/10 backdrop-blur-xl bg-black/50">
          <div className="p-6 sm:p-8 lg:p-10">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                <span>Nova senha</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Redefinir senha</h2>
              <p className="text-sm text-gray-400 mt-1.5">Digite sua nova senha abaixo.</p>
            </div>

            {/* Form */}
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* New Password */}
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-gray-300 mb-1.5 pl-[10px]">
                  Nova senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="m7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...register('password')}
                    className="w-full rounded-2xl bg-black/30 text-gray-100 placeholder-gray-500/60 border border-white/10 focus:border-white/30 focus:outline-none transition px-10 pr-11 py-2.5 text-sm"
                    placeholder="Minimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-400 mt-1.5 pl-[10px]">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-300 mb-1.5 pl-[10px]">
                  Confirmar senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="m7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...register('confirmPassword')}
                    className="w-full rounded-2xl bg-black/30 text-gray-100 placeholder-gray-500/60 border border-white/10 focus:border-white/30 focus:outline-none transition px-10 pr-11 py-2.5 text-sm"
                    placeholder="Repita a nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                  >
                    {showConfirmPassword ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-400 mt-1.5 pl-[10px]">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={mutation.isPending}
                className="group w-full inline-flex items-center justify-center gap-2 relative overflow-hidden font-medium rounded-2xl text-sm py-2.5 mt-4 bg-transparent text-gray-300 border border-white/20 transition-all duration-300 cursor-pointer hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <span className="relative z-10 transition-all duration-300 group-hover:opacity-0">
                  {mutation.isPending ? 'Redefinindo...' : 'Redefinir senha'}
                </span>

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
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
