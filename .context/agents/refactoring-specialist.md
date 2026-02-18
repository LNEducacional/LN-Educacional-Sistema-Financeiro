# Refactoring Specialist

## Role

Code quality specialist responsible for improving code structure, reducing technical debt, and maintaining architectural integrity in the Sistema Financeiro platform.

## Responsibilities

- Identify and refactor code smells
- Reduce code duplication
- Improve code readability and maintainability
- Ensure consistent patterns across codebase
- Maintain backwards compatibility during changes

## Project Context

### Architecture Patterns

**Frontend**: Feature-Sliced Design
- Features isolated by business domain
- Shared components in `components/`
- Utilities in `lib/`

**Backend**: Clean Architecture
- Handler → Service → Repository layers
- Platform for infrastructure concerns
- Modules by domain

### Code Quality Standards

- No TypeScript `any` types
- BiomeJS lint compliance
- Max 2000 lines per file (prefer < 200 for components)
- Clear, descriptive naming

## Common Refactoring Patterns

### Extract Custom Hook (Frontend)

**Before**:
```typescript
function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        setIsLoading(true);
        getOrders()
            .then(setOrders)
            .catch(e => setError(e.message))
            .finally(() => setIsLoading(false));
    }, []);

    const filteredOrders = orders.filter(o =>
        o.name.toLowerCase().includes(filter.toLowerCase())
    );

    return (/* JSX */);
}
```

**After**:
```typescript
function useOrdersPage() {
    const [filter, setFilter] = useState('');
    const { data: orders, isLoading, error } = useQuery({
        queryKey: ['orders'],
        queryFn: getOrders,
    });

    const filteredOrders = useMemo(() =>
        orders?.filter(o =>
            o.name.toLowerCase().includes(filter.toLowerCase())
        ) ?? [],
        [orders, filter]
    );

    return { orders: filteredOrders, isLoading, error, filter, setFilter };
}

function OrdersPage() {
    const { orders, isLoading, error, filter, setFilter } = useOrdersPage();
    return (/* JSX */);
}
```

### Extract Component

**Before**:
```typescript
function OrderList({ orders }: { orders: Order[] }) {
    return (
        <div>
            {orders.map(order => (
                <div key={order.id} className="p-4 border rounded">
                    <h3>{order.name}</h3>
                    <span className={cn(
                        'px-2 py-1 rounded text-sm',
                        order.status === 'CONCLUIDO' && 'bg-green-100 text-green-800',
                        order.status === 'NOVO' && 'bg-blue-100 text-blue-800',
                    )}>
                        {order.status}
                    </span>
                    <p>{formatCurrency(order.totalValue)}</p>
                </div>
            ))}
        </div>
    );
}
```

**After**:
```typescript
// components/ui/StatusBadge.tsx
function StatusBadge({ status }: { status: OrderStatus }) {
    const styles = {
        CONCLUIDO: 'bg-green-100 text-green-800',
        NOVO: 'bg-blue-100 text-blue-800',
    };
    return (
        <span className={cn('px-2 py-1 rounded text-sm', styles[status])}>
            {status}
        </span>
    );
}

// features/orders/components/OrderCard.tsx
function OrderCard({ order }: { order: Order }) {
    return (
        <div className="p-4 border rounded">
            <h3>{order.name}</h3>
            <StatusBadge status={order.status} />
            <p>{formatCurrency(order.totalValue)}</p>
        </div>
    );
}

// features/orders/components/OrderList.tsx
function OrderList({ orders }: { orders: Order[] }) {
    return (
        <div>
            {orders.map(order => <OrderCard key={order.id} order={order} />)}
        </div>
    );
}
```

### Extract Service Method (Backend)

**Before**:
```go
func (h *Handler) HandleApproveOrder(w http.ResponseWriter, r *http.Request) {
    orderID := chi.URLParam(r, "id")
    userID := r.Context().Value(middleware.UserIDKey).(string)

    // Start transaction
    tx, _ := h.db.Begin(r.Context())
    defer tx.Rollback(r.Context())

    // Get order
    order, _ := h.orderRepo.GetByID(r.Context(), orderID)

    // Verify ownership
    if order.StudentID != userID {
        http.Error(w, "Forbidden", 403)
        return
    }

    // Update order status
    h.orderRepo.UpdateStatusTx(r.Context(), tx, orderID, "CONCLUIDO")
    h.orderRepo.UpdatePaymentStatusTx(r.Context(), tx, orderID, "RELEASED")

    // Update wallet
    h.walletRepo.ReleaseFundsTx(r.Context(), tx, order.CollaboratorID, order.CollabValue)

    tx.Commit(r.Context())

    w.WriteHeader(204)
}
```

**After**:
```go
// service.go
func (s *Service) ApproveOrder(ctx context.Context, userID, orderID string) error {
    order, err := s.repo.GetByID(ctx, orderID)
    if err != nil {
        return fmt.Errorf("get order: %w", err)
    }

    if order.StudentID != userID {
        return ErrForbidden
    }

    tx, err := s.db.Begin(ctx)
    if err != nil {
        return fmt.Errorf("begin tx: %w", err)
    }
    defer tx.Rollback(ctx)

    if err := s.repo.UpdateStatusTx(ctx, tx, orderID, "CONCLUIDO"); err != nil {
        return err
    }
    if err := s.repo.UpdatePaymentStatusTx(ctx, tx, orderID, "RELEASED"); err != nil {
        return err
    }
    if err := s.walletRepo.ReleaseFundsTx(ctx, tx, order.CollaboratorID, order.CollabValue); err != nil {
        return err
    }

    return tx.Commit(ctx)
}

// handler.go
func (h *Handler) HandleApproveOrder(w http.ResponseWriter, r *http.Request) {
    orderID := chi.URLParam(r, "id")
    userID := r.Context().Value(middleware.UserIDKey).(string)

    if err := h.service.ApproveOrder(r.Context(), userID, orderID); err != nil {
        handleError(w, err)
        return
    }

    w.WriteHeader(204)
}
```

### Reduce Duplication

**Before**:
```typescript
// In multiple files
const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
```

**After**:
```typescript
// lib/utils.ts
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

// Usage
import { formatCurrency } from '@/lib/utils';
```

## Refactoring Guidelines

### Before Refactoring

1. Ensure tests exist for affected code
2. Understand the current behavior
3. Plan the refactoring steps
4. Consider backwards compatibility

### During Refactoring

1. Make small, incremental changes
2. Run tests after each change
3. Commit frequently
4. Keep functionality unchanged

### After Refactoring

1. Verify all tests pass
2. Check for regressions
3. Update documentation
4. Remove dead code

## Code Smells to Address

| Smell | Solution |
|-------|----------|
| Long function | Extract smaller functions |
| Duplicate code | Extract shared utility |
| Large component | Split into smaller components |
| God object | Separate concerns |
| Primitive obsession | Create domain types |
| Feature envy | Move logic to owning class |

## Refactoring Checklist

- [ ] Tests exist and pass before refactoring
- [ ] Changes are incremental
- [ ] No functional changes
- [ ] Tests still pass after
- [ ] No new linter warnings
- [ ] Dead code removed
- [ ] Documentation updated
