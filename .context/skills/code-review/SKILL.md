---
type: skill
name: Code Review
description: Review code quality, patterns, and best practices
skillSlug: code-review
phases: [R, V]
generated: 2026-01-29
status: filled
scaffoldVersion: "2.0.0"
---

# Code Review

## When to Use

Use this skill when reviewing code changes for quality, correctness, and adherence to project standards.

## Project Standards (from CLAUDE.md)

### Frontend (TypeScript/React)

- 100% typed, no `any` (use generics when needed)
- Files max 1999 lines, components preferably < 200 lines
- Pages: only UI/JSX; logic in `usePageName()` hooks
- FSD layer enforcement: no cross-imports between sibling slices
- Public API via `index.ts` only
- Path alias `@` for imports from `src/`
- Tailwind CSS 4 for styling, `cn()` for conditional classes
- Zod 4 for validation schemas
- React Hook Form for forms
- ESLint must pass

### Backend (Go)

- Clean Architecture: Handler -> Service -> Repository
- No business logic in handlers or repositories
- `context.Context` in all I/O functions
- Error wrapping with context: `fmt.Errorf("...: %w", err)`
- Transactions for multi-step operations
- Parameterized SQL queries (no string concatenation)
- golangci-lint must pass (gosec, errcheck, bodyclose)

### Security

- No sensitive data in error responses or logs
- Input validation in handlers before calling services
- Role checks via middleware
- JWT tokens not exposed in responses beyond login

## Review Checklist

### Correctness
- [ ] Logic handles success, error, and edge cases
- [ ] Database queries use parameterized inputs
- [ ] Transactions used for multi-table operations
- [ ] Error handling doesn't leak internal details

### Architecture
- [ ] Code in the correct layer (handler/service/repository)
- [ ] No circular dependencies between modules
- [ ] Feature module follows FSD structure (frontend)
- [ ] Public API exported via index.ts (frontend)

### Quality
- [ ] No `any` types (TypeScript)
- [ ] No dead code or unused imports
- [ ] No hardcoded text (use i18n)
- [ ] Conventional commit message format

### Performance
- [ ] Server-side pagination for list endpoints
- [ ] No N+1 queries
- [ ] Debounce/throttle for search inputs (frontend)

### Security
- [ ] Inputs validated
- [ ] Role-based access enforced
- [ ] No PII in logs
- [ ] SQL injection prevented (parameterized queries)
