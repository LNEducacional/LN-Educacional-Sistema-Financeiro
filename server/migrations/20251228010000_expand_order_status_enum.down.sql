-- Reverter mudanças (cuidado: pode causar perda de dados se novos status já estiverem em uso)
DROP TABLE IF EXISTS order_status_history CASCADE;

ALTER TABLE orders DROP COLUMN IF EXISTS internal_review_requested;
ALTER TABLE orders DROP COLUMN IF EXISTS internal_review_notes;

-- Nota: Não é possível remover valores de ENUM em PostgreSQL sem recriar o tipo
-- Se precisar reverter, será necessário migração complexa com conversão de dados
