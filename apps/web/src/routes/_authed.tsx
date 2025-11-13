import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import React from "react";

import { SidebarInset, SidebarProvider } from "@cronicorn/ui-library/components/sidebar";
import { AppSidebar } from "../components/nav/app-sidebar";
import { SiteHeader } from "../components/nav/site-header";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { resolveAuthClient } from "../app";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ context }) => {
    // Initialize auth client when entering protected routes
    const auth = await context.auth();
    if (!auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
  async loader({ context }) {
    const auth = await context.auth();
    if (!auth.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return auth;
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayoutInner() {
  const { user } = Route.useLoaderData();
  if (!user) {
    throw redirect({ to: "/login", search: { redirect: location.href } });
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
        name: user.name,
        email: user.email,
        avatar: user.image || undefined,
      }} variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="@container/main flex flex-1 flex-col gap-4 p-4 sm:p-6 sm:gap-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AuthenticatedLayout() {
  const hookSession = useAuth();
  
  // Resolve the auth client when session is ready
  React.useEffect(() => {
    if (!hookSession.isLoading && resolveAuthClient) {
      resolveAuthClient(hookSession);
    }
  }, [hookSession]);

  return (
    <AuthProvider>
      <AuthenticatedLayoutInner />
    </AuthProvider>
  );
}
