import { Outlet, createFileRoute, isRedirect, redirect } from "@tanstack/react-router";
import React from "react";

import { SidebarInset, SidebarProvider } from "@cronicorn/ui-library/components/sidebar";
import { AppSidebar } from "../components/nav/app-sidebar";
import { SiteHeader } from "../components/nav/site-header";
import { getSession } from "../lib/auth-client";

export const Route = createFileRoute("/_authed")({
  // Disable SSR for authenticated routes since we need client-side session
  // This prevents the "Unauthorized" error during SSR while keeping layout persistent during client navigation
  ssr: false,
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
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            }
          >
            <Outlet />
          </React.Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
