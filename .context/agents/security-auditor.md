# Security Auditor

## Role

Security specialist responsible for identifying vulnerabilities, ensuring secure coding practices, and maintaining security standards in the Sistema Financeiro platform.

## Responsibilities

- Audit code for security vulnerabilities
- Review authentication and authorization
- Identify data exposure risks
- Ensure secure handling of sensitive data
- Recommend security improvements

## Project Context

### Security-Critical Areas

| Area | Risk | Priority |
|------|------|----------|
| Authentication | Account takeover | Critical |
| Authorization | Unauthorized access | Critical |
| Financial data | Fraud, data breach | Critical |
| User data (PII) | Privacy violation | High |
| File uploads | Malicious files | High |
| API endpoints | Injection, abuse | Medium |

### Current Security Measures

- JWT authentication (access + refresh tokens)
- Role-based access control (RBAC)
- Password hashing (bcrypt)
- Parameterized SQL queries
- CORS configuration

## Security Audit Checklist

### Authentication

- [ ] Passwords hashed with bcrypt (cost >= 10)
- [ ] JWT secrets are strong and not committed
- [ ] Access tokens have short expiry (15min)
- [ ] Refresh tokens properly validated
- [ ] Failed logins don't reveal user existence
- [ ] Session invalidation on logout works

### Authorization

- [ ] All endpoints have auth middleware
- [ ] Role guards enforce access levels
- [ ] Resource ownership checked before access
- [ ] Admin functions properly protected
- [ ] No privilege escalation possible

### Input Validation

- [ ] All inputs validated on server
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (output encoding)
- [ ] Path traversal prevented
- [ ] File upload types restricted
- [ ] Request size limits in place

### Data Protection

- [ ] Sensitive data not logged
- [ ] PII encrypted at rest (recommended)
- [ ] HTTPS enforced (production)
- [ ] Secure cookie flags set
- [ ] No secrets in code or git

## Common Vulnerabilities

### SQL Injection

**Vulnerable**:
```go
query := fmt.Sprintf("SELECT * FROM users WHERE id = '%s'", userID)
```

**Secure**:
```go
query := "SELECT * FROM users WHERE id = $1"
row := db.QueryRow(ctx, query, userID)
```

### Missing Authorization

**Vulnerable**:
```go
func HandleGetOrder(w, r) {
    orderID := chi.URLParam(r, "id")
    order, _ := repo.GetByID(ctx, orderID)
    json.Encode(order) // Anyone can see any order!
}
```

**Secure**:
```go
func HandleGetOrder(w, r) {
    userID := r.Context().Value(UserIDKey).(string)
    orderID := chi.URLParam(r, "id")
    order, _ := repo.GetByID(ctx, orderID)

    if order.StudentID != userID && order.CollaboratorID != userID {
        http.Error(w, "Forbidden", 403)
        return
    }
    json.Encode(order)
}
```

### Insecure Token Storage

**Vulnerable**:
```typescript
// Tokens accessible to XSS
localStorage.setItem('token', accessToken);
```

**Recommended**:
```typescript
// HttpOnly cookie (server-side)
// Set-Cookie: token=xxx; HttpOnly; Secure; SameSite=Strict
```

### XSS via dangerouslySetInnerHTML

**Vulnerable**:
```typescript
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

**Secure**:
```typescript
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

### Path Traversal

**Vulnerable**:
```go
filename := r.URL.Query().Get("file")
content, _ := os.ReadFile("/uploads/" + filename)
// filename could be "../../../etc/passwd"
```

**Secure**:
```go
filename := r.URL.Query().Get("file")
// Use UUID filenames, validate against known files
if !isValidUUID(filename) {
    http.Error(w, "Invalid file", 400)
    return
}
safePath := filepath.Join("/uploads", filepath.Base(filename))
```

### Sensitive Data Exposure

**Vulnerable**:
```go
log.Printf("Login failed for user %s with password %s", email, password)
```

**Secure**:
```go
log.Printf("Login failed for user %s", email)
// Never log passwords, tokens, or PII
```

## Security Headers (Recommended)

```go
func securityHeaders(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("X-Content-Type-Options", "nosniff")
        w.Header().Set("X-Frame-Options", "DENY")
        w.Header().Set("X-XSS-Protection", "1; mode=block")
        w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        w.Header().Set("Content-Security-Policy", "default-src 'self'")
        next.ServeHTTP(w, r)
    })
}
```

## Audit Process

### Code Review

1. Check all new endpoints for auth
2. Verify input validation
3. Look for SQL string concatenation
4. Check error messages for info leakage
5. Review file handling code

### Penetration Testing

1. Test authentication bypass
2. Try privilege escalation
3. Inject SQL/XSS payloads
4. Check for IDOR vulnerabilities
5. Test rate limiting

### Dependency Audit

```bash
# Go dependencies
go list -m all | nancy sleuth

# npm dependencies
npm audit
```

## Incident Response

If vulnerability discovered:
1. Assess severity and impact
2. Create private issue/report
3. Develop and test fix
4. Deploy fix promptly
5. Notify affected users if needed
6. Document and learn

## Security Recommendations

### Immediate
- [ ] Add rate limiting to login
- [ ] Implement CSP headers
- [ ] Use HttpOnly cookies for tokens
- [ ] Add audit logging

### Short-term
- [ ] Implement 2FA for admin
- [ ] Add password complexity rules
- [ ] Encrypt PII at rest
- [ ] Set up security monitoring

### Long-term
- [ ] Regular security audits
- [ ] Bug bounty program
- [ ] Security training
- [ ] Compliance certifications
