# Tooling

## Build Tools

### Make

The Makefile provides common development commands:

| Command | Description |
|---------|-------------|
| `make dev` | Start full development environment (Docker + Backend + Frontend) |
| `make stop` | Stop all services (kills Go, Vite, and Docker) |
| `make up` | Start Docker containers |
| `make down` | Stop Docker containers |
| `make run-api` | Start Go backend only |
| `make run-web` | Start Vite frontend only |
| `make migrate-create` | Create migration files (interactive name prompt) |
| `make migrate-up` | Apply all migrations via Docker exec |
| `make migrate-down` | Rollback all migrations via Docker exec |

### Docker Compose

Services defined in `docker-compose.yml`:

```yaml
services:
  postgres:
    container_name: sistema-financeiro-postgres
    image: postgres:15-alpine
    ports:
      - "5435:5432"
    volumes:
      - ./.docker/postgres-data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### Vite

Frontend build tool with configuration in `client/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8082,
    host: true,
  },
})
```

Key points:
- Tailwind CSS 4 integrated via Vite plugin (not PostCSS)
- Path alias `@` maps to `src/`
- No API proxy configured (frontend calls backend directly)

## Linting & Formatting

### ESLint (Frontend)

Configuration via `eslint.config.js` with TypeScript support:

```bash
# Run linter
cd client
npm run lint
```

Key plugins:
- `@eslint/js` - Core ESLint rules
- `typescript-eslint` - TypeScript-specific rules
- `eslint-plugin-react-hooks` - React hooks rules
- `eslint-plugin-react-refresh` - Fast Refresh compatibility

### golangci-lint (Backend)

Recommended configuration (`.golangci.yml`):

```yaml
linters:
  enable:
    - gosec
    - errcheck
    - bodyclose
    - govet
    - staticcheck
```

Commands:
```bash
golangci-lint run ./...
```

## Package Management

### npm (Frontend)

```bash
cd client
npm install           # Install dependencies
npm run dev           # Start dev server
npm run build         # Production build (tsc + vite build)
npm run lint          # Run ESLint
npm run preview       # Preview production build
```

Key dependencies:
- react: ^19.2.0
- react-router-dom: ^7.10.1
- @tanstack/react-query: ^5.90.12
- axios: ^1.13.2
- tailwindcss: ^4.1.17
- zod: ^4.1.13
- react-hook-form: ^7.68.0
- typescript: ~5.9.3
- vite: ^7.2.4

### Go Modules (Backend)

```bash
cd server
go mod tidy           # Clean dependencies
go mod download       # Download dependencies
go build ./...        # Build
```

Key dependencies:
- github.com/go-chi/chi/v5 v5.2.3 - Router
- github.com/jackc/pgx/v5 v5.7.6 - PostgreSQL driver
- github.com/golang-jwt/jwt/v5 v5.3.0 - JWT handling
- github.com/google/uuid v1.6.0 - UUID generation
- github.com/joho/godotenv v1.5.1 - .env loading
- golang.org/x/crypto - Password hashing (bcrypt)

## Database Tools

### psql (PostgreSQL CLI)

```bash
# Connect via Docker
docker exec -it sistema-financeiro-postgres psql -U postgres -d financial_system

# Common commands
\dt                   # List tables
\d tablename          # Describe table
\q                    # Quit
```

### Migrations

Migrations are managed via Makefile targets that execute SQL files directly:

```bash
# Create new migration (prompts for name)
make migrate-create

# Apply all up migrations
make migrate-up

# Rollback all down migrations
make migrate-down
```

Migration files are stored in `server/migrations/` with timestamp-based naming.
Currently 46 migration files covering all database tables.

## IDE Configuration

### VS Code

Recommended extensions:
- Go (golang.go)
- Tailwind CSS IntelliSense
- ESLint
- Thunder Client (API testing)
- PostgreSQL (ckolkman.vscode-postgres)

Workspace settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "[go]": {
    "editor.defaultFormatter": "golang.go"
  },
  "go.lintTool": "golangci-lint",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## API Testing

### Thunder Client / Postman

Import environment:
```json
{
  "name": "Development",
  "values": [
    { "name": "baseUrl", "value": "http://localhost:8080" },
    { "name": "token", "value": "" }
  ]
}
```

### cURL Examples

```bash
# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'

# Health check
curl http://localhost:8080/health

# Authenticated request
curl http://localhost:8080/api/orders \
  -H "Authorization: Bearer <token>"
```

## Debugging

### Backend (Go)

Using Delve:
```bash
# Install
go install github.com/go-delve/delve/cmd/dlv@latest

# Debug
dlv debug ./cmd/api/main.go
```

VS Code launch configuration:
```json
{
  "name": "Debug Backend",
  "type": "go",
  "request": "launch",
  "mode": "auto",
  "program": "${workspaceFolder}/server/cmd/api"
}
```

### Frontend (React)

- Browser DevTools (F12)
- React DevTools extension
- VS Code debugger with Chrome

## Monitoring & Logs

### Development Logs

Backend logs to stdout:
```
2026/01/29 10:30:00 Server starting on port 8080
2026/01/29 10:30:05 POST /api/auth/login 200 45ms
2026/01/29 10:30:10 ASAAS payment gateway configured (production mode)
2026/01/29 10:30:10 Email service configured for password reset
```

Frontend logs in browser console.

### Docker Logs

```bash
# View logs
docker logs sistema-financeiro-postgres

# Follow logs
docker logs -f sistema-financeiro-postgres
```

## File Structure

```
sistema-financeiro/
├── .claude/              # Claude Code settings
├── .context/             # AI context documentation
├── .docker/              # Docker data volumes (postgres-data)
├── .vscode/              # VS Code settings
├── client/               # React frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── server/               # Go backend
│   ├── cmd/api/
│   ├── internal/
│   │   ├── config/
│   │   ├── modules/     # 13 business modules
│   │   └── platform/    # Infrastructure (8 packages)
│   └── migrations/       # 46 SQL migration files
├── .env                  # Environment variables (not in git)
├── docker-compose.yml
├── Makefile
└── CLAUDE.md             # Project instructions and coding standards
```
