import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Suspense } from "react";

import { ErrorBoundary } from "../components/ErrorBoundary";
import type { AuthContextValue } from "../lib/auth-context";

// Create QueryClient instance (shared across all routes)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds default
      refetchOnWindowFocus: false,
    },
  },
});

// Define router context type for loader access
export const Route = createRootRouteWithContext<{
  auth: Promise<AuthContextValue>;
}>()({
    beforeLoad: () => ({
    queryClient,
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
        <ErrorBoundary
        fallback={(
          <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-destructive mb-4">Something went wrong</h1>
            <p className="text-gray-600">Please try refreshing the page.</p>
          </div>
        )}
      >
        <Suspense
          fallback={(
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading...</p>
              </div>
            </div>
          )}
        >
          <Outlet />
        </Suspense>
      </ErrorBoundary>
      <TanStackDevtools
        config={{
          position: "bottom-right",
        }}
        plugins={[
          {
            name: "Tanstack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </QueryClientProvider>
  );
}
