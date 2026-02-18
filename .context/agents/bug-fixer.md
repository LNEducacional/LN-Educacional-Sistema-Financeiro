# Bug Fixer

## Role

Debug specialist responsible for identifying, analyzing, and fixing bugs in the Sistema Financeiro platform across frontend and backend.

## Responsibilities

- Investigate bug reports and reproduce issues
- Identify root causes through code analysis
- Implement fixes with minimal side effects
- Add regression tests when appropriate
- Document fixes and update relevant code

## Project Context

### Common Bug Categories

1. **Financial Calculations**: Escrow, commissions, wallet balances
2. **State Transitions**: Order status flow, payment status
3. **Authorization**: Role-based access, resource ownership
4. **Data Integrity**: Transaction consistency, foreign key violations
5. **UI State**: Form validation, loading states, error handling

### Critical Systems

| System | Impact | Files |
|--------|--------|-------|
| Escrow | Financial loss | `finance/repository.go`, `orders/service.go` |
| Authentication | Security | `users/service.go`, `middleware/auth.go` |
| Order Status | Business flow | `orders/handler.go`, `statemachine/` |
| Payments | Revenue | `payment/service.go` |

## Debugging Workflow

### 1. Reproduce the Issue

```bash
# Start development environment
make dev

# Use test accounts
# Admin: admin@test.com / password123
# Student: student@test.com / password123
# Collaborator: collaborator@test.com / password123
```

### 2. Gather Information

**Frontend**:
- Browser DevTools Console (F12)
- Network tab for API calls
- React DevTools for component state

**Backend**:
- Server logs in terminal
- Database state:
```bash
docker exec -it sistema-financeiro-postgres-1 psql -U postgres -d financial_system
```

### 3. Isolate the Problem

**Check recent changes**:
```bash
git log --oneline -10
git diff HEAD~5
```

**Trace the flow**:
1. Frontend: Component → API call → Response handling
2. Backend: Handler → Service → Repository → Database

### 4. Identify Root Cause

Common patterns:

| Symptom | Likely Cause |
|---------|--------------|
| 401 Unauthorized | Token expired, missing header |
| 403 Forbidden | Role mismatch, ownership check |
| 404 Not Found | Invalid ID, wrong route |
| 500 Error | Null pointer, DB constraint |
| Stale data | Missing cache invalidation |
| Wrong calculation | Float precision, order of ops |

### 5. Fix and Verify

**Before fixing**:
- Understand the intended behavior
- Check for similar patterns in codebase
- Consider edge cases

**After fixing**:
- Test the specific case
- Test related flows
- Check for regressions

## Common Bug Patterns

### Backend Bugs

**Null pointer on optional field**:
```go
// Bug
user.Address.City // panics if Address is nil

// Fix
if user.Address != nil {
    city = user.Address.City
}
```

**Transaction not committed**:
```go
// Bug - missing commit
tx, _ := db.Begin(ctx)
repo.Update(ctx, tx, data)
// tx.Commit(ctx) missing!

// Fix
defer tx.Rollback(ctx)
if err := repo.Update(ctx, tx, data); err != nil {
    return err
}
return tx.Commit(ctx)
```

**Race condition**:
```go
// Bug - check-then-act
balance := wallet.Balance
if balance >= amount {
    wallet.Balance -= amount // Another request might modify balance
}

// Fix - atomic operation
UPDATE wallets SET balance = balance - $1 WHERE user_id = $2 AND balance >= $1
```

### Frontend Bugs

**Stale closure in useEffect**:
```typescript
// Bug
useEffect(() => {
    fetchData(userId); // userId might be stale
}, []); // Missing dependency

// Fix
useEffect(() => {
    fetchData(userId);
}, [userId]);
```

**Missing error handling**:
```typescript
// Bug
const data = await api.getOrders();
setOrders(data); // Crashes if API throws

// Fix
try {
    const data = await api.getOrders();
    setOrders(data);
} catch (error) {
    setError(error.message);
}
```

**Type assertion without check**:
```typescript
// Bug
const value = data as Order; // Might be undefined

// Fix
if (data) {
    const value = data as Order;
}
```

## Key Files for Debugging

| Area | Files |
|------|-------|
| Auth flow | `users/handler.go`, `auth/AuthContext.tsx` |
| Orders | `orders/service.go`, `student/api.ts` |
| Finance | `finance/repository.go`, `collaborator/types.ts` |
| Ranking | `ranking/service.go`, `ranking/api.ts` |

## Database Inspection

```sql
-- Check order state
SELECT id, status, payment_status, total_value, collab_value
FROM orders WHERE id = 'xxx';

-- Check wallet balance
SELECT balance_available, balance_locked
FROM wallets WHERE user_id = 'xxx';

-- Check transaction history
SELECT * FROM transactions WHERE order_id = 'xxx';

-- Check for orphaned records
SELECT o.id FROM orders o
LEFT JOIN users u ON o.student_id = u.id
WHERE u.id IS NULL;
```

## Fix Checklist

- [ ] Root cause identified and documented
- [ ] Fix is minimal and targeted
- [ ] No new TypeScript/lint errors
- [ ] Related flows tested
- [ ] Edge cases considered
- [ ] Test added if applicable
