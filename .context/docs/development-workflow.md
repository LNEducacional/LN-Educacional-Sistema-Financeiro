# Development Workflow

## Environment Setup

### Prerequisites
- Go 1.24+
- Node.js 20+
- Docker & Docker Compose
- Make

### Initial Setup

```bash
# Clone repository
git clone <repo-url>
cd sistema-financeiro

# Copy and configure environment
cp .env.example .env
# Edit .env with your DB_URL, JWT_SECRET, etc.

# Start development environment
make dev
```

This command:
1. Starts PostgreSQL via Docker
2. Waits for database to be ready
3. Starts the Go backend (background)
4. Starts the Vite frontend

### Service URLs

| Service | URL | Port |
|---------|-----|------|
| Frontend | http://localhost:8082 | 8082 |
| Backend | http://localhost:8080 | 8080 |
| PostgreSQL | localhost:5435 | 5435 |

## Daily Development

### Starting Work

```bash
# Start all services
make dev

# Or start individually:
make up          # Docker containers only
make run-api     # Backend only
make run-web     # Frontend only
```

### Stopping Work

```bash
make stop        # Stop all services (Go, Vite, Docker)
make down        # Stop Docker containers only
```

## Backend Development

### Module Structure

When creating a new module:

```
server/internal/modules/newmodule/
├── models.go      # Domain types and DTOs
├── repository.go  # Database layer (SQL queries via pgx)
├── service.go     # Business logic
└── handler.go     # HTTP handlers (validation, response)
```

### Adding New Endpoints

1. Define models in `models.go`
2. Add repository methods in `repository.go`
3. Implement business logic in `service.go`
4. Create handlers in `handler.go`
5. Register routes in `cmd/api/main.go`

### Database Migrations

```bash
# Create new migration (interactive prompt for name)
make migrate-create

# Apply all migrations
make migrate-up

# Rollback all migrations
make migrate-down
```

Migration files go in `server/migrations/` with naming:
```
YYYYMMDDHHMMSS_description.up.sql
YYYYMMDDHHMMSS_description.down.sql
```

Migrations are applied directly to PostgreSQL via Docker exec.

### Code Quality

- Use `golangci-lint` for linting (strict mode with gosec, errcheck, bodyclose)
- Follow Go idioms and conventions
- Add `context.Context` to all I/O functions
- Wrap errors with context using `fmt.Errorf("...: %w", err)`
- Use transactions for multi-step operations

## Frontend Development

### Feature Structure

When creating a new feature:

```
client/src/features/newfeature/
├── index.ts           # Public exports
├── types.ts           # TypeScript types
├── api.ts             # API calls (axios)
├── schemas.ts         # Zod validation
├── components/        # Feature components
│   └── SomeComponent.tsx
└── SomePage.tsx       # Page component
```

### Component Guidelines

1. **Pages**: Only UI/JSX, logic in custom `usePageName()` hooks
2. **Components**: Pure UI, receive data via props
3. **Hooks**: Extract complex logic from pages (state, effects, handlers)
4. **API**: Use axios instance from `@/lib/axios.ts`

### Path Alias

Use `@` to import from `src/`:
```typescript
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth'
```

### Styling

- Use Tailwind CSS 4 classes (via Vite plugin, not PostCSS config)
- Follow existing color patterns
- Use `cn()` utility for conditional classes (clsx + tailwind-merge)

### Code Quality

```bash
# Run ESLint
cd client
npm run lint
```

- 100% TypeScript typing, no `any`
- Files max 1999 lines, components preferably < 200 lines
- JSDoc "LLM-friendly" comments for public APIs

## Git Workflow

### Branch Naming

```
feature/short-description
fix/issue-description
refactor/what-changed
```

### Commit Messages

Follow Conventional Commits:

```
type(scope): description

Examples:
feat(orders): add revision request endpoint
fix(auth): handle expired token correctly
refactor(ranking): optimize query performance
docs(readme): update setup instructions
```

### Before Committing

1. Run linters (ESLint for frontend, golangci-lint for backend)
2. Fix TypeScript errors (`tsc --noEmit`)
3. Remove unused code
4. Update i18n if needed
5. Run relevant tests

## Testing

### Backend Tests

```bash
cd server
go test ./...
```

### Frontend Tests

```bash
cd client
npm test
```

### Manual Testing

Use the test credentials:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@test.com | password123 |
| Student | student@test.com | password123 |
| Collaborator | collaborator@test.com | password123 |
| Financeiro | financeiro@test.com | password123 |

## Debugging

### Backend

- Logs output to stdout (structured format)
- Check Docker logs: `docker logs sistema-financeiro-postgres`
- Database: Connect via Docker exec

### Frontend

- Browser DevTools (F12)
- React DevTools extension
- Network tab for API calls
- Console for errors

### Database Inspection

```bash
# Connect to PostgreSQL
docker exec -it sistema-financeiro-postgres psql -U postgres -d financial_system

# Common commands
\dt                          # List tables
\d tablename                 # Describe table
SELECT * FROM users;         # View users
SELECT * FROM orders;        # View orders
```

## Troubleshooting

### Port Already in Use

```bash
make stop
# or
lsof -i :8080  # Find process
kill -9 <PID>  # Kill it
```

### Database Connection Issues

```bash
make down
make up
# Wait for PostgreSQL to start (healthcheck runs every 10s)
make migrate-up
```

### Frontend Build Issues

```bash
cd client
rm -rf node_modules
npm install
npm run dev
```

## Environment Variables

### Backend (.env at project root)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| DB_URL | Yes | - | PostgreSQL connection string |
| JWT_SECRET | Yes | - | JWT signing secret |
| ACCESS_TOKEN_DURATION | No | 15m | Access token lifetime |
| REFRESH_TOKEN_DURATION | No | 168h | Refresh token lifetime (7d) |
| CORS_ALLOWED_ORIGINS | No | http://localhost:8082 | Comma-separated origins |
| CORS_ALLOW_CREDENTIALS | No | true | Allow credentials in CORS |
| ASAAS_API_KEY | No | - | ASAAS payment gateway key |
| ASAAS_WEBHOOK_TOKEN | No | - | ASAAS webhook validation token |
| ASAAS_SANDBOX | No | false | Use sandbox API |
| WITHDRAWAL_MIN_AMOUNT | No | 50 | Min withdrawal (R$) |
| WITHDRAWAL_MAX_AMOUNT | No | 10000 | Max withdrawal (R$) |
| WITHDRAWAL_DAILY_LIMIT | No | 50000 | Daily withdrawal limit (R$) |
| SMTP_HOST | No | - | SMTP server host |
| SMTP_PORT | No | - | SMTP server port |
| SMTP_USERNAME | No | - | SMTP username |
| SMTP_PASSWORD | No | - | SMTP password |
| SMTP_FROM | No | - | Sender email address |
| SMTP_FROM_NAME | No | - | Sender display name |
| APP_BASE_URL | No | http://localhost:8082 | App URL for email links |
| POSTGRES_USER | Yes | - | PostgreSQL user (Docker) |
| POSTGRES_PASSWORD | Yes | - | PostgreSQL password (Docker) |
| POSTGRES_DB | Yes | - | PostgreSQL database name (Docker) |
