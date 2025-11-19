import { Outlet, createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../components/composed/page-header";
import { TabNavigation } from "../../components/primitives/tab-navigation";
import { endpointsQueryOptions, jobQueryOptions } from "@/lib/api-client/queries/jobs.queries";

export const Route = createFileRoute("/_authed/jobs/$id")({
    loader: async ({ params, context }) => {
        // Load shared data for all tabs
        const jobPromise = context.queryClient.ensureQueryData(jobQueryOptions(params.id));
        const endpointsPromise = context.queryClient.ensureQueryData(
            endpointsQueryOptions(params.id),
        );
        const [job] = await Promise.all([jobPromise, endpointsPromise]);
        return { job };
    },
    component: JobLayoutPage,
});

function JobLayoutPage() {
    const { id } = Route.useParams();
    const { job } = Route.useLoaderData();

    const tabs = [
        { to: "/jobs/$id", label: "Overview", exact: true },
        { to: "/jobs/$id/endpoints", label: "Endpoints" },
        { to: "/jobs/$id/edit", label: "Edit" },
    ];

    return (
        <>
            <PageHeader
                text="Job"
                description={job.name}
            />

            <TabNavigation tabs={tabs} params={{ id }} ariaLabel="Job tabs" />

            {/* Child route content renders here */}
            <Outlet />
        </>
    );
}
