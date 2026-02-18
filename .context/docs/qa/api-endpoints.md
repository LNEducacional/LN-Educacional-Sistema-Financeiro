---
slug: api-endpoints
category: features
generatedAt: 2026-01-29T04:11:07.648Z
updatedAt: 2026-02-02
---

# What API endpoints are available?

## API Endpoints

All endpoints are served from `http://localhost:8080`.

### Public Routes (No Authentication)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (returns `{"status": "ok"}`) |
| POST | `/api/auth/login` | User login (returns access + refresh tokens) |
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/forgot-password` | Request password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |
| POST | `/api/payment/webhook/asaas` | ASAAS payment webhook (validated by token header) |

### Authenticated Routes (All Roles)

Require `Authorization: Bearer <access_token>` header.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/logout` | Logout (invalidates refresh token) |
| GET | `/api/services` | List active services |
| GET | `/api/collaborators` | List collaborators for selection |

### Orders (`/api/orders`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/orders` | List orders (filtered by role) |
| POST | `/api/orders` | Create new order |
| GET | `/api/orders/{id}` | Get order details |
| POST | `/api/orders/{id}/deliver` | Upload delivery (file) |
| POST | `/api/orders/{id}/approve` | Approve order (student) |
| POST | `/api/orders/{id}/revision` | Request revision (student) |
| POST | `/api/orders/{id}/cancel` | Cancel order |
| POST | `/api/orders/{id}/start` | Start working on order |

### Ranking (`/api/ranking`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ranking` | Get rankings (query: criteria, period) |

### Notifications (`/api/notifications`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications` | List user notifications |
| GET | `/api/notifications/stream` | SSE stream for real-time notifications |
| PUT | `/api/notifications/{id}/read` | Mark notification as read |

### Disputes (`/api/disputes`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/disputes` | List disputes |
| POST | `/api/disputes` | Open new dispute |
| GET | `/api/disputes/{id}` | Get dispute details |
| POST | `/api/disputes/{id}/comments` | Add comment to dispute |
| POST | `/api/disputes/{id}/evidence` | Upload evidence |
| PUT | `/api/disputes/{id}/resolve` | Resolve dispute (admin) |

### Production (`/api/production`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/production` | Get production dashboard data |
| GET | `/api/production/stats` | Get production statistics |

### Payment (`/api/payment`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/payment/withdraw` | Request withdrawal |
| GET | `/api/payment/withdrawals` | List own withdrawal requests |
| POST | `/api/payment/charge` | Create ASAAS charge |

### Collaborator Only (`/api/collaborator`)

Requires role: `COLLABORATOR`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/collaborator/dashboard` | Collaborator dashboard data |
| GET | `/api/collaborator/wallet` | Wallet balance and history |

### Admin Only (`/admin/settings`)

Requires role: `ADMIN`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/settings` | Get system settings |
| PUT | `/admin/settings` | Update system settings |
| PUT | `/admin/settings/asaas` | Update ASAAS configuration |

### Admin + Financeiro Routes

Requires role: `ADMIN` or `FINANCEIRO`

#### Services (`/admin/services`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/services` | List all services |
| POST | `/admin/services` | Create service |
| PUT | `/admin/services/{id}` | Update service |
| DELETE | `/admin/services/{id}` | Delete service |

#### Reports (`/admin/reports`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/reports/kpi` | Financial KPIs |
| GET | `/admin/reports/delinquents` | Delinquent students list |
| GET | `/admin/reports/delinquents/export` | Export delinquents CSV |

#### Collaborators (`/admin/collaborators`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/collaborators` | List collaborators with details |
| GET | `/admin/collaborators/{id}` | Get collaborator details |

#### Withdrawals (`/admin/withdrawals`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/withdrawals` | List pending withdrawals |
| PUT | `/admin/withdrawals/{id}/approve` | Approve withdrawal |
| PUT | `/admin/withdrawals/{id}/reject` | Reject withdrawal |
