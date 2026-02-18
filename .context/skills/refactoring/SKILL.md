---
type: skill
name: Refactoring
description: Safe code refactoring with step-by-step approach
skillSlug: refactoring
phases: [E]
generated: 2026-01-29
status: filled
scaffoldVersion: "2.0.0"
---

# Refactoring

## When to Use

Use this skill when restructuring code without changing behavior in the Sistema Financeiro project.

## Safety Rules

1. **Never change behavior and structure in the same commit**
2. **Verify all callers** before changing function signatures
3. **Run linters after each step**: ESLint (frontend), golangci-lint (backend)
4. **Check TypeScript types**: `tsc --noEmit`
5. **Test affected flows** with all relevant roles

## Common Refactoring Patterns

### Frontend

| Pattern | When | Example |
|---------|------|---------|
| Extract hook | Page has too much logic | `useOrdersPage()` from `OrdersPage.tsx` |
| Extract component | Component > 200 lines | Split large forms into sub-components |
| Move to shared | Used by 2+ features | Move util to `lib/` or component to `components/ui/` |
| Consolidate types | Duplicate interfaces | Single source in `types.ts` |

### Backend

| Pattern | When | Example |
|---------|------|---------|
| Extract service method | Handler has business logic | Move from handler to service |
| Break circular deps | Module A imports B and B imports A | Use adapter pattern (like `OrderRepoAdapter`) |
| Extract repository query | Inline SQL in service | Move to repository method |
| Consolidate errors | Repeated error handling | Define error types in models.go |

## Step-by-Step Process

### 1. Identify Scope
- List all files that will change
- List all callers/imports affected
- Check for cross-module dependencies

### 2. Plan Changes
- Describe what moves where
- Identify if any public API changes
- Note if routes or middleware need updating

### 3. Execute
- Make structural changes only (no behavior changes)
- Update all imports/callers
- Run linters and type checks

### 4. Verify
- All tests pass
- Manual testing of affected flows
- No dead code left behind

## Project-Specific Notes

- **FSD isolation**: Never create cross-imports between sibling features
- **Adapter pattern**: Used in `main.go` for breaking circular deps (UserInfoAdapter, OrderRepoAdapter)
- **Public API**: Features export only through `index.ts`
- **Hard deletes**: If removing code, remove completely (no soft-delete pattern for code)

## Checklist

- [ ] No behavior change (refactoring only)
- [ ] All imports updated
- [ ] No dead code remaining
- [ ] Linters pass (ESLint + golangci-lint)
- [ ] TypeScript types check (`tsc --noEmit`)
- [ ] Affected flows manually tested
