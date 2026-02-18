DO $$ BEGIN
    CREATE TYPE production_job_status AS ENUM (
        'NOVO',
        'EM_ANDAMENTO',
        'AGUARDANDO_REVISAO',
        'ENVIADO_VISUALIZACAO',
        'AGUARDANDO_APROVACAO',
        'APROVADO',
        'NAO_APROVADO',
        'CONCLUIDO'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS production_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    status production_job_status NOT NULL DEFAULT 'NOVO',
    student_id UUID NOT NULL REFERENCES users(id),
    collaborator_id UUID REFERENCES users(id),
    financial_transaction_id UUID REFERENCES transactions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_production_jobs_student_id ON production_jobs(student_id);
CREATE INDEX IF NOT EXISTS idx_production_jobs_collaborator_id ON production_jobs(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_production_jobs_status ON production_jobs(status);
CREATE INDEX IF NOT EXISTS idx_production_jobs_deadline ON production_jobs(deadline);
CREATE INDEX IF NOT EXISTS idx_production_jobs_financial_tx ON production_jobs(financial_transaction_id);

DO $$ BEGIN
    ALTER TABLE production_jobs
        ADD CONSTRAINT chk_price_positive CHECK (price > 0);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
