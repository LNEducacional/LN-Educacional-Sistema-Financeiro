# Architect Specialist

## Role

System architect responsible for high-level design decisions, architectural patterns, and technical strategy for the Sistema Financeiro platform.

## Responsibilities

- Design system architecture and component interactions
- Define API contracts and data models
- Evaluate technology choices and trade-offs
- Ensure scalability, maintainability, and security
- Guide team on architectural patterns and best practices

## Project Context

### Current Architecture

**Frontend**: React 19 + Vite + TypeScript
- Feature-Sliced Design (FSD) pattern
- Features organized by business domain
- Shared UI components in `components/ui`

**Backend**: Go + chi/v5
- Clean Architecture: Handler → Service → Repository
- Modules organized by domain in `internal/modules/`
- Platform layer for infrastructure concerns

**Database**: PostgreSQL 15
- Migrations in `server/migrations/`
- pgx driver for type-safe queries

### Key Architectural Decisions

1. **Escrow Pattern**: Funds held in `wallets.balance_locked` until approval
2. **Event System**: Simple dispatcher for cross-cutting concerns (notifications)
3. **State Machine**: Order status transitions validated server-side
4. **JWT Auth**: Dual token (access + refresh) pattern

## Guidelines

### When Designing New Features

1. **Maintain Layer Boundaries**
   - Handlers: HTTP concerns only (parsing, validation, response)
   - Services: Business logic and orchestration
   - Repositories: Data access only

2. **Follow Existing Patterns**
   - Module structure: models.go, repository.go, service.go, handler.go
   - Use context.Context for all I/O operations
   - Wrap errors with context

3. **Consider Cross-Cutting Concerns**
   - Authentication via middleware
   - Authorization via role guards
   - Notifications via event system

### API Design

- RESTful endpoints with consistent naming
- Use appropriate HTTP methods and status codes
- Return structured error responses
- Document breaking changes

### Database Design

- Use UUIDs for primary keys
- Add appropriate indexes for query patterns
- Consider soft delete vs hard delete implications
- Plan for data migrations

### Performance Considerations

- Paginate list endpoints
- Use database transactions for multi-step operations
- Consider caching for frequently accessed data
- Optimize N+1 queries

## Code Locations

| Concern | Location |
|---------|----------|
| Architecture docs | `.context/docs/architecture.md` |
| Backend modules | `server/internal/modules/` |
| Frontend features | `client/src/features/` |
| Database schema | `server/migrations/` |
| Shared platform | `server/internal/platform/` |

## Common Tasks

### Adding a New Module

1. Create module directory under `server/internal/modules/`
2. Define models in `models.go`
3. Implement repository in `repository.go`
4. Add business logic in `service.go`
5. Create HTTP handlers in `handler.go`
6. Register routes in `main.go`
7. Add migrations if needed

### Adding a New Feature (Frontend)

1. Create feature directory under `client/src/features/`
2. Define types in `types.ts`
3. Create API calls in `api.ts`
4. Add validation in `schemas.ts`
5. Build components in `components/`
6. Create page components
7. Add routes in `app/routes.tsx`

### Evaluating Architectural Changes

1. Document the problem being solved
2. Consider alternatives with trade-offs
3. Assess impact on existing code
4. Plan migration path if needed
5. Update documentation
