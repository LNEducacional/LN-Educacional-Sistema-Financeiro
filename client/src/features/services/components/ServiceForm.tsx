import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Users, AlertTriangle } from 'lucide-react';
import {
  createServiceSchema,
  serviceAreaOptions,
  type CreateServiceSchema,
} from '../schemas';
import { useCreateService, useUpdateService } from '../api';
import { useWithdrawalLimitsConfig } from '@/features/admin/api';
import type { Service } from '../types';
import { Select } from '@/components/ui';

interface ServiceFormProps {
  onSuccess?: () => void;
  initialData?: Service;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function ServiceForm({ onSuccess, initialData }: ServiceFormProps) {
  const createMutation = useCreateService();
  const updateMutation = useUpdateService();
  const { data: limitsConfig } = useWithdrawalLimitsConfig();
  const chargeMinAmount = limitsConfig?.charge_min_amount ?? 5;
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreateServiceSchema>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          area: initialData.area,
          work_type: initialData.work_type ?? '',
          total_value: initialData.total_value,
          company_percent: initialData.company_percent,
          collaborator_percent: initialData.collaborator_percent,
        }
      : {
          name: '',
          area: 'DIREITO',
          work_type: '',
          total_value: 0,
          company_percent: 50,
          collaborator_percent: 50,
        },
  });

  const totalValue = watch('total_value') || 0;
  const companyPercent = watch('company_percent') || 0;
  const collaboratorPercent = watch('collaborator_percent') || 0;

  const companyValue = (totalValue * companyPercent) / 100;
  const collaboratorValue = (totalValue * collaboratorPercent) / 100;

  const handleCompanyPercentChange = (value: number) => {
    const clamped = Math.min(100, Math.max(0, value));
    setValue('company_percent', clamped);
    setValue('collaborator_percent', 100 - clamped);
  };

  const handleCollaboratorPercentChange = (value: number) => {
    const clamped = Math.min(100, Math.max(0, value));
    setValue('collaborator_percent', clamped);
    setValue('company_percent', 100 - clamped);
  };

  const isBelowMinAmount = totalValue > 0 && totalValue < chargeMinAmount;

  const onSubmit = (data: CreateServiceSchema) => {
    if (data.total_value < chargeMinAmount) {
      return;
    }
    if (isEditing) {
      updateMutation.mutate(
        { id: initialData.id, data },
        {
          onSuccess: () => {
            onSuccess?.();
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          onSuccess?.();
        },
      });
    }
  };

  const isPending = isEditing ? updateMutation.isPending : createMutation.isPending;
  const isError = isEditing ? updateMutation.isError : createMutation.isError;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-300"
        >
          Nome do Servico
        </label>
        <input
          id="name"
          type="text"
          {...register('name')}
          className="mt-1 block w-full rounded-xl bg-black/30 backdrop-blur-xl text-gray-100 placeholder-gray-500/60 border border-white/10 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 px-4 py-2.5 text-sm"
          placeholder="Ex: TCC Direito"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="area"
            className="block text-sm font-medium text-gray-300"
          >
            Area
          </label>
          <Controller
            name="area"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                options={serviceAreaOptions}
                placeholder="Selecione uma area"
                error={!!errors.area}
                className="mt-1"
              />
            )}
          />
          {errors.area && (
            <p className="mt-1 text-sm text-red-400">{errors.area.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="work_type"
            className="block text-sm font-medium text-gray-300"
          >
            Tipo de Trabalho
          </label>
          <input
            id="work_type"
            type="text"
            {...register('work_type')}
            className="mt-1 block w-full rounded-xl bg-black/30 backdrop-blur-xl text-gray-100 placeholder-gray-500/60 border border-white/10 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 px-4 py-2.5 text-sm"
            placeholder="Ex: Monografia, TCC, Artigo"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="total_value"
          className="block text-sm font-medium text-gray-300"
        >
          Valor Total (R$)
        </label>
        <input
          id="total_value"
          type="number"
          step="0.01"
          min="0"
          {...register('total_value')}
          className="mt-1 block w-full rounded-xl bg-black/30 backdrop-blur-xl text-gray-100 placeholder-gray-500/60 border border-white/10 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 px-4 py-2.5 text-sm"
          placeholder="0,00"
        />
        {errors.total_value && (
          <p className="mt-1 text-sm text-red-400">
            {errors.total_value.message}
          </p>
        )}
        {isBelowMinAmount && (
          <p className="mt-1 text-sm text-amber-400 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Valor minimo para cobranca e {formatCurrency(chargeMinAmount)}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-300">
          Divisao do Valor (Split)
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="company_percent"
              className="block text-sm font-medium text-gray-300"
            >
              Empresa (%)
            </label>
            <input
              id="company_percent"
              type="number"
              min="0"
              max="100"
              value={companyPercent}
              onChange={(e) =>
                handleCompanyPercentChange(Number(e.target.value))
              }
              className="mt-1 block w-full rounded-xl bg-black/30 backdrop-blur-xl text-gray-100 placeholder-gray-500/60 border border-white/10 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="collaborator_percent"
              className="block text-sm font-medium text-gray-300"
            >
              Colaborador (%)
            </label>
            <input
              id="collaborator_percent"
              type="number"
              min="0"
              max="100"
              value={collaboratorPercent}
              onChange={(e) =>
                handleCollaboratorPercentChange(Number(e.target.value))
              }
              className="mt-1 block w-full rounded-xl bg-black/30 backdrop-blur-xl text-gray-100 placeholder-gray-500/60 border border-white/10 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 px-4 py-2.5 text-sm"
            />
            {errors.collaborator_percent && (
              <p className="mt-1 text-sm text-red-400">
                {errors.collaborator_percent.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
            <div className="flex items-center gap-2 text-sm text-blue-400">
              <Building2 className="h-4 w-4" />
              Empresa recebe
            </div>
            <p className="mt-1 text-xl font-bold text-blue-300">
              {formatCurrency(companyValue)}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <Users className="h-4 w-4" />
              Colaborador recebe
            </div>
            <p className="mt-1 text-xl font-bold text-emerald-300">
              {formatCurrency(collaboratorValue)}
            </p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending || isBelowMinAmount}
        className="w-full h-10 rounded-2xl bg-violet-600 text-white font-medium transition-all duration-200 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Salvando...' : isEditing ? 'Atualizar Servico' : 'Criar Servico'}
      </button>

      {isError && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4" />
          Erro ao {isEditing ? 'atualizar' : 'criar'} servico. Tente novamente.
        </div>
      )}
    </form>
  );
}
