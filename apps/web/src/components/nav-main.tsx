"use client"

import {  IconCirclePlusFilled, IconMail } from "@tabler/icons-react"

import { Button } from "@cronicorn/ui-library/components/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@cronicorn/ui-library/components/sidebar"
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@cronicorn/ui-library/lib/utils";
import type {Icon} from "@tabler/icons-react";

export function NavMain({
  items,
}: {
  items: Array<{
    title: string
    url: string
    icon?: Icon
  }>
}) {
    const location = useLocation()
    console.log({location})

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Quick Create"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
            >
              <IconCirclePlusFilled />
              <span>Quick Create</span>
            </SidebarMenuButton>
            <Button
              size="icon"
              className="size-8 group-data-[collapsible=icon]:opacity-0"
              variant="outline"
            >
              <IconMail />
              <span className="sr-only">Inbox</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton className={cn({'bg-sidebar-accent text-sidebar-accent-foreground': location.pathname === item.url})} tooltip={item.title} asChild>
                  <Link to={item.url}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
