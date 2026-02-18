import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../schemas';
import type { LoginSchema } from '../schemas';
import { useAuth } from '../AuthContext';
import { loginUser } from '../api';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { jwtDecode } from 'jwt-decode';
import type { DecodedToken } from '../types';

const getRedirectPath = (role: string): string => {
  switch (role) {
    case 'ADMIN':
      return '/admin/reports';
    case 'FINANCEIRO':
      return '/admin/reports';
    case 'COLLABORATOR':
      return '/collaborator/dashboard';
    case 'STUDENT':
      return '/student/orders';
    default:
      return '/login';
  }
};

const getErrorMessage = (error: Error): string => {
  const message = error.message?.toLowerCase() || '';

  if (message.includes('network') || message.includes('fetch')) {
    return 'Erro de conexao. Verifique sua internet e tente novamente.';
  }
  if (message.includes('401') || message.includes('unauthorized') || message.includes('invalid credentials')) {
    return 'Email ou senha incorretos. Verifique suas credenciais.';
  }
  if (message.includes('500') || message.includes('internal')) {
    return 'Erro no servidor. Tente novamente em alguns instantes.';
  }
  if (message.includes('timeout')) {
    return 'O servidor demorou para responder. Tente novamente.';
  }

  return 'Ocorreu um erro inesperado. Tente novamente.';
};

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
  });

  const mutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      if (!data.access_token) {
        throw new Error('Resposta invalida do servidor');
      }
      login(data);
      const decoded = jwtDecode<DecodedToken>(data.access_token);
      navigate(getRedirectPath(decoded.role));
    },
  });

  const onSubmit = (data: LoginSchema) => {
    mutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/auth-image.png')" }}
      />

      {/* Login Card - Glass Dark */}
      <section className="relative z-10 w-full max-w-md lg:max-w-lg px-4">
        <div className="rounded-2xl border border-white/10 backdrop-blur-xl bg-black/50">
          <div className="p-6 sm:p-8 lg:p-10">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                <span>Area segura</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Entrar</h2>
              <p className="text-sm text-gray-400 mt-1.5">Use seu email e senha para acessar sua conta.</p>
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

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-gray-300 mb-1.5 pl-[10px]">
                  Senha
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
                    autoComplete="current-password"
                    {...register('password')}
                    className="w-full rounded-2xl bg-black/30 text-gray-100 placeholder-gray-500/60 border border-white/10 focus:border-white/30 focus:outline-none transition px-10 pr-11 py-2.5 text-sm"
                    placeholder="••••••••"
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
                <div className="flex justify-end mt-1.5 pr-[10px]">
                  <Link
                    to="/forgot-password"
                    className="text-xs text-gray-400 hover:text-gray-200 hover:underline underline-offset-4"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-400 mt-1.5 pl-[10px]">{errors.password.message}</p>
                )}
              </div>

              {/* Submit - Animated Button */}
              <button
                type="submit"
                disabled={mutation.isPending}
                className="group w-full inline-flex items-center justify-center gap-2 relative overflow-hidden font-medium rounded-2xl text-sm py-2.5 mt-4 bg-transparent text-gray-300 border border-white/20 transition-all duration-300 cursor-pointer hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Gradient background - hidden by default, visible on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <span className="relative z-10 transition-all duration-300 group-hover:opacity-0">
                  {mutation.isPending ? 'Entrando...' : 'Entrar'}
                </span>

                {/* Circulo expandivel com icone */}
                <span className="absolute left-[0.3em] z-10 flex items-center justify-center h-[2.2em] w-[2.2em] rounded-[0.7em] bg-white/10 transition-all duration-300 group-hover:bg-white/20 group-hover:w-[calc(100%-0.6em)]">
                  {mutation.isPending ? (
                    <div className="w-[1.1em] h-[1.1em] border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="w-[1.1em] h-[1.1em] text-gray-300 transition-all duration-300 group-hover:text-white group-hover:scale-110"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M8 7.86859V7.34663C8 5.90823 9.02094 4.67225 10.4335 4.40061L17.4335 3.05446C19.2836 2.69866 21 4.1164 21 6.00048V17.9995C21 19.8836 19.2836 21.3013 17.4335 20.9455L10.4335 19.5994C9.02094 19.3278 8 18.0918 8 16.6534V16.1314" />
                      <path d="M13 14.9995L16 11.9995L13 8.99953M15.5 11.9995H3" />
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
