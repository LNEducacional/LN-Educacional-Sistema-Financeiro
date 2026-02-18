---
type: skill
name: Api Design
description: Design RESTful APIs following best practices
skillSlug: api-design
phases: [P, R]
generated: 2026-01-29
status: filled
scaffoldVersion: "2.0.0"
---

# API Design

## When to Use

Use this skill when designing new API endpoints or reviewing existing endpoint designs for the Sistema Financeiro platform.

## Project Context

- **Backend**: Go 1.24 + chi/v5 router
- **Database**: PostgreSQL 15 via pgx/v5
- **Auth**: JWT (access + refresh tokens) via middleware
- **Architecture**: Clean Architecture (Handler -> Service -> Repository)

## Instructions

### 1. Route Registration

Register routes in `server/cmd/api/main.go` following the existing pattern:

```go
// Protected route group
r.Group(func(r chi.Router) {
    r.Use(middleware.AuthMiddleware(cfg.JWTSecret))
    r.Route("/api/resource", handler.RegisterRoutes)
})

// Role-restricted group
r.Group(func(r chi.Router) {
    r.Use(middleware.RoleGuard("ADMIN", "FINANCEIRO"))
    r.Route("/admin/resource", handler.RegisterRoutes)
})
```

### 2. Handler Design

```go
func (h *Handler) RegisterRoutes(r chi.Router) {
    r.Get("/", h.List)
    r.Post("/", h.Create)
    r.Get("/{id}", h.GetByID)
    r.Put("/{id}", h.Update)
    r.Delete("/{id}", h.Delete)
}
```

### 3. Request/Response Conventions

- Parse JSON body with `json.NewDecoder(r.Body).Decode(&req)`
- Validate inputs in handler before calling service
- Return JSON with `json.NewEncoder(w).Encode(response)`
- Use appropriate HTTP status codes (201 Created, 400 Bad Request, 404 Not Found)
- Extract user context: `r.Context().Value(middleware.UserIDKey).(string)`

### 4. URL Patterns

| Pattern | Example | Notes |
|---------|---------|-------|
| List | `GET /api/orders` | Server-side pagination required |
| Create | `POST /api/orders` | Return 201 with created resource |
| Get | `GET /api/orders/{id}` | Return 404 if not found |
| Update | `PUT /api/orders/{id}` | Validate ownership |
| Action | `POST /api/orders/{id}/approve` | Use verbs for actions |

### 5. Error Response Format

```json
{
  "error": "Human-readable message without internal details"
}
```

### 6. Pagination

```
GET /api/orders?page=1&limit=20
Response: { "data": [...], "total": 100, "page": 1, "limit": 20 }
```

## Checklist

- [ ] Endpoint follows RESTful conventions
- [ ] Auth middleware applied correctly
- [ ] Role guard matches route requirements
- [ ] Input validation in handler
- [ ] Proper HTTP status codes
- [ ] No sensitive data in error responses
- [ ] Server-side pagination for list endpoints
- [ ] Route registered in main.go
