import { Outlet, createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../components/composed/page-header";
import { TabNavigation } from "../../components/primitives/tab-navigation";

export const Route = createFileRoute("/_authed/settings")({
    component: SettingsLayoutPage,
});

function SettingsLayoutPage() {
    const tabs = [
        { to: "/settings", label: "Profile", exact: true },
        { to: "/settings/connected-devices", label: "Connected Devices" },
    ];

    return (
        <>
            <PageHeader
                text="Account Settings"
                description="Manage your profile and preferences"
            />

            <TabNavigation tabs={tabs} params={{}} ariaLabel="Settings tabs" />

            {/* Child route content renders here */}
            <Outlet />
        </>
    );
}
