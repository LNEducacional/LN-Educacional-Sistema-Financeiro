# System Architecture

## High-Level Overview

```
+---------------------------------------------------------------------+
|                         Client (React 19)                            |
|  +-------+ +-------+ +-------+ +---------+ +-------+ +-------+      |
|  | Admin | |Student| |Collab | |Financeiro| |Ranking| |Dispute|      |
|  +-------+ +-------+ +-------+ +---------+ +-------+ +-------+      |
|                              |                                       |
|  +---------------------------------------------------------------+   |
|  |               Shared (lib, components/ui, components/layout)   |   |
|  +---------------------------------------------------------------+   |
+---------------------------------------------------------------------+
                               | HTTP/REST
                               v
+---------------------------------------------------------------------+
|                        Server (Go 1.24 + chi/v5)                     |
|  +---------------------------------------------------------------+   |
|  |                    Middleware Layer                             |   |
|  |   (CORS, Logger, Recoverer, Auth, RoleGuard)                   |   |
|  +---------------------------------------------------------------+   |
|  +---------+ +---------+ +---------+ +---------+ +---------+        |
|  |  Users  | | Orders  | | Finance | | Ranking | | Dispute |        |
|  | Module  | | Module  | | Module  | | Module  | | Module  |        |
|  +---------+ +---------+ +---------+ +---------+ +---------+        |
|  +---------+ +----------+ +---------+ +---------+ +----------+      |
|  |Services | |Production| |  Admin  | | Payment | | Settings |      |
|  | Module  | |  Module  | | Module  | | Module  | |  Module  |      |
|  +---------+ +----------+ +---------+ +---------+ +----------+      |
|  +---------+ +----------+ +----------------+                         |
|  | Bureau  | |Collabora-| | Notifications  |                         |
|  | Module  | |tor Module| |    Module       |                         |
|  +---------+ +----------+ +----------------+                         |
|                              |                                       |
|  +---------------------------------------------------------------+   |
|  |  Platform (database, events, middleware, payment, statemachine, |   |
|  |           storage, crypto, email)                              |   |
|  +---------------------------------------------------------------+   |
+---------------------------------------------------------------------+
                               |
                               v
+---------------------------------------------------------------------+
|                     PostgreSQL 15 (Docker)                            |
+---------------------------------------------------------------------+
```

## Frontend Architecture (Feature-Sliced Design)

### Layer Structure

```
client/src/
├── app/                    # Application entry, providers, routes
│   ├── providers.tsx       # React context providers
│   └── routes.tsx          # Route definitions
├── features/               # Feature modules (business logic)
│   ├── admin/              # Admin dashboard, reports, KPIs
│   ├── auth/               # Authentication (login, password reset)
│   ├── collaborator/       # Collaborator dashboard and profile
│   ├── disputes/           # Dispute management workflow
│   ├── notifications/      # Real-time SSE notifications
│   ├── orders/             # Order management (create, track, approve)
│   ├── production/         # Production dashboards and stats
│   ├── ranking/            # Gamification and leaderboards
│   ├── services/           # Service catalog configuration
│   └── student/            # Student dashboard and order creation
├── components/             # Shared UI components
│   ├── layout/             # Layout components (Sidebar, AppLayout)
│   └── ui/                 # Base UI components (Badge, Select, etc.)
└── lib/                    # Utilities and hooks
    ├── hooks/              # Custom React hooks
    ├── axios.ts            # HTTP client configuration
    └── utils.ts            # Utility functions (cn, formatters)
```

### Path Alias

The project uses `@` as a path alias to `client/src/`:
```typescript
import { Button } from '@/components/ui/button'
```

### Feature Module Structure

Each feature follows a consistent structure:
```
features/admin/
├── index.ts                # Public exports
├── types.ts                # TypeScript interfaces
├── api.ts                  # API calls (axios)
├── schemas.ts              # Validation schemas (Zod)
├── components/             # Feature-specific components
│   ├── KPICards.tsx
│   └── FinancialChart.tsx
└── *Page.tsx               # Page components
```

### Key Frontend Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| React | 19.2.0 | UI framework |
| Vite | 7.2.4 | Build tool and dev server |
| TypeScript | 5.9.3 | Type safety |
| Tailwind CSS | 4.1.17 | Utility-first CSS (via Vite plugin) |
| React Router DOM | 7.10.1 | Client-side routing |
| React Hook Form | 7.68.0 | Form management |
| @tanstack/react-query | 5.90.12 | Server state management |
| Axios | 1.13.2 | HTTP client |
| Zod | 4.1.13 | Schema validation |
| Radix UI | latest | Accessible UI primitives |
| Lucide React | latest | Icon library |

## Backend Architecture (Clean Architecture)

### Layer Structure

```
server/
├── cmd/api/main.go         # Application entry point, DI, routes
├── internal/
│   ├── config/             # Configuration loading (.env)
│   ├── modules/            # Business domain modules
│   │   ├── admin/          # Admin reports, delinquency checks
│   │   ├── bureau/         # Financial compliance features
│   │   ├── collaborator/   # Collaborator-specific logic
│   │   ├── disputes/       # Dispute handling and resolution
│   │   ├── finance/        # Financial calculations, wallets
│   │   ├── notifications/  # Event-driven notifications (SSE)
│   │   ├── orders/         # Order lifecycle and status management
│   │   ├── payment/        # ASAAS integration, withdrawals
│   │   ├── production/     # Production tracking and statistics
│   │   ├── ranking/        # Ranking calculations and queries
│   │   ├── services/       # Service CRUD operations
│   │   ├── settings/       # Dynamic settings management
│   │   └── users/          # User management, auth, tokens
│   └── platform/           # Infrastructure
│       ├── database.go     # PostgreSQL connection (pgx pool)
│       ├── crypto/         # Cryptographic utilities
│       ├── email/          # SMTP email service
│       ├── events/         # Event dispatcher (pub/sub)
│       ├── middleware/      # HTTP middleware (auth.go, cors.go)
│       ├── payment/        # ASAAS client manager (hot-reload)
│       ├── statemachine/   # Order state machine
│       └── storage/        # File storage
└── migrations/             # SQL migrations (46 files)
```

### Module Structure

Each module follows clean architecture:
```
modules/orders/
├── models.go               # Domain models and DTOs
├── repository.go           # Data access layer (SQL queries)
├── service.go              # Business logic
└── handler.go              # HTTP handlers (validation, response)
```

### Key Backend Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| go-chi/chi/v5 | 5.2.3 | HTTP router |
| jackc/pgx/v5 | 5.7.6 | PostgreSQL driver |
| golang-jwt/jwt/v5 | 5.3.0 | JWT handling |
| google/uuid | 1.6.0 | UUID generation |
| joho/godotenv | 1.5.1 | .env file loading |
| golang.org/x/crypto | latest | bcrypt password hashing |

### Request Flow

```
HTTP Request
    |
    v
chi Router
    |
    v
Middleware (Logger, Recoverer, CORS, Auth, RoleGuard)
    |
    v
Handler (input validation, request parsing)
    |
    v
Service (business logic, transactions)
    |
    v
Repository (SQL queries via pgx)
    |
    v
PostgreSQL
```

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| users | User accounts (all roles: ADMIN, STUDENT, COLLABORATOR, FINANCEIRO) |
| services | Available services with pricing and commission splits |
| orders | Order records with status, dates, and payment info |
| order_revisions | Revision request history |
| deliveries | File deliveries from collaborators |
| wallets | Collaborator balances (locked/available) |
| transactions | Financial audit ledger |
| charges | ASAAS payment charge records |
| withdrawal_requests | Payout requests to collaborators |
| disputes | Dispute records |
| dispute_comments | Dispute timeline/comments |
| dispute_evidence | Dispute file attachments |
| notifications | User notifications |
| ratings | Student ratings for collaborators |
| delinquency_history | Overdue tracking history |
| refresh_tokens | JWT refresh token storage |
| settings | Dynamic system configuration (encrypted) |

## Key Design Decisions

### Escrow Implementation
- Funds tracked in `wallets` table with `balance_locked` and `balance_available`
- `transactions` table provides audit trail
- State changes trigger wallet updates via service layer
- Refund processing via OrderRepoAdapter pattern to avoid circular dependencies

### Event System
- Simple dispatcher pattern in `platform/events`
- Typed events: OrderCreated, OrderStatusChanged, DeliveryUploaded, PaymentReleased, DisputeOpened, DisputeCommentAdded, DisputeResolved, EvidenceUploaded
- Subscribers receive typed events for notifications and side effects

### State Machine
- Order status transitions validated via state machine
- Prevents invalid state changes
- Located in `platform/statemachine`

### Authentication
- JWT with access (15min) and refresh (7d) tokens
- Middleware extracts user ID and role from context
- Role guards protect routes per group

### ASAAS Hot Reload
- Payment gateway config stored in database (encrypted via settings module)
- `AsaasClientManager` supports hot reload when admin updates settings
- Falls back to environment variables if DB config is empty

### Dependency Injection
- All dependencies wired in `main.go`
- Adapter pattern used to break circular dependencies (UserInfoAdapter, OrderRepoAdapter)
- Interface-based contracts between modules

### Route Organization

| Route Group | Middleware | Modules |
|-------------|-----------|---------|
| Public | None | Health check, Auth (login/register), ASAAS webhook |
| Authenticated | AuthMiddleware | Orders, Services list, Collaborators list, Ranking, Notifications, Disputes, Production, Payment |
| Admin only | AuthMiddleware + RoleGuard("ADMIN") | Settings |
| Admin + Financeiro | AuthMiddleware + RoleGuard("ADMIN", "FINANCEIRO") | Services CRUD, Admin reports, Collaborators mgmt, Withdrawals mgmt |
| Collaborator only | AuthMiddleware + RoleGuard("COLLABORATOR") | Collaborator dashboard |
