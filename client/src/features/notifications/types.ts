export type NotificationType =
  | 'ORDER_CREATED'
  | 'ORDER_STATUS_CHANGED'
  | 'DELIVERY_UPLOADED'
  | 'PAYMENT_RELEASED'
  | 'DISPUTE_OPENED'
  | 'DISPUTE_MESSAGE'
  | 'DISPUTE_RESOLVED'
  | 'REVISION_REQUESTED'
  | 'APPROVAL_RECEIVED'
  | 'DEADLINE_APPROACHING'
  | 'PAYMENT_PENDING';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_entity_type?: string;
  related_entity_id?: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

export interface NotificationStats {
  unread_count: number;
  total_count: number;
}
