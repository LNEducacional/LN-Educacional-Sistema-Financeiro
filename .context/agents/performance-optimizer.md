# Performance Optimizer

## Role

Performance specialist responsible for identifying and resolving performance bottlenecks across frontend, backend, and database layers of the Sistema Financeiro platform.

## Responsibilities

- Analyze and optimize query performance
- Reduce frontend bundle size and load times
- Identify and fix memory leaks
- Optimize API response times
- Monitor and improve overall system performance

## Project Context

### Performance-Critical Areas

| Area | Impact | Priority |
|------|--------|----------|
| Ranking calculations | Heavy queries | High |
| Admin reports | Large data aggregations | High |
| Order listing | Frequent access | Medium |
| File uploads | I/O bound | Medium |
| Notifications (SSE) | Long connections | Low |

## Frontend Performance

### Bundle Optimization

```typescript
// vite.config.ts
export default defineConfig({
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    router: ['react-router-dom'],
                    charts: ['recharts'],
                },
            },
        },
    },
});
```

### Code Splitting

```typescript
// Lazy load heavy components
const ReportsDashboard = lazy(() => import('./features/admin/ReportsDashboard'));

// Route-based splitting
<Route
    path="/admin/reports"
    element={
        <Suspense fallback={<Spinner />}>
            <ReportsDashboard />
        </Suspense>
    }
/>
```

### React Optimization

**Memoization**:
```typescript
// Expensive computations
const sortedOrders = useMemo(
    () => orders.sort((a, b) => b.createdAt - a.createdAt),
    [orders]
);

// Callback stability
const handleClick = useCallback((id: string) => {
    selectOrder(id);
}, [selectOrder]);

// Component memoization
const OrderCard = memo(({ order }: OrderCardProps) => {
    return <div>{order.name}</div>;
});
```

**Virtualization for long lists**:
```typescript
import { FixedSizeList } from 'react-window';

function OrderList({ orders }) {
    return (
        <FixedSizeList
            height={600}
            itemCount={orders.length}
            itemSize={80}
        >
            {({ index, style }) => (
                <div style={style}>
                    <OrderCard order={orders[index]} />
                </div>
            )}
        </FixedSizeList>
    );
}
```

### Network Optimization

**Request deduplication**:
```typescript
// Use React Query for automatic caching
const { data: orders } = useQuery({
    queryKey: ['orders'],
    queryFn: getOrders,
    staleTime: 5 * 60 * 1000, // 5 minutes
});
```

**Debounce search inputs**:
```typescript
const debouncedSearch = useMemo(
    () => debounce((term: string) => {
        setSearchTerm(term);
    }, 300),
    []
);
```

## Backend Performance

### Query Optimization

**Use indexes**:
```sql
-- Add indexes for common filters
CREATE INDEX idx_orders_student_id ON orders(student_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Composite index for combined filters
CREATE INDEX idx_orders_student_status ON orders(student_id, status);
```

**Analyze queries**:
```sql
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE student_id = $1
ORDER BY created_at DESC
LIMIT 20;
```

**Avoid N+1 queries**:
```go
// Bad: N+1
for _, order := range orders {
    user, _ := userRepo.GetByID(order.StudentID)
    order.StudentName = user.Name
}

// Good: Single join query
query := `
    SELECT o.*, u.name as student_name
    FROM orders o
    JOIN users u ON o.student_id = u.id
    WHERE o.collaborator_id = $1
`
```

### Pagination

```go
// Always paginate list endpoints
func (r *Repository) List(ctx context.Context, limit, offset int) ([]Order, int, error) {
    countQuery := `SELECT COUNT(*) FROM orders`
    var total int
    r.db.QueryRow(ctx, countQuery).Scan(&total)

    query := `
        SELECT * FROM orders
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
    `
    rows, _ := r.db.Query(ctx, query, limit, offset)
    // ...
    return orders, total, nil
}
```

### Caching

```go
// Cache expensive calculations
type RankingCache struct {
    data      []RankingEntry
    expiresAt time.Time
    mu        sync.RWMutex
}

func (c *RankingCache) Get() ([]RankingEntry, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    if time.Now().Before(c.expiresAt) {
        return c.data, true
    }
    return nil, false
}
```

### Connection Pooling

```go
// pgx connection pool settings
config, _ := pgxpool.ParseConfig(databaseURL)
config.MaxConns = 25
config.MinConns = 5
config.MaxConnLifetime = time.Hour
config.MaxConnIdleTime = 30 * time.Minute
```

## Database Performance

### Index Strategy

```sql
-- Check index usage
SELECT
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Find missing indexes
SELECT
    schemaname,
    relname,
    seq_scan,
    seq_tup_read
FROM pg_stat_user_tables
WHERE seq_scan > 1000
ORDER BY seq_tup_read DESC;
```

### Query Analysis

```sql
-- Enable timing
\timing

-- Explain with analyze
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT ...;

-- Find slow queries (requires pg_stat_statements)
SELECT
    query,
    calls,
    mean_time,
    total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

## Monitoring

### Key Metrics

| Metric | Target | Alert |
|--------|--------|-------|
| API p95 latency | < 200ms | > 500ms |
| Database query time | < 50ms | > 200ms |
| Frontend FCP | < 1.5s | > 3s |
| Bundle size | < 300KB | > 500KB |

### Profiling

**Backend**:
```go
import _ "net/http/pprof"

// Access at: http://localhost:8080/debug/pprof/
```

**Frontend**:
```bash
# Build with source maps
npm run build -- --sourcemap

# Analyze bundle
npx vite-bundle-analyzer
```

## Optimization Checklist

### Frontend
- [ ] Bundle analyzed and optimized
- [ ] Lazy loading implemented
- [ ] Lists virtualized (50+ items)
- [ ] Images optimized
- [ ] Debounce on search/filter

### Backend
- [ ] Queries have appropriate indexes
- [ ] No N+1 queries
- [ ] Pagination on all lists
- [ ] Connection pooling configured
- [ ] Heavy operations are async

### Database
- [ ] Index usage verified
- [ ] Slow queries identified
- [ ] Query plans analyzed
- [ ] Table statistics updated
