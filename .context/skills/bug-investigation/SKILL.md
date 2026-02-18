---
type: skill
name: Bug Investigation
description: Systematic bug investigation and root cause analysis
skillSlug: bug-investigation
phases: [E, V]
generated: 2026-01-29
status: filled
scaffoldVersion: "2.0.0"
---

# Bug Investigation

## When to Use

Use this skill when investigating bugs, unexpected behavior, or errors in the Sistema Financeiro platform.

## Project Context

- **Frontend**: React 19 + TypeScript 5.9 + Vite 7 (port 8082)
- **Backend**: Go 1.24 + chi/v5 (port 8080)
- **Database**: PostgreSQL 15 (port 5435 via Docker)
- **Key flows**: Order lifecycle, escrow/wallet, payments (ASAAS), disputes

## Investigation Steps

### 1. Reproduce the Issue

- Identify which role is affected (Admin, Student, Collaborator, Financeiro)
- Use test credentials to reproduce
- Check browser console and network tab for frontend issues
- Check backend stdout logs for server errors

### 2. Locate the Code Path

**Frontend**: Follow the feature module structure:
```
client/src/features/{feature}/
├── api.ts          # API calls - check request/response
├── schemas.ts      # Validation - check schema rules
├── types.ts        # Types - check interfaces
└── components/     # UI - check rendering logic
```

**Backend**: Follow the clean architecture layers:
```
server/internal/modules/{module}/
├── handler.go      # Check input validation, response format
├── service.go      # Check business logic, transactions
├── repository.go   # Check SQL queries, data access
└── models.go       # Check data structures
```

### 3. Common Bug Patterns

| Symptom | Likely Location | Check |
|---------|----------------|-------|
| 401 Unauthorized | `middleware/auth.go` | Token expiry, refresh logic |
| 403 Forbidden | `middleware/auth.go` | RoleGuard configuration |
| Wallet balance wrong | `finance/service.go` | Transaction logic, locked vs available |
| Order stuck in status | `statemachine/` | State transition rules |
| Notification not sent | `events/` | Event subscription in main.go |
| ASAAS payment failed | `platform/payment/` | API key, webhook token |
| File upload error | `platform/storage/` | File path, permissions |

### 4. Database Inspection

```bash
docker exec -it sistema-financeiro-postgres psql -U postgres -d financial_system
```

Check relevant tables: `orders`, `wallets`, `transactions`, `notifications`

### 5. Background Worker Issues

Check if workers are running correctly:
- Delinquency checker: logs at startup and every 24h
- Overdue marker: runs every 1h
- Payout processor: runs every 5min (only if ASAAS configured)
- Token cleanup: runs every 1h

## Checklist

- [ ] Issue reproduced consistently
- [ ] Root cause identified (not just symptom)
- [ ] Fix doesn't break other flows
- [ ] All roles tested if relevant
- [ ] Error handling improved at the fix location
