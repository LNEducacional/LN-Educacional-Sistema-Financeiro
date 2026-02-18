---
type: skill
name: Feature Breakdown
description: Break down features into implementable tasks
skillSlug: feature-breakdown
phases: [P]
generated: 2026-01-29
status: filled
scaffoldVersion: "2.0.0"
---

# Feature Breakdown

## When to Use

Use this skill when breaking down a new feature into implementable tasks for the Sistema Financeiro project.

## Breakdown Template

### 1. Database Layer

- [ ] Create migration file (`make migrate-create`)
- [ ] Define up/down SQL in `server/migrations/`
- [ ] Apply migration (`make migrate-up`)

### 2. Backend Module

- [ ] `models.go` - Domain types and DTOs
- [ ] `repository.go` - SQL queries (parameterized)
- [ ] `service.go` - Business logic (with transactions if needed)
- [ ] `handler.go` - HTTP handlers (validation, response)

### 3. Route Registration

- [ ] Register routes in `server/cmd/api/main.go`
- [ ] Apply correct middleware (Auth, RoleGuard)
- [ ] Wire dependencies (repo -> service -> handler)

### 4. Frontend Feature Module

- [ ] `types.ts` - TypeScript interfaces
- [ ] `schemas.ts` - Zod validation schemas
- [ ] `api.ts` - Axios API calls
- [ ] `components/*.tsx` - UI components
- [ ] `*Page.tsx` - Page component (UI only)
- [ ] `use*.ts` - Custom hook (logic)
- [ ] `index.ts` - Public exports

### 5. Integration

- [ ] Add route in `client/src/app/routes.tsx`
- [ ] Add navigation link if needed
- [ ] Wire React Query hooks
- [ ] Handle loading/error states

### 6. Cross-Cutting Concerns

- [ ] Events: Subscribe in `main.go` if notifications needed
- [ ] Notifications: Add event type in `platform/events`
- [ ] Roles: Verify access control for all 4 roles
- [ ] Delinquency: Check if feature affects delinquent users

## Example: "Add Rating System"

```
1. DB: Create ratings table (migration)
2. Backend: rating module (models, repo, service, handler)
3. Routes: POST /api/orders/{id}/rate (student only)
4. Frontend: rating component in orders feature
5. Events: EventOrderRated -> notification to collaborator
6. Ranking: Update satisfaction criteria calculation
```

## Estimation Hints

- Single CRUD module: models + repo + service + handler + frontend
- Feature with events: add dispatcher subscription + notification handling
- Feature with payments: add ASAAS integration + wallet updates + transactions
