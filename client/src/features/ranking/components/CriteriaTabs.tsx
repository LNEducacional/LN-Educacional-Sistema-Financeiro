import { useState } from 'react';
import { TrendingUp, DollarSign, Clock, Star, Award, Calendar, Info } from 'lucide-react';
import type { RankingCriteria, RankingPeriod } from '../types';

interface CriteriaTabsProps {
  criteria: RankingCriteria;
  onCriteriaChange: (criteria: RankingCriteria) => void;
  period: RankingPeriod;
  onPeriodChange: (period: RankingPeriod) => void;
}

const CRITERIA_CONFIG: Record<
  RankingCriteria,
  { label: string; icon: typeof TrendingUp; description: string }
> = {
  productivity: {
    label: 'Produtividade',
    icon: TrendingUp,
    description: 'Total de pedidos concluidos no periodo. Quanto mais pedidos finalizados, melhor sua posicao.',
  },
  revenue: {
    label: 'Faturamento',
    icon: DollarSign,
    description: 'Soma dos valores recebidos (status RELEASED). Pedidos de maior valor contribuem mais.',
  },
  punctuality: {
    label: 'Pontualidade',
    icon: Clock,
    description: 'Percentual de entregas feitas antes do prazo. Entregas no prazo = 100% de pontualidade.',
  },
  satisfaction: {
    label: 'Satisfacao',
    icon: Star,
    description: 'Media das avaliacoes recebidas dos clientes (1-5 estrelas). Precisa ter ao menos 1 avaliacao.',
  },
  quality: {
    label: 'Qualidade',
    icon: Award,
    description:
      'Score automatico: (1 - taxa_revisao) x 50% + (1 - taxa_reembolso) x 30% + taxa_aprovacao_direta x 20%. Minimo 3 pedidos concluidos.',
  },
};

const CRITERIA_OPTIONS: RankingCriteria[] = ['productivity', 'revenue', 'punctuality', 'satisfaction', 'quality'];

export function CriteriaTabs({
  criteria,
  onCriteriaChange,
  period,
  onPeriodChange,
}: CriteriaTabsProps) {
  const [hoveredCriteria, setHoveredCriteria] = useState<RankingCriteria | null>(null);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        {/* Criteria Buttons */}
        <div className="flex flex-wrap gap-2 flex-1">
          {CRITERIA_OPTIONS.map((c) => {
            const config = CRITERIA_CONFIG[c];
            const Icon = config.icon;
            const isActive = criteria === c;

            return (
              <button
                key={c}
                onClick={() => onCriteriaChange(c)}
                onMouseEnter={() => setHoveredCriteria(c)}
                onMouseLeave={() => setHoveredCriteria(null)}
                className={`h-10 inline-flex items-center gap-2 rounded-2xl backdrop-blur-xl px-4 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
                  isActive
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'bg-black/30 text-gray-100 border border-white/10 hover:bg-black/50 hover:border-white/30'
                }`}
                aria-label={`${config.label}: ${config.description}`}
              >
                <Icon className="h-4 w-4" />
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Period Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <button
            onClick={() => onPeriodChange('this_month')}
            className={`h-10 inline-flex items-center gap-2 rounded-2xl backdrop-blur-xl px-4 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
              period === 'this_month'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-black/30 text-gray-100 border border-white/10 hover:bg-black/50 hover:border-white/30'
            }`}
          >
            Este Mes
          </button>
          <button
            onClick={() => onPeriodChange('all_time')}
            className={`h-10 inline-flex items-center gap-2 rounded-2xl backdrop-blur-xl px-4 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
              period === 'all_time'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-black/30 text-gray-100 border border-white/10 hover:bg-black/50 hover:border-white/30'
            }`}
          >
            Todo Periodo
          </button>
        </div>
      </div>

      {/* Tooltip - description of hovered or active criteria */}
      <CriteriaTooltip criteria={hoveredCriteria ?? criteria} />
    </div>
  );
}

function CriteriaTooltip({ criteria }: { criteria: RankingCriteria }) {
  const config = CRITERIA_CONFIG[criteria];

  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5">
      <Info className="h-3.5 w-3.5 text-violet-400 mt-0.5 shrink-0" />
      <p className="text-xs text-gray-400 leading-relaxed">
        <span className="text-violet-300 font-medium">{config.label}:</span>{' '}
        {config.description}
      </p>
    </div>
  );
}
