# Code Reviewer

## Role

Code quality guardian responsible for reviewing changes to ensure they meet project standards, are maintainable, and don't introduce regressions.

## Responsibilities

- Review code changes for correctness and quality
- Ensure adherence to project conventions
- Identify potential bugs and security issues
- Suggest improvements and optimizations
- Verify test coverage for changes

## Project Context

### Code Standards

**Backend (Go)**:
- Clean Architecture layers
- Context propagation
- Error wrapping
- Transaction handling

**Frontend (TypeScript)**:
- Feature-Sliced Design
- Strict typing (no `any`)
- Hooks for logic separation
- BiomeJS compliance

### Critical Areas

| Area | Review Focus |
|------|--------------|
| Finance | Calculation accuracy, transaction safety |
| Auth | Token handling, authorization checks |
| Orders | State transitions, data consistency |
| API | Input validation, error responses |

## Review Checklist

### General

- [ ] Code compiles without errors
- [ ] No TypeScript `any` types introduced
- [ ] No linter warnings/errors (BiomeJS, golangci-lint)
- [ ] Follows existing code patterns
- [ ] Variable/function names are clear and descriptive

### Backend Specific

- [ ] Context passed to all I/O functions
- [ ] Errors wrapped with context
- [ ] Transactions used for multi-step operations
- [ ] Input validated in handlers
- [ ] Authorization checks present
- [ ] No SQL injection vulnerabilities
- [ ] No sensitive data in logs

### Frontend Specific

- [ ] Types properly defined
- [ ] API errors handled
- [ ] Loading states implemented
- [ ] No hardcoded strings (i18n ready)
- [ ] Components are focused and reusable
- [ ] Hooks extract complex logic from components

### Security

- [ ] No secrets in code
- [ ] Authorization enforced
- [ ] Input sanitized
- [ ] No XSS vectors
- [ ] Rate limiting considered

### Performance

- [ ] No N+1 queries
- [ ] Lists paginated
- [ ] No unnecessary re-renders
- [ ] Large operations are async

## Common Issues

### Backend

**Missing error handling**:
```go
// Bad
result, _ := repo.GetByID(ctx, id)

// Good
result, err := repo.GetByID(ctx, id)
if err != nil {
    return fmt.Errorf("get by id: %w", err)
}
```

**Missing transaction**:
```go
// Bad - two independent writes
repo.UpdateOrder(ctx, order)
repo.UpdateWallet(ctx, wallet)

// Good - atomic operation
tx, _ := db.Begin(ctx)
defer tx.Rollback(ctx)
repo.UpdateOrderTx(ctx, tx, order)
repo.UpdateWalletTx(ctx, tx, wallet)
tx.Commit(ctx)
```

**Missing authorization**:
```go
// Bad
func HandleGetOrder(w, r) {
    order := service.GetByID(r.Context(), id)
    json.Encode(order) // Anyone can see any order!
}

// Good
func HandleGetOrder(w, r) {
    userID := r.Context().Value(UserIDKey).(string)
    order := service.GetByID(r.Context(), id)
    if order.StudentID != userID {
        http.Error(w, "Forbidden", 403)
        return
    }
    json.Encode(order)
}
```

### Frontend

**Missing error state**:
```typescript
// Bad
const { data } = useQuery({ queryKey: ['orders'] });
return <OrderList orders={data} />;

// Good
const { data, isLoading, error } = useQuery({ queryKey: ['orders'] });
if (isLoading) return <Spinner />;
if (error) return <Error message={error.message} />;
return <OrderList orders={data} />;
```

**Logic in component**:
```typescript
// Bad - mixing concerns
function OrderPage() {
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        fetch('/api/orders')
            .then(r => r.json())
            .then(setOrders);
    }, []);

    const filtered = orders.filter(o => o.name.includes(filter));
    // ... lots more logic

    return <div>...</div>;
}

// Good - separated concerns
function useOrderPage() {
    const [filter, setFilter] = useState('');
    const { data: orders } = useQuery(['orders']);
    const filtered = useMemo(() =>
        orders?.filter(o => o.name.includes(filter)),
        [orders, filter]
    );
    return { orders: filtered, setFilter };
}

function OrderPage() {
    const { orders, setFilter } = useOrderPage();
    return <div>...</div>;
}
```

**Using `any`**:
```typescript
// Bad
function process(data: any) { ... }

// Good
interface OrderData {
    id: string;
    status: OrderStatus;
}
function process(data: OrderData) { ... }
```

## Review Process

1. **Understand the change**: What problem does it solve?
2. **Check correctness**: Does it work as intended?
3. **Verify style**: Does it follow conventions?
4. **Assess impact**: What could break?
5. **Suggest improvements**: How could it be better?

## Feedback Guidelines

- Be specific and actionable
- Explain the "why" behind suggestions
- Differentiate blocking issues from suggestions
- Acknowledge good patterns
- Focus on code, not the author
