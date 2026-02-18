---
slug: deployment
category: operations
generatedAt: 2026-01-29T04:11:07.775Z
updatedAt: 2026-02-02
relevantFiles:
  - docker-compose.yml
  - Makefile
  - server/cmd/api/main.go
  - client/vite.config.ts
---

# How do I deploy this project?

## Deployment

### Development (Local)

```bash
# Start everything
make dev

# This runs:
# 1. docker-compose up -d (PostgreSQL)
# 2. cd server && go run cmd/api/main.go (backend, background)
# 3. cd client && npm run dev (frontend)
```

### Production Build

#### Frontend

```bash
cd client
npm run build    # Runs tsc + vite build
# Output: client/dist/
```

#### Backend

```bash
cd server
CGO_ENABLED=0 go build -ldflags "-s -w" -o api ./cmd/api
# Output: server/api (static binary)
```

### Docker (Database Only)

Currently, only PostgreSQL runs in Docker:

```yaml
# docker-compose.yml
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

### Environment Configuration

Required environment variables for production:

```env
# Database
DB_URL=postgres://user:password@host:port/database?sslmode=require
POSTGRES_USER=...
POSTGRES_PASSWORD=...
POSTGRES_DB=...

# Authentication
JWT_SECRET=<strong-random-secret>
ACCESS_TOKEN_DURATION=15m
REFRESH_TOKEN_DURATION=168h

# CORS
CORS_ALLOWED_ORIGINS=https://yourdomain.com
CORS_ALLOW_CREDENTIALS=true

# Payment Gateway
ASAAS_API_KEY=<production-key>
ASAAS_WEBHOOK_TOKEN=<webhook-token>

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_FROM=noreply@yourdomain.com
SMTP_FROM_NAME=Sistema Financeiro
APP_BASE_URL=https://yourdomain.com

# Withdrawal Limits
WITHDRAWAL_MIN_AMOUNT=50
WITHDRAWAL_MAX_AMOUNT=10000
WITHDRAWAL_DAILY_LIMIT=50000
```

### Production Checklist

- [ ] Set strong JWT_SECRET (high entropy)
- [ ] Configure CORS_ALLOWED_ORIGINS (not wildcard)
- [ ] Enable SSL/TLS on PostgreSQL (`sslmode=require`)
- [ ] Set up ASAAS production API key
- [ ] Configure SMTP for email features
- [ ] Set appropriate withdrawal limits
- [ ] Run `make migrate-up` on production database
- [ ] Build frontend with `npm run build`
- [ ] Build backend with static linking (`CGO_ENABLED=0`)
- [ ] Configure reverse proxy (nginx/caddy) for HTTPS
