-- Fix password hash for financeiro test user
-- Password: password123
UPDATE users
SET password_hash = '$2a$10$rpGW7BCshsOvDeZW/AgCOeBhrRyi0TTNdejonWNBAyEqcSvGepyf6'
WHERE email = 'financeiro@test.com';
