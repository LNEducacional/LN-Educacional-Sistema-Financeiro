-- Rollback: Remove Serasa fields from users table

DROP INDEX IF EXISTS idx_users_phone;
DROP INDEX IF EXISTS idx_users_cpf;

ALTER TABLE users DROP COLUMN IF EXISTS address_state;
ALTER TABLE users DROP COLUMN IF EXISTS address_city;
ALTER TABLE users DROP COLUMN IF EXISTS address_neighborhood;
ALTER TABLE users DROP COLUMN IF EXISTS address_complement;
ALTER TABLE users DROP COLUMN IF EXISTS address_number;
ALTER TABLE users DROP COLUMN IF EXISTS address_street;
ALTER TABLE users DROP COLUMN IF EXISTS address_zipcode;
ALTER TABLE users DROP COLUMN IF EXISTS birth_date;
ALTER TABLE users DROP COLUMN IF EXISTS phone;
ALTER TABLE users DROP COLUMN IF EXISTS cpf;
