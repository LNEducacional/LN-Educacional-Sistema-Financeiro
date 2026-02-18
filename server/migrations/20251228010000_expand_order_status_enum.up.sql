-- Adicionar novos estados ao enum order_status
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'AGUARDANDO_REVISAO';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'ENVIADO_VISUALIZACAO';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'AGUARDANDO_APROVACAO';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'APROVADO';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'REVISAO_SOLICITADA';

-- Criar tabela de histórico de mudanças de status (auditoria)
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    previous_status order_status,
    new_status order_status NOT NULL,
    changed_by_user_id UUID NOT NULL REFERENCES users(id),
    changed_by_role user_role NOT NULL,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX idx_order_status_history_created_at ON order_status_history(created_at DESC);

-- Adicionar campo para rastrear revisões internas (diferentes de revisões do cliente)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_review_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_review_notes TEXT;

-- Comentários
COMMENT ON TABLE order_status_history IS 'Histórico completo de mudanças de status de pedidos (auditoria)';
COMMENT ON COLUMN order_status_history.changed_by_role IS 'Role do usuário que fez a mudança (ADMIN/COLLABORATOR/STUDENT)';
COMMENT ON COLUMN orders.internal_review_requested IS 'Flag para indicar se colaborador solicitou revisão interna antes de enviar ao cliente';
