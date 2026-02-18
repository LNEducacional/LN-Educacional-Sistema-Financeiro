---
slug: project-structure
category: architecture
generatedAt: 2026-01-29T04:11:07.647Z
updatedAt: 2026-02-02
---

# How is the codebase organized?

## Project Structure

```
sistema-financeiro/
├── client/                      # Frontend (React 19 + Vite 7 + TypeScript)
│   ├── src/
│   │   ├── app/                 # App entry, providers, routes
│   │   ├── features/            # Feature modules (10 features)
│   │   │   ├── admin/           # Admin dashboard, reports, KPIs
│   │   │   ├── auth/            # Login, password reset
│   │   │   ├── collaborator/    # Collaborator dashboard
│   │   │   ├── disputes/        # Dispute management
│   │   │   ├── notifications/   # SSE notifications
│   │   │   ├── orders/          # Order CRUD and lifecycle
│   │   │   ├── production/      # Production stats
│   │   │   ├── ranking/         # Gamification leaderboards
│   │   │   ├── services/        # Service catalog config
│   │   │   └── student/         # Student dashboard
│   │   ├── components/          # Shared UI components
│   │   │   ├── layout/          # Sidebar, AppLayout
│   │   │   └── ui/              # Badge, Select, Button, etc.
│   │   └── lib/                 # Utilities, hooks, axios config
│   ├── package.json
│   └── vite.config.ts
│
├── server/                      # Backend (Go 1.24 + chi/v5)
│   ├── cmd/api/main.go          # Entry point, DI, route registration
│   ├── internal/
│   │   ├── config/              # Environment configuration
│   │   ├── modules/             # Business domain (13 modules)
│   │   │   ├── admin/           # Reports, delinquency checks
│   │   │   ├── bureau/          # Financial compliance
│   │   │   ├── collaborator/    # Collaborator-specific logic
│   │   │   ├── disputes/        # Dispute handling
│   │   │   ├── finance/         # Wallets, transactions
│   │   │   ├── notifications/   # Event-driven SSE notifications
│   │   │   ├── orders/          # Order lifecycle
│   │   │   ├── payment/         # ASAAS integration, withdrawals
│   │   │   ├── production/      # Production tracking
│   │   │   ├── ranking/         # Ranking calculations
│   │   │   ├── services/        # Service CRUD
│   │   │   ├── settings/        # Dynamic settings (encrypted)
│   │   │   └── users/           # Auth, user management, tokens
│   │   └── platform/            # Infrastructure (8 packages)
│   │       ├── database.go      # pgx connection pool
│   │       ├── crypto/          # Encryption utilities
│   │       ├── email/           # SMTP service
│   │       ├── events/          # Event dispatcher
│   │       ├── middleware/      # auth.go, cors.go
│   │       ├── payment/         # ASAAS client manager
│   │       ├── statemachine/    # Order state machine
│   │       └── storage/         # File storage
│   └── migrations/              # 46 SQL migration files
│
├── .context/                    # AI context scaffolding
├── .docker/                     # PostgreSQL data volume
├── .env                         # Environment variables
├── docker-compose.yml           # PostgreSQL service
├── Makefile                     # Development automation
└── CLAUDE.md                    # Coding standards and rules
```

## Architecture Patterns

- **Frontend**: Feature-Sliced Design (FSD) with strict layer isolation
- **Backend**: Clean Architecture (Handler -> Service -> Repository)
- **Database**: PostgreSQL 15 with 17+ tables, hard delete strategy
- **Communication**: REST/JSON over HTTP, SSE for real-time notifications
- **Events**: Internal pub/sub dispatcher for decoupled side effects
