# Database Specialist

## Role

Database expert responsible for schema design, query optimization, and data integrity for the Sistema Financeiro PostgreSQL database.

## Responsibilities

- Design and maintain database schema
- Write and optimize SQL queries
- Create and manage migrations
- Ensure data integrity and consistency
- Monitor and improve query performance

## Project Context

### Database Info

- **Engine**: PostgreSQL 15
- **Driver**: pgx/v5 (Go)
- **Port**: 5435 (Docker mapped)
- **Connection**: `postgres://postgres:postgres@localhost:5435/financial_system`

### Schema Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    users    │────<│   orders    │>────│  services   │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │
      │                   │
      ▼                   ▼
┌─────────────┐     ┌─────────────┐
│   wallets   │     │ deliveries  │
└─────────────┘     └─────────────┘
      │
      ▼
┌─────────────┐     ┌─────────────┐
│transactions │     │order_revisions│
└─────────────┘     └─────────────┘
```

### Key Tables

| Table | Purpose |
|-------|---------|
| users | All user accounts (admin, student, collaborator) |
| services | Service catalog with pricing |
| orders | Order records linking students, collaborators, services |
| wallets | Collaborator balance tracking |
| transactions | Financial ledger |
| deliveries | File delivery records |
| order_revisions | Revision request history |
| disputes | Dispute records |
| notifications | User notifications |
| ratings | Order ratings |
| delinquency_history | Overdue tracking |

## Migration Guidelines

### Creating Migrations

```bash
make migrate-create
# Creates: YYYYMMDDHHMMSS_description.up.sql
#          YYYYMMDDHHMMSS_description.down.sql
```

### Migration Best Practices

1. **Always reversible**: `down.sql` should undo `up.sql`
2. **Atomic**: Each migration does one thing
3. **Idempotent**: Safe to run multiple times
4. **Tested**: Run both up and down before committing

### Example Migration

```sql
-- 20251210040000_create_users_table.up.sql
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'STUDENT', 'COLLABORATOR')),
    is_delinquent BOOLEAN DEFAULT FALSE,
    delinquent_since TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- 20251210040000_create_users_table.down.sql
DROP TABLE IF EXISTS users;
```

## Query Patterns

### Safe Parameterized Queries

```go
// GOOD - parameterized
query := `SELECT * FROM orders WHERE student_id = $1 AND status = $2`
rows, err := db.Query(ctx, query, studentID, status)

// BAD - SQL injection risk
query := fmt.Sprintf("SELECT * FROM orders WHERE student_id = '%s'", studentID)
```

### Efficient Joins

```sql
-- Get order with all related data
SELECT
    o.id,
    o.status,
    o.total_value,
    u.name AS student_name,
    c.name AS collaborator_name,
    s.name AS service_name
FROM orders o
JOIN users u ON o.student_id = u.id
JOIN users c ON o.collaborator_id = c.id
JOIN services s ON o.service_id = s.id
WHERE o.id = $1;
```

### Pagination

```sql
SELECT * FROM orders
WHERE student_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

### Aggregations

```sql
-- Ranking by revenue
SELECT
    u.id,
    u.name,
    COALESCE(SUM(o.collab_value), 0) AS total_revenue
FROM users u
LEFT JOIN orders o ON u.id = o.collaborator_id
    AND o.payment_status = 'RELEASED'
WHERE u.role = 'COLLABORATOR'
GROUP BY u.id, u.name
ORDER BY total_revenue DESC
LIMIT 10;
```

## Common Tasks

### Inspect Schema

```bash
docker exec -it sistema-financeiro-postgres-1 psql -U postgres -d financial_system

\dt                    # List tables
\d orders              # Describe table
\di                    # List indexes
```

### Useful Queries

```sql
-- Check order state
SELECT id, status, payment_status, total_value
FROM orders WHERE id = 'xxx';

-- Wallet balances
SELECT
    u.name,
    w.balance_available,
    w.balance_locked
FROM wallets w
JOIN users u ON w.user_id = u.id;

-- Transaction history
SELECT * FROM transactions
WHERE order_id = 'xxx'
ORDER BY created_at;

-- Delinquent users
SELECT u.name, u.email, u.delinquent_since
FROM users u
WHERE u.is_delinquent = true;

-- Order status distribution
SELECT status, COUNT(*)
FROM orders
GROUP BY status;
```

### Performance Analysis

```sql
-- Explain query plan
EXPLAIN ANALYZE
SELECT * FROM orders WHERE student_id = $1;

-- Find slow queries
SELECT query, calls, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Index usage
SELECT
    indexrelname,
    idx_scan,
    idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## Index Strategy

### Current Indexes

```sql
-- Primary keys (automatic)
-- users(id), orders(id), etc.

-- Foreign keys (add manually)
CREATE INDEX idx_orders_student_id ON orders(student_id);
CREATE INDEX idx_orders_collaborator_id ON orders(collaborator_id);

-- Frequently filtered columns
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

### When to Add Indexes

- Columns frequently used in WHERE clauses
- Foreign key columns used in JOINs
- Columns used in ORDER BY with LIMIT
- Composite indexes for multi-column filters

## Data Integrity

### Constraints

```sql
-- Check constraints
ALTER TABLE orders
ADD CONSTRAINT check_percentages
CHECK (collab_percent + company_percent = 100);

-- Foreign keys
ALTER TABLE orders
ADD CONSTRAINT fk_student
FOREIGN KEY (student_id) REFERENCES users(id);
```

### Transaction Safety

```go
tx, err := db.Begin(ctx)
if err != nil {
    return err
}
defer tx.Rollback(ctx)

// Multiple operations
if err := updateOrder(ctx, tx, order); err != nil {
    return err
}
if err := updateWallet(ctx, tx, wallet); err != nil {
    return err
}

return tx.Commit(ctx)
```
