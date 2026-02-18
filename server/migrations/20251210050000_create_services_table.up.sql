DO $$ BEGIN
    CREATE TYPE service_area AS ENUM ('DIREITO', 'PEDAGOGIA', 'CONTABILIDADE', 'OUTROS');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    area service_area NOT NULL,
    work_type VARCHAR(255),
    total_value NUMERIC(10, 2) NOT NULL CHECK (total_value >= 0),
    company_percent INTEGER NOT NULL CHECK (company_percent >= 0 AND company_percent <= 100),
    collaborator_percent INTEGER NOT NULL CHECK (collaborator_percent >= 0 AND collaborator_percent <= 100),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_split_sum CHECK (company_percent + collaborator_percent = 100)
);

CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_services_area ON services(area);
