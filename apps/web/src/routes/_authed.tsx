import { Outlet, createFileRoute, useRouter } from "@tanstack/react-router";
import React from "react";

import { SidebarInset, SidebarProvider } from "@cronicorn/ui-library/components/sidebar";
import { AppSidebar } from "../components/nav/app-sidebar";
import { SiteHeader } from "../components/nav/site-header";
import { useSession } from "../lib/auth-client";

export const Route = createFileRoute("/_authed")({
  component: AuthenticatedLayout,
  ssr: false,
});

function AuthenticatedLayout() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  React.useEffect(() => {
    if (!isPending && !session) {
      router.navigate({ to: "/login" });
    }
  }, [session, isPending, router]);
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

  if (!session) {
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
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
