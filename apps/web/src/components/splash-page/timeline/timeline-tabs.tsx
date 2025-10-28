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
};

export function TimelineTabs({ tabs, className }: AnimatedTabsProps) {
  const [activeTab, setActiveTab] = React.useState(tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  return (
    <div className={cn("w-full flex flex-col gap-4", className)}>

      <Tabs defaultValue="account" className="w-full" value={activeTab} onValueChange={handleTabChange}>

        <ScrollArea className="rounded-lg bg-background/70 backdrop-blur-xl max-w-5xl mx-auto w-full   shadow-2xl">
          <div className="w-full relative h-10">
            <TabsList className="flex absolute h-10 bg-transparent min-w-full">
              {tabs.map(tab => (
                <TabsTrigger
                  className="data-[state=active]:bg-secondary! text-xs "
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
          <TabsContent key={`${tab.label}-tab-content`} value={tab.id}>
            {tab.content}
          </TabsContent>

        ))}
      </Tabs>

    </div>
  );
}
