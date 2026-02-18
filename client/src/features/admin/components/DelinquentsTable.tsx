import { useState, useCallback, useMemo } from 'react';
import {
  Download,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
} from 'lucide-react';
import { TableSkeleton } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { DelinquentUser } from '../types';
import { exportDelinquentsCSV } from '../api';

interface DelinquentsTableProps {
  data?: DelinquentUser[];
  isLoading: boolean;
}

type SortField = 'name' | 'email' | 'total_owed' | 'days_overdue' | 'overdue_orders' | 'delinquent_since';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 10;

const COLUMNS: { field: SortField; label: string }[] = [
  { field: 'name', label: 'Nome' },
  { field: 'email', label: 'Email' },
  { field: 'total_owed', label: 'Valor Devido' },
  { field: 'days_overdue', label: 'Dias Atraso' },
  { field: 'overdue_orders', label: 'Pedidos' },
  { field: 'delinquent_since', label: 'Desde' },
];

const getDaysOverdueStyle = (days: number): string => {
  if (days > 30) return 'bg-red-500/20 text-red-300 border-red-500/30';
  if (days > 14) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
};

const SortIcon = ({ field, sortField, sortDirection }: { field: SortField; sortField: SortField | null; sortDirection: SortDirection }) => {
  if (sortField !== field) {
    return <ChevronsUpDown className="h-4 w-4 opacity-50" />;
  }
  return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
};

export const DelinquentsTable = ({ data, isLoading }: DelinquentsTableProps) => {
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
      setPage(1);
    },
    [sortField]
  );

  const sortedData = useMemo(() => {
    if (!data) return [];
    if (!sortField) return data;

    return [...data].sort((a, b) => {
      let aVal: string | number = a[sortField];
      let bVal: string | number = b[sortField];

      if (sortField === 'delinquent_since') {
        aVal = new Date(a.delinquent_since).getTime();
        bVal = new Date(b.delinquent_since).getTime();
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [data, sortField, sortDirection]);

  const total = sortedData.length;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const paginatedData = sortedData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) {
    return <TableSkeleton rows={5} />;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <h3 className="text-lg font-semibold text-white">Usuarios Inadimplentes</h3>
          <span className="bg-red-500/20 text-red-300 text-xs font-bold px-2 py-0.5 rounded-full border border-red-500/30">
            {total}
          </span>
        </div>
        <button
          type="button"
          onClick={exportDelinquentsCSV}
          disabled={total === 0}
          className="h-10 inline-flex items-center gap-2 rounded-2xl bg-red-500/20 border border-red-500/30 px-4 text-sm font-medium text-red-300 cursor-pointer transition-all duration-200 hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto custom-scrollbar-dark">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              {COLUMNS.map(({ field, label }) => (
                <th
                  key={field}
                  onClick={() => handleSort(field)}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    {label}
                    <SortIcon field={field} sortField={sortField} sortDirection={sortDirection} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  Nenhum usuario inadimplente encontrado
                </td>
              </tr>
            ) : (
              paginatedData.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-white">{user.name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-semibold text-red-300">{formatCurrency(user.total_owed)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getDaysOverdueStyle(user.days_overdue)}`}
                    >
                      {user.days_overdue} dias
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">{user.overdue_orders}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                    {user.delinquent_since ? formatDate(user.delinquent_since) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginacao */}
      <div className="px-4 sm:px-6 py-4 border-t border-white/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          Pagina {page} de {totalPages} ({total} usuarios)
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="p-2 rounded-xl border border-white/10 text-gray-400 cursor-pointer hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Primeira pagina"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 rounded-xl border border-white/10 text-gray-400 cursor-pointer hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Pagina anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || total === 0}
            className="p-2 rounded-xl border border-white/10 text-gray-400 cursor-pointer hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Proxima pagina"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages || total === 0}
            className="p-2 rounded-xl border border-white/10 text-gray-400 cursor-pointer hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Ultima pagina"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
