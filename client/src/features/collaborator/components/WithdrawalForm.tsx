import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Wallet, AlertCircle, Loader2, CheckCircle, Info } from 'lucide-react';
import axios from '@/lib/axios';
import { useWithdrawalLimits } from '../api';

const PIX_KEY_TYPES = [
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'PHONE', label: 'Telefone' },
  { value: 'RANDOM', label: 'Chave Aleatoria' },
] as const;

type WithdrawalFormData = z.infer<ReturnType<typeof createWithdrawalSchema>>;

function createWithdrawalSchema(min: number, max: number) {
  return z.object({
    amount: z
      .number({ required_error: 'Valor obrigatorio' })
      .min(min, `Valor minimo: R$ ${min.toFixed(2).replace('.', ',')}`)
      .max(max, `Valor maximo: R$ ${max.toFixed(2).replace('.', ',')}`),
    pix_key: z.string().min(1, 'Chave PIX obrigatoria'),
    pix_key_type: z.enum(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM']),
  });
}

interface WithdrawalFormProps {
  availableBalance: number;
  onSuccess?: () => void;
}

export const WithdrawalForm = ({ availableBalance, onSuccess }: WithdrawalFormProps) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const queryClient = useQueryClient();
  const { data: limits } = useWithdrawalLimits();

  const minAmount = limits?.min_amount ?? 50;
  const maxAmount = limits?.max_amount ?? 10000;
  const dailyLimit = limits?.daily_limit ?? 50000;
  const dailyUsed = limits?.daily_used ?? 0;
  const dailyRemaining = Math.max(0, dailyLimit - dailyUsed);

  const withdrawalSchema = useMemo(
    () => createWithdrawalSchema(minAmount, maxAmount),
    [minAmount, maxAmount],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WithdrawalFormData>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      pix_key_type: 'CPF',
    },
  });

  const amount = watch('amount');

  const withdrawMutation = useMutation({
    mutationFn: async (data: WithdrawalFormData) => {
      const response = await axios.post('/api/payment/withdrawals', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['collaborator-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['withdrawal-limits'] });
      setShowSuccess(true);
      reset();
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess?.();
      }, 3000);
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const effectiveMax = Math.min(availableBalance, maxAmount, dailyRemaining);

  const handleSetMax = () => {
    setValue('amount', effectiveMax);
  };

  const onSubmit = (data: WithdrawalFormData) => {
    withdrawMutation.mutate(data);
  };

  const canWithdraw = availableBalance >= minAmount && dailyRemaining >= minAmount;

  if (showSuccess) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6">
        <div className="flex flex-col items-center text-center">
          <CheckCircle className="h-12 w-12 text-emerald-400 mb-4" />
          <h3 className="text-lg font-semibold text-emerald-300 mb-2">
            Saque Solicitado!
          </h3>
          <p className="text-zinc-400">
            Sua solicitacao foi recebida e sera processada em breve.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
          <Wallet className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">Solicitar Saque</h3>
          <p className="text-sm text-zinc-400">
            Disponivel: <span className="text-emerald-400 font-medium">{formatCurrency(availableBalance)}</span>
          </p>
        </div>
      </div>

      {/* Limites de saque */}
      <div className="mb-6 rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-300">Limites de Saque</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Minimo</p>
            <p className="text-sm font-medium text-zinc-200">{formatCurrency(minAmount)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Maximo</p>
            <p className="text-sm font-medium text-zinc-200">{formatCurrency(maxAmount)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Diario</p>
            <p className="text-sm font-medium text-zinc-200">{formatCurrency(dailyLimit)}</p>
          </div>
        </div>
        {dailyUsed > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-700/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Utilizado hoje</span>
              <span className="text-amber-400 font-medium">{formatCurrency(dailyUsed)}</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-zinc-500">Restante hoje</span>
              <span className="text-emerald-400 font-medium">{formatCurrency(dailyRemaining)}</span>
            </div>
          </div>
        )}
      </div>

      {!canWithdraw ? (
        <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-300 font-medium">
              {dailyRemaining < minAmount ? 'Limite diario atingido' : 'Saldo insuficiente'}
            </p>
            <p className="text-sm text-zinc-400 mt-1">
              {dailyRemaining < minAmount
                ? `Voce ja utilizou ${formatCurrency(dailyUsed)} do limite diario de ${formatCurrency(dailyLimit)}.`
                : `O valor minimo para saque e ${formatCurrency(minAmount)}. Continue trabalhando para acumular saldo.`}
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Valor do Saque
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min={minAmount}
                max={effectiveMax}
                {...register('amount', { valueAsNumber: true })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 pl-10 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="0,00"
              />
              <button
                type="button"
                onClick={handleSetMax}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                MAX
              </button>
            </div>
            {errors.amount && (
              <p className="mt-1 text-sm text-red-400">{errors.amount.message}</p>
            )}
            {amount && amount > availableBalance && (
              <p className="mt-1 text-sm text-amber-400">
                Valor excede o saldo disponivel
              </p>
            )}
            {amount && amount > dailyRemaining && amount <= availableBalance && (
              <p className="mt-1 text-sm text-amber-400">
                Valor excede o limite diario restante ({formatCurrency(dailyRemaining)})
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Tipo de Chave PIX
            </label>
            <select
              {...register('pix_key_type')}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {PIX_KEY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Chave PIX
            </label>
            <input
              type="text"
              {...register('pix_key')}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Digite sua chave PIX"
            />
            {errors.pix_key && (
              <p className="mt-1 text-sm text-red-400">{errors.pix_key.message}</p>
            )}
          </div>

          {withdrawMutation.isError && (
            <div className="flex items-start gap-3 rounded-lg bg-red-500/10 border border-red-500/20 p-4">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-300 font-medium">Erro ao solicitar saque</p>
                <p className="text-sm text-zinc-400 mt-1">
                  {(withdrawMutation.error as Error)?.message || 'Tente novamente mais tarde.'}
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={withdrawMutation.isPending || (!!amount && amount > availableBalance)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {withdrawMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" />
                Solicitar Saque
              </>
            )}
          </button>

          <p className="text-xs text-zinc-500 text-center">
            Saques sao processados automaticamente via PIX em ate 5 minutos.
          </p>
        </form>
      )}
    </div>
  );
};
