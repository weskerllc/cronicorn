import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import React from "react";

import { SidebarInset, SidebarProvider } from "@cronicorn/ui-library/components/sidebar";
import { AppSidebar } from "../components/nav/app-sidebar";
import { SiteHeader } from "../components/nav/site-header";
import { useSession } from "../lib/auth-client";

export const Route = createFileRoute("/_authed")({
  // Disable SSR for authenticated routes since we need client-side session
  // This prevents the "Unauthorized" error during SSR while keeping layout persistent during client navigation
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { data: session, isPending } = useSession();

  // Show loading state while checking auth
  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!session) {
    // Use window.location for a full redirect to ensure clean state
    window.location.href = '/login';
    return null;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
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
