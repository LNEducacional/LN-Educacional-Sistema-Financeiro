import type { RankingCriteria, RankingEntry } from '../types';

interface RankingTableProps {
  entries: RankingEntry[];
  criteria: RankingCriteria;
  currentUserId?: string;
}

function formatValue(value: number, criteria: RankingCriteria): string {
  switch (criteria) {
    case 'productivity':
      return `${value} pedidos`;
    case 'revenue':
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    case 'punctuality':
      return `${value.toFixed(1)}%`;
    case 'satisfaction':
      return `${value.toFixed(1)} estrelas`;
    case 'quality':
      return `${value.toFixed(2)} pts`;
    default:
      return String(value);
  }
}

export function RankingTable({ entries, criteria, currentUserId }: RankingTableProps) {
  if (!entries || entries.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-white/5 border-b border-white/10">
          <tr>
            <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
              #
            </th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Nome
            </th>
            <th className="px-5 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Valor
            </th>
            <th className="px-5 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Pedidos
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {entries.map((entry) => {
            const isCurrentUser = entry.collaborator_id === currentUserId;
            return (
              <tr
                key={entry.collaborator_id}
                className={`transition-colors ${isCurrentUser ? 'bg-violet-500/10' : 'hover:bg-white/5'}`}
              >
                <td className="px-5 py-4">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white/10 border border-white/10 text-sm font-medium text-gray-300">
                    {entry.position}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`font-medium ${isCurrentUser ? 'text-violet-300' : 'text-white'}`}>
                    {entry.name}
                    {isCurrentUser && <span className="ml-2 text-xs text-violet-400">(voce)</span>}
                  </span>
                </td>
                <td className="px-5 py-4 text-right text-sm text-gray-300">
                  {formatValue(entry.value, criteria)}
                </td>
                <td className="px-5 py-4 text-right text-sm text-gray-500">{entry.orders_count}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
