"use client";

import { IconLoader } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@cronicorn/ui-library/components/tabs";
import { RecentRunsTable } from "./recent-runs-table";
import { TopEndpointsTable } from "./top-endpoints-table";
import { dashboardStatsQueryOptions } from "@/lib/api-client/queries/dashboard.queries";

export function DashboardTables() {
  const { data, isLoading } = useQuery(dashboardStatsQueryOptions({ days: 7 }));

  if (isLoading) {
    return (
      <div className="px-4 lg:px-6">
        <div className="h-64 flex items-center justify-center">
          <IconLoader className="animate-spin size-8" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-4 lg:px-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load dashboard data
        </div>
      </div>
    );
  }

  // Transform top endpoints into table rows
  const endpointsData = data.topEndpoints.map((endpoint) => ({
    id: endpoint.id,
    name: endpoint.name,
    jobName: endpoint.jobName,
    successRate: endpoint.successRate,
    runCount: endpoint.runCount,
    lastRunAt: endpoint.lastRunAt,
    status: "active" as const, // We don't have this in the response yet
  }));

  // Recent runs data needs type casting for status field
  const runsData = data.recentRuns.map((run) => ({
    ...run,
    status: run.status as "success" | "failure" | "cancelled" | "timeout",
    source: run.source || "unknown",
  }));

  return (
    <Tabs defaultValue="endpoints" className="w-full flex flex-col justify-start gap-4">
      <div className="flex items-center justify-between">
        <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1">
          <TabsTrigger value="endpoints">Top Endpoints</TabsTrigger>
          <TabsTrigger value="recent">Recent Runs</TabsTrigger>
        </TabsList>
      </div>
      
      <TabsContent
        value="endpoints"
        className="relative flex flex-col gap-4 overflow-auto"
      >
        <TopEndpointsTable data={endpointsData} />
      </TabsContent>
      
      <TabsContent value="recent" className="flex flex-col">
        <RecentRunsTable data={runsData} />
      </TabsContent>
    </Tabs>
  );
}
