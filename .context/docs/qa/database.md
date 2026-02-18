---
slug: database
category: features
generatedAt: 2026-01-29T04:11:07.648Z
updatedAt: 2026-02-02
relevantFiles:
  - server/internal/platform/database.go
  - server/migrations/
  - docker-compose.yml
---

# How is data stored and accessed?

## Database

### Technology

- **PostgreSQL 15** (Alpine) running in Docker
- **pgx/v5** (v5.7.6) as the Go driver (connection pool)
- Port: 5435 (mapped from Docker's 5432)

### Connection

```go
// server/internal/platform/database.go
db := platform.NewDatabase(cfg.DBUrl)
// DB_URL format: postgres://user:password@localhost:5435/dbname?sslmode=disable
```

### Schema (17+ Tables)

| Table | Description | Key Fields |
|-------|-------------|------------|
| `users` | All user accounts | id, name, email, password_hash, role, is_delinquent |
| `services` | Service catalog | id, name, area, total_value, collab_percent, company_percent |
| `orders` | Order records | id, student_id, collaborator_id, service_id, status, payment_status, due_date |
| `order_revisions` | Revision history | id, order_id, reason, revision_number |
| `deliveries` | File uploads | id, order_id, file_path, original_filename |
| `wallets` | Collaborator finances | id, collaborator_id, balance_available, balance_locked |
| `transactions` | Financial ledger | id, wallet_id, order_id, type, amount, description |
| `charges` | ASAAS payments | id, order_id, external_id, status, amount |
| `withdrawal_requests` | Payout requests | id, collaborator_id, amount, status, pix_key |
| `disputes` | Dispute records | id, order_id, student_id, reason, status |
| `dispute_comments` | Dispute timeline | id, dispute_id, user_id, content |
| `dispute_evidence` | Dispute files | id, dispute_id, file_path |
| `notifications` | User notifications | id, user_id, type, title, message, read |
| `ratings` | Student ratings | id, order_id, collaborator_id, score |
| `delinquency_history` | Overdue tracking | id, user_id, started_at, cleared_at |
| `refresh_tokens` | Auth tokens | id, user_id, token, expires_at |
| `settings` | System config | key, value (encrypted for sensitive data) |

### Data Access Pattern

Each module follows the Repository pattern:

```go
// Repository: raw SQL queries via pgx
type Repository struct {
    db *pgx.Pool
}

func (r *Repository) GetByID(ctx context.Context, id string) (*Order, error) {
    row := r.db.QueryRow(ctx, "SELECT ... FROM orders WHERE id = $1", id)
    // ...
}
```

### Transactions

Multi-step operations use database transactions:

```go
tx, _ := db.Begin(ctx)
defer tx.Rollback(ctx)
// ... multiple operations ...
tx.Commit(ctx)
```

### Migration System

- 46 SQL migration files in `server/migrations/`
- Applied via `make migrate-up` (Docker exec)
- Naming: `YYYYMMDDHHMMSS_description.up.sql` / `.down.sql`
- No ORM; raw SQL with parameterized queries

### Hard Delete Strategy

The project uses hard deletes (no soft-delete). Audit trail is maintained through:
- `transactions` table for financial history
- `delinquency_history` for overdue tracking
- `dispute_comments` for dispute timeline

### Settings Encryption

Sensitive settings (ASAAS keys) are encrypted before storage using `platform/crypto` with the JWT secret as the encryption key.
