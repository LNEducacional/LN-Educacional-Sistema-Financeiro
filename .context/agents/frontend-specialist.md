# Frontend Specialist

## Role

React/TypeScript frontend developer responsible for UI implementation, state management, and user experience for the Sistema Financeiro platform.

## Responsibilities

- Implement React components and pages
- Manage client-side state
- Handle API integration
- Ensure responsive and accessible UI
- Maintain code quality with BiomeJS

## Project Context

### Tech Stack

- **Framework**: React 19
- **Build**: Vite
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM v7
- **HTTP**: Axios
- **Validation**: Zod
- **Linting**: BiomeJS

### Project Structure

```
client/src/
├── app/                    # Application entry
│   ├── providers.tsx       # Context providers
│   └── routes.tsx          # Route definitions
├── features/               # Feature modules
│   ├── admin/              # Admin features
│   ├── auth/               # Authentication
│   ├── collaborator/       # Collaborator dashboard
│   ├── disputes/           # Dispute management
│   ├── notifications/      # Real-time notifications
│   ├── orders/             # Order management
│   ├── production/         # Production dashboards
│   ├── ranking/            # Gamification
│   ├── services/           # Service configuration
│   └── student/            # Student features
├── components/             # Shared components
│   ├── layout/             # Layout components
│   └── ui/                 # Base UI components
└── lib/                    # Utilities
    ├── hooks/              # Custom hooks
    ├── axios.ts            # HTTP client
    └── utils.ts            # Utility functions
```

### Feature Module Pattern

```
features/orders/
├── index.ts                # Public exports
├── types.ts                # TypeScript types
├── api.ts                  # API calls
├── schemas.ts              # Zod schemas
├── components/
│   ├── OrderList.tsx
│   └── OrderCard.tsx
├── OrdersListPage.tsx
└── OrderDetailsPage.tsx
```

## Development Guidelines

### Component Structure

**Page Component** (UI only):
```typescript
export function OrdersListPage() {
    const { orders, isLoading, error, filters, setFilters } = useOrdersPage();

    if (isLoading) return <Spinner />;
    if (error) return <ErrorMessage error={error} />;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold">Orders</h1>
            <OrderFilters filters={filters} onChange={setFilters} />
            <OrderList orders={orders} />
        </div>
    );
}
```

**Custom Hook** (logic extraction):
```typescript
function useOrdersPage() {
    const [filters, setFilters] = useState<OrderFilters>({});
    const { data: orders, isLoading, error } = useQuery({
        queryKey: ['orders', filters],
        queryFn: () => getOrders(filters),
    });

    return { orders, isLoading, error, filters, setFilters };
}
```

### Styling with Tailwind

```typescript
import { cn } from '@/lib/utils';

interface ButtonProps {
    variant?: 'primary' | 'secondary';
    children: React.ReactNode;
}

export function Button({ variant = 'primary', children }: ButtonProps) {
    return (
        <button
            className={cn(
                'px-4 py-2 rounded-md font-medium',
                variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
                variant === 'secondary' && 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            )}
        >
            {children}
        </button>
    );
}
```

### API Integration

**API File**:
```typescript
// features/orders/api.ts
import axios from '@/lib/axios';
import type { Order, CreateOrderRequest } from './types';

export async function getOrders(): Promise<Order[]> {
    const response = await axios.get('/api/orders');
    return response.data;
}

export async function createOrder(data: CreateOrderRequest): Promise<Order> {
    const response = await axios.post('/api/orders', data);
    return response.data;
}
```

**Usage with Error Handling**:
```typescript
async function handleSubmit(data: CreateOrderFormData) {
    setIsLoading(true);
    try {
        const order = await createOrder(data);
        navigate(`/orders/${order.id}`);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            setError(error.response?.data?.message || 'Failed to create order');
        }
    } finally {
        setIsLoading(false);
    }
}
```

### Form Handling with Zod

```typescript
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const orderSchema = z.object({
    serviceId: z.string().uuid('Invalid service'),
    collaboratorId: z.string().uuid('Invalid collaborator'),
    dueDate: z.string().refine(val => new Date(val) > new Date(), {
        message: 'Due date must be in the future',
    }),
});

type OrderFormData = z.infer<typeof orderSchema>;

function OrderForm() {
    const { register, handleSubmit, formState: { errors } } = useForm<OrderFormData>({
        resolver: zodResolver(orderSchema),
    });

    const onSubmit = (data: OrderFormData) => {
        // Handle submission
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <input {...register('serviceId')} />
            {errors.serviceId && <span>{errors.serviceId.message}</span>}
            {/* More fields */}
        </form>
    );
}
```

### State Patterns

**Local State** (component-specific):
```typescript
const [isOpen, setIsOpen] = useState(false);
```

**Context** (shared across components):
```typescript
// AuthContext.tsx
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState<User | null>(null);
    // ...
    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
```

## Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| AppLayout | `components/layout/` | Main layout with sidebar |
| Badge | `components/ui/` | Status badges |
| AuthContext | `features/auth/` | Authentication state |
| LoginForm | `features/auth/` | Login UI |

## Common Tasks

### Adding a New Page

1. Create page component in feature directory
2. Add types in `types.ts`
3. Add API calls in `api.ts`
4. Add route in `app/routes.tsx`
5. Update navigation if needed

### Adding a New Component

1. Create component in appropriate location
2. Export from `index.ts`
3. Add TypeScript props interface
4. Use Tailwind for styling

## Quality Checklist

- [ ] No TypeScript errors (`tsc --noEmit`)
- [ ] BiomeJS passes (`npx biome check src/`)
- [ ] No `any` types
- [ ] Loading states implemented
- [ ] Error states handled
- [ ] Responsive design verified
- [ ] Accessible (keyboard, ARIA)
