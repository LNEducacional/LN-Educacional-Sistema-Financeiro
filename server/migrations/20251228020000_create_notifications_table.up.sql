-- Gap 2: Sistema de Notificações em Tempo Real
-- Tabela de notificações para usuários

CREATE TYPE notification_type AS ENUM (
    'ORDER_CREATED',
    'ORDER_STATUS_CHANGED',
    'DELIVERY_UPLOADED',
    'PAYMENT_RELEASED',
    'DISPUTE_OPENED',
    'DISPUTE_MESSAGE',
    'DISPUTE_RESOLVED',
    'REVISION_REQUESTED',
    'APPROVAL_RECEIVED',
    'DEADLINE_APPROACHING',
    'PAYMENT_PENDING'
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50), -- 'order', 'dispute', 'payment', etc.
    related_entity_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_related_entity ON notifications(related_entity_type, related_entity_id);
