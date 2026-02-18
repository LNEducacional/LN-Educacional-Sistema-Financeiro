# DevOps Specialist

## Role

Infrastructure and deployment specialist responsible for development environment, containerization, and deployment pipelines for the Sistema Financeiro platform.

## Responsibilities

- Manage Docker and development environment
- Configure CI/CD pipelines
- Handle deployment and infrastructure
- Monitor system health and performance
- Manage environment configurations

## Project Context

### Current Infrastructure

| Component | Technology |
|-----------|------------|
| Containers | Docker Compose |
| Database | PostgreSQL 15 (containerized) |
| Backend | Go binary |
| Frontend | Vite dev server / static build |

### Service Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 8082 | http://localhost:8082 |
| Backend | 8080 | http://localhost:8080 |
| PostgreSQL | 5435 | localhost:5435 |

## Docker Configuration

### docker-compose.yml

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    container_name: sistema-financeiro-postgres-1
    ports:
      - "5435:5432"
    volumes:
      - ./.docker/postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: financial_system
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
```

### Docker Commands

```bash
# Start containers
docker-compose up -d

# Stop containers
docker-compose down

# View logs
docker-compose logs -f postgres

# Access PostgreSQL shell
docker exec -it sistema-financeiro-postgres-1 psql -U postgres -d financial_system

# Restart container
docker-compose restart postgres
```

## Makefile Commands

```makefile
# Development
dev:          # Start full environment
stop:         # Stop all services
up:           # Start Docker containers
down:         # Stop Docker containers
run-api:      # Start Go backend
run-web:      # Start Vite frontend

# Database
migrate-up:   # Apply migrations
migrate-down: # Rollback migrations
migrate-create: # Create new migration

# Build
build:        # Build production artifacts
```

## Environment Configuration

### Backend (.env)

```env
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5435/financial_system?sslmode=disable

# Authentication
JWT_SECRET=your-secret-key-change-in-production
ACCESS_TOKEN_DURATION=15m
REFRESH_TOKEN_DURATION=168h

# ASAAS (optional)
ASAAS_API_KEY=
ASAAS_WEBHOOK_TOKEN=
```

### Frontend (via Vite)

```env
VITE_API_URL=http://localhost:8080
```

## Development Environment

### Starting Development

```bash
# Option 1: Full stack
make dev

# Option 2: Individual services
make up          # Docker only
make run-api     # Backend
make run-web     # Frontend
```

### Troubleshooting

**Port conflicts**:
```bash
# Find process using port
lsof -i :8080
kill -9 <PID>
```

**Database connection issues**:
```bash
# Check container status
docker ps
docker logs sistema-financeiro-postgres-1

# Restart database
docker-compose restart postgres
```

**Fresh start**:
```bash
make down
rm -rf .docker/postgres-data
make up
make migrate-up
```

## Deployment

### Production Build

```bash
# Frontend
cd client
npm run build
# Output: client/dist/

# Backend
cd server
CGO_ENABLED=0 go build -ldflags="-s -w" -o api ./cmd/api
# Output: server/api
```

### Deploy Script

```bash
#!/bin/bash
# deploy.sh

# Build frontend
cd client
npm ci
npm run build

# Build backend
cd ../server
go build -o api ./cmd/api

# Deploy (example)
# scp -r client/dist/ server@host:/app/static/
# scp server/api server@host:/app/
```

## Monitoring

### Health Check

```bash
# Backend health
curl http://localhost:8080/health

# Database health
docker exec sistema-financeiro-postgres-1 pg_isready -U postgres
```

### Logs

```bash
# Backend logs (stdout)
# Visible in terminal running make run-api

# Database logs
docker logs sistema-financeiro-postgres-1 --tail 100

# Follow logs
docker logs -f sistema-financeiro-postgres-1
```

### Database Monitoring

```sql
-- Active connections
SELECT * FROM pg_stat_activity;

-- Table sizes
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(quote_ident(tablename)))
FROM pg_tables
WHERE schemaname = 'public';

-- Index usage
SELECT
    indexrelname,
    idx_scan,
    idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## CI/CD (Recommended)

### GitHub Actions Example

```yaml
name: CI

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.21'
      - run: cd server && go test ./...
      - run: cd server && golangci-lint run

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd client && npm ci
      - run: cd client && npm run build
      - run: cd client && npx biome check src/
```

## Security Considerations

### Secrets Management

- Never commit secrets to git
- Use environment variables
- Consider secret management tools for production

### Network Security

- Limit exposed ports
- Use HTTPS in production
- Configure proper CORS
- Add rate limiting

### Container Security

- Use specific image versions
- Run as non-root user
- Scan images for vulnerabilities
