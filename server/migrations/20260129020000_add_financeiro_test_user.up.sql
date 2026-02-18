-- Insert test user with FINANCEIRO role
-- Password: password123 (bcrypt hash)
INSERT INTO users (name, email, password_hash, role)
VALUES (
    'Financeiro Teste',
    'financeiro@test.com',
    '$2a$10$rpGW7BCshsOvDeZW/AgCOeBhrRyi0TTNdejonWNBAyEqcSvGepyf6',
    'FINANCEIRO'
)
ON CONFLICT (email) DO NOTHING;
