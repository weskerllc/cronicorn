import { createFileRoute } from "@tanstack/react-router";

import { jobsQueryOptions } from "../lib/api-client/queries/jobs.queries";
import { ChartAreaInteractive, DataTable, SectionCards } from "../components/dashboard-new";

export const Route = createFileRoute("/dashboard/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(jobsQueryOptions());
  },
  component: DashboardPage,
});

function DashboardPage() {

  return (
<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <DataTable/>
            </div>  );
}
