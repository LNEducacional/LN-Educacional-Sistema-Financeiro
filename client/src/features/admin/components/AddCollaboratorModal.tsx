import { useState, useEffect } from 'react';
import { X, UserPlus, Eye, EyeOff, User, Mail, Lock, Sparkles, Key, Star } from 'lucide-react';
import { useCreateCollaborator } from '../api';
import type { CreateCollaboratorRequest } from '../types';

interface AddCollaboratorModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddCollaboratorModal({
  onClose,
  onSuccess,
}: AddCollaboratorModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [specialty, setSpecialty] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [internalRanking, setInternalRanking] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateCollaborator();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Nome e obrigatorio';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    }

    if (!email.trim()) {
      newErrors.email = 'Email e obrigatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email invalido';
    }

    if (!password) {
      newErrors.password = 'Senha e obrigatoria';
    } else if (password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (internalRanking) {
      const ranking = parseFloat(internalRanking);
      if (isNaN(ranking) || ranking < 0 || ranking > 5) {
        newErrors.internalRanking = 'Ranking deve ser entre 0 e 5';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const data: CreateCollaboratorRequest = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    };

    if (specialty.trim()) {
      data.specialty = specialty.trim();
    }
    if (pixKey.trim()) {
      data.pix_key = pixKey.trim();
    }
    if (internalRanking) {
      data.internal_ranking = parseFloat(internalRanking);
    }

    createMutation.mutate(data, {
      onSuccess: () => {
        onSuccess();
        onClose();
      },
    });
  };

  const inputBaseClass = "w-full rounded-2xl bg-black/30 text-gray-100 placeholder-gray-500/60 border border-white/10 focus:border-white/30 focus:outline-none transition px-10 py-2.5 text-sm";
  const inputErrorClass = "w-full rounded-2xl bg-black/30 text-gray-100 placeholder-gray-500/60 border border-red-500/50 focus:border-red-500/70 focus:outline-none transition px-10 py-2.5 text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md lg:max-w-2xl mx-4 rounded-2xl border border-white/10 backdrop-blur-xl bg-black/50 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                <span>Novo registro</span>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
                <UserPlus className="h-6 w-6 text-violet-400" />
                Novo Colaborador
              </h2>
              <p className="text-sm text-gray-400 mt-1">Preencha os dados para criar uma nova conta.</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-gray-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campos obrigatorios - grid 2 colunas no desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Nome */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5 pl-2.5">
                  Nome *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome completo"
                    className={errors.name ? inputErrorClass : inputBaseClass}
                  />
                </div>
                {errors.name && (
                  <p className="text-xs text-red-400 mt-1.5 pl-2.5">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5 pl-2.5">
                  Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className={errors.email ? inputErrorClass : inputBaseClass}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-400 mt-1.5 pl-2.5">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Senha - largura total */}
            <div className="lg:w-1/2 lg:pr-2">
              <label className="block text-xs font-medium text-gray-300 mb-1.5 pl-2.5">
                Senha *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimo 6 caracteres"
                  className={errors.password ? inputErrorClass + " pr-10" : inputBaseClass + " pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 mt-1.5 pl-2.5">{errors.password}</p>
              )}
            </div>

            {/* Divisor */}
            <div className="border-t border-white/10 pt-4">
              <p className="text-xs text-gray-500 mb-3 pl-2.5">Campos opcionais</p>
            </div>

            {/* Campos opcionais - grid 2 colunas no desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Especialidade */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5 pl-2.5">
                  Especialidade
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="Ex: Design Grafico, Desenvolvimento Web"
                    className={inputBaseClass}
                  />
                </div>
              </div>

              {/* Chave PIX */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5 pl-2.5">
                  Chave PIX
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Key className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="CPF, Email, Telefone ou Chave Aleatoria"
                    className={inputBaseClass}
                  />
                </div>
              </div>
            </div>

            {/* Ranking Interno - meia largura no desktop */}
            <div className="lg:w-1/2 lg:pr-2">
              <label className="block text-xs font-medium text-gray-300 mb-1.5 pl-2.5">
                Ranking Interno (0-5)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Star className="h-4 w-4" />
                </div>
                <input
                  type="number"
                  value={internalRanking}
                  onChange={(e) => setInternalRanking(e.target.value)}
                  min="0"
                  max="5"
                  step="0.01"
                  placeholder="0.00"
                  className={errors.internalRanking ? inputErrorClass : inputBaseClass}
                />
              </div>
              {errors.internalRanking && (
                <p className="text-xs text-red-400 mt-1.5 pl-2.5">{errors.internalRanking}</p>
              )}
              <p className="text-xs text-gray-500 mt-1.5 pl-2.5">
                Nota interna de qualidade do colaborador
              </p>
            </div>

            {/* Error Message */}
            {createMutation.error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                <p className="text-xs text-red-400">
                  {(createMutation.error as Error).message === 'Request failed with status code 409'
                    ? 'Email ja cadastrado no sistema.'
                    : 'Erro ao criar colaborador. Tente novamente.'}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="group w-full lg:w-auto lg:min-w-[220px] lg:ml-auto lg:flex inline-flex items-center justify-center gap-2 relative overflow-hidden font-medium rounded-2xl text-sm py-2.5 mt-4 bg-transparent text-gray-300 border border-white/20 transition-all duration-300 hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Gradient background - hidden by default, visible on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <span className="relative z-10 transition-all duration-300 group-hover:opacity-0">
                {createMutation.isPending ? 'Criando...' : 'Criar Colaborador'}
              </span>

              {/* Circulo expandivel com icone */}
              <span className="absolute right-[0.3em] z-10 flex items-center justify-center h-[2.2em] w-[2.2em] rounded-[0.7em] bg-white/10 transition-all duration-300 group-hover:bg-white/20 group-hover:w-[calc(100%-0.6em)]">
                {createMutation.isPending ? (
                  <div className="w-[1.1em] h-[1.1em] border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <UserPlus className="w-[1.1em] h-[1.1em] text-gray-300 transition-all duration-300 group-hover:text-white group-hover:scale-110" />
                )}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
