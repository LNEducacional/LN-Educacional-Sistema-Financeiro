/**
 * DisputeTimeline - Timeline de comentários e eventos de uma disputa
 * Reutiliza o componente genérico Timeline
 */

import { Timeline, type TimelineItem } from '@/components/ui/Timeline';
import { ROLE_LABELS } from '@/lib/constants';
import type { DisputeComment } from '../types';

interface DisputeTimelineProps {
  comments: DisputeComment[];
  showInternalComments?: boolean; // Admin pode ver comentários internos
}

export function DisputeTimeline({
  comments,
  showInternalComments = false
}: DisputeTimelineProps) {
  // Filtrar comentários internos se não for admin
  const visibleComments = showInternalComments
    ? comments
    : comments.filter(c => !c.is_internal);

  const items: TimelineItem[] = visibleComments.map((comment) => ({
    id: comment.id,
    title: comment.is_internal
      ? 'Comentário Interno (Admin)'
      : comment.user_role === 'ADMIN'
        ? 'Resposta da Administração'
        : 'Comentário',
    description: comment.content,
    timestamp: comment.created_at,
    user_role: comment.user_role,
    variant: comment.is_internal ? 'warning' : 'default',
    icon: 'message',
  }));

  return (
    <Timeline
      items={items}
      emptyMessage="Nenhum comentário registrado ainda"
    />
  );
}
