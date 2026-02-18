import { useMemo, useState, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown, Calendar, CalendarDays, CalendarRange, CalendarClock } from 'lucide-react';
import { ChartSkeleton } from '@/components/ui';
import { formatCurrency } from '@/lib/formatters';
import type { MonthlyFinancial, WeeklyFinancial } from '../types';

type ViewMode = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

interface ChartDataPoint {
  label: string;
  income: number;
  payouts: number;
  key: string;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  income: number;
  payouts: number;
  label: string;
}

interface FinancialChartProps {
  monthlyData?: MonthlyFinancial[];
  weeklyData?: WeeklyFinancial[];
  quarterlyData?: MonthlyFinancial[];
  yearlyData?: MonthlyFinancial[];
  isLoadingMonthly: boolean;
  isLoadingWeekly: boolean;
  isLoadingQuarterly?: boolean;
  isLoadingYearly?: boolean;
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const VIEW_MODES: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
  { mode: 'weekly', label: 'Semanal', icon: <CalendarDays className="h-4 w-4" /> },
  { mode: 'monthly', label: 'Mensal', icon: <Calendar className="h-4 w-4" /> },
  { mode: 'quarterly', label: 'Trimestral', icon: <CalendarRange className="h-4 w-4" /> },
  { mode: 'yearly', label: 'Anual', icon: <CalendarClock className="h-4 w-4" /> },
];

/** Formata mes YYYY-MM para Mmm/AA */
const formatMonth = (month: string): string => {
  const [year, monthNum] = month.split('-');
  return `${MONTH_NAMES[Number.parseInt(monthNum, 10) - 1]}/${year.slice(2)}`;
};

/** Formata semana YYYY-Wnn para Sem nn */
const formatWeek = (week: string): string => {
  const weekNum = week.split('-W')[1];
  return `Sem ${weekNum}`;
};

/** Agrega dados mensais em trimestres */
const aggregateToQuarterly = (data: MonthlyFinancial[]): ChartDataPoint[] => {
  const quarterMap = new Map<string, { income: number; payouts: number }>();

  for (const item of data) {
    const [year, monthStr] = item.month.split('-');
    const month = Number.parseInt(monthStr, 10);
    const quarter = Math.ceil(month / 3);
    const key = `Q${quarter}/${year.slice(2)}`;

    const existing = quarterMap.get(key) || { income: 0, payouts: 0 };
    quarterMap.set(key, {
      income: existing.income + item.income,
      payouts: existing.payouts + item.payouts,
    });
  }

  return Array.from(quarterMap.entries()).map(([key, values]) => ({
    label: key,
    income: values.income,
    payouts: values.payouts,
    key,
  }));
};

/** Agrega dados mensais em anos */
const aggregateToYearly = (data: MonthlyFinancial[]): ChartDataPoint[] => {
  const yearMap = new Map<string, { income: number; payouts: number }>();

  for (const item of data) {
    const year = item.month.split('-')[0];
    const existing = yearMap.get(year) || { income: 0, payouts: 0 };
    yearMap.set(year, {
      income: existing.income + item.income,
      payouts: existing.payouts + item.payouts,
    });
  }

  return Array.from(yearMap.entries()).map(([year, values]) => ({
    label: year,
    income: values.income,
    payouts: values.payouts,
    key: year,
  }));
};

/** Tooltip do grafico */
const ChartTooltip = ({ tooltip }: { tooltip: TooltipState }) => (
  <div
    className="absolute z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full"
    style={{ left: tooltip.x, top: tooltip.y }}
  >
    <div className="bg-gray-900/95 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-gray-400 font-medium mb-1">{tooltip.label}</p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded bg-emerald-500" />
          <span className="text-sm text-emerald-300 font-medium">
            {formatCurrency(tooltip.income, true)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded bg-violet-500" />
          <span className="text-sm text-violet-300 font-medium">
            {formatCurrency(tooltip.payouts, true)}
          </span>
        </div>
      </div>
    </div>
    <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-gray-900/95 border-r border-b border-white/20 rotate-45" />
  </div>
);

export const FinancialChart = ({
  monthlyData,
  weeklyData,
  quarterlyData,
  yearlyData,
  isLoadingMonthly,
  isLoadingWeekly,
  isLoadingQuarterly = false,
  isLoadingYearly = false,
}: FinancialChartProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo((): ChartDataPoint[] => {
    if (viewMode === 'weekly' && weeklyData) {
      return weeklyData.map((item) => ({
        label: formatWeek(item.week),
        income: item.income,
        payouts: item.payouts,
        key: item.week,
      }));
    }
    if (viewMode === 'monthly' && monthlyData) {
      return monthlyData.map((item) => ({
        label: formatMonth(item.month),
        income: item.income,
        payouts: item.payouts,
        key: item.month,
      }));
    }
    if (viewMode === 'quarterly' && (quarterlyData || monthlyData)) {
      return aggregateToQuarterly(quarterlyData || monthlyData || []);
    }
    if (viewMode === 'yearly' && (yearlyData || monthlyData)) {
      return aggregateToYearly(yearlyData || monthlyData || []);
    }
    return [];
  }, [viewMode, weeklyData, monthlyData, quarterlyData, yearlyData]);

  const isLoading = useMemo(() => {
    switch (viewMode) {
      case 'weekly':
        return isLoadingWeekly;
      case 'monthly':
        return isLoadingMonthly;
      case 'quarterly':
        return isLoadingQuarterly || isLoadingMonthly;
      case 'yearly':
        return isLoadingYearly || isLoadingMonthly;
      default:
        return false;
    }
  }, [viewMode, isLoadingWeekly, isLoadingMonthly, isLoadingQuarterly, isLoadingYearly]);

  const handleBarMouseEnter = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, item: ChartDataPoint) => {
      if (!chartRef.current) return;

      const chartRect = chartRef.current.getBoundingClientRect();
      const barRect = event.currentTarget.getBoundingClientRect();

      setTooltip({
        visible: true,
        x: barRect.left - chartRect.left + barRect.width / 2,
        y: barRect.top - chartRect.top - 10,
        income: item.income,
        payouts: item.payouts,
        label: item.label,
      });
    },
    []
  );

  const handleBarMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const { maxValue, totals } = useMemo(() => {
    if (chartData.length === 0) {
      return { maxValue: 1, totals: { income: 0, payouts: 0 } };
    }
    const max = Math.max(...chartData.flatMap((d) => [d.income, d.payouts]));
    const totalValues = chartData.reduce(
      (acc, d) => ({
        income: acc.income + d.income,
        payouts: acc.payouts + d.payouts,
      }),
      { income: 0, payouts: 0 }
    );
    return { maxValue: max || 1, totals: totalValues };
  }, [chartData]);

  if (isLoading) {
    return <ChartSkeleton />;
  }

  const margin = totals.income - totals.payouts;
  const marginPercentage = totals.income > 0 ? ((margin / totals.income) * 100).toFixed(1) : '0';

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Receita vs Repasses</h3>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Tabs de visualizacao */}
          <div className="flex items-center p-1 bg-white/5 border border-white/10 rounded-xl">
            {VIEW_MODES.map(({ mode, label, icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 ${
                  viewMode === mode
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
          {/* Legenda */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-sm text-gray-400">Receita</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-violet-500" />
              <span className="text-sm text-gray-400">Repasses</span>
            </div>
          </div>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          Nenhum dado disponivel
        </div>
      ) : (
        <>
          {/* Grafico de barras */}
          <div
            ref={chartRef}
            className="relative flex items-end justify-between h-64 gap-2 mb-4 border-b border-white/10 pb-2"
          >
            {tooltip?.visible && <ChartTooltip tooltip={tooltip} />}
            {chartData.map((item) => {
              const incomeHeight = (item.income / maxValue) * 100;
              const payoutsHeight = (item.payouts / maxValue) * 100;

              return (
                <div key={item.key} className="flex-1 flex flex-col items-center">
                  <div
                    className="flex gap-1 items-end h-56 w-full justify-center cursor-pointer"
                    onMouseEnter={(e) => handleBarMouseEnter(e, item)}
                    onMouseLeave={handleBarMouseLeave}
                  >
                    <div
                      className="w-6 bg-emerald-500 rounded-t transition-all duration-300 hover:bg-emerald-400"
                      style={{ height: `${Math.max(incomeHeight, 2)}%` }}
                    />
                    <div
                      className="w-6 bg-violet-500 rounded-t transition-all duration-300 hover:bg-violet-400"
                      style={{ height: `${Math.max(payoutsHeight, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 mt-2">{item.label}</span>
                </div>
              );
            })}
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Receita</p>
              <p className="text-lg font-bold text-emerald-300">{formatCurrency(totals.income, true)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Repasses</p>
              <p className="text-lg font-bold text-violet-300">{formatCurrency(totals.payouts, true)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Margem</p>
              <div className="flex items-center justify-center gap-1">
                {margin >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
                <p className={`text-lg font-bold ${margin >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {marginPercentage}%
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
