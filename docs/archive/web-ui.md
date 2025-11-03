# Web UI Guide

**Status:** ✅ Production Ready  
**Last Updated:** 2025-10-22

## Overview

The Cronicorn web UI is a React application built with TanStack Router, React Query, and shadcn/ui components. It provides a complete interface for managing scheduled jobs, monitoring execution, and handling subscriptions.

## Features

### Core Functionality
- **Authentication**: OAuth (GitHub/Google) and email/password login
- **Job Management**: Create, edit, view, and archive jobs with endpoints
- **Monitoring**: Dashboard with metrics, run history, and health tracking
- **Subscriptions**: Stripe integration for tier management (free/pro/enterprise)
- **API Keys**: Generate and manage keys for programmatic access

### Key Pages
- **Dashboard**: Metrics overview, activity charts, recent runs
- **Jobs**: List, create, edit, and manage scheduled jobs
- **Endpoints**: Configure HTTP requests with adaptive scheduling
- **Runs**: Detailed execution history with filtering
- **Settings**: Profile, API keys, subscription management
- **Pricing**: Public tier selection with Stripe checkout

## Architecture

### Tech Stack
- **React 18** with TypeScript
- **TanStack Router** (file-based routing)
- **TanStack Query** (server state management)
- **shadcn/ui** (component library with Tailwind)
- **Better Auth** (authentication)
- **Hono RPC** (type-safe API client)

### Key Patterns

#### Data Fetching (Prefetch-then-Render)
```tsx
// Query options factory
export const jobQueryOptions = (id: string) => queryOptions({
  queryKey: ["jobs", id],
  queryFn: () => fetchJob(id),
  staleTime: 30000,
});

// Route loader (prefetch)
export const Route = createFileRoute("/jobs/$id/")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(jobQueryOptions(params.id));
  },
  component: JobDetailsPage,
});

// Component (render with guaranteed data)
function JobDetailsPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(jobQueryOptions(id));
  return <div>{data.name}</div>;
}
```

#### API Client (Type-Safe)
```tsx
import apiClient from "@/lib/api-client/api-client";
import type { InferResponseType } from "hono/client";

const $get = apiClient.api.jobs[":id"].$get;
type Job = InferResponseType<typeof $get>;
```

#### Form Validation (Shared Schemas)
```tsx
import { CreateJobRequestSchema } from "@cronicorn/api-contracts/jobs";
import { zodResolver } from "@hookform/resolvers/zod";

const form = useForm({
  resolver: zodResolver(CreateJobRequestSchema),
});
```

## File Structure

```
apps/web/src/
├── components/          # Reusable UI components
│   ├── dashboard-new/   # Dashboard-specific components
│   ├── app-sidebar.tsx  # Main navigation
│   ├── data-table.tsx   # Generic table component
│   └── ...
├── lib/
│   ├── api-client/      # Type-safe API client
│   │   └── queries/     # React Query options factories
│   ├── auth-client.ts   # Better Auth client
│   └── auth-context.tsx # Auth state provider
├── routes/              # TanStack Router file-based routes
│   ├── _authed/         # Protected routes
│   │   ├── dashboard.tsx
│   │   ├── jobs/
│   │   ├── endpoints/
│   │   ├── runs/
│   │   ├── api-keys.tsx
│   │   └── settings/
│   ├── login.tsx
│   ├── register.tsx
│   ├── pricing.tsx
│   └── index.tsx
└── site-config.ts       # App configuration
```

## Development

### Setup
```bash
cd apps/web
pnpm install

# Configure environment
cp .env.example .env.local

# Start dev server
pnpm dev
```

### Available Commands
```bash
pnpm dev          # Start dev server (port 5173)
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm lint         # ESLint check
pnpm typecheck    # TypeScript check
```

## Production Readiness

### ✅ Verified
- Zero linting errors or warnings
- All builds pass TypeScript strict mode
- Consistent code patterns throughout
- Proper error boundaries and loading states
- Responsive design across devices
- Accessibility standards (WCAG AA)
- Security best practices (no exposed secrets)

### Known Considerations
- Dashboard bundle is 430KB (can be optimized with further code splitting)
- Some mobile optimizations can be enhanced
- Unit test coverage can be expanded

See [Future Improvements](#future-improvements) for planned enhancements.

## Deployment

### Environment Variables
```bash
# Required
VITE_SITE_URL=https://yourdomain.com

# Optional (defaults to production)
NODE_ENV=production
```

### Build and Deploy
```bash
# Build for production
pnpm build

# Output: apps/web/dist/
# Deploy dist/ folder to your hosting provider
```

### Hosting Options
- **Vercel/Netlify**: Auto-deploys from Git with zero config
- **Static hosting**: S3 + CloudFront, GitHub Pages, etc.
- **Docker**: See Dockerfile in apps/web/

## Future Improvements

### High Priority
- **Charts & Visualizations**: Enhanced time-series charts for metrics
- **Advanced Filtering**: More filter options in data tables
- **Real-time Updates**: WebSocket support for live dashboard updates
- **Export Functionality**: CSV/JSON export for runs and metrics

### Medium Priority
- **Mobile Optimizations**: Improved touch interactions and layouts
- **Keyboard Shortcuts**: Power-user navigation
- **Batch Operations**: Multi-select for job/endpoint actions
- **Custom Dashboards**: User-configurable widgets

### Low Priority
- **Dark Mode**: Theme switching support
- **Internationalization**: Multi-language support
- **Advanced Accessibility**: Enhanced screen reader support
- **Offline Mode**: Service worker for offline access

## Troubleshooting

### Build Errors
```bash
# Clean and rebuild
rm -rf node_modules dist .eslintcache
pnpm install
pnpm build
```

### API Connection Issues
- Verify `VITE_SITE_URL` matches your site URL (API is proxied at /api)
- Check CORS configuration in API server
- Ensure API server is running and accessible

### Authentication Problems
- Clear browser cookies and localStorage
- Verify Better Auth configuration in API
- Check OAuth callback URLs match

### Type Errors
```bash
# Rebuild API contracts package
cd packages/api-contracts
pnpm build

# Then rebuild web
cd apps/web
pnpm typecheck
```

## Related Documentation

- [Quickstart Guide](./quickstart.md) - Get up and running
- [Architecture Guide](./architecture.md) - System design
- [Authentication](./authentication.md) - OAuth & API keys
- [API Documentation](../apps/api/README.md) - Backend API

---

**Questions?** Check the guides above or open an issue on GitHub.
