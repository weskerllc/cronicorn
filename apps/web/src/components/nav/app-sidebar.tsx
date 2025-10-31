"use client";

import * as React from "react";
import {
  IconBriefcase,
  IconChartBar,
  IconDashboard,
  IconHelp,
  IconInnerShadowTop,
  IconKey,
  IconSettings,
} from "@tabler/icons-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@cronicorn/ui-library/components/sidebar";
import siteConfig from "../../site-config";
import { NavMain } from "@/components/nav/nav-main";
import { NavSecondary } from "@/components/nav/nav-secondary";
import { NavUser } from "@/components/nav/nav-user";

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Jobs",
      url: "/jobs",
      icon: IconBriefcase,
    },
    {
      title: "API Keys",
      url: "/api-keys",
      icon: IconKey,
    },
    {
      title: "Usage",
      url: "/usage",
      icon: IconChartBar,
    },
    {
      title: "Plan",
      url: "/plan",
      icon: IconChartBar,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: siteConfig.urls.support,
      icon: IconHelp,
    },
  ],
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/dashboard">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">{siteConfig.siteName}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
