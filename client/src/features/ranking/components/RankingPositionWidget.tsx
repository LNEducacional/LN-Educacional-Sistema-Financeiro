import { Link } from 'react-router-dom';
import { Trophy, TrendingUp, DollarSign, Clock, Star, Award, ArrowRight, Loader2 } from 'lucide-react';
import { useRankingSummary } from '../api';
import type { RankingCriteria, RankingSummaryEntry } from '../types';

const CRITERIA_CONFIG: Record<
  RankingCriteria,
  {
    label: string;
    icon: typeof TrendingUp;
    color: string;
    bgColor: string;
    borderColor: string;
    tip: string;
  }
> = {
  productivity: {
    label: 'Produtividade',
    icon: TrendingUp,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    tip: 'Complete mais pedidos para subir',
  },
  revenue: {
    label: 'Faturamento',
    icon: DollarSign,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    tip: 'Aceite pedidos de maior valor',
  },
  punctuality: {
    label: 'Pontualidade',
    icon: Clock,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    tip: 'Entregue antes do prazo',
  },
  satisfaction: {
    label: 'Satisfacao',
    icon: Star,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
    tip: 'Mantenha alta qualidade nas entregas',
  },
  quality: {
    label: 'Qualidade',
    icon: Award,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20',
    tip: 'Reduza revisoes e reembolsos',
  },
};

const CRITERIA_ORDER: RankingCriteria[] = [
  'productivity',
  'revenue',
  'punctuality',
  'satisfaction',
  'quality',
];

function PositionCard({ entry }: { entry: RankingSummaryEntry }) {
  const config = CRITERIA_CONFIG[entry.criteria];
  const Icon = config.icon;
  const hasPosition = entry.position > 0;

  return (
    <div
      className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-3 flex items-center gap-3 transition-colors hover:bg-white/5`}
    >
      <div className={`flex items-center justify-center w-9 h-9 rounded-lg bg-black/30 ${config.color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 truncate">{config.label}</p>
        {hasPosition ? (
          <p className="text-sm font-semibold text-white">
            #{entry.position}
            <span className="text-xs text-gray-500 font-normal ml-1">/ {entry.total_users}</span>
          </p>
        ) : (
          <p className="text-xs text-gray-500">Sem posicao</p>
        )}
      </div>
    </div>
  );
}

/** Widget resumido de ranking para o dashboard do colaborador */
export function RankingPositionWidget() {
  const { data, isLoading, isError } = useRankingSummary();

  if (isError) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Meu Ranking</h2>
        </div>
        <Link
          to="/ranking"
          className="inline-flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors"
        >
          Ver completo
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {CRITERIA_ORDER.map((criteria) => {
              const entry = data?.entries.find((e) => e.criteria === criteria);
              if (!entry) {
                return (
                  <PositionCard
                    key={criteria}
                    entry={{ criteria, position: 0, value: 0, total_users: 0, orders_count: 0 }}
                  />
                );
              }
              return <PositionCard key={criteria} entry={entry} />;
            })}
          </div>

          {/* Dica de melhoria */}
          {data?.entries && data.entries.length > 0 && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-violet-500/5 border border-violet-500/10">
              <p className="text-xs text-gray-400">
                <span className="text-violet-400 font-medium">Dica: </span>
                {getBestTip(data.entries)}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Seleciona a dica mais relevante baseado na pior posicao do usuario */
function getBestTip(entries: RankingSummaryEntry[]): string {
  const ranked = entries.filter((e) => e.position > 0);
  if (ranked.length === 0) {
    return 'Complete pedidos para aparecer no ranking e desbloquear recompensas!';
  }

  // Find worst position (highest number)
  const worst = ranked.reduce((prev, curr) =>
    curr.position > prev.position ? curr : prev,
  );

  return CRITERIA_CONFIG[worst.criteria].tip;
}
