---
type: skill
name: Test Generation
description: Generate comprehensive test cases for code
skillSlug: test-generation
phases: [E, V]
generated: 2026-01-29
status: filled
scaffoldVersion: "2.0.0"
---

# Test Generation

## When to Use

Use this skill when generating tests for new or modified code in the Sistema Financeiro project.

## Testing Strategy

### Backend (Go)

**Location**: Tests live alongside source files (`*_test.go`)

**Naming**: `TestFunctionName_Scenario_ExpectedResult`

```go
func TestCreateOrder_ValidInput_ReturnsOrder(t *testing.T) { ... }
func TestCreateOrder_InvalidService_ReturnsError(t *testing.T) { ... }
func TestApproveOrder_AlreadyApproved_ReturnsError(t *testing.T) { ... }
```

**Running**:
```bash
cd server
go test ./...                                    # All tests
go test -v ./internal/modules/orders/...        # Single module
go test -cover ./...                             # With coverage
```

**Mock pattern**: Interface-based dependency injection
```go
type MockRepository struct {
    GetByIDFunc func(ctx context.Context, id string) (*Order, error)
}

func (m *MockRepository) GetByID(ctx context.Context, id string) (*Order, error) {
    return m.GetByIDFunc(ctx, id)
}
```

### Frontend (TypeScript)

**Running**:
```bash
cd client
npm test
```

**Component testing**:
```typescript
import { render, screen } from '@testing-library/react';

describe('ComponentName', () => {
  it('should render correctly with default props', () => { ... });
  it('should handle user interactions', () => { ... });
  it('should display error state', () => { ... });
});
```

## Critical Test Cases by Module

### Orders
- Create order: valid input, invalid service, invalid collaborator
- Status transitions: valid (NOVO->EM_ANDAMENTO), invalid (NOVO->CONCLUIDO)
- Approval: balance released, wallet updated, transaction created
- Cancellation: refund processed, wallet updated

### Finance/Wallet
- Lock balance: correct amount, insufficient funds
- Release balance: locked->available, transaction recorded
- Refund: locked->refunded, wallet updated

### Authentication
- Login: valid credentials, invalid password, non-existent user
- Token refresh: valid token, expired token, revoked token
- Password reset: valid token, expired token

### Payment
- Withdrawal: sufficient balance, exceeds limits, ASAAS error
- Payout processing: successful transfer, failed transfer

### Disputes
- Open dispute: valid order, already disputed
- Resolution: with payment adjustment, without adjustment

## Test Data

```sql
-- Standard test users
Admin: admin@test.com / password123
Student: student@test.com / password123
Collaborator: collaborator@test.com / password123
Financeiro: financeiro@test.com / password123
```

## Checklist

- [ ] Success case tested
- [ ] Error/failure cases tested
- [ ] Edge cases tested (empty, nil, boundary values)
- [ ] All roles tested (if authorization-dependent)
- [ ] Database state verified (for integration tests)
- [ ] No flaky tests (deterministic)
