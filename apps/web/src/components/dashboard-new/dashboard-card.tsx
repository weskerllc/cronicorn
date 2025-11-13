import * as React from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@cronicorn/ui-library/components/card";
import { cn } from "@cronicorn/ui-library/lib/utils";

interface DashboardCardProps {
    title: string;
    description?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    headerSlot?: React.ReactNode;
    footerSlot?: React.ReactNode;
    contentClassName?: string;
}

export function DashboardCard({
    title,
    description,
    children,
    className,
    headerSlot,
    footerSlot,
    contentClassName,
}: DashboardCardProps) {
    return (
        <Card className={cn("h-[300px] gap-0 py-0 px-0  overflow-hidden flex flex-col gap-2", className)}>
            <CardHeader className="flex-row items-start space-y-0 flex p-0 px-4 pt-4">
                <div className="grid gap-0.5">
                    <CardTitle className="text-base">{title}</CardTitle>
                    {description && (
                        <CardDescription className="text-xs">
                            {description}
                        </CardDescription>
                    )}
                </div>
                {headerSlot && (
                    <div className="ml-auto">{headerSlot}</div>
                )}
            </CardHeader>
            <CardContent className={cn("flex flex-auto overflow-hidden p-0", contentClassName)}>
                {children}
            </CardContent>
            {footerSlot && (
                <CardFooter className="p-0 py-1 px-1 mt-auto ">
                    {footerSlot}
                </CardFooter>
            )}
        </Card>
    );
}
