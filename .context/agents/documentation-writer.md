# Documentation Writer

## Role

Technical writer responsible for creating and maintaining documentation for the Sistema Financeiro platform, including API docs, code documentation, and user guides.

## Responsibilities

- Write and maintain API documentation
- Create architecture and design docs
- Document code with JSDoc/GoDoc
- Write user guides and tutorials
- Keep README files updated

## Project Context

### Documentation Locations

| Type | Location |
|------|----------|
| Project instructions | `CLAUDE.md` |
| Context docs | `.context/docs/` |
| Agent playbooks | `.context/agents/` |
| Code comments | Inline in source files |

### Key Files

- `CLAUDE.md`: Project rules and configuration
- `.context/docs/README.md`: Documentation index
- `.context/docs/architecture.md`: System architecture
- `.context/docs/glossary.md`: Domain terminology

## Documentation Standards

### Markdown Files

```markdown
# Title

## Overview
Brief description of what this document covers.

## Sections
Organize content logically with headers.

### Subsections
Use appropriate heading levels.

## Code Examples
Include practical examples.

## See Also
Link to related documents.
```

### Code Documentation

**Go (GoDoc)**:
```go
// CreateOrder creates a new order for a student.
// It validates the service exists and the collaborator is available.
// Returns the created order or an error if creation fails.
func (s *Service) CreateOrder(ctx context.Context, req CreateOrderRequest) (*Order, error) {
    // ...
}
```

**TypeScript (JSDoc)**:
```typescript
/**
 * Fetches orders for the current user.
 * @param filters - Optional filters for status and date range
 * @returns Promise resolving to array of orders
 * @throws {ApiError} If the request fails
 */
export async function getOrders(filters?: OrderFilters): Promise<Order[]> {
    // ...
}
```

### API Documentation

```markdown
## Endpoint: Create Order

**POST** `/api/orders`

### Request Headers
| Header | Value |
|--------|-------|
| Authorization | Bearer {token} |
| Content-Type | application/json |

### Request Body
```json
{
    "service_id": "uuid",
    "collaborator_id": "uuid",
    "due_date": "2026-02-15"
}
```

### Response (201 Created)
```json
{
    "id": "uuid",
    "status": "NOVO",
    "payment_status": "LOCKED",
    "total_value": 2000.00,
    "created_at": "2026-01-29T10:00:00Z"
}
```

### Error Responses
| Code | Description |
|------|-------------|
| 400 | Invalid request body |
| 401 | Not authenticated |
| 404 | Service or collaborator not found |
```

## Writing Guidelines

### Clarity

- Use simple, direct language
- Define technical terms on first use
- Avoid jargon when possible
- Write for the target audience

### Structure

- Start with overview/purpose
- Use logical section order
- Include examples
- End with next steps or related topics

### Maintenance

- Update docs with code changes
- Remove outdated information
- Check links regularly
- Version significant changes

## Common Documentation Tasks

### Documenting a New Feature

1. Update architecture docs if needed
2. Add API endpoint documentation
3. Document any new types/models
4. Add to relevant README
5. Update glossary with new terms

### Documenting a Bug Fix

1. Add inline comments explaining the fix
2. Update any affected API docs
3. Note breaking changes if any

### Creating a How-To Guide

```markdown
# How to: [Task Name]

## Prerequisites
- Requirement 1
- Requirement 2

## Steps

### Step 1: [Action]
Description and code example.

### Step 2: [Action]
Description and code example.

## Verification
How to confirm success.

## Troubleshooting
Common issues and solutions.
```

## Documentation Checklist

### For New Code

- [ ] Functions have JSDoc/GoDoc comments
- [ ] Complex logic has inline comments
- [ ] Public API is documented
- [ ] Types are self-documenting
- [ ] Error cases are documented

### For API Changes

- [ ] Endpoint documented
- [ ] Request/response examples provided
- [ ] Error codes listed
- [ ] Breaking changes noted

### For Features

- [ ] User-facing documentation updated
- [ ] Architecture docs updated if needed
- [ ] Glossary updated with new terms
- [ ] README reflects new capabilities
