import { Link, useMatchRoute } from "@tanstack/react-router";
import { cn } from "@cronicorn/ui-library/lib/utils";

export interface TabItem {
    to: string;
    label: string;
    exact?: boolean;
}

interface TabNavigationProps {
    tabs: Array<TabItem>;
    params: Record<string, string>;
    ariaLabel?: string;
}

export function TabNavigation({ tabs, params, ariaLabel = "Navigation tabs" }: TabNavigationProps) {
    const matchRoute = useMatchRoute();

    return (
        <div className="border-b border-border mb-6">
            <nav className="flex space-x-4" aria-label={ariaLabel}>
                {tabs.map((tab) => {
                    const isActive = matchRoute({
                        to: tab.to,
                        params,
                        ...(tab.exact ? { exact: true } : { fuzzy: true }),
                    });

                    return (
                        <Link
                            key={tab.to}
                            to={tab.to}
                            params={params}
                            className={cn(
                                "px-4 py-2 border-b-2 font-medium transition-colors",
                                isActive
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                            )}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
