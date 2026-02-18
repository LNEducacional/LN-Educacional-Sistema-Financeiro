import { useState } from 'react';
import {
  Settings,
  Key,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Wallet,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import {
  useAsaasSettings,
  useUpdateSetting,
  useTestAsaasConnection,
  useWithdrawalLimitsConfig,
  useUpdateWithdrawalLimit,
} from './api';

export const SettingsPage = () => {
  const { data: settings, isLoading, error } = useAsaasSettings();
  const updateMutation = useUpdateSetting();
  const testMutation = useTestAsaasConnection();
  const { data: withdrawalLimits } = useWithdrawalLimitsConfig();
  const updateLimitMutation = useUpdateWithdrawalLimit();

  const [apiKey, setApiKey] = useState('');
  const [webhookToken, setWebhookToken] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookToken, setShowWebhookToken] = useState(false);
  const [editingApiKey, setEditingApiKey] = useState(false);
  const [editingWebhookToken, setEditingWebhookToken] = useState(false);
  const [showSandboxConfirm, setShowSandboxConfirm] = useState(false);

  // Withdrawal limits editing state
  const [editingLimit, setEditingLimit] = useState<string | null>(null);
  const [limitValue, setLimitValue] = useState('');

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    await updateMutation.mutateAsync({ key: 'asaas_api_key', value: apiKey });
    setApiKey('');
    setEditingApiKey(false);
  };

  const handleSaveWebhookToken = async () => {
    if (!webhookToken.trim()) return;
    await updateMutation.mutateAsync({ key: 'asaas_webhook_token', value: webhookToken });
    setWebhookToken('');
    setEditingWebhookToken(false);
  };

  const handleTestConnection = async () => {
    await testMutation.mutateAsync();
  };

  const handleToggleSandbox = async () => {
    const newValue = settings?.sandbox ? 'false' : 'true';
    // Se trocando para producao, exigir confirmacao
    if (newValue === 'false' && !showSandboxConfirm) {
      setShowSandboxConfirm(true);
      return;
    }
    await updateMutation.mutateAsync({ key: 'asaas_sandbox', value: newValue });
    setShowSandboxConfirm(false);
  };

  const handleSaveLimit = async (key: string) => {
    const parsed = Number.parseFloat(limitValue);
    if (Number.isNaN(parsed) || parsed <= 0) return;
    await updateLimitMutation.mutateAsync({ key, value: limitValue });
    setEditingLimit(null);
    setLimitValue('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
        <p className="text-red-400">Erro ao carregar configuracoes</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400/80" />
          <span>Administracao</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
          <Settings className="h-7 w-7 text-violet-400" />
          Configuracoes do Sistema
        </h1>
        <p className="text-gray-400 mt-2">
          Configure as credenciais do gateway de pagamento ASAAS
        </p>
      </div>

      {/* Status Card */}
      <div className={`rounded-2xl border p-6 ${
        settings?.is_configured
          ? 'border-emerald-500/30 bg-emerald-500/10'
          : 'border-amber-500/30 bg-amber-500/10'
      }`}>
        <div className="flex items-center gap-4">
          {settings?.is_configured ? (
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          ) : (
            <XCircle className="h-8 w-8 text-amber-400" />
          )}
          <div>
            <h2 className={`text-lg font-semibold ${
              settings?.is_configured ? 'text-emerald-300' : 'text-amber-300'
            }`}>
              {settings?.is_configured ? 'Gateway Configurado' : 'Gateway Nao Configurado'}
            </h2>
            <p className="text-sm text-gray-400">
              {settings?.is_configured
                ? 'O sistema esta pronto para processar pagamentos'
                : 'Configure as credenciais abaixo para habilitar pagamentos'}
            </p>
          </div>
        </div>
      </div>

      {/* Sandbox / Production Toggle */}
      <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <ExternalLink className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-white">Ambiente ASAAS</h3>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-300">Modo:</span>
            <span className={`text-sm font-medium px-2.5 py-1 rounded ${
              settings?.sandbox
                ? 'text-amber-300 bg-amber-500/10'
                : 'text-emerald-300 bg-emerald-500/10'
            }`}>
              {settings?.sandbox ? 'Sandbox (testes)' : 'Producao'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleSandbox}
            disabled={updateMutation.isPending}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 ${
              settings?.sandbox ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                settings?.sandbox ? 'translate-x-1' : 'translate-x-6'
              }`}
            />
          </button>
        </div>

        {showSandboxConfirm && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-300">
                  Ativar modo producao?
                </p>
                <p className="text-xs text-red-400/80 mt-1">
                  Cobrancas reais serao processadas. Certifique-se de que as credenciais sao de producao.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleToggleSandbox}
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Confirmar'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSandboxConfirm(false)}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">URL da API:</span>
          <code className="text-sm text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg">
            {settings?.api_url}
          </code>
        </div>
      </div>

      {/* API Key Card */}
      <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-violet-400" />
            <h3 className="text-lg font-semibold text-white">API Key</h3>
          </div>
          <div className="flex items-center gap-2">
            {settings?.api_key.is_configured ? (
              <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                Configurada
              </span>
            ) : (
              <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                Nao configurada
              </span>
            )}
          </div>
        </div>

        {!editingApiKey ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <code className="text-sm text-gray-300 bg-gray-500/10 px-3 py-1.5 rounded-lg">
                {settings?.api_key.value || '(vazio)'}
              </code>
            </div>
            <button
              onClick={() => setEditingApiKey(true)}
              className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              {settings?.api_key.is_configured ? 'Alterar' : 'Configurar'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Cole sua API Key aqui"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 pr-10 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveApiKey}
                disabled={!apiKey.trim() || updateMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Salvar'
                )}
              </button>
              <button
                onClick={() => {
                  setEditingApiKey(false);
                  setApiKey('');
                }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {settings?.api_key.updated_at && (
          <p className="text-xs text-gray-500 mt-3">
            Ultima atualizacao: {new Date(settings.api_key.updated_at).toLocaleString('pt-BR')}
          </p>
        )}
      </div>

      {/* Webhook Token Card */}
      <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-violet-400" />
            <h3 className="text-lg font-semibold text-white">Webhook Token</h3>
          </div>
          <div className="flex items-center gap-2">
            {settings?.webhook_token.is_configured ? (
              <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                Configurado
              </span>
            ) : (
              <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                Nao configurado
              </span>
            )}
          </div>
        </div>

        {!editingWebhookToken ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <code className="text-sm text-gray-300 bg-gray-500/10 px-3 py-1.5 rounded-lg">
                {settings?.webhook_token.value || '(vazio)'}
              </code>
            </div>
            <button
              onClick={() => setEditingWebhookToken(true)}
              className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              {settings?.webhook_token.is_configured ? 'Alterar' : 'Configurar'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <input
                type={showWebhookToken ? 'text' : 'password'}
                value={webhookToken}
                onChange={(e) => setWebhookToken(e.target.value)}
                placeholder="Cole seu Webhook Token aqui"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 pr-10 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button
                type="button"
                onClick={() => setShowWebhookToken(!showWebhookToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showWebhookToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveWebhookToken}
                disabled={!webhookToken.trim() || updateMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Salvar'
                )}
              </button>
              <button
                onClick={() => {
                  setEditingWebhookToken(false);
                  setWebhookToken('');
                }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {settings?.webhook_token.updated_at && (
          <p className="text-xs text-gray-500 mt-3">
            Ultima atualizacao: {new Date(settings.webhook_token.updated_at).toLocaleString('pt-BR')}
          </p>
        )}
      </div>

      {/* Test Connection */}
      <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Testar Conexao</h3>
            <p className="text-sm text-gray-400 mt-1">
              Verifique se as credenciais estao funcionando corretamente
            </p>
          </div>
          <button
            onClick={handleTestConnection}
            disabled={!settings?.is_configured || testMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Testar
          </button>
        </div>

        {testMutation.data && (
          <div className={`mt-4 p-4 rounded-lg ${
            testMutation.data.success
              ? 'bg-emerald-500/10 border border-emerald-500/30'
              : 'bg-red-500/10 border border-red-500/30'
          }`}>
            <div className="flex items-center gap-2">
              {testMutation.data.success ? (
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              <span className={testMutation.data.success ? 'text-emerald-300' : 'text-red-300'}>
                {testMutation.data.message}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Withdrawal Limits Section */}
      <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <Wallet className="h-5 w-5 text-emerald-400" />
          <h3 className="text-lg font-semibold text-white">Limites de Saque</h3>
        </div>
        <p className="text-sm text-gray-400 mb-6">
          Configure os valores minimo, maximo e limite diario para saques dos colaboradores.
        </p>

        <div className="space-y-4">
          {[
            {
              key: 'withdrawal_min_amount',
              label: 'Valor Minimo por Saque',
              value: withdrawalLimits?.min_amount ?? 50,
              description: 'Menor valor permitido para cada solicitacao de saque',
            },
            {
              key: 'withdrawal_max_amount',
              label: 'Valor Maximo por Saque',
              value: withdrawalLimits?.max_amount ?? 10000,
              description: 'Maior valor permitido para cada solicitacao de saque',
            },
            {
              key: 'withdrawal_daily_limit',
              label: 'Limite Diario',
              value: withdrawalLimits?.daily_limit ?? 50000,
              description: 'Valor total maximo de saques por colaborador por dia',
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div>
                <p className="text-sm font-medium text-gray-200">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
              </div>

              {editingLimit === item.key ? (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={limitValue}
                      onChange={(e) => setLimitValue(e.target.value)}
                      className="w-36 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-1.5 pl-10 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveLimit(item.key)}
                    disabled={!limitValue || updateLimitMutation.isPending}
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
                  >
                    {updateLimitMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Salvar'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLimit(null);
                      setLimitValue('');
                    }}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-emerald-400">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(item.value)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLimit(item.key);
                      setLimitValue(String(item.value));
                    }}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    Alterar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Charge Min Amount Section */}
      <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <DollarSign className="h-5 w-5 text-violet-400" />
          <h3 className="text-lg font-semibold text-white">Cobranca</h3>
        </div>
        <p className="text-sm text-gray-400 mb-6">
          Valor minimo exigido pelo ASAAS para gerar cobrancas (PIX, boleto, etc).
        </p>

        <div className="space-y-4">
          {[
            {
              key: 'charge_min_amount',
              label: 'Valor Minimo de Cobranca',
              value: withdrawalLimits?.charge_min_amount ?? 5,
              description: 'Servicos com valor abaixo deste limite nao poderao gerar cobrancas',
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div>
                <p className="text-sm font-medium text-gray-200">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
              </div>

              {editingLimit === item.key ? (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={limitValue}
                      onChange={(e) => setLimitValue(e.target.value)}
                      className="w-36 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-1.5 pl-10 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveLimit(item.key)}
                    disabled={!limitValue || updateLimitMutation.isPending}
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
                  >
                    {updateLimitMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Salvar'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLimit(null);
                      setLimitValue('');
                    }}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-emerald-400">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(item.value)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLimit(item.key);
                      setLimitValue(String(item.value));
                    }}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    Alterar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Help Section */}
      <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Como obter as credenciais</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-400 text-sm">
          <li>Acesse o painel do ASAAS em <a href="https://www.asaas.com" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">asaas.com</a></li>
          <li>Va em <strong className="text-gray-300">Configuracoes &gt; Integracao</strong></li>
          <li>Gere ou copie sua <strong className="text-gray-300">API Key de Producao</strong></li>
          <li>Para webhooks, configure a URL do seu sistema e copie o <strong className="text-gray-300">Token de Autenticacao</strong></li>
        </ol>
      </div>
    </div>
  );
};
