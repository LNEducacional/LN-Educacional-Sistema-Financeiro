import { useState } from 'react';
import { useRanking } from './api';
import { CriteriaTabs } from './components/CriteriaTabs';
import { Podium } from './components/Podium';
import { RankingTable } from './components/RankingTable';
import { UserPositionBar } from './components/UserPositionBar';
import type { RankingCriteria, RankingPeriod } from './types';
import { Trophy, AlertTriangle, Users, Zap, Lightbulb, Calculator } from 'lucide-react';

function RankingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-6">
        <div className="flex justify-center items-end gap-8">
          <div className="w-20 h-20 rounded-full bg-white/10" />
          <div className="w-24 h-24 rounded-full bg-white/10" />
          <div className="w-20 h-20 rounded-full bg-white/10" />
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-white/10 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-12 text-center">
      {/* Trophy Illustration */}
      <div className="relative w-48 h-48 mx-auto mb-8">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/20 to-transparent rounded-full blur-3xl animate-pulse" />

        {/* Trophy Container */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2">
          {/* Trophy Cup */}
          <div className="relative w-24 h-20">
            {/* Star on top */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-yellow-400 animate-bounce" style={{ animationDuration: '2s' }}>
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>

            {/* Main Cup Body */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2">
              <div className="relative w-20 h-16 bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-500 rounded-b-[50%] rounded-t-lg">
                {/* Shine effect */}
                <div className="absolute left-2 top-2 w-3 h-10 bg-gradient-to-b from-yellow-200/60 to-transparent rounded-full" />
              </div>

              {/* Left Handle */}
              <div className="absolute -left-3 top-2 w-3 h-8 border-4 border-yellow-400 rounded-l-full border-r-0" />
              {/* Right Handle */}
              <div className="absolute -right-3 top-2 w-3 h-8 border-4 border-yellow-400 rounded-r-full border-l-0" />

              {/* Trophy Base/Stem */}
              <div className="mx-auto w-6 h-4 bg-gradient-to-b from-yellow-500 to-orange-600" />
              <div className="mx-auto w-10 h-2 bg-gradient-to-b from-orange-600 to-orange-700 rounded-sm" />
              <div className="mx-auto w-14 h-3 bg-gradient-to-b from-orange-700 to-orange-800 rounded-b-md" />
            </div>
          </div>
        </div>

        {/* Podium Base */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-2">
          {/* Left podium (2nd place - silver/gray) */}
          <div className="w-12 h-8 bg-gradient-to-t from-gray-600 to-gray-500 rounded-t-md" />

          {/* Center podium (1st place - gold) */}
          <div className="w-16 h-12 bg-gradient-to-t from-orange-600 to-orange-500 rounded-t-md shadow-lg shadow-orange-500/30" />

          {/* Right podium (3rd place - bronze) */}
          <div className="w-12 h-6 bg-gradient-to-t from-orange-700 to-red-600 rounded-t-md" />
        </div>

        {/* Floating sparkles with ping animation */}
        <div className="absolute top-4 left-8 w-2 h-2 bg-amber-400 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
        <div className="absolute top-12 right-6 w-1.5 h-1.5 bg-amber-300 rounded-full animate-ping" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />
        <div className="absolute bottom-20 left-6 w-1 h-1 bg-amber-200 rounded-full animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }} />
        <div className="absolute bottom-24 right-10 w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" style={{ animationDuration: '3.2s', animationDelay: '0.3s' }} />
        <div className="absolute top-20 left-12 w-1 h-1 bg-yellow-300 rounded-full animate-ping" style={{ animationDuration: '3.8s', animationDelay: '0.7s' }} />
        <div className="absolute bottom-16 right-8 w-1.5 h-1.5 bg-orange-300 rounded-full animate-ping" style={{ animationDuration: '3.4s', animationDelay: '0.2s' }} />
      </div>

      {/* Text Content */}
      <h3 className="text-xl font-semibold text-white mb-2">Conquiste seu lugar no podio!</h3>
      <p className="text-gray-400 max-w-md mx-auto mb-6">{message}</p>

      {/* Motivational Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300">
        <Zap className="w-4 h-4" />
        Complete trabalhos para subir no ranking
      </div>
    </div>
  );
}

const CRITERIA_TIPS: Record<RankingCriteria, { tips: string[]; formula?: string }> = {
  productivity: {
    tips: [
      'Aceite pedidos compativeis com seu ritmo de trabalho',
      'Mantenha um fluxo constante de entregas ao longo do mes',
      'Evite deixar pedidos parados por muito tempo',
    ],
  },
  revenue: {
    tips: [
      'Aceite pedidos de maior valor quando possivel',
      'Mantenha alta qualidade para receber pedidos premium',
      'Evite reembolsos que reduzem seu faturamento total',
    ],
  },
  punctuality: {
    tips: [
      'Entregue sempre antes do prazo estipulado',
      'Organize sua agenda para nao acumular prazos',
      'Comunique antecipadamente se houver risco de atraso',
    ],
  },
  satisfaction: {
    tips: [
      'Atenda aos requisitos do pedido com atencao aos detalhes',
      'Mantenha comunicacao clara com o cliente',
      'Busque resolver duvidas antes de entregar',
    ],
  },
  quality: {
    tips: [
      'Reduza revisoes: revise seu trabalho antes de entregar',
      'Evite reembolsos: entenda bem o escopo antes de aceitar',
      'Busque aprovacao direta: entregar certo de primeira',
    ],
    formula: '(1 - taxa_revisao) x 50% + (1 - taxa_reembolso) x 30% + taxa_aprovacao_direta x 20%',
  },
};

function CriteriaInfoPanel({ criteria }: { criteria: RankingCriteria }) {
  const config = CRITERIA_TIPS[criteria];

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5 space-y-4">
      {/* Formula (quality only) */}
      {config.formula && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-violet-500/5 border border-violet-500/15">
          <Calculator className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-violet-300 mb-1">Formula de Qualidade</p>
            <code className="text-xs text-gray-300 bg-black/40 px-2 py-1 rounded font-mono">
              {config.formula}
            </code>
            <p className="text-xs text-gray-500 mt-1.5">
              Minimo de 3 pedidos concluidos para entrar no ranking de qualidade.
            </p>
          </div>
        </div>
      )}

      {/* Improvement Tips */}
      <div className="flex items-start gap-3">
        <Lightbulb className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-amber-300 mb-2">Como melhorar seu score</p>
          <ul className="space-y-1.5">
            {config.tips.map((tip) => (
              <li key={tip} className="text-xs text-gray-400 flex items-start gap-2">
                <span className="h-1 w-1 rounded-full bg-gray-600 mt-1.5 shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function RankingPage() {
  const [criteria, setCriteria] = useState<RankingCriteria>('productivity');
  const [period, setPeriod] = useState<RankingPeriod>('this_month');
  const { data, isLoading, error } = useRanking(criteria, period);

  const topTen = data?.top_ten ?? [];
  // Verificar se há dados válidos (pelo menos 1 colaborador com valor > 0)
  const hasData = topTen.length > 0 && topTen.some(entry => entry.value > 0);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400/80" />
            <span>Gamificacao</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
            <Trophy className="h-7 w-7 text-violet-400" />
            Ranking de Colaboradores
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-10 inline-flex items-center gap-2 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 px-4 text-sm font-medium text-gray-100">
            <Users className="h-4 w-4 text-violet-400" />
            {data?.total_users || 0} participantes
          </span>
        </div>
      </div>

      {/* Filters */}
      <CriteriaTabs
        criteria={criteria}
        onCriteriaChange={setCriteria}
        period={period}
        onPeriodChange={setPeriod}
      />

      {/* Quality Formula & Improvement Tips */}
      <CriteriaInfoPanel criteria={criteria} />

      {isLoading ? (
        <RankingSkeleton />
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-6 text-center flex items-center justify-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <p className="text-red-300">Erro ao carregar ranking. Tente novamente.</p>
        </div>
      ) : !hasData ? (
        <EmptyState message="Realize sua primeira venda para entrar no ranking!" />
      ) : (
        <>
          <Podium entries={topTen.slice(0, 3)} criteria={criteria} />
          {topTen.length > 3 && (
            <RankingTable entries={topTen.slice(3)} criteria={criteria} />
          )}
        </>
      )}

      {data?.current_user && (
        <UserPositionBar
          entry={data.current_user}
          totalUsers={data.total_users}
          criteria={criteria}
        />
      )}
    </div>
  );
}
