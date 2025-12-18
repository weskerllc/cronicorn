import { Outlet, createFileRoute, isRedirect, redirect } from "@tanstack/react-router";
import React from "react";
import { useQuery } from "@tanstack/react-query";

import { SidebarInset, SidebarProvider } from "@cronicorn/ui-library/components/sidebar";
import { AppSidebar } from "../components/nav/app-sidebar";
import { SiteHeader } from "../components/nav/site-header";
import { AuthLayoutSkeleton } from "../components/skeletons/auth-layout-skeleton";
import { PageSkeleton } from "../components/skeletons/page-skeleton";
import { getSession } from "../lib/auth-client";
import { UsageWarningBanner } from "../components/composed/usage-warning-banner";
import { usageQueryOptions } from "../lib/api-client/queries/subscriptions.queries";
import { getMostCriticalWarning } from "../lib/usage-helpers";

export const Route = createFileRoute("/_authed")({
  // Disable SSR for authenticated routes since we need client-side session
  // This prevents the "Unauthorized" error during SSR while keeping layout persistent during client navigation
  ssr: false,
  // Show skeleton layout while beforeLoad is checking authentication
  pendingComponent: AuthLayoutSkeleton,
  // beforeLoad runs BEFORE child route loaders, ensuring session is validated first
  // This prevents race conditions where child loaders make API calls before auth is confirmed
  beforeLoad: async () => {
    // During OAuth callback redirect, getSession() may briefly fail before cookies are set.
    // We catch errors and redirect to login - the OAuth flow will complete and redirect properly.
    // This follows TanStack Router's recommended pattern for auth guards in beforeLoad.
    try {
      const result = await getSession();

      if (!result.data) {
        throw redirect({
          to: '/login',
          search: {
            redirect: window.location.pathname,
          },
        });
      }

      // Return session in context - available to this route and all children via useRouteContext()
      return { session: result.data };
    } catch (e) {
      // Re-throw TanStack Router redirects (they use throw for control flow)
      if (isRedirect(e)) {
        throw e;
      }
      // If getSession throws (e.g., during OAuth callback timing), redirect to login.
      // The OAuth callback will complete independently and redirect the user.
      throw redirect({
        to: '/login',
        search: {
          redirect: window.location.pathname,
        },
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  // Access session from route context - guaranteed to exist because beforeLoad validated it
  // This is the TanStack Router recommended pattern for sharing auth state
  const { session } = Route.useRouteContext();

  // Fetch usage data to show warnings when limits are near/reached
  // Using useQuery (not useSuspenseQuery) to avoid blocking the layout render
  const { data: usage } = useQuery({
    ...usageQueryOptions(),
    // Refetch every 2 minutes to keep warnings up-to-date
    refetchInterval: 120000,
  });

  // Calculate if we should show a warning banner
  const warning = usage
    ? getMostCriticalWarning([
        { used: usage.aiCallsUsed, limit: usage.aiCallsLimit, label: "AI Usage" },
        { used: usage.endpointsUsed, limit: usage.endpointsLimit, label: "Endpoints" },
        { used: usage.totalRuns, limit: usage.totalRunsLimit, label: "Total Runs" },
      ])
    : null;

  return (
    <SidebarProvider
      style={{
        // @ts-ignore - CSS custom properties conflict between csstype versions
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      }}
    >
      <AppSidebar user={{
        name: session.user.name,
        email: session.user.email,
        avatar: session.user.image || undefined,
      }} variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="@container/main flex flex-1 flex-col gap-4 p-4 sm:p-6 sm:gap-6">
          {warning && <UsageWarningBanner warning={warning} />}
          <React.Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </React.Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
