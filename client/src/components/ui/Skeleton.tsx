import { type ComponentProps, forwardRef } from 'react';

type SkeletonProps = ComponentProps<'div'> & {
  /** Variante do skeleton */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  /** Largura (aceita Tailwind ou valor CSS) */
  width?: string;
  /** Altura (aceita Tailwind ou valor CSS) */
  height?: string;
};

/**
 * Componente Skeleton reutilizavel para estados de loading
 * @example
 * <Skeleton variant="text" width="w-32" height="h-4" />
 * <Skeleton variant="rounded" width="w-full" height="h-16" />
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant = 'rectangular', width, height, className = '', ...props }, ref) => {
    const baseClasses = 'animate-pulse bg-white/10';

    const variantClasses = {
      text: 'rounded',
      circular: 'rounded-full',
      rectangular: '',
      rounded: 'rounded-xl',
    };

    const sizeClasses = `${width ?? ''} ${height ?? ''}`.trim();

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses} ${className}`.trim()}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

type CardSkeletonProps = {
  /** Numero de linhas de conteudo */
  lines?: number;
  /** Mostrar header com titulo */
  showHeader?: boolean;
  /** Altura customizada */
  className?: string;
};

/**
 * Skeleton para cards padrao do dashboard
 */
export const CardSkeleton = ({ lines = 3, showHeader = true, className = '' }: CardSkeletonProps) => (
  <div className={`rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5 ${className}`}>
    <div className="animate-pulse">
      {showHeader && <Skeleton variant="text" width="w-32" height="h-5" className="mb-4" />}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} variant="rounded" width="w-full" height="h-12" />
        ))}
      </div>
    </div>
  </div>
);

/**
 * Skeleton para tabelas
 */
export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm overflow-hidden">
    <div className="p-5 border-b border-white/10">
      <div className="animate-pulse flex items-center justify-between">
        <Skeleton variant="text" width="w-40" height="h-6" />
        <Skeleton variant="rounded" width="w-32" height="h-10" />
      </div>
    </div>
    <div className="divide-y divide-white/5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 animate-pulse">
          <div className="flex gap-4">
            <Skeleton variant="text" width="w-32" height="h-4" />
            <Skeleton variant="text" width="w-48" height="h-4" />
            <Skeleton variant="text" width="w-24" height="h-4" />
            <Skeleton variant="text" width="w-20" height="h-4" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Skeleton para graficos
 */
export const ChartSkeleton = () => (
  <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <Skeleton variant="text" width="w-48" height="h-6" />
        <div className="flex gap-2">
          <Skeleton variant="rounded" width="w-20" height="h-8" />
          <Skeleton variant="rounded" width="w-20" height="h-8" />
          <Skeleton variant="rounded" width="w-20" height="h-8" />
        </div>
      </div>
      <div className="flex items-end justify-between h-64 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col gap-2">
            <Skeleton
              variant="rectangular"
              width="w-full"
              className="rounded-t"
              style={{ height: `${40 + Math.random() * 40}%` }}
            />
            <Skeleton variant="text" width="w-12" height="h-4" className="mx-auto" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/**
 * Skeleton para KPI cards
 */
export const KPICardSkeleton = () => (
  <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
    <div className="animate-pulse">
      <Skeleton variant="text" width="w-24" height="h-4" className="mb-2" />
      <Skeleton variant="text" width="w-32" height="h-8" />
    </div>
  </div>
);

/**
 * Skeleton para widgets com estatisticas
 */
export const StatsWidgetSkeleton = ({ items = 4 }: { items?: number }) => (
  <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5">
    <div className="animate-pulse">
      <Skeleton variant="text" width="w-40" height="h-5" className="mb-4" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: items }).map((_, i) => (
          <Skeleton key={i} variant="rounded" width="w-full" height="h-16" />
        ))}
      </div>
    </div>
  </div>
);
