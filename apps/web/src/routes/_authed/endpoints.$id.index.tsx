import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AlertCircle, ChevronDown, ChevronUp, Clock, Play, Plus, Save, X, Zap } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@cronicorn/ui-library/components/alert";
import { Badge } from "@cronicorn/ui-library/components/badge";
import { Button } from "@cronicorn/ui-library/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cronicorn/ui-library/components/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@cronicorn/ui-library/components/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@cronicorn/ui-library/components/form";
import { Input } from "@cronicorn/ui-library/components/input";
import { Label } from "@cronicorn/ui-library/components/label";
import { RadioGroup, RadioGroupItem } from "@cronicorn/ui-library/components/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@cronicorn/ui-library/components/select";
import { Separator } from "@cronicorn/ui-library/components/separator";
import { Textarea } from "@cronicorn/ui-library/components/textarea";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "../../components/page-header";
import type { UpdateEndpointForm } from "@/lib/endpoint-forms";
import { applyIntervalHint, clearHints, endpointByIdQueryOptions, pauseEndpoint, resetFailures, scheduleOneShot, updateEndpoint } from "@/lib/api-client/queries/endpoints.queries";
import { jobQueryOptions } from "@/lib/api-client/queries/jobs.queries";
import {
    endpointToFormData,
    transformUpdatePayload,
    updateEndpointSchema
} from "@/lib/endpoint-forms";
import { isEndpointPaused } from "@/lib/endpoint-utils";

export const Route = createFileRoute("/_authed/endpoints/$id/")({
    loader: async ({ params, context }) => {
        // Load endpoint by ID only
        const endpoint = await context.queryClient.ensureQueryData(
            endpointByIdQueryOptions(params.id),
        );
        // Then load the job for breadcrumb context (if jobId exists)
        if (endpoint.jobId) {
            await context.queryClient.ensureQueryData(jobQueryOptions(endpoint.jobId));
        }
    },
    component: EditEndpointPage,
});

// Schema for interval hint dialog
const intervalHintSchema = z.object({
    intervalMinutes: z.number().min(1, "Must be at least 1 minute"),
    ttlMinutes: z.number().min(1, "Must be at least 1 minute").optional(),
    reason: z.string().optional(),
});

type IntervalHintForm = z.infer<typeof intervalHintSchema>;

function EditEndpointPage() {
    const { id } = Route.useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { data: endpoint } = useSuspenseQuery(endpointByIdQueryOptions(id));
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [intervalHintDialogOpen, setIntervalHintDialogOpen] = useState(false);

    const form = useForm<UpdateEndpointForm>({
        resolver: zodResolver(updateEndpointSchema),
        defaultValues: endpointToFormData(endpoint) as UpdateEndpointForm,
    });

    const intervalHintForm = useForm<IntervalHintForm>({
        resolver: zodResolver(intervalHintSchema),
        defaultValues: {
            intervalMinutes: 15,
            ttlMinutes: 60,
            reason: "",
        },
    });

    const { fields: headerFields, append: appendHeader, remove: removeHeader } = useFieldArray({
        control: form.control,
        name: "headers",
    });

    const watchedScheduleType = form.watch("scheduleType");

    const { mutateAsync: updateMutate, isPending: updatePending, error: updateError } = useMutation({
        mutationFn: async (data: UpdateEndpointForm) => {
            if (!endpoint.jobId) {
                throw new Error("Endpoint is missing jobId");
            }
            const payload = transformUpdatePayload(data);
            return updateEndpoint(endpoint.jobId, id, payload);
        },
        onSuccess: async () => {
            // Invalidate the flat endpoint query
            await queryClient.invalidateQueries({ queryKey: ["endpoints", id] });
            // Also invalidate job-scoped queries so job detail page updates
            if (endpoint.jobId) {
                await queryClient.invalidateQueries({ queryKey: ["jobs", endpoint.jobId, "endpoints"] });
                await queryClient.invalidateQueries({ queryKey: ["jobs", endpoint.jobId, "endpoints", id] });
            }
            toast.success("Endpoint updated successfully");
        },
    });
    const { mutateAsync: pauseMutate, isPending: pausePending } = useMutation({
        mutationFn: async (pausedUntil: string | null) => pauseEndpoint(id, { pausedUntil }),
        onSuccess: async (_, pausedUntil) => {
            await queryClient.invalidateQueries({ queryKey: ["endpoints", id] });
            if (endpoint.jobId) {
                await queryClient.invalidateQueries({ queryKey: ["jobs", endpoint.jobId, "endpoints"] });
                await queryClient.invalidateQueries({ queryKey: ["jobs", endpoint.jobId, "endpoints", id] });
            }
            toast.success(pausedUntil ? "Endpoint paused for 24 hours" : "Endpoint resumed");
        },
    });

    const { mutateAsync: resetMutate, isPending: resetPending } = useMutation({
        mutationFn: async () => resetFailures(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["endpoints", id] });
            if (endpoint.jobId) {
                await queryClient.invalidateQueries({ queryKey: ["jobs", endpoint.jobId, "endpoints"] });
                await queryClient.invalidateQueries({ queryKey: ["jobs", endpoint.jobId, "endpoints", id] });
            }
            toast.success("Failure count reset");
        },
    });

    const { mutateAsync: clearMutate, isPending: clearPending } = useMutation({
        mutationFn: async () => clearHints(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["endpoints", id] });
            if (endpoint.jobId) {
                await queryClient.invalidateQueries({ queryKey: ["jobs", endpoint.jobId, "endpoints"] });
                await queryClient.invalidateQueries({ queryKey: ["jobs", endpoint.jobId, "endpoints", id] });
            }
            toast.success("AI hints cleared");
        },
    });

    const { mutateAsync: runNowMutate, isPending: runNowPending } = useMutation({
        mutationFn: async () => scheduleOneShot(id, { nextRunInMs: 0, reason: "Manual trigger via UI" }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["endpoints", id] });
            if (endpoint.jobId) {
                await queryClient.invalidateQueries({ queryKey: ["jobs", endpoint.jobId, "endpoints"] });
                await queryClient.invalidateQueries({ queryKey: ["jobs", endpoint.jobId, "endpoints", id] });
            }
            toast.success("Endpoint scheduled to run immediately");
        },
    });

    const { mutateAsync: applyHintMutate, isPending: applyHintPending } = useMutation({
        mutationFn: async (data: IntervalHintForm) => {
            await applyIntervalHint(id, {
                intervalMs: data.intervalMinutes * 60 * 1000,
                ttlMinutes: data.ttlMinutes,
                reason: data.reason,
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["endpoints", id] });
            if (endpoint.jobId) {
                await queryClient.invalidateQueries({ queryKey: ["jobs", endpoint.jobId, "endpoints"] });
                await queryClient.invalidateQueries({ queryKey: ["jobs", endpoint.jobId, "endpoints", id] });
            }
            toast.success("Interval hint applied");
            setIntervalHintDialogOpen(false);
            intervalHintForm.reset();
        },
    });

    const handleFormSubmit = async (data: UpdateEndpointForm) => {
        await updateMutate(data);
    };

    const handlePause = async () => {
        const isPaused = isEndpointPaused(endpoint.pausedUntil);
        const pausedUntil = isPaused ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        await pauseMutate(pausedUntil);
    };

    const handleResetFailures = async () => {
        await resetMutate();
    };

    const handleClearHints = async () => {
        await clearMutate();
    };

    const handleRunNow = async () => {
        await runNowMutate();
    };

    const handleApplyHint = async (data: IntervalHintForm) => {
        await applyHintMutate(data);
    };

    const onCancel = () => {
        router.history.back();
    };

    const isPaused = isEndpointPaused(endpoint.pausedUntil);
    const hasAIHints = !!(endpoint.aiHintIntervalMs || endpoint.aiHintNextRunAt || endpoint.aiHintReason);
    const isHintExpired = endpoint.aiHintExpiresAt && new Date(endpoint.aiHintExpiresAt) < new Date();

    return (
        <>

            <PageHeader
                text="Edit Endpoint"
                description={`Update configuration for ${endpoint.name}`}
            />

            {hasAIHints && (
                <Card className="mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-semibold">AI Scheduling Hint Active</h2>
                        {isHintExpired && (
                            <Badge variant="destructive">Expired</Badge>
                        )}
                    </div>

                    <div className="space-y-3">
                        {endpoint.aiHintIntervalMs && (
                            <div>
                                <p className="text-sm text-muted-foreground">Suggested Interval</p>
                                <p className="font-medium">
                                    {Math.round(endpoint.aiHintIntervalMs / 60000)} minutes
                                    <span className="text-sm text-muted-foreground ml-2">
                                        ({endpoint.aiHintIntervalMs}ms)
                                    </span>
                                </p>
                            </div>
                        )}

                        {endpoint.aiHintNextRunAt && (
                            <div>
                                <p className="text-sm text-muted-foreground">Suggested Next Run</p>
                                <p className="font-medium">
                                    {new Date(endpoint.aiHintNextRunAt).toLocaleString()}
                                </p>
                            </div>
                        )}

                        {endpoint.aiHintExpiresAt && (
                            <div>
                                <p className="text-sm text-muted-foreground">Hint Expires</p>
                                <p className={`font-medium ${isHintExpired ? "text-destructive" : ""}`}>
                                    {new Date(endpoint.aiHintExpiresAt).toLocaleString()}
                                    {isHintExpired && <span className="ml-2 text-sm">(Expired)</span>}
                                </p>
                            </div>
                        )}

                        {endpoint.aiHintReason && (
                            <div>
                                <p className="text-sm text-muted-foreground">Reason</p>
                                <p className="text-sm italic">{endpoint.aiHintReason}</p>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {updateError && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{updateError.message}</AlertDescription>
                </Alert>
            )}

            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Endpoint Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Fetch Users API" {...field} disabled={updatePending} />
                                </FormControl>
                                <FormDescription>A descriptive name for this endpoint</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description (Optional)</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="e.g., Fetches user data for analytics dashboard"
                                        {...field}
                                        disabled={updatePending}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Endpoint-specific context: what it does, response schema, thresholds
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="url"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>URL</FormLabel>
                                <FormControl>
                                    <Input
                                        type="url"
                                        placeholder="https://api.example.com/users"
                                        {...field}
                                        disabled={updatePending}
                                    />
                                </FormControl>
                                <FormDescription>The full URL to call for this endpoint</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="method"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>HTTP Method</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    disabled={updatePending}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select HTTP method" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="GET">GET</SelectItem>
                                        <SelectItem value="POST">POST</SelectItem>
                                        <SelectItem value="PUT">PUT</SelectItem>
                                        <SelectItem value="PATCH">PATCH</SelectItem>
                                        <SelectItem value="DELETE">DELETE</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="scheduleType"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Schedule Type</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex flex-col space-y-1"
                                        disabled={updatePending}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="interval" id="interval" />
                                            <Label htmlFor="interval" className="font-normal cursor-pointer">
                                                Fixed Interval
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="cron" id="cron" />
                                            <Label htmlFor="cron" className="font-normal cursor-pointer">
                                                Cron Expression
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </FormControl>
                                <FormDescription>
                                    Choose how you want to schedule this endpoint
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {watchedScheduleType === "interval" && (
                        <FormField
                            control={form.control}
                            name="baselineIntervalMinutes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Interval (minutes)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="5"
                                            min="1"
                                            {...field}
                                            disabled={updatePending}
                                            value={field.value || ""}
                                            onChange={(e) =>
                                                field.onChange(e.target.value ? Number(e.target.value) : undefined)
                                            }
                                        />
                                    </FormControl>
                                    <FormDescription>How often should this endpoint run?</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    {watchedScheduleType === "cron" && (
                        <FormField
                            control={form.control}
                            name="baselineCron"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cron Expression</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="0 * * * *"
                                            {...field}
                                            disabled={updatePending}
                                            value={field.value || ""}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        5-field format: minute hour day month weekday (e.g., "0 * * * *" for hourly)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Request Headers</CardTitle>
                            <CardDescription>
                                Add custom headers to be sent with each request
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {headerFields.map((headerField, index) => (
                                <div key={headerField.id} className="flex gap-2 items-end">
                                    <FormField
                                        control={form.control}
                                        name={`headers.${index}.key`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                {index === 0 && <FormLabel>Header Name</FormLabel>}
                                                <FormControl>
                                                    <Input
                                                        placeholder="e.g., Authorization"
                                                        {...field}
                                                        disabled={updatePending}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`headers.${index}.value`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                {index === 0 && <FormLabel>Header Value</FormLabel>}
                                                <FormControl>
                                                    <Input
                                                        placeholder="e.g., Bearer your-token"
                                                        {...field}
                                                        disabled={updatePending}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => removeHeader(index)}
                                        disabled={updatePending}
                                    >
                                        <X className="size-4" />
                                    </Button>
                                </div>
                            ))}

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => appendHeader({ key: "", value: "" })}
                                disabled={updatePending}
                            >
                                <Plus className="size-4 mr-2" />
                                Add Header
                            </Button>

                            {headerFields.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    No custom headers configured. Click "Add Header" to add one.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Request Body (for POST/PUT/PATCH/DELETE) */}
                    {form.watch("method") !== "GET" && (
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle>Request Body</CardTitle>
                                <CardDescription>
                                    JSON payload to send with {form.watch("method")} requests
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <FormField
                                    control={form.control}
                                    name="bodyJson"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>JSON Body (Optional)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder={'{\n  "key": "value"\n}'}
                                                    rows={8}
                                                    className="font-mono text-sm"
                                                    {...field}
                                                    disabled={updatePending}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Enter valid JSON. Will be parsed and validated before submission.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* Advanced Configuration */}
                    <Card className="mb-6">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Advanced Configuration</CardTitle>
                                    <CardDescription>
                                        Optional timeout, execution limits, and AI scheduling constraints
                                    </CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                >
                                    {showAdvanced ? (
                                        <>
                                            <ChevronUp className="size-4 mr-1" />
                                            Hide
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="size-4 mr-1" />
                                            Show
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardHeader>
                        {showAdvanced && (
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="timeoutMs"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Request Timeout (ms)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        placeholder="e.g., 30000"
                                                        {...field}
                                                        disabled={updatePending}
                                                        value={field.value ?? ""}
                                                        onChange={(e) =>
                                                            field.onChange(e.target.value ? Number(e.target.value) : undefined)
                                                        }
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    HTTP request timeout in milliseconds
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="maxExecutionTimeMs"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Max Execution Time (ms)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        max="1800000"
                                                        placeholder="e.g., 60000 (1 min)"
                                                        {...field}
                                                        disabled={updatePending}
                                                        value={field.value ?? ""}
                                                        onChange={(e) =>
                                                            field.onChange(e.target.value ? Number(e.target.value) : undefined)
                                                        }
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Lock duration for distributed execution (max: 30 min)
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="maxResponseSizeKb"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Max Response Size (KB)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        placeholder="e.g., 1024"
                                                        {...field}
                                                        disabled={updatePending}
                                                        value={field.value ?? ""}
                                                        onChange={(e) =>
                                                            field.onChange(e.target.value ? Number(e.target.value) : undefined)
                                                        }
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Maximum response body size to capture
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="pt-4 border-t">
                                    <h4 className="text-sm font-medium mb-3">AI Scheduling Constraints</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="minIntervalMinutes"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Min Interval (minutes)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            placeholder="e.g., 5"
                                                            {...field}
                                                            disabled={updatePending}
                                                            value={field.value ?? ""}
                                                            onChange={(e) =>
                                                                field.onChange(e.target.value ? Number(e.target.value) : undefined)
                                                            }
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Minimum time between AI-adjusted runs
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="maxIntervalMinutes"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Max Interval (minutes)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            placeholder="e.g., 60"
                                                            {...field}
                                                            disabled={updatePending}
                                                            value={field.value ?? ""}
                                                            onChange={(e) =>
                                                                field.onChange(e.target.value ? Number(e.target.value) : undefined)
                                                            }
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Maximum time between AI-adjusted runs
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        )}
                    </Card>

                    <div className="flex gap-4">
                        <Button type="submit" disabled={updatePending}>
                            <Save className="size-4 mr-2" />
                            {updatePending ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button type="button" variant="outline" onClick={onCancel}>
                            <X className="size-4 mr-2" />
                            Cancel
                        </Button>
                    </div>
                </form>
            </Form>

            <Separator className="my-8" />

            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Endpoint Actions</h2>

                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="default"
                        onClick={handleRunNow}
                        disabled={runNowPending || isPaused}
                    >
                        <Play className="h-4 w-4 mr-2" />
                        {runNowPending ? "Scheduling..." : "Run Now"}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handlePause}
                        disabled={pausePending}
                    >
                        {pausePending ? "Loading..." : isPaused ? "Resume Endpoint" : "Pause Endpoint"}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleResetFailures}
                        disabled={resetPending}
                    >
                        {resetPending ? "Loading..." : "Reset Failure Count"}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleClearHints}
                        disabled={clearPending}
                    >
                        {clearPending ? "Loading..." : "Clear AI Hints"}
                    </Button>

                    <Dialog open={intervalHintDialogOpen} onOpenChange={setIntervalHintDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Clock className="h-4 w-4 mr-2" />
                                Set Interval Hint
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Apply Interval Hint</DialogTitle>
                                <DialogDescription>
                                    Manually override the scheduling interval for this endpoint. The hint will expire after the specified TTL.
                                </DialogDescription>
                            </DialogHeader>

                            <Form {...intervalHintForm}>
                                <form onSubmit={intervalHintForm.handleSubmit(handleApplyHint)} className="space-y-4">
                                    <FormField
                                        control={intervalHintForm.control}
                                        name="intervalMinutes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Interval (minutes)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        placeholder="15"
                                                        {...field}
                                                        value={field.value || ""}
                                                        onChange={(e) => {
                                                            field.onChange(
                                                                e.target.value
                                                                    ? Number(e.target.value)
                                                                    : undefined,
                                                            );
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormDescription>How often should the endpoint run?</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={intervalHintForm.control}
                                        name="ttlMinutes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Time to Live (minutes)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        placeholder="60"
                                                        {...field}
                                                        value={field.value ?? ""}
                                                        onChange={(e) => {
                                                            field.onChange(
                                                                e.target.value
                                                                    ? Number(e.target.value)
                                                                    : undefined,
                                                            );
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormDescription>How long should this hint remain active?</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={intervalHintForm.control}
                                        name="reason"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Reason (optional)</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Why are you changing the interval?"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>Provide context for this manual override</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setIntervalHintDialogOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={applyHintPending}>
                                            {applyHintPending ? "Applying..." : "Apply Hint"}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Endpoint State</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Paused Until:</span>
                                <span className="font-mono">{endpoint.pausedUntil || "—"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Failure Count:</span>
                                <span className="font-mono">{endpoint.failureCount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Last Run:</span>
                                <span className="font-mono text-xs">{endpoint.lastRunAt || "—"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Next Run:</span>
                                <span className="font-mono text-xs">{endpoint.nextRunAt}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Advanced Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Timeout:</span>
                                <span className="font-mono">{endpoint.timeoutMs ? `${endpoint.timeoutMs}ms` : "Default"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Max Execution Time:</span>
                                <span className="font-mono">{endpoint.maxExecutionTimeMs ? `${endpoint.maxExecutionTimeMs}ms` : "Default"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Max Response Size:</span>
                                <span className="font-mono">{endpoint.maxResponseSizeKb ? `${endpoint.maxResponseSizeKb}KB` : "Default"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Min Interval:</span>
                                <span className="font-mono">{endpoint.minIntervalMs ? `${Math.round(endpoint.minIntervalMs / 60000)}min` : "—"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Max Interval:</span>
                                <span className="font-mono">{endpoint.maxIntervalMs ? `${Math.round(endpoint.maxIntervalMs / 60000)}min` : "—"}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
