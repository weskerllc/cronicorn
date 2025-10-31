"use client";

import * as React from "react";

import { ScrollArea, ScrollBar } from "@cronicorn/ui-library/components/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@cronicorn/ui-library/components/tabs";
import { cn } from "@cronicorn/ui-library/lib/utils";

type AnimatedTabsProps = {
  tabs: Array<{
    id: string;
    label: string;
    content: React.ReactNode;
    icon?: React.ReactNode;
    badge?: string | number;
  }>;
  className?: string;
  variant?: "default" | "pills" | "underline";
  onTabChange?: (tabId: string) => void;
};

export function TimelineTabs({ tabs, className, onTabChange }: AnimatedTabsProps) {
  const [activeTab, setActiveTab] = React.useState(tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  return (
    <div className={cn("w-full flex flex-col gap-5", className)}>

      <Tabs defaultValue="account" className="w-full" value={activeTab} onValueChange={handleTabChange}>

        <ScrollArea className="max-w-6xl mx-auto w-full">
          <div className="w-full relative">
            <TabsList className="flex h-auto bg-transparent min-w-full p-0 gap-0 rounded-none border-b border-border/20">
              {tabs.map(tab => (
                <TabsTrigger
                  className="relative rounded-none border-0 bg-transparent px-4 md:px-5 py-3 text-sm font-medium text-muted-foreground shadow-none transition-all duration-150 hover:text-foreground/90 data-[state=active]:bg-transparent! data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-transparent data-[state=active]:after:bg-primary"
                  key={`${tab.label}-tab-trigger`}
                  value={tab.id}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>

        {tabs.map(tab => (
          <TabsContent key={`${tab.label}-tab-content`} value={tab.id} className="mt-5">
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>

    </div>
  );
}
