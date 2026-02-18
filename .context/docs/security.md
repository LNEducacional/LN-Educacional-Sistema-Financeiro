# Security

## Authentication

### JWT-Based Auth

The system uses JSON Web Tokens for authentication with a dual-token approach:

| Token Type | Lifetime | Purpose |
|------------|----------|---------|
| Access Token | 15 minutes | API authorization |
| Refresh Token | 7 days | Obtain new access tokens |

### Token Flow

```
1. Login: POST /api/auth/login
   -> Receive: { access_token, refresh_token }

2. API Requests: Authorization: Bearer <access_token>

3. Token Refresh: POST /api/auth/refresh
   Body: { refresh_token }
   -> Receive: { access_token, refresh_token }

4. Logout: POST /api/auth/logout
   -> Invalidates refresh token in database
```

### Token Storage

Frontend stores tokens in localStorage:

```typescript
// client/src/features/auth/
localStorage.setItem('access_token', token);
localStorage.setItem('refresh_token', token);
```

### Middleware

Backend middleware chain:

```go
// AuthMiddleware: Validates JWT, extracts user ID and role into context
r.Use(middleware.AuthMiddleware(cfg.JWTSecret))

// RoleGuard: Restricts routes by one or more roles
r.Use(middleware.RoleGuard("ADMIN", "FINANCEIRO"))
```

## Authorization

### Role-Based Access Control (RBAC)

| Route Pattern | Allowed Roles |
|---------------|---------------|
| `/api/auth/*` | Public (no auth required) |
| `/health` | Public |
| `/api/orders/*` | All authenticated |
| `/api/services` (GET) | All authenticated |
| `/api/collaborators` (GET) | All authenticated |
| `/api/ranking/*` | All authenticated |
| `/api/notifications/*` | All authenticated |
| `/api/disputes/*` | All authenticated |
| `/api/production/*` | All authenticated |
| `/api/payment/*` | All authenticated |
| `/admin/settings/*` | ADMIN |
| `/admin/services/*` | ADMIN, FINANCEIRO |
| `/admin/reports/*` | ADMIN, FINANCEIRO |
| `/admin/collaborators/*` | ADMIN, FINANCEIRO |
| `/admin/withdrawals/*` | ADMIN, FINANCEIRO |
| `/api/collaborator/*` | COLLABORATOR |

### Resource Ownership

- Students can only view/modify their own orders
- Collaborators can only view orders assigned to them
- Admins have unrestricted access

## Input Validation

### Backend Validation

Handlers validate all inputs before processing:

```go
// Example: request parsing and validation in handler
type CreateOrderRequest struct {
    ServiceID      string `json:"service_id"`
    CollaboratorID string `json:"collaborator_id"`
    DueDate        string `json:"due_date"`
}
```

### Frontend Validation

Zod 4 schemas validate forms before submission:

```typescript
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
```

## Password Security

### Hashing

Passwords are hashed using bcrypt via `golang.org/x/crypto`:

```go
hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
```

### Password Reset

- SMTP-based email with time-limited reset token
- Requires `SMTP_HOST` and related env vars to be configured
- Falls back gracefully if email service is not configured

### Password Requirements

- Minimum 6 characters
- No complexity requirements currently enforced

## API Security

### CORS

Secure CORS configuration using environment variables:

```go
// middleware/cors.go - configurable per environment
corsConfig := &middleware.CORSConfig{
    AllowedOrigins:   cfg.CORSAllowedOrigins,   // from CORS_ALLOWED_ORIGINS env
    AllowCredentials: cfg.CORSAllowCredentials,  // defaults to true
    MaxAge:           "86400",                   // 24 hours
}
```

Default in development: allows `http://localhost:8082` only.

### Rate Limiting

Currently not implemented. Recommended to add:
- Per-IP rate limiting
- Per-user rate limiting for sensitive endpoints
- Exponential backoff for failed auth attempts

### Request Size Limits

File uploads should be limited to prevent DoS:
- Delivery files: configurable per service type

## Database Security

### Connection

Using environment variables for credentials:

```go
cfg.DBUrl = os.Getenv("DB_URL")
// Format: postgres://user:password@host:port/database?sslmode=disable
```

Docker Compose uses env vars from `.env`:
```yaml
environment:
  - POSTGRES_USER=${POSTGRES_USER}
  - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
  - POSTGRES_DB=${POSTGRES_DB}
```

### Query Safety

Using parameterized queries via pgx to prevent SQL injection:

```go
// Safe - parameterized
row := db.QueryRow(ctx, "SELECT * FROM users WHERE id = $1", userID)
```

### Sensitive Data

| Data | Protection |
|------|------------|
| Passwords | bcrypt hashed |
| JWT Secret | Environment variable |
| ASAAS API Key | Encrypted in database (settings module) |
| ASAAS Webhook Token | Encrypted in database |
| PIX Keys | Stored plain (PII) |
| CPF | Stored plain (PII) |

## File Upload Security

### Allowed Types

Deliveries accept:
- PDF (.pdf)
- Word documents (.docx, .doc)
- Archives (.zip, .rar)

### Storage

Files stored in `server/uploads/` with UUID filenames to prevent path traversal:

```
uploads/
├── 00a1f82e-d008-4c91-9ce1-22a836575785.pdf
├── 05c1e908-fb0d-446f-bb9c-9343f8fc5051.pdf
```

## Webhook Security

### ASAAS Webhooks

Registered as public route, validated using webhook token in header:

```go
// Verify webhook authenticity
token := r.Header.Get("asaas-access-token")
if token != expectedToken {
    return error
}
```

Webhook token can be configured via:
1. Database settings (admin panel) - takes priority
2. `ASAAS_WEBHOOK_TOKEN` environment variable - fallback

## Sensitive Data Handling

### Logging

Avoid logging:
- Passwords
- JWT tokens
- Credit card numbers
- Full CPF/PIX keys

### Error Messages

Don't leak internal details to users:

```go
// Bad
return fmt.Errorf("user %s not found in database", email)

// Good
return ErrInvalidCredentials
```

## Settings Encryption

The settings module encrypts sensitive values (ASAAS keys) before storing in the database:
- Uses `platform/crypto` package
- Encryption key derived from JWT_SECRET
- Decrypted at runtime when needed

## Security Checklist

### Implemented
- [x] JWT authentication with access/refresh tokens
- [x] Password hashing (bcrypt)
- [x] Role-based access control (4 roles)
- [x] Parameterized SQL queries (pgx)
- [x] Input validation in handlers
- [x] Webhook token verification
- [x] Configurable CORS (not wildcard)
- [x] Encrypted settings storage
- [x] Password reset via email token
- [x] Refresh token cleanup worker

### Recommended Improvements
- [ ] HttpOnly cookies for tokens (currently localStorage)
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] Content Security Policy (CSP) with nonce
- [ ] Security headers (HSTS, X-Frame-Options)
- [ ] Audit logging
- [ ] PII encryption at rest (CPF, PIX keys)
- [ ] Two-factor authentication
- [ ] Password complexity requirements
