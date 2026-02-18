---
type: skill
name: Pr Review
description: Review pull requests against team standards and best practices
skillSlug: pr-review
phases: [R, V]
generated: 2026-01-29
status: filled
scaffoldVersion: "2.0.0"
---

# PR Review

## When to Use

Use this skill when reviewing pull requests for the Sistema Financeiro project.

## Review Process

### 1. Understand the Change

- Read the PR title and description
- Identify which modules/features are affected
- Check if it's a feature, fix, refactor, or docs change

### 2. Architecture Compliance

**Frontend**:
- [ ] FSD layer rules respected (no cross-feature imports)
- [ ] Pages contain only UI; logic in hooks
- [ ] Components are pure (props-driven)
- [ ] Public API via `index.ts`
- [ ] Path alias `@` used for imports

**Backend**:
- [ ] Clean Architecture maintained (Handler -> Service -> Repository)
- [ ] No business logic in handlers or repositories
- [ ] Routes registered correctly in `main.go`
- [ ] Middleware chain correct (Auth, RoleGuard)

### 3. Code Quality

- [ ] No `any` types in TypeScript
- [ ] No dead code or unused imports
- [ ] No hardcoded strings (use i18n)
- [ ] Error handling with context wrapping (Go)
- [ ] `context.Context` in all I/O functions (Go)
- [ ] File size limits respected (< 1999 lines, components < 200)

### 4. Security

- [ ] Input validation in handlers
- [ ] Parameterized SQL queries
- [ ] No sensitive data in logs or error responses
- [ ] Role-based access enforced
- [ ] File uploads validated

### 5. Performance

- [ ] Server-side pagination for list endpoints
- [ ] No N+1 queries
- [ ] Transactions for multi-table operations
- [ ] Debounce/throttle for search inputs (frontend)

### 6. Testing

- [ ] New business logic has tests
- [ ] Affected existing tests still pass
- [ ] All roles tested if authorization-related

### 7. Commit Quality

- [ ] Follows Conventional Commits: `type(scope): description`
- [ ] Commits are focused (one concern per commit)
- [ ] No `BREAKING CHANGE` without necessity

## Common Issues to Flag

| Issue | Where to Look |
|-------|--------------|
| Missing RoleGuard | `main.go` route registration |
| SQL injection risk | Repository queries using `fmt.Sprintf` |
| Circular dependency | Module imports in Go |
| Stale wallet balance | Missing transaction wrapper |
| Missing event subscription | New feature needs notifications |
| Leaked PII | Log statements with email/CPF |
