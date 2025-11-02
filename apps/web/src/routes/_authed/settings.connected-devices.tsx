import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Smartphone, Trash2 } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@cronicorn/ui-library/components/alert-dialog";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import { Skeleton } from "@cronicorn/ui-library/components/skeleton";

import type { ListDevicesResponse } from "@/lib/api-client/queries/devices.queries";
import { devicesQueryOptions, revokeDevice } from "@/lib/api-client/queries/devices.queries";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authed/settings/connected-devices")({
    component: ConnectedDevices,
});

type OAuthToken = ListDevicesResponse["devices"][number];

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    return date.toLocaleDateString();
}

function formatExpiresIn(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays < 1) return "expires soon";
    if (diffDays === 1) return "expires in 1 day";
    return `expires in ${diffDays} days`;
}

function ConnectedDevices() {
    const queryClient = useQueryClient();
    const [deviceToRevoke, setDeviceToRevoke] = useState<OAuthToken | null>(null);

    // Fetch connected devices using RPC query
    const { data, isLoading, error } = useQuery(devicesQueryOptions());
    const tokens = data?.devices || [];

    // Revoke device mutation using RPC function
    const revokeMutation = useMutation({
        mutationFn: revokeDevice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["connected-devices"] });
            setDeviceToRevoke(null);
        },
    });

    const handleRevokeClick = (token: OAuthToken) => {
        setDeviceToRevoke(token);
    };

    const handleConfirmRevoke = () => {
        if (deviceToRevoke) {
            revokeMutation.mutate(deviceToRevoke.id);
        }
    };

    return (
        <>
            <PageHeader
                text="Connected Devices"
                description="Manage devices and applications that have access to your account"
            />

            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Failed to load connected devices. Please try again later.
                    </AlertDescription>
                </Alert>
            )}

            <AlertDialog open={!!deviceToRevoke} onOpenChange={(open) => !open && setDeviceToRevoke(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Revoke Device Access</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to revoke access for{" "}
                            <span className="font-semibold">
                                {deviceToRevoke?.userAgent || "this device"}
                            </span>
                            ? This action cannot be undone. The device will be logged out immediately.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmRevoke}
                            disabled={revokeMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {revokeMutation.isPending ? "Revoking..." : "Revoke Access"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Failed to load connected devices. Please try again later.
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Active Devices</CardTitle>
                    <CardDescription>
                        These devices and applications currently have access to your Cronicorn account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-start gap-4 flex-1">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="space-y-2 flex-1">
                                            <Skeleton className="h-4 w-1/3" />
                                            <Skeleton className="h-3 w-1/2" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-9 w-20" />
                                </div>
                            ))}
                        </div>
                    ) : tokens && tokens.length > 0 ? (
                        <div className="space-y-4">
                            {tokens.map((token) => (
                                <div
                                    key={token.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <Smartphone className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium">
                                                    {token.userAgent || "Unknown Device"}
                                                </p>
                                                {token.ipAddress && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-muted">
                                                        {token.ipAddress}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                <span>
                                                    Connected {formatRelativeTime(token.createdAt)}
                                                </span>
                                                <span>
                                                    {formatExpiresIn(token.expiresAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRevokeClick(token)}
                                        disabled={revokeMutation.isPending}
                                        className="ml-4 shrink-0"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Revoke
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No connected devices</h3>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                You haven't connected any devices or applications yet. When you authorize a device using
                                a user code, it will appear here.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
