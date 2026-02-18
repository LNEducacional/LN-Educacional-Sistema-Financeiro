---
slug: getting-started
category: getting-started
generatedAt: 2026-01-29T04:11:07.538Z
updatedAt: 2026-02-02
---

# How do I set up and run this project?

## Getting Started

### Prerequisites

- **Go 1.24+**: Backend runtime
- **Node.js 20+**: Frontend runtime
- **Docker & Docker Compose**: PostgreSQL database
- **Make**: Build automation

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd sistema-financeiro

# Configure environment
cp .env.example .env
# Edit .env with required values:
#   DB_URL=postgres://postgres:postgres@localhost:5435/financial_system?sslmode=disable
#   JWT_SECRET=your-secret-key
#   POSTGRES_USER=postgres
#   POSTGRES_PASSWORD=postgres
#   POSTGRES_DB=financial_system

# Install frontend dependencies
cd client && npm install && cd ..
```

### Running

```bash
# Start everything (Docker + Backend + Frontend)
make dev

# Or start services individually:
make up          # Start PostgreSQL Docker container
make run-api     # Start Go backend (port 8080)
make run-web     # Start Vite frontend (port 8082)
```

### Applying Database Migrations

```bash
# After starting Docker, apply all migrations
make migrate-up
```

### Stopping

```bash
make stop        # Stop all services
make down        # Stop Docker only
```

### Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8082 |
| Backend | http://localhost:8080 |
| Health Check | http://localhost:8080/health |

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@test.com | password123 |
| Student | student@test.com | password123 |
| Collaborator | collaborator@test.com | password123 |
| Financeiro | financeiro@test.com | password123 |

### Common Issues

- **Port 8080 in use**: Run `make stop` or `lsof -i :8080` to find and kill the process
- **Database connection failed**: Ensure Docker is running (`make up`) and wait for healthcheck
- **Frontend build errors**: Delete `client/node_modules` and run `npm install` again
