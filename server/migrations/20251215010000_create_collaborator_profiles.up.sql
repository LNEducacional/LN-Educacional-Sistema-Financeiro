CREATE TABLE IF NOT EXISTS collaborator_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    pix_key VARCHAR(255),
    specialty VARCHAR(255),
    internal_ranking NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_collaborator_profiles_user_id ON collaborator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborator_profiles_active ON collaborator_profiles(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_collaborator_profiles_specialty ON collaborator_profiles(specialty);

DO $$ BEGIN
    ALTER TABLE collaborator_profiles
        ADD CONSTRAINT chk_internal_ranking CHECK (internal_ranking >= 0 AND internal_ranking <= 5);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
