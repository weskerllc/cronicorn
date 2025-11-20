"use client";

import {
  IconBriefcase,
  IconDashboard,
  IconHelp,
  IconKey,
  IconSettings
} from "@tabler/icons-react";
import * as React from "react";
import { Link } from "@tanstack/react-router";

import { brand, urls } from "@cronicorn/content";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@cronicorn/ui-library/components/sidebar";
// import AppLogo from "../../../../public/logo.svg?react";
import AppLogo from "../../../public/logo.svg?react";

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
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: urls.github.issues,
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
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link to="/dashboard">
                <AppLogo className="size-5! fill-foreground" />

                <span className="text-base font-semibold">{brand.name}</span>
              </Link>
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
