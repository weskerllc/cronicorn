import { Skeleton } from "@cronicorn/ui-library/components/skeleton";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
} from "@cronicorn/ui-library/components/sidebar";
import { Separator } from "@cronicorn/ui-library/components/separator";
import { brand } from "@cronicorn/content";
import AppLogo from "../../../public/logo.svg?react";
import { PageSkeleton } from "./page-skeleton";

// Fixed widths for sidebar menu skeleton items to prevent "pumping" on re-renders
// These values mimic the real nav items: Dashboard, Jobs, API Keys, Settings, Get Help, Home Page
const MAIN_NAV_WIDTHS = ["70%", "45%", "60%"];
const SECONDARY_NAV_WIDTHS = ["55%", "58%", "65%"];

/**
 * Fixed-width sidebar menu skeleton item.
 * Unlike SidebarMenuSkeleton which uses random widths, this uses predetermined
 * widths to prevent visual "pumping" during re-renders and transitions.
 */
function FixedSidebarMenuSkeleton({ width, showIcon = true }: { width: string; showIcon?: boolean }) {
    return (
        <div className="flex h-8 items-center gap-2 rounded-md px-2">
            {showIcon && <Skeleton className="size-4 rounded-md" />}
            <Skeleton className="h-4 flex-1" style={{ maxWidth: width }} />
        </div>
    );
}

/**
 * AuthLayoutSkeleton - Shows a full layout skeleton while the authenticated
 * layout is loading (during beforeLoad auth check). Mimics the AppSidebar,
 * SiteHeader, and content area structure for a smooth loading experience.
 */
export function AuthLayoutSkeleton() {
    return (
        <SidebarProvider
            style={{
                // @ts-ignore - CSS custom properties conflict between csstype versions
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)",
            }}
        >
            {/* Skeleton Sidebar */}
            <Sidebar collapsible="offcanvas" variant="inset">
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton className="data-[slot=sidebar-menu-button]:p-1.5!">
                                <AppLogo className="size-5! fill-foreground" />
                                <span className="text-base font-semibold">{brand.name}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>
                <SidebarContent>
                    {/* Main nav skeleton */}
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {MAIN_NAV_WIDTHS.map((width, i) => (
                                    <FixedSidebarMenuSkeleton key={i} width={width} />
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                    {/* Secondary nav skeleton - pushed to bottom */}
                    <SidebarGroup className="mt-auto">
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {SECONDARY_NAV_WIDTHS.map((width, i) => (
                                    <FixedSidebarMenuSkeleton key={i} width={width} />
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
                <SidebarFooter>
                    {/* User section skeleton */}
                    <div className="flex items-center gap-2 p-2">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <div className="flex-1 space-y-1">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-2 w-32" />
                        </div>
                    </div>
                </SidebarFooter>
            </Sidebar>

            <SidebarInset>
                {/* Skeleton Header */}
                <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b">
                    <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
                        <Skeleton className="h-7 w-7 rounded" />
                        <Separator
                            orientation="vertical"
                            className="mx-2 data-[orientation=vertical]:h-4"
                        />
                        <div className="ml-auto flex items-center gap-2">
                            <Skeleton className="h-8 w-24 rounded" />
                        </div>
                    </div>
                </header>

                {/* Skeleton Content Area - Uses PageSkeleton for consistency with route transitions */}
                <div className="@container/main flex flex-1 flex-col gap-4 p-4 sm:p-6 sm:gap-6">
                    <PageSkeleton />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
