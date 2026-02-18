# Testing Strategy

## Overview

The project follows a testing pyramid approach with emphasis on integration tests for critical business flows.

## Test Types

### Unit Tests

**Backend (Go)**
- Test individual functions and methods
- Mock external dependencies
- Focus on business logic in service layer

```go
func TestCalculateCommission(t *testing.T) {
    service := NewService(mockRepo)
    result := service.CalculateCommission(1000, 60)
    assert.Equal(t, 600.0, result)
}
```

**Frontend (TypeScript)**
- Test utility functions
- Test hooks with React Testing Library
- Test component rendering

```typescript
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

test('renders badge with correct variant', () => {
  render(<Badge variant="success">Approved</Badge>);
  expect(screen.getByText('Approved')).toHaveClass('bg-green-500');
});
```

### Integration Tests

**API Integration**
- Test complete request/response cycles
- Use test database
- Verify database state changes

```go
func TestCreateOrder_Integration(t *testing.T) {
    // Setup test database
    db := setupTestDB(t)
    defer cleanupTestDB(db)

    // Make request
    resp := httptest.NewRecorder()
    req := httptest.NewRequest("POST", "/api/orders", body)
    router.ServeHTTP(resp, req)

    // Verify response
    assert.Equal(t, http.StatusCreated, resp.Code)

    // Verify database
    var count int
    db.QueryRow("SELECT COUNT(*) FROM orders").Scan(&count)
    assert.Equal(t, 1, count)
}
```

### End-to-End Tests

Manual testing using test credentials:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@test.com | password123 |
| Student | student@test.com | password123 |
| Collaborator | collaborator@test.com | password123 |

## Test Coverage Areas

### Critical Paths (Must Test)

1. **Authentication Flow**
   - Login with valid credentials
   - Login with invalid credentials
   - Token refresh
   - Logout

2. **Order Lifecycle**
   - Order creation
   - Status transitions
   - Delivery upload
   - Approval/revision flow

3. **Escrow System**
   - Balance locked on order creation
   - Balance released on approval
   - Balance refunded on cancellation

4. **Financial Calculations**
   - Commission splits
   - Wallet balance updates
   - Transaction recording

5. **Authorization**
   - Role-based route access
   - Resource ownership checks

### Secondary Paths (Should Test)

- Ranking calculations
- Notification delivery
- Delinquency detection
- Dispute workflow
- File upload/download

## Test Data

### Fixtures

Create consistent test data:

```sql
-- Test users
INSERT INTO users (id, name, email, password_hash, role)
VALUES
  ('admin-1', 'Admin User', 'admin@test.com', '$2a$10$...', 'ADMIN'),
  ('student-1', 'Test Student', 'student@test.com', '$2a$10$...', 'STUDENT'),
  ('collab-1', 'Test Collaborator', 'collaborator@test.com', '$2a$10$...', 'COLLABORATOR');

-- Test services
INSERT INTO services (id, name, total_value, collab_percent, company_percent)
VALUES ('service-1', 'TCC Direito', 2000, 60, 40);
```

### Database Seeding

For development, seed with realistic data:

```bash
# Run seed script
make seed-db
```

## Quality Gates

### Pre-Commit

1. TypeScript type checking passes
2. BiomeJS lint passes
3. Go lint passes
4. Unit tests pass

### Pre-Merge

1. All quality gates pass
2. Integration tests pass
3. No new security vulnerabilities
4. Code review approved

### Checklist

Before marking a task complete:

- [ ] TypeScript types checked (`tsc --noEmit`)
- [ ] Frontend linting passed (`biome check`)
- [ ] Backend linting passed (`golangci-lint run`)
- [ ] New code has test coverage
- [ ] Existing tests still pass
- [ ] Manual testing of affected flows
- [ ] No console errors in browser

## Running Tests

### Backend

```bash
cd server

# Run all tests
go test ./...

# Run with coverage
go test -cover ./...

# Run specific package
go test ./internal/modules/orders/...

# Verbose output
go test -v ./...
```

### Frontend

```bash
cd client

# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Mocking

### Backend Mocks

Use interfaces for dependency injection:

```go
type Repository interface {
    GetByID(ctx context.Context, id string) (*Order, error)
}

type MockRepository struct {
    GetByIDFunc func(ctx context.Context, id string) (*Order, error)
}

func (m *MockRepository) GetByID(ctx context.Context, id string) (*Order, error) {
    return m.GetByIDFunc(ctx, id)
}
```

### Frontend Mocks

Mock API responses:

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/orders', (req, res, ctx) => {
    return res(ctx.json([{ id: '1', status: 'NOVO' }]));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Test Naming Conventions

### Backend

```go
func TestFunctionName_Scenario_ExpectedResult(t *testing.T)

// Examples
func TestCreateOrder_ValidInput_ReturnsOrder(t *testing.T)
func TestCreateOrder_InvalidService_ReturnsError(t *testing.T)
func TestApproveOrder_AlreadyApproved_ReturnsError(t *testing.T)
```

### Frontend

```typescript
describe('ComponentName', () => {
  it('should render correctly with default props', () => {});
  it('should handle click events', () => {});
  it('should display error state', () => {});
});
```

## Debugging Failed Tests

1. Check test output for specific failure
2. Run single test with verbose flag
3. Add logging/breakpoints
4. Check test data state
5. Verify mocks are correctly configured
