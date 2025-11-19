import { Outlet, createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../components/composed/page-header";
import { TabNavigation } from "../../components/primitives/tab-navigation";
import { endpointByIdQueryOptions } from "@/lib/api-client/queries/endpoints.queries";
import { healthQueryOptions } from "@/lib/api-client/queries/runs.queries";
import { jobQueryOptions } from "@/lib/api-client/queries/jobs.queries";

export const Route = createFileRoute("/_authed/endpoints/$id")({
    loader: async ({ params, context }) => {
        // Load shared data for all tabs
        const endpoint = await context.queryClient.ensureQueryData(
            endpointByIdQueryOptions(params.id),
        );

        // Preload health data for overview tab
        await context.queryClient.ensureQueryData(healthQueryOptions(params.id));

        // Load job for breadcrumb context if jobId exists
        if (endpoint.jobId) {
            await context.queryClient.ensureQueryData(jobQueryOptions(endpoint.jobId));
        }

        return { endpoint };
    },
    component: EndpointLayoutPage,
});

function EndpointLayoutPage() {
    const { id } = Route.useParams();
    const { endpoint } = Route.useLoaderData();

    const tabs = [
        { to: "/endpoints/$id", label: "Overview", exact: true },
        { to: "/endpoints/$id/runs", label: "Run History" },
        { to: "/endpoints/$id/edit", label: "Edit" },
    ];

    return (
        <>
            <PageHeader
                text="Endpoint"
                description={endpoint.name}
            />

            <TabNavigation tabs={tabs} params={{ id }} ariaLabel="Endpoint tabs" />

            {/* Child route content renders here */}
            <Outlet />
        </>
    );
}
