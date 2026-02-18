---
type: skill
name: Security Audit
description: Security review checklist for code and infrastructure
skillSlug: security-audit
phases: [R, V]
generated: 2026-01-29
status: filled
scaffoldVersion: "2.0.0"
---

# Security Audit

## When to Use

Use this skill when reviewing code for security vulnerabilities or auditing the Sistema Financeiro platform.

## Project Security Profile

- **Auth**: JWT (access 15min + refresh 7d), stored in localStorage
- **Roles**: ADMIN, STUDENT, COLLABORATOR, FINANCEIRO
- **Database**: PostgreSQL with parameterized queries (pgx)
- **Payments**: ASAAS integration (PIX), webhook token validation
- **Secrets**: ASAAS keys encrypted in DB via `platform/crypto`
- **Email**: SMTP with password reset tokens

## Audit Checklist

### Authentication & Authorization

- [ ] JWT secret is strong and from environment variable
- [ ] Access token has short lifetime (15min)
- [ ] Refresh tokens are stored in database and cleaned up hourly
- [ ] AuthMiddleware validates JWT on all protected routes
- [ ] RoleGuard correctly restricts routes per role
- [ ] Password reset tokens have expiration
- [ ] Logout invalidates refresh token

### Input Validation

- [ ] All handler inputs validated before service calls
- [ ] SQL queries use parameterized inputs ($1, $2)
- [ ] File uploads validated by type and size
- [ ] No `fmt.Sprintf` in SQL queries
- [ ] Frontend uses Zod schemas for form validation

### Data Protection

- [ ] Passwords hashed with bcrypt
- [ ] ASAAS API keys encrypted in database
- [ ] No PII in log output (emails, CPF, PIX keys)
- [ ] Error responses don't leak internal details
- [ ] DB credentials from environment variables only

### API Security

- [ ] CORS configured with specific origins (not wildcard)
- [ ] ASAAS webhook validates token header
- [ ] No sensitive data in URL query parameters
- [ ] File paths use UUID names (no path traversal)

### Financial Security

- [ ] Escrow: funds locked on order creation, released on approval
- [ ] Withdrawal limits enforced (min/max/daily)
- [ ] Transactions table provides audit trail
- [ ] Wallet balance updates within database transactions
- [ ] Refund logic handles edge cases (already released, cancelled)

### Known Gaps (from security.md)

- Tokens in localStorage (should be HttpOnly cookies)
- No CSRF protection
- No rate limiting
- No CSP headers
- PII stored unencrypted (CPF, PIX keys)

## Critical Flows to Audit

1. **Order creation** -> escrow lock -> wallet update
2. **Order approval** -> payment release -> wallet unlock
3. **Dispute resolution** -> payment adjustment -> wallet rebalance
4. **Withdrawal** -> ASAAS transfer -> balance deduction
5. **Login/refresh** -> token generation -> token storage
