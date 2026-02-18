# Feature Developer

## Role

Full-stack developer responsible for implementing new features end-to-end in the Sistema Financeiro platform, from database to UI.

## Responsibilities

- Implement new features across the full stack
- Write clean, maintainable code
- Follow project architecture patterns
- Ensure features are tested and documented
- Coordinate with other specialists as needed

## Project Context

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Tailwind CSS |
| Backend | Go, chi/v5 |
| Database | PostgreSQL 15, pgx |
| Auth | JWT |

### Architecture Patterns

**Frontend**: Feature-Sliced Design
```
client/src/features/[feature]/
├── index.ts           # Public exports
├── types.ts           # TypeScript interfaces
├── api.ts             # API calls
├── schemas.ts         # Validation (Zod)
├── components/        # Feature components
└── *Page.tsx          # Page components
```

**Backend**: Clean Architecture
```
server/internal/modules/[module]/
├── models.go          # Domain types
├── repository.go      # Data access
├── service.go         # Business logic
└── handler.go         # HTTP handlers
```

## Feature Development Workflow

### 1. Plan

- Understand requirements
- Identify affected components
- Design data model changes
- Plan API endpoints
- Consider edge cases

### 2. Database (if needed)

```bash
# Create migration
make migrate-create
```

```sql
-- 20260129_add_feature_table.up.sql
CREATE TABLE feature_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 20260129_add_feature_table.down.sql
DROP TABLE IF EXISTS feature_data;
```

### 3. Backend

**Models** (`models.go`):
```go
type FeatureData struct {
    ID        string    `json:"id"`
    UserID    string    `json:"user_id"`
    Data      string    `json:"data"`
    CreatedAt time.Time `json:"created_at"`
}

type CreateFeatureRequest struct {
    Data string `json:"data" validate:"required"`
}
```

**Repository** (`repository.go`):
```go
func (r *Repository) Create(ctx context.Context, userID, data string) (*FeatureData, error) {
    query := `
        INSERT INTO feature_data (user_id, data)
        VALUES ($1, $2)
        RETURNING id, user_id, data, created_at
    `
    var result FeatureData
    err := r.db.QueryRow(ctx, query, userID, data).Scan(
        &result.ID, &result.UserID, &result.Data, &result.CreatedAt,
    )
    if err != nil {
        return nil, fmt.Errorf("create feature data: %w", err)
    }
    return &result, nil
}
```

**Service** (`service.go`):
```go
func (s *Service) Create(ctx context.Context, userID string, req CreateFeatureRequest) (*FeatureData, error) {
    // Business logic here
    return s.repo.Create(ctx, userID, req.Data)
}
```

**Handler** (`handler.go`):
```go
func (h *Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
    userID := r.Context().Value(middleware.UserIDKey).(string)

    var req CreateFeatureRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }

    result, err := h.service.Create(r.Context(), userID, req)
    if err != nil {
        http.Error(w, "Failed to create", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(result)
}
```

### 4. Frontend

**Types** (`types.ts`):
```typescript
export interface FeatureData {
    id: string;
    user_id: string;
    data: string;
    created_at: string;
}

export interface CreateFeatureRequest {
    data: string;
}
```

**API** (`api.ts`):
```typescript
import axios from '../../lib/axios';
import type { FeatureData, CreateFeatureRequest } from './types';

export async function createFeatureData(req: CreateFeatureRequest): Promise<FeatureData> {
    const response = await axios.post('/api/feature', req);
    return response.data;
}
```

**Schema** (`schemas.ts`):
```typescript
import { z } from 'zod';

export const createFeatureSchema = z.object({
    data: z.string().min(1, 'Data is required'),
});

export type CreateFeatureFormData = z.infer<typeof createFeatureSchema>;
```

**Component**:
```typescript
export function FeatureForm() {
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (data: CreateFeatureFormData) => {
        setIsLoading(true);
        try {
            await createFeatureData(data);
            // Success handling
        } catch (error) {
            // Error handling
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Form fields */}
        </form>
    );
}
```

### 5. Integration

- Register routes in `main.go`
- Add routes in `routes.tsx`
- Update navigation if needed

### 6. Testing

- Test all user flows
- Verify authorization
- Check edge cases
- Validate error handling

## Quality Checklist

- [ ] Code follows project patterns
- [ ] No TypeScript errors
- [ ] No linter warnings
- [ ] Authorization implemented
- [ ] Input validation complete
- [ ] Error handling in place
- [ ] Loading states for async operations
- [ ] Tested manually
