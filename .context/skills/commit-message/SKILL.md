---
type: skill
name: Commit Message
description: Generate commit messages following conventional commits with scope detection
skillSlug: commit-message
phases: [E, C]
generated: 2026-01-29
status: filled
scaffoldVersion: "2.0.0"
---

# Commit Message

## When to Use

Use this skill when generating commit messages for changes in the Sistema Financeiro project.

## Format

```
type(scope): description

[optional body]

[optional BREAKING CHANGE: description]
```

## Types

| Type | When to Use |
|------|-------------|
| `feat` | New feature or functionality |
| `fix` | Bug fix |
| `refactor` | Code restructuring without behavior change |
| `docs` | Documentation changes |
| `style` | Formatting, linting (no logic change) |
| `test` | Adding or fixing tests |
| `chore` | Build, CI, tooling changes |
| `perf` | Performance improvements |

## Scope Detection

Detect scope from the files changed:

| Files Changed | Scope |
|--------------|-------|
| `client/src/features/auth/*` | `auth` |
| `client/src/features/orders/*` | `orders` |
| `client/src/features/admin/*` | `admin` |
| `client/src/features/disputes/*` | `disputes` |
| `client/src/features/ranking/*` | `ranking` |
| `client/src/features/production/*` | `production` |
| `client/src/features/notifications/*` | `notifications` |
| `client/src/features/services/*` | `services` |
| `client/src/features/student/*` | `student` |
| `client/src/features/collaborator/*` | `collaborator` |
| `client/src/components/*` | `ui` |
| `client/src/lib/*` | `lib` |
| `server/internal/modules/orders/*` | `orders` |
| `server/internal/modules/users/*` | `auth` |
| `server/internal/modules/finance/*` | `finance` |
| `server/internal/modules/payment/*` | `payment` |
| `server/internal/modules/admin/*` | `admin` |
| `server/internal/modules/disputes/*` | `disputes` |
| `server/internal/modules/ranking/*` | `ranking` |
| `server/internal/modules/settings/*` | `settings` |
| `server/internal/platform/*` | `platform` |
| `server/migrations/*` | `db` |
| Multiple areas | Use most relevant or omit scope |

## Examples

```
feat(orders): add revision request endpoint
fix(auth): handle expired refresh token gracefully
refactor(finance): extract wallet update into transaction
docs(readme): update deployment instructions
chore(db): add migration for dispute_evidence table
perf(ranking): optimize monthly ranking query with index
feat(payment): integrate ASAAS withdrawal processing
fix(notifications): prevent duplicate SSE connections
```

## Rules

1. Use imperative mood ("add" not "added")
2. Keep first line under 72 characters
3. Don't end with a period
4. Add `BREAKING CHANGE:` footer when changing public contracts/endpoints
