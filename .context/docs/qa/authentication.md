---
slug: authentication
category: features
generatedAt: 2026-01-29T04:11:07.648Z
updatedAt: 2026-02-02
relevantFiles:
  - server/internal/modules/users/handler.go
  - server/internal/modules/users/service.go
  - server/internal/platform/middleware/auth.go
  - client/src/features/auth/types.ts
  - client/src/features/auth/schemas.ts
  - client/src/features/auth/api.ts
---

# How does authentication work?

## Authentication Flow

### JWT Dual-Token System

The system uses two tokens:

1. **Access Token** (15 min): Short-lived JWT sent in `Authorization: Bearer` header for API requests. Contains `user_id` and `role` claims.

2. **Refresh Token** (7 days): Long-lived token stored in the `refresh_tokens` database table. Used to obtain new access tokens without re-login.

### Login Flow

```
1. POST /api/auth/login { email, password }
2. Server validates credentials (bcrypt comparison)
3. Server generates access_token (JWT) + refresh_token (random UUID)
4. Refresh token saved to database
5. Response: { access_token, refresh_token, user }
```

### Token Refresh Flow

```
1. POST /api/auth/refresh { refresh_token }
2. Server looks up refresh_token in database
3. If valid and not expired, generates new access_token + refresh_token
4. Old refresh token deleted, new one saved
5. Response: { access_token, refresh_token }
```

### Password Reset Flow

```
1. POST /api/auth/forgot-password { email }
2. Server generates reset token (stored in DB)
3. SMTP email sent with reset link (requires SMTP config)
4. POST /api/auth/reset-password { token, new_password }
5. Server validates token, updates password hash
```

### Middleware

- **AuthMiddleware** (`platform/middleware/auth.go`): Validates JWT, extracts `user_id` and `role` into request context
- **RoleGuard** (`platform/middleware/auth.go`): Checks if user's role is in the allowed list

### Frontend Auth State

```typescript
// client/src/features/auth/types.ts
interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
}
```

### Token Storage (Frontend)

Tokens are stored in `localStorage`:
- `access_token` - JWT access token
- `refresh_token` - Refresh token string

### Automatic Token Refresh

The axios interceptor in `lib/axios.ts` automatically:
1. Detects 401 responses
2. Attempts token refresh
3. Retries the failed request with new token
4. Redirects to login if refresh fails

### Background Cleanup

A goroutine runs every hour to delete expired refresh tokens from the database, preventing table bloat.
