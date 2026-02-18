CREATE TABLE IF NOT EXISTS job_histories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES production_jobs(id) ON DELETE CASCADE,
    previous_status production_job_status,
    new_status production_job_status NOT NULL,
    changed_by_user_id UUID NOT NULL REFERENCES users(id),
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_histories_job_id ON job_histories(job_id);
CREATE INDEX IF NOT EXISTS idx_job_histories_created_at ON job_histories(created_at);
CREATE INDEX IF NOT EXISTS idx_job_histories_changed_by ON job_histories(changed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_job_histories_job_timeline ON job_histories(job_id, created_at DESC);
