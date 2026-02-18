import { useState } from 'react';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  DollarSign,
  Clock,
  Star,
  Award,
} from 'lucide-react';
import { useFullRankings } from '../api';
import type { RankingType, RankingResponse, RankingEntry } from '../types';

const Skeleton = () => (
  <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
    <div className="animate-pulse">
      <div className="h-6 bg-white/10 rounded w-48 mb-4" />
      <div className="flex gap-2 mb-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 bg-white/5 rounded-xl w-24" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-white/5 rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

const tabConfig: { type: RankingType; label: string; icon: typeof Trophy }[] = [
  { type: 'production', label: 'Producao', icon: Activity },
  { type: 'revenue', label: 'Faturamento', icon: DollarSign },
  { type: 'punctuality', label: 'Pontualidade', icon: Clock },
  { type: 'satisfaction', label: 'Satisfacao', icon: Star },
  { type: 'quality', label: 'Qualidade', icon: Award },
];

const getPositionBadge = (position: number) => {
  switch (position) {
    case 1:
      return (
        <div className="flex items-center justify-center w-8 h-8 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
          <Trophy className="h-4 w-4 text-yellow-400" />
        </div>
      );
    case 2:
      return (
        <div className="flex items-center justify-center w-8 h-8 bg-gray-500/20 border border-gray-500/30 rounded-full">
          <span className="text-sm font-bold text-gray-300">2</span>
        </div>
      );
    case 3:
      return (
        <div className="flex items-center justify-center w-8 h-8 bg-amber-500/20 border border-amber-500/30 rounded-full">
          <span className="text-sm font-bold text-amber-400">3</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center justify-center w-8 h-8 bg-white/5 border border-white/10 rounded-full">
          <span className="text-sm font-medium text-gray-500">{position}</span>
        </div>
      );
  }
};

const getTrendIcon = (trend: RankingEntry['trend']) => {
  switch (trend) {
    case 'UP':
      return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    case 'DOWN':
      return <TrendingDown className="h-4 w-4 text-red-400" />;
    default:
      return <Minus className="h-4 w-4 text-gray-500" />;
  }
};

const formatValue = (value: number, unit: string): string => {
  if (unit === 'R$') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }
  if (unit === '%') {
    return `${value.toFixed(1)}%`;
  }
  if (unit === 'estrelas') {
    return value.toFixed(1);
  }
  if (unit === 'nota') {
    return value.toFixed(2);
  }
  return value.toString();
};

interface RankingListProps {
  ranking: RankingResponse;
}

const RankingList = ({ ranking }: RankingListProps) => {
  if (!ranking.entries || ranking.entries.length === 0) {
    return (
      <div className="text-center py-8">
        <Trophy className="h-10 w-10 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-500">Nenhum colaborador no ranking</p>
        <p className="text-xs text-gray-600 mt-1">
          Minimo de 3 trabalhos concluidos necessario
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {ranking.entries.map((entry) => (
        <div
          key={entry.collaborator_id}
          className={`flex items-center gap-3 p-3 rounded-xl ${
            entry.position <= 3 ? 'bg-white/5' : 'bg-white/[0.02]'
          } border border-white/10`}
        >
          {getPositionBadge(entry.position)}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {entry.name}
            </p>
            {entry.specialty && (
              <p className="text-xs text-gray-500 truncate">{entry.specialty}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-bold text-white">
                {formatValue(entry.value, ranking.unit)}
              </p>
              {entry.secondary_value !== null && entry.secondary_value > 0 && (
                <p className="text-xs text-gray-500">
                  {ranking.type === 'punctuality' || ranking.type === 'satisfaction'
                    ? `${entry.secondary_value} ${ranking.type === 'satisfaction' ? 'avaliacoes' : 'trabalhos'}`
                    : `Este mes: ${formatValue(entry.secondary_value, ranking.unit)}`}
                </p>
              )}
            </div>
            {getTrendIcon(entry.trend)}
          </div>
        </div>
      ))}
    </div>
  );
};

export const FullRankingWidget = () => {
  const [activeTab, setActiveTab] = useState<RankingType>('production');
  const { data, isLoading } = useFullRankings(10);

  if (isLoading) {
    return <Skeleton />;
  }

  const rankings: Record<RankingType, RankingResponse | undefined> = {
    production: data?.production,
    revenue: data?.revenue,
    punctuality: data?.punctuality,
    satisfaction: data?.satisfaction,
    quality: data?.quality,
  };

  const activeRanking = rankings[activeTab];

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-amber-400" />
        <h3 className="text-lg font-semibold text-white">
          Rankings de Colaboradores
        </h3>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-5 gap-1 mb-4 p-1 bg-white/5 border border-white/10 rounded-xl">
        {tabConfig.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              activeTab === type
                ? 'bg-white/10 text-white border border-white/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Description */}
      {activeRanking && (
        <p className="text-xs text-gray-500 mb-4">{activeRanking.description}</p>
      )}

      {/* Ranking List */}
      {activeRanking ? (
        <RankingList ranking={activeRanking} />
      ) : (
        <div className="text-center py-8 text-gray-500">
          Nenhum dado disponivel
        </div>
      )}
    </div>
  );
};
