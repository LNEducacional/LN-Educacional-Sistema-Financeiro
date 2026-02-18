-- Gap 3: Sistema de Disputas Formais
-- Tabelas para workflow de disputa entre aluno e colaborador

-- Enum para status da disputa
CREATE TYPE dispute_status AS ENUM (
    'ABERTA',           -- Disputa criada
    'EM_ANALISE',       -- Admin está analisando
    'AGUARDANDO_RESPOSTA', -- Aguardando resposta de uma das partes
    'RESOLVIDA',        -- Disputa resolvida
    'CANCELADA'         -- Disputa cancelada
);

-- Enum para resultado da resolução
CREATE TYPE dispute_resolution AS ENUM (
    'FAVOR_ALUNO',      -- Decisão a favor do aluno
    'FAVOR_COLABORADOR', -- Decisão a favor do colaborador
    'ACORDO',           -- Acordo entre as partes
    'PARCIAL'           -- Resolução parcial
);

-- Tabela principal de disputas
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    opened_by_user_id UUID NOT NULL REFERENCES users(id),
    opened_by_role user_role NOT NULL,
    status dispute_status NOT NULL DEFAULT 'ABERTA',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    resolution dispute_resolution,
    resolution_notes TEXT,
    resolved_by_admin_id UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de comentários da disputa (thread)
CREATE TABLE dispute_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    user_role user_role NOT NULL,
    comment TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE, -- Comentário interno do admin
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de evidências (arquivos)
CREATE TABLE dispute_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    uploaded_by_user_id UUID NOT NULL REFERENCES users(id),
    uploaded_by_role user_role NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL, -- bytes
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_disputes_order_id ON disputes(order_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_opened_by ON disputes(opened_by_user_id);
CREATE INDEX idx_disputes_created_at ON disputes(created_at DESC);

CREATE INDEX idx_dispute_comments_dispute_id ON dispute_comments(dispute_id);
CREATE INDEX idx_dispute_comments_created_at ON dispute_comments(created_at);

CREATE INDEX idx_dispute_evidence_dispute_id ON dispute_evidence(dispute_id);

-- Comentários de documentação
COMMENT ON TABLE disputes IS 'Disputas formais entre aluno e colaborador sobre pedidos';
COMMENT ON COLUMN dispute_comments.is_internal IS 'Comentário visível apenas para admins';
COMMENT ON TABLE dispute_evidence IS 'Arquivos anexados como evidência na disputa';
