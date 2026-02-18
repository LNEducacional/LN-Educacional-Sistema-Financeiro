# Mobile Specialist

## Role

Responsive design and mobile experience specialist ensuring the Sistema Financeiro web application works well on all device sizes.

## Responsibilities

- Ensure responsive design across devices
- Optimize touch interactions
- Test on various screen sizes
- Improve mobile performance
- Maintain accessibility on mobile

## Project Context

### Current Stack

The application is a responsive web app (not native mobile):
- React 19 with TypeScript
- Tailwind CSS for responsive styling
- Vite for optimized builds

### Breakpoints (Tailwind)

| Prefix | Min Width | Target |
|--------|-----------|--------|
| (none) | 0px | Mobile first |
| `sm:` | 640px | Large phones |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Large screens |

## Responsive Patterns

### Mobile-First Approach

```typescript
// Always start with mobile styles, add larger screen overrides
<div className="
    p-4              /* Mobile: 16px padding */
    md:p-6           /* Tablet: 24px padding */
    lg:p-8           /* Desktop: 32px padding */
">
```

### Responsive Grid

```typescript
<div className="
    grid
    grid-cols-1      /* Mobile: 1 column */
    md:grid-cols-2   /* Tablet: 2 columns */
    lg:grid-cols-3   /* Desktop: 3 columns */
    gap-4
">
    <Card />
    <Card />
    <Card />
</div>
```

### Responsive Navigation

```typescript
function Sidebar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Mobile hamburger button */}
            <button
                className="md:hidden fixed top-4 left-4 z-50"
                onClick={() => setIsOpen(!isOpen)}
            >
                <MenuIcon />
            </button>

            {/* Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 w-64 bg-gray-900 transform transition-transform",
                "md:translate-x-0", /* Always visible on tablet+ */
                isOpen ? "translate-x-0" : "-translate-x-full" /* Toggle on mobile */
            )}>
                {/* Navigation items */}
            </aside>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
```

### Responsive Tables

```typescript
// Option 1: Horizontal scroll
<div className="overflow-x-auto">
    <table className="min-w-full">
        {/* Full table */}
    </table>
</div>

// Option 2: Card layout on mobile
<div className="hidden md:block">
    <table>{/* Desktop table */}</table>
</div>
<div className="md:hidden space-y-4">
    {items.map(item => (
        <div className="p-4 bg-white rounded shadow">
            <p><strong>Name:</strong> {item.name}</p>
            <p><strong>Status:</strong> {item.status}</p>
        </div>
    ))}
</div>
```

## Touch Optimization

### Touch Targets

```typescript
// Minimum 44x44px for touch targets
<button className="
    min-h-[44px]
    min-w-[44px]
    p-3
    flex items-center justify-center
">
    <Icon />
</button>
```

### Touch-Friendly Spacing

```typescript
// Adequate spacing between interactive elements
<div className="space-y-3">
    <button className="w-full py-3">Action 1</button>
    <button className="w-full py-3">Action 2</button>
</div>
```

### Swipe Gestures

```typescript
// Consider swipe for common actions
// Libraries: react-swipeable, framer-motion

import { useSwipeable } from 'react-swipeable';

function SwipeableCard({ onSwipeLeft, onSwipeRight }) {
    const handlers = useSwipeable({
        onSwipedLeft: onSwipeLeft,
        onSwipedRight: onSwipeRight,
    });

    return <div {...handlers}>Card content</div>;
}
```

## Performance

### Mobile Performance Tips

1. **Lazy load below-the-fold content**
```typescript
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

2. **Optimize images**
```typescript
<img
    src={image}
    loading="lazy"
    className="w-full h-auto"
/>
```

3. **Reduce bundle size**
- Tree-shake unused code
- Use dynamic imports
- Compress assets

4. **Minimize repaints**
- Use `transform` instead of `top/left`
- Use `will-change` sparingly
- Avoid layout thrashing

## Testing

### Device Testing

```bash
# Chrome DevTools Device Mode
# F12 → Toggle Device Toolbar (Ctrl+Shift+M)

# Test at these breakpoints:
# - 375px (iPhone SE)
# - 414px (iPhone Plus)
# - 768px (iPad)
# - 1024px (iPad Pro)
# - 1280px+ (Desktop)
```

### Checklist

- [ ] Readable text without zooming
- [ ] Touch targets at least 44x44px
- [ ] No horizontal scroll on viewport
- [ ] Modals fit on screen
- [ ] Forms usable with keyboard
- [ ] Loading states visible
- [ ] Error messages visible

## Key Components

| Component | Mobile Consideration |
|-----------|---------------------|
| Sidebar | Collapsible drawer |
| Tables | Scroll or card layout |
| Forms | Stack labels above inputs |
| Modals | Full screen on small devices |
| Navigation | Bottom nav or hamburger |

## Accessibility on Mobile

- Large enough touch targets
- Sufficient color contrast
- Screen reader support
- Keyboard navigation (external keyboards)
- Orientation support (portrait/landscape)
