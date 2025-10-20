import { createFileRoute } from "@tanstack/react-router";

import { jobsQueryOptions } from "../lib/api-client/queries/jobs.queries";
import { ChartAreaInteractive, DashboardTables, SectionCards } from "../components/dashboard-new";

export const Route = createFileRoute("/dashboard/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(jobsQueryOptions());
  },
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-4 py-4 sm:gap-6 sm:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </div>
      
      <SectionCards />
      
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      
      <DashboardTables />
    </div>
  );
}
