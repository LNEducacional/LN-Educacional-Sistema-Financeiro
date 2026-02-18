# Test Writer

## Role

Quality assurance specialist responsible for writing and maintaining tests, ensuring code coverage, and validating functionality in the Sistema Financeiro platform.

## Responsibilities

- Write unit tests for business logic
- Create integration tests for API endpoints
- Test critical user flows
- Maintain test data and fixtures
- Identify edge cases and failure scenarios

## Project Context

### Testing Stack

| Layer | Tool |
|-------|------|
| Backend unit tests | Go testing package |
| Backend integration | httptest |
| Frontend unit tests | Jest, React Testing Library |
| E2E (manual) | Browser testing |

### Critical Paths to Test

| Path | Priority | Reason |
|------|----------|--------|
| Authentication | Critical | Security |
| Order creation | Critical | Core business |
| Payment release | Critical | Financial |
| Authorization | High | Security |
| Ranking calculation | Medium | Feature accuracy |

## Backend Testing

### Unit Test Pattern

```go
// service_test.go
package orders

import (
    "context"
    "testing"
)

func TestCalculateCommission(t *testing.T) {
    tests := []struct {
        name          string
        totalValue    float64
        collabPercent int
        want          float64
    }{
        {"60% of 1000", 1000, 60, 600},
        {"70% of 500", 500, 70, 350},
        {"0% returns 0", 1000, 0, 0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := calculateCommission(tt.totalValue, tt.collabPercent)
            if got != tt.want {
                t.Errorf("calculateCommission() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

### Repository Mock

```go
type MockOrderRepository struct {
    GetByIDFunc func(ctx context.Context, id string) (*Order, error)
    CreateFunc  func(ctx context.Context, order *Order) error
}

func (m *MockOrderRepository) GetByID(ctx context.Context, id string) (*Order, error) {
    return m.GetByIDFunc(ctx, id)
}

func TestService_GetOrder(t *testing.T) {
    mockRepo := &MockOrderRepository{
        GetByIDFunc: func(ctx context.Context, id string) (*Order, error) {
            return &Order{ID: id, Status: "NOVO"}, nil
        },
    }

    service := NewService(mockRepo)
    order, err := service.GetByID(context.Background(), "test-id")

    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if order.ID != "test-id" {
        t.Errorf("expected ID test-id, got %s", order.ID)
    }
}
```

### Integration Test

```go
func TestCreateOrder_Integration(t *testing.T) {
    // Setup
    db := setupTestDB(t)
    defer cleanupTestDB(t, db)

    handler := NewHandler(NewService(NewRepository(db)))
    router := chi.NewRouter()
    router.Post("/orders", handler.HandleCreate)

    // Request
    body := `{"service_id":"svc-1","collaborator_id":"collab-1","due_date":"2026-02-15"}`
    req := httptest.NewRequest("POST", "/orders", strings.NewReader(body))
    req.Header.Set("Content-Type", "application/json")

    // Add auth context
    ctx := context.WithValue(req.Context(), middleware.UserIDKey, "student-1")
    req = req.WithContext(ctx)

    rec := httptest.NewRecorder()
    router.ServeHTTP(rec, req)

    // Assert
    if rec.Code != http.StatusCreated {
        t.Errorf("expected 201, got %d: %s", rec.Code, rec.Body.String())
    }

    var order Order
    json.Unmarshal(rec.Body.Bytes(), &order)
    if order.Status != "NOVO" {
        t.Errorf("expected status NOVO, got %s", order.Status)
    }
}
```

### Running Backend Tests

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

# Run specific test
go test -run TestCreateOrder ./...
```

## Frontend Testing

### Component Test

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Badge } from './Badge';

describe('Badge', () => {
    it('renders with correct text', () => {
        render(<Badge variant="success">Approved</Badge>);
        expect(screen.getByText('Approved')).toBeInTheDocument();
    });

    it('applies success variant styles', () => {
        render(<Badge variant="success">Test</Badge>);
        const badge = screen.getByText('Test');
        expect(badge).toHaveClass('bg-green-500');
    });
});
```

### Hook Test

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useOrders } from './useOrders';

// Mock the API
jest.mock('./api', () => ({
    getOrders: jest.fn(() => Promise.resolve([
        { id: '1', status: 'NOVO' },
    ])),
}));

describe('useOrders', () => {
    it('fetches and returns orders', async () => {
        const { result } = renderHook(() => useOrders());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.orders).toHaveLength(1);
        expect(result.current.orders[0].status).toBe('NOVO');
    });
});
```

### API Mock with MSW

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
    rest.get('/api/orders', (req, res, ctx) => {
        return res(ctx.json([
            { id: '1', status: 'NOVO', totalValue: 1000 },
        ]));
    }),
    rest.post('/api/orders', (req, res, ctx) => {
        return res(ctx.status(201), ctx.json({
            id: 'new-order',
            status: 'NOVO',
        }));
    })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('creates order successfully', async () => {
    // Test code using the mocked API
});
```

### Running Frontend Tests

```bash
cd client

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# Run specific file
npm test -- OrderList.test.tsx
```

## Test Data & Fixtures

### Database Fixtures

```sql
-- test_fixtures.sql
INSERT INTO users (id, name, email, password_hash, role)
VALUES
    ('admin-1', 'Test Admin', 'admin@test.com', '$2a$10$...', 'ADMIN'),
    ('student-1', 'Test Student', 'student@test.com', '$2a$10$...', 'STUDENT'),
    ('collab-1', 'Test Collaborator', 'collab@test.com', '$2a$10$...', 'COLLABORATOR');

INSERT INTO services (id, name, total_value, collab_percent, company_percent)
VALUES ('service-1', 'TCC Test', 1000, 60, 40);
```

### TypeScript Fixtures

```typescript
// fixtures/orders.ts
export const mockOrder: Order = {
    id: 'order-1',
    studentId: 'student-1',
    collaboratorId: 'collab-1',
    serviceId: 'service-1',
    status: 'NOVO',
    paymentStatus: 'LOCKED',
    totalValue: 1000,
    collabValue: 600,
    dueDate: '2026-02-15',
    createdAt: '2026-01-29T10:00:00Z',
};

export const mockOrders: Order[] = [
    mockOrder,
    { ...mockOrder, id: 'order-2', status: 'EM_ANDAMENTO' },
];
```

## Test Categories

### Unit Tests
- Individual functions
- Business logic
- Calculations
- Validation

### Integration Tests
- API endpoints
- Database operations
- Service interactions

### E2E Tests (Manual)
- Complete user flows
- Cross-feature interactions
- Error scenarios

## Testing Checklist

### For New Code
- [ ] Unit tests for business logic
- [ ] Edge cases covered
- [ ] Error scenarios tested
- [ ] Integration test for API endpoints

### For Bug Fixes
- [ ] Test reproducing the bug
- [ ] Test verifying the fix
- [ ] Regression tests

### Coverage Goals
- Business logic: 80%+
- API handlers: 70%+
- UI components: 60%+
