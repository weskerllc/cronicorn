import { createFileRoute } from "@tanstack/react-router";

import { ChartAreaInteractive, DashboardTables, SectionCards } from "../../components/dashboard-new";
import { PageHeader } from "../../components/page-header";
import { jobsQueryOptions } from "@/lib/api-client/queries/jobs.queries";

export const Route = createFileRoute("/_authed/dashboard")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(jobsQueryOptions());
  },
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <>
      <PageHeader text="Dashboard" />
      <SectionCards />
      <div>
        <ChartAreaInteractive />
      </div>
      <DashboardTables />
    </>
  );
}
