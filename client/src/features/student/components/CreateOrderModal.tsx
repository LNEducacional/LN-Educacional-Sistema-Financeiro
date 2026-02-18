import { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  Calendar,
  User,
  Briefcase,
  DollarSign,
  Star,
  AlertTriangle,
  CheckCircle,
  Copy,
  Check,
  ExternalLink,
  QrCode,
} from 'lucide-react';
import {
  useServicesForSelection,
  useCollaboratorsForSelection,
  useCreateOrder,
} from '../api';
import type { AxiosError } from 'axios';
import type { CreateOrderPaymentInfo } from '../types';
import { Select } from '@/components/ui';

interface CreateOrderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

type Step = 'form' | 'success';

export function CreateOrderModal({ onClose, onSuccess }: CreateOrderModalProps) {
  const [step, setStep] = useState<Step>('form');
  const [serviceId, setServiceId] = useState('');
  const [collaboratorId, setCollaboratorId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentInfo, setPaymentInfo] = useState<CreateOrderPaymentInfo | null>(null);
  const [orderValue, setOrderValue] = useState(0);
  const [copied, setCopied] = useState(false);

  const { data: services, isLoading: loadingServices } = useServicesForSelection();
  const { data: collaborators, isLoading: loadingCollaborators } = useCollaboratorsForSelection();
  const createMutation = useCreateOrder();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [step]);

  const serviceOptions = useMemo(() => {
    if (!services) return [];
    return services.map((s) => ({
      value: s.id,
      label: `${s.name} - ${formatCurrency(s.total_value)}`,
    }));
  }, [services]);

  const collaboratorOptions = useMemo(() => {
    if (!collaborators) return [];
    return collaborators.map((c) => ({
      value: c.id,
      label: c.specialty ? `${c.name} (${c.specialty})` : c.name,
    }));
  }, [collaborators]);

  const selectedService = useMemo(() => {
    if (!services || !serviceId) return null;
    return services.find((s) => s.id === serviceId);
  }, [services, serviceId]);

  const selectedCollaborator = useMemo(() => {
    if (!collaborators || !collaboratorId) return null;
    return collaborators.find((c) => c.id === collaboratorId);
  }, [collaborators, collaboratorId]);

  const minDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!serviceId) {
      newErrors.serviceId = 'Selecione um servico';
    }

    if (!collaboratorId) {
      newErrors.collaboratorId = 'Selecione um colaborador';
    }

    if (!dueDate) {
      newErrors.dueDate = 'Informe a data de entrega';
    } else {
      const selectedDate = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate <= today) {
        newErrors.dueDate = 'A data deve ser no futuro';
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

    const dueDateRFC3339 = new Date(dueDate + 'T23:59:59Z').toISOString();

    createMutation.mutate(
      {
        service_id: serviceId,
        collaborator_id: collaboratorId,
        due_date: dueDateRFC3339,
      },
      {
        onSuccess: (data) => {
          setOrderValue(data.order.total_value);
          if (data.payment_info) {
            setPaymentInfo(data.payment_info);
            setStep('success');
          } else {
            onSuccess();
            onClose();
          }
        },
      }
    );
  };

  const handleClose = () => {
    if (step === 'success') {
      onSuccess();
    }
    onClose();
  };

  const handleCopyPix = () => {
    if (paymentInfo?.pix_payload) {
      navigator.clipboard.writeText(paymentInfo.pix_payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const inputBaseClass =
    'w-full rounded-2xl bg-black/30 text-gray-100 placeholder-gray-500/60 border border-white/10 focus:border-white/30 focus:outline-none transition px-10 py-2.5 text-sm';
  const inputErrorClass =
    'w-full rounded-2xl bg-black/30 text-gray-100 placeholder-gray-500/60 border border-red-500/50 focus:border-red-500/70 focus:outline-none transition px-10 py-2.5 text-sm';

  const isLoading = loadingServices || loadingCollaborators;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl mx-4 rounded-2xl border border-white/10 backdrop-blur-xl bg-black/50 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 sm:p-8">
          {step === 'success' && paymentInfo ? (
            <>
              {/* Success Header */}
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                    <span>Pedido criado</span>
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
                    <CheckCircle className="h-6 w-6 text-emerald-400" />
                    Pedido Criado!
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Realize o pagamento para iniciar o servico.
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="rounded-xl p-2 text-gray-400 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Payment Value */}
              <div className="mb-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
                <p className="text-xs text-emerald-400 mb-1">Valor total</p>
                <p className="text-3xl font-bold text-emerald-400">
                  {formatCurrency(orderValue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Vencimento: {new Date(paymentInfo.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>

              {/* PIX QR Code */}
              {paymentInfo.pix_qr_code && (
                <div className="mb-5 rounded-xl bg-white/5 border border-white/10 p-4">
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    QR Code PIX
                  </h3>
                  <div className="flex justify-center mb-3">
                    <div className="rounded-xl bg-white p-3">
                      <img
                        src={`data:image/png;base64,${paymentInfo.pix_qr_code}`}
                        alt="QR Code PIX"
                        className="h-48 w-48"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Escaneie o QR Code com o app do seu banco
                  </p>
                </div>
              )}

              {/* PIX Copy-Paste */}
              {paymentInfo.pix_payload && (
                <div className="mb-5">
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 pl-2.5">
                    PIX Copia e Cola
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={paymentInfo.pix_payload}
                      readOnly
                      className="flex-1 rounded-2xl bg-black/30 text-gray-300 border border-white/10 px-4 py-2.5 text-xs truncate"
                    />
                    <button
                      onClick={handleCopyPix}
                      className="flex items-center gap-1.5 rounded-2xl bg-violet-600/80 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-600 shrink-0"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copiar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Invoice Link */}
              {paymentInfo.invoice_url && (
                <a
                  href={paymentInfo.invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-5 flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300 transition hover:bg-white/10 hover:text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir Fatura Completa
                </a>
              )}

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-gray-300 transition hover:bg-white/5"
              >
                Fechar
              </button>
            </>
          ) : (
            <>
              {/* Form Header */}
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400/80" />
                    <span>Novo pedido</span>
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
                    <FileText className="h-6 w-6 text-violet-400" />
                    Criar Pedido
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Selecione o servico e colaborador.
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="rounded-xl p-2 text-gray-400 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Servico e Colaborador */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5 pl-2.5">
                        Servico *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <Select
                          value={serviceId}
                          onValueChange={setServiceId}
                          options={serviceOptions}
                          placeholder="Selecione um servico"
                          error={!!errors.serviceId}
                          className="pl-10"
                        />
                      </div>
                      {errors.serviceId && (
                        <p className="text-xs text-red-400 mt-1.5 pl-2.5">{errors.serviceId}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5 pl-2.5">
                        Colaborador *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                          <User className="h-4 w-4" />
                        </div>
                        <Select
                          value={collaboratorId}
                          onValueChange={setCollaboratorId}
                          options={collaboratorOptions}
                          placeholder="Selecione um colaborador"
                          error={!!errors.collaboratorId}
                          className="pl-10"
                        />
                      </div>
                      {errors.collaboratorId && (
                        <p className="text-xs text-red-400 mt-1.5 pl-2.5">{errors.collaboratorId}</p>
                      )}
                    </div>
                  </div>

                  {/* Previews */}
                  {(selectedService || selectedCollaborator) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {selectedService && (
                        <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-white">{selectedService.name}</p>
                              <p className="text-xs text-gray-400">
                                {selectedService.area}
                                {selectedService.work_type && ` - ${selectedService.work_type}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-emerald-400">
                                <DollarSign className="h-4 w-4" />
                                <span className="text-lg font-bold">
                                  {formatCurrency(selectedService.total_value)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedCollaborator && (
                        <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-white">{selectedCollaborator.name}</p>
                              {selectedCollaborator.specialty && (
                                <p className="text-xs text-gray-400">{selectedCollaborator.specialty}</p>
                              )}
                            </div>
                            {selectedCollaborator.avg_rating > 0 && (
                              <div className="flex items-center gap-1 text-amber-400">
                                <Star className="h-4 w-4 fill-current" />
                                <span className="text-sm font-medium">
                                  {selectedCollaborator.avg_rating.toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Data de Entrega */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5 pl-2.5">
                      Data de Entrega *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        min={minDate}
                        className={errors.dueDate ? inputErrorClass : inputBaseClass}
                      />
                    </div>
                    {errors.dueDate && (
                      <p className="text-xs text-red-400 mt-1.5 pl-2.5">{errors.dueDate}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1.5 pl-2.5">
                      A data deve ser no futuro
                    </p>
                  </div>

                  {/* Error Message */}
                  {createMutation.error && (
                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                      <p className="text-xs text-red-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {(createMutation.error as AxiosError<string>)?.response?.data ||
                          'Erro ao criar pedido. Tente novamente.'}
                      </p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="group w-full inline-flex items-center justify-center gap-2 relative overflow-hidden font-medium rounded-2xl text-sm py-2.5 mt-4 bg-transparent text-gray-300 border border-white/20 transition-all duration-300 hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                    <span className="relative z-10 transition-all duration-300 group-hover:opacity-0">
                      {createMutation.isPending ? 'Criando...' : 'Criar Pedido'}
                    </span>

                    <span className="absolute right-[0.3em] z-10 flex items-center justify-center h-[2.2em] w-[2.2em] rounded-[0.7em] bg-white/10 transition-all duration-300 group-hover:bg-white/20 group-hover:w-[calc(100%-0.6em)]">
                      {createMutation.isPending ? (
                        <div className="w-[1.1em] h-[1.1em] border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <FileText className="w-[1.1em] h-[1.1em] text-gray-300 transition-all duration-300 group-hover:text-white group-hover:scale-110" />
                      )}
                    </span>
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
