---
type: skill
name: Documentation
description: Generate and update technical documentation
skillSlug: documentation
phases: [P, C]
generated: 2026-01-29
status: filled
scaffoldVersion: "2.0.0"
---

# Documentation

## When to Use

Use this skill when creating or updating documentation for the Sistema Financeiro project.

## Documentation Locations

| Type | Location | Format |
|------|----------|--------|
| Project rules | `CLAUDE.md` | Markdown (Portuguese) |
| AI context docs | `.context/docs/` | Markdown (English) |
| AI context QA | `.context/docs/qa/` | Markdown with frontmatter |
| Agent specs | `.context/agents/` | Markdown |
| Skills | `.context/skills/*/SKILL.md` | Markdown with frontmatter |

## Documentation Standards

### Language
- `.context/` documentation: English
- `CLAUDE.md`: Portuguese (project rules)
- Code comments (JSDoc): English, LLM-friendly

### JSDoc Format

```typescript
/**
 * Calculates the collaborator's share of an order payment.
 * @param totalValue - The total service price in BRL
 * @param collabPercent - Collaborator percentage (0-100)
 * @returns The collaborator's payment value in BRL
 */
function calculateCollabValue(totalValue: number, collabPercent: number): number
```

```go
// CalculateCommission returns the collaborator's share of the total order value.
// totalValue is in BRL, percent is 0-100.
func (s *Service) CalculateCommission(totalValue float64, percent float64) float64
```

### When to Update Docs

- New module/feature added -> update `architecture.md`, `project-structure.md`
- New API endpoint -> update `api-endpoints.md`
- New env variable -> update `development-workflow.md`, `deployment.md`
- New background worker -> update `background-jobs.md`, `glossary.md`
- Schema change -> update `database.md`, `glossary.md`
- Security change -> update `security.md`

## Checklist

- [ ] Technical accuracy (matches actual code)
- [ ] Versions match `go.mod` and `package.json`
- [ ] All env variables documented with defaults
- [ ] API endpoints match `main.go` route registration
- [ ] Database tables match migration files
- [ ] No stale/outdated information
