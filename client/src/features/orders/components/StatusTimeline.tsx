import { Timeline } from '@/components/ui/Timeline';
import type { TimelineItem } from '@/components/ui/Timeline';
import { ORDER_STATUS_LABELS } from '@/lib/constants';
import type { OrderStatusHistory } from '../types';

interface StatusTimelineProps {
  history: OrderStatusHistory[];
}

export function StatusTimeline({ history }: StatusTimelineProps) {
  const items: TimelineItem[] = history.map((h) => ({
    id: h.id,
    title: ORDER_STATUS_LABELS[h.new_status] || h.new_status,
    subtitle: h.previous_status ? `De: ${ORDER_STATUS_LABELS[h.previous_status]}` : undefined,
    description: h.comments || undefined,
    timestamp: h.created_at,
    user_role: h.changed_by_role,
    variant: 'success',
    icon: 'check',
  }));

  return <Timeline items={items} emptyMessage="Nenhuma mudança de status" />;
}
