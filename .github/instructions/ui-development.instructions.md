---
description: 'Guidelines for building TanStack Start applications'
applyTo: '**/apps/web/**'
---

# TanStack Start with Shadcn/ui Development Guide

You are an expert TypeScript developer specializing in TanStack Start applications with modern React patterns.

## Tech Stack
- TypeScript (strict mode)
- TanStack Start (routing & SSR)
- Shadcn/ui (UI components)
- Tailwind CSS (styling)
- Zod (validation)
- TanStack Query (client state)

## Code Style Rules

- NEVER use `any` type - always use proper TypeScript types
- Prefer function components over class components
- Always validate external data with Zod schemas
- Include error and pending boundaries for all routes
- Follow accessibility best practices with ARIA attributes

## Component Patterns

Use function components with proper TypeScript interfaces:

```typescript
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export default function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button onClick={onClick} className={cn(buttonVariants({ variant }))}>
      {children}
    </button>
  );
}
```

## Data Fetching

Use Route Loaders for:
- Initial page data required for rendering
- SSR requirements
- SEO-critical data

Use React Query for:
- Frequently updating data
- Optional/secondary data
- Client mutations with optimistic updates

```typescript
// Route Loader
export const Route = createFileRoute('/users')({
  loader: async () => {
    const users = await fetchUsers()
    return { users: userListSchema.parse(users) }
  },
  component: UserList,
})

// React Query
const { data: stats } = useQuery({
  queryKey: ['user-stats', userId],
  queryFn: () => fetchUserStats(userId),
  refetchInterval: 30000,
});
```

## Zod Validation

Always validate external data. Define schemas in `src/lib/schemas.ts`:

```typescript
export const userSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user']).default('user'),
})

export type User = z.infer<typeof userSchema>

// Safe parsing
const result = userSchema.safeParse(data)
if (!result.success) {
  console.error('Validation failed:', result.error.format())
  return null
}
```

## Routes

Structure routes in `src/routes/` with file-based routing. Always include error and pending boundaries:

```typescript
export const Route = createFileRoute('/users/$id')({
  loader: async ({ params }) => {
    const user = await fetchUser(params.id);
    return { user: userSchema.parse(user) };
  },
  component: UserDetail,
  errorBoundary: ({ error }) => (
    <div className="text-red-600 p-4">Error: {error.message}</div>
  ),
  pendingBoundary: () => (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  ),
});
```

## UI Components

### Component Hierarchy (Always Follow)

1. **Shadcn/ui components first** - Use existing Shadcn components (Button, Card, Input, etc.)
2. **Project components second** - Use existing custom components from `@/components/`
3. **Create new shared components only when pattern repeats 3+ times**
4. **NEVER write inline custom styles** - Always extract to reusable components

### Reusable Component Requirements

**CRITICAL**: Before writing any custom layout or styling, check if a reusable component exists:

```typescript
// ✅ CORRECT: Use shared layout components
import { GridLayout } from '@/components/layouts/grid-layout';
import { ActionsGroup } from '@/components/ui/actions-group';

<GridLayout cols={1} md={2} lg={4}>
  <StatCard />
  <StatCard />
</GridLayout>

<ActionsGroup gap="2">
  <Button>Save</Button>
  <Button variant="outline">Cancel</Button>
</ActionsGroup>

// ❌ WRONG: Custom inline layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard />
  <StatCard />
</div>

<div className="flex gap-2">
  <Button>Save</Button>
  <Button variant="outline">Cancel</Button>
</div>
```

**Available Shared Components:**
- `GridLayout` - Responsive grid layouts (replaces manual grid classes)
- `ActionsGroup` - Button groups with consistent spacing
- `FormFieldRow` - Horizontal form field layouts
- `AlertCard` - Status alerts and notifications
- `StatCard` - Metric display cards
- `DetailSection` - Card-based detail sections
- `InfoGrid` / `InfoField` - Key-value pair displays
- `PageSection` - Page content sections
- `EmptyCTA` - Empty state displays
- `LoadingState` - Loading spinners
- `ErrorState` - Error displays
- `CodeDisplay` - Code blocks with copy button
- `InlineBadge` - Small inline status indicators
- `IconContainer` - Consistent icon backgrounds

### When to Create New Components

**Create a new shared component when:**
- Same pattern appears 3+ times across different files
- Complex layout/styling that should be standardized
- Business logic that should be centralized

**Process:**
1. Extract pattern to new component file
2. Update all existing usages
3. Document props and usage examples
4. Add to shared components directory

```typescript
// Good: Extracted reusable pattern
// components/ui/status-indicator.tsx
interface StatusIndicatorProps {
  status: 'active' | 'paused' | 'archived';
  label: string;
}

export function StatusIndicator({ status, label }: StatusIndicatorProps) {
  return (
    <Badge variant={statusVariants[status]}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}
```

### Styling Rules

NEVER use custom colors or styles that deviate from the design system.
Use theme vars from Tailwind config (e.g. `text-primary`, `bg-secondary`).

**Prohibited patterns:**
- ❌ `className="flex gap-2"` (use `<ActionsGroup>`)
- ❌ `className="grid grid-cols-* gap-*"` (use `<GridLayout>`)
- ❌ `className="flex gap-2 items-end"` (use `<FormFieldRow>`)
- ❌ Custom spacing values outside theme
- ❌ Arbitrary color values (use theme variables)

KEEP IT SIMPLE. This is a developer-focused web app. We need things to be maintainable, usable, and functional over flashy.

## Accessibility

Use semantic HTML first. Only add ARIA when no semantic equivalent exists:

```typescript
// ✅ Good: Semantic HTML with minimal ARIA
<button onClick={toggleMenu}>
  <MenuIcon aria-hidden="true" />
  <span className="sr-only">Toggle Menu</span>
</button>

// ✅ Good: ARIA only when needed (for dynamic states)
<button
  aria-expanded={isOpen}
  aria-controls="menu"
  onClick={toggleMenu}
>
  Menu
</button>

// ✅ Good: Semantic form elements
<label htmlFor="email">Email Address</label>
<input id="email" type="email" />
{errors.email && (
  <p role="alert">{errors.email}</p>
)}
```

## File Organization

```
src/
├── components/
│   ├── ui/           # Shadcn/ui base components + small UI primitives
│   │   ├── button.tsx, card.tsx, etc. (Shadcn)
│   │   ├── actions-group.tsx
│   │   ├── form-field-row.tsx
│   │   ├── inline-badge.tsx
│   │   └── icon-container.tsx
│   ├── layouts/      # Layout components
│   │   └── grid-layout.tsx
│   ├── sections/     # Card-based section components
│   │   ├── alert-card.tsx
│   │   ├── stat-card.tsx
│   │   ├── detail-section.tsx
│   │   ├── info-grid.tsx
│   │   ├── page-section.tsx
│   │   └── empty-cta.tsx
│   ├── page-header.tsx
│   ├── data-table.tsx
│   ├── loading-state.tsx
│   ├── error-state.tsx
│   └── code-display.tsx
├── lib/schemas.ts    # Zod schemas
├── routes/          # File-based routes
└── routes/api/      # Server routes (.ts)
```

**Component Selection Guide:**
- Need a button/input/card? → Use Shadcn from `@/components/ui/`
- Need a grid layout? → Use `<GridLayout>` from `@/components/layouts/`
- Need button group? → Use `<ActionsGroup>` from `@/components/ui/`
- Need a card section? → Use components from `@/components/sections/`
- Writing custom `className` with layout? → Extract to reusable component

## Import Standards

Use `@/` alias for all internal imports:

```typescript
// ✅ Good
import { Button } from '@/components/ui/button'
import { userSchema } from '@/lib/schemas'

// ❌ Bad
import { Button } from '../components/ui/button'
```

## Adding Components

Install Shadcn components when needed:

```bash
npx shadcn@latest add button card input dialog
```

## Common Patterns

- Always validate external data with Zod
- Use route loaders for initial data, React Query for updates
- Include error/pending boundaries on all routes
- Prefer Shadcn components over custom UI
- Follow accessibility best practices
- Keep styling consistent with Tailwind theme vars