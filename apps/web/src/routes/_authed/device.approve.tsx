import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { IconAlertCircle, IconCheck, IconDeviceDesktop, IconX } from "@tabler/icons-react";
import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Skeleton } from "@cronicorn/ui-library/components/skeleton";

import { authClient } from "@/lib/auth-client";

type DeviceApproveSearch = {
    user_code?: string;
};

export const Route = createFileRoute("/_authed/device/approve")({
    component: DeviceApproval,
    validateSearch: (search: Record<string, unknown>): DeviceApproveSearch => {
        return {
            user_code: (search.user_code as string) || undefined,
        };
    },
    async loader({ context }) {
        const auth = await context.auth;
        if (!auth.user) {
            throw redirect({ to: "/login", search: { redirect: location.href } });
        }
        return auth;
    },
});

function DeviceApproval() {
    const { user } = Route.useLoaderData();
    if (!user) {
        throw redirect({ to: "/login", search: { redirect: location.href } });
    }


    const navigate = useNavigate();
    const search = Route.useSearch();
    const userCode = search.user_code;
    const [status, setStatus] = useState<"pending" | "approved" | "denied">("pending");

    // Fetch device code details using authClient
    const { data: deviceCode, isLoading, error } = useQuery({
        queryKey: ["device-code", userCode],
        queryFn: async () => {
            if (!userCode) throw new Error("No user code provided");

            const { data, error: deviceError } = await authClient.device({
                query: { user_code: userCode },
            });

            if (deviceError) {
                throw new Error(deviceError.error_description || "Failed to fetch device code");
            }

            return data as { user_code: string; status: string };
        },
        enabled: !!userCode,
        retry: false,
    });

    // Approve device mutation using authClient
    const approveMutation = useMutation({
        mutationFn: async () => {
            if (!userCode) throw new Error("No user code provided");

            const { data, error: approveError } = await authClient.device.approve({
                userCode,
            });

            if (approveError) {
                throw new Error(approveError.error_description || "Failed to approve device");
            }

            return data;
        },
        onSuccess: () => {
            setStatus("approved");
        },
    });

    // Deny device mutation using authClient
    const denyMutation = useMutation({
        mutationFn: async () => {
            if (!userCode) throw new Error("No user code provided");

            const { data, error: denyError } = await authClient.device.deny({
                userCode,
            });

            if (denyError) {
                throw new Error(denyError.error_description || "Failed to deny device");
            }

            return data;
        },
        onSuccess: () => {
            setStatus("denied");
        },
    });



    // Show loading state
    if (isLoading) {
        return (
            <div className="container max-w-md mx-auto py-16 px-4">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-full" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Show error state
    if (error || !deviceCode) {
        return (
            <div className="container max-w-md mx-auto py-16 px-4">
                <Alert variant="destructive">
                    <IconAlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {error?.message || "Invalid or expired device code"}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Show success state (approved)
    if (status === "approved") {
        return (
            <div className="container max-w-md mx-auto py-16 px-4">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                                <IconCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <CardTitle>Device Authorized</CardTitle>
                        </div>
                        <CardDescription>
                            Your AI agent has been successfully connected
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            You can now return to your AI agent. It should have access to your Cronicorn account.
                        </p>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => navigate({ to: "/dashboard" })}
                        >
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Show denied state
    if (status === "denied") {
        return (
            <div className="container max-w-md mx-auto py-16 px-4">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                                <IconX className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                            <CardTitle>Access Denied</CardTitle>
                        </div>
                        <CardDescription>
                            The device authorization was denied
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            The AI agent will not have access to your account.
                        </p>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => navigate({ to: "/dashboard" })}
                        >
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Show approval prompt (pending)
    return (
        <div className="container max-w-md mx-auto py-16 px-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                            <IconDeviceDesktop className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Authorize AI Agent</CardTitle>
                            <CardDescription>
                                Code: <span className="font-mono font-semibold">{userCode}</span>
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium">An AI agent is requesting access</h3>
                        <p className="text-sm text-muted-foreground">
                            This will allow the AI agent to manage your jobs, endpoints, and view analytics on your behalf.
                        </p>
                    </div>

                    <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                        <h4 className="text-sm font-medium">Permissions requested:</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2">
                                <IconCheck className="h-4 w-4 text-primary" />
                                Create and manage jobs
                            </li>
                            <li className="flex items-center gap-2">
                                <IconCheck className="h-4 w-4 text-primary" />
                                View job execution history
                            </li>
                            <li className="flex items-center gap-2">
                                <IconCheck className="h-4 w-4 text-primary" />
                                Pause and resume jobs
                            </li>
                        </ul>
                    </div>

                    <Alert>
                        <IconAlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Only approve this request if you initiated it from your AI agent.
                        </AlertDescription>
                    </Alert>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => denyMutation.mutate()}
                            disabled={denyMutation.isPending}
                        >
                            <IconX className="mr-2 h-4 w-4" />
                            Deny
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={() => approveMutation.mutate()}
                            disabled={approveMutation.isPending}
                        >
                            <IconCheck className="mr-2 h-4 w-4" />
                            Approve
                        </Button>
                    </div>

                    {(approveMutation.error || denyMutation.error) && (
                        <Alert variant="destructive">
                            <IconAlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                {approveMutation.error?.message || denyMutation.error?.message}
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
