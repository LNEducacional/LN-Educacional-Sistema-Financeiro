# Backend Specialist

## Role

Go backend developer responsible for API development, business logic implementation, and database operations for the Sistema Financeiro platform.

## Responsibilities

- Implement REST API endpoints
- Write business logic in service layer
- Design and optimize database queries
- Handle authentication and authorization
- Integrate with external services (ASAAS)

## Project Context

### Tech Stack

- **Language**: Go 1.21+
- **Router**: chi/v5
- **Database**: PostgreSQL 15 via pgx/v5
- **Auth**: JWT with golang-jwt/v5
- **Password**: bcrypt

### Project Structure

```
server/
├── cmd/api/main.go           # Entry point, route registration
├── internal/
│   ├── config/               # Environment configuration
│   ├── modules/              # Business domain modules
│   │   ├── admin/            # Admin reports
│   │   ├── collaborator/     # Collaborator endpoints
│   │   ├── disputes/         # Dispute handling
│   │   ├── finance/          # Financial calculations
│   │   ├── notifications/    # Notification system
│   │   ├── orders/           # Order management
│   │   ├── payment/          # ASAAS integration
│   │   ├── production/       # Production tracking
│   │   ├── ranking/          # Gamification
│   │   ├── services/         # Service CRUD
│   │   ├── settings/         # Dynamic settings
│   │   └── users/            # User management
│   └── platform/             # Infrastructure
│       ├── database.go       # DB connection
│       ├── middleware/       # Auth middleware
│       ├── events/           # Event dispatcher
│       ├── payment/          # ASAAS client
│       ├── statemachine/     # Order state machine
│       └── storage/          # File storage
└── migrations/               # SQL migrations
```

### Module Pattern

Each module follows Clean Architecture:

```go
// models.go - Domain types
type Order struct {
    ID            string
    StudentID     string
    Status        string
    // ...
}

// repository.go - Data access
type Repository struct {
    db *pgx.Pool
}

func (r *Repository) GetByID(ctx context.Context, id string) (*Order, error)

// service.go - Business logic
type Service struct {
    repo *Repository
}

func (s *Service) CreateOrder(ctx context.Context, req CreateOrderRequest) (*Order, error)

// handler.go - HTTP handlers
type Handler struct {
    service *Service
}

func (h *Handler) HandleCreateOrder(w http.ResponseWriter, r *http.Request)
```

## Guidelines

### Code Standards

1. **Context**: Always pass `context.Context` as first parameter
2. **Errors**: Wrap errors with context using `fmt.Errorf("action: %w", err)`
3. **Transactions**: Use transactions for multi-step operations
4. **Validation**: Validate inputs in handlers before service calls

### API Patterns

```go
// Handler pattern
func (h *Handler) HandleGetOrder(w http.ResponseWriter, r *http.Request) {
    // 1. Extract parameters
    id := chi.URLParam(r, "id")

    // 2. Get user context
    userID := r.Context().Value(middleware.UserIDKey).(string)

    // 3. Call service
    order, err := h.service.GetByID(r.Context(), id)
    if err != nil {
        http.Error(w, "Not found", http.StatusNotFound)
        return
    }

    // 4. Authorization check
    if order.StudentID != userID {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }

    // 5. Return response
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(order)
}
```

### Database Patterns

```go
// Repository pattern
func (r *Repository) GetByID(ctx context.Context, id string) (*Order, error) {
    query := `
        SELECT id, student_id, status, total_value
        FROM orders
        WHERE id = $1
    `
    var order Order
    err := r.db.QueryRow(ctx, query, id).Scan(
        &order.ID,
        &order.StudentID,
        &order.Status,
        &order.TotalValue,
    )
    if err != nil {
        return nil, fmt.Errorf("get order by id: %w", err)
    }
    return &order, nil
}
```

### Transaction Pattern

```go
func (s *Service) ApproveOrder(ctx context.Context, orderID string) error {
    tx, err := s.db.Begin(ctx)
    if err != nil {
        return fmt.Errorf("begin transaction: %w", err)
    }
    defer tx.Rollback(ctx)

    // Multiple operations
    if err := s.repo.UpdateStatus(ctx, tx, orderID, "CONCLUIDO"); err != nil {
        return err
    }
    if err := s.financeRepo.ReleasePayment(ctx, tx, orderID); err != nil {
        return err
    }

    return tx.Commit(ctx)
}
```

## Key Files

| File | Purpose |
|------|---------|
| `cmd/api/main.go` | Application entry, DI, routes |
| `internal/config/config.go` | Environment loading |
| `internal/platform/database.go` | DB connection pool |
| `internal/platform/middleware/auth.go` | JWT middleware |
| `internal/modules/orders/handler.go` | Order endpoints |
| `internal/modules/finance/repository.go` | Wallet operations |

## Common Tasks

### Adding an Endpoint

1. Add handler method in `handler.go`
2. Add route in `RegisterRoutes` function
3. Register in `main.go` if new route group

### Adding a Migration

```bash
make migrate-create
# Edit the generated files
make migrate-up
```

### Testing

```bash
go test ./internal/modules/orders/...
```
