"use client";

import {
  IconCircleCheckFilled,
  IconDotsVertical,
  IconX,
} from "@tabler/icons-react";

import { Badge } from "@cronicorn/ui-library/components/badge";
import { Button } from "@cronicorn/ui-library/components/button";
import { Checkbox } from "@cronicorn/ui-library/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@cronicorn/ui-library/components/dropdown-menu";

import { Link } from "@tanstack/react-router";
import { DataTable } from "../data-table";
import type { ColumnDef } from "@tanstack/react-table";

interface EndpointRow {
  id: string;
  name: string;
  jobName: string;
  successRate: number;
  runCount: number;
  lastRunAt: string | null;
  status: "active" | "paused";
}

const columns: Array<ColumnDef<EndpointRow>> = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Endpoint Name",
    cell: ({ row }) => (
      <Link to="/endpoints/$id" params={{ id: row.original.id }} className="flex flex-col hover:underline ">
        <span className="font-medium">{row.original.name}</span>
        <span className="text-muted-foreground text-xs">{row.original.jobName}</span>
      </Link>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-muted-foreground px-1.5">
        {row.original.status === "active" ? (
          <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
        ) : (
          <IconX className="text-gray-400" />
        )}
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "successRate",
    header: () => <div className="w-full text-right">Success Rate</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        <Badge
          variant={
            row.original.successRate >= 90
              ? "default"
              : row.original.successRate >= 50
                ? "outline"
                : "destructive"
          }
        >
          {row.original.successRate.toFixed(1)}%
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "runCount",
    header: () => <div className="w-full text-right">Total Runs</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">{row.original.runCount}</div>
    ),
  },
  {
    accessorKey: "lastRunAt",
    header: "Last Run",
    cell: ({ row }) => {
      if (!row.original.lastRunAt) return <span className="text-muted-foreground">Never</span>;
      const date = new Date(row.original.lastRunAt);
      return (
        <div className="flex flex-col text-sm">
          <span>{date.toLocaleDateString()}</span>
          <span className="text-muted-foreground text-xs">{date.toLocaleTimeString()}</span>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
          >
            <IconDotsVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem asChild>
            <Link
              to="/endpoints/$id"
              params={{ id: row.original.id }}
            >
              Edit Endpoint
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link
              to="/endpoints/$id/health"
              params={{ id: row.original.id }}
            >
              View Health
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              to="/endpoints/$id/runs"
              params={{ id: row.original.id }}
            >
              View Runs
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

interface TopEndpointsTableProps {
  data: Array<EndpointRow>;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function TopEndpointsTable({ data, onRefresh, isRefreshing = false }: TopEndpointsTableProps) {
  console.log({ data })
  return (
    <DataTable
      columns={columns}
      data={data}
      onRefresh={onRefresh}
      isRefreshing={isRefreshing}
      enableRowSelection={true}
      emptyMessage="No endpoints found."
      getRowId={(row) => row.id}
    />
  );
}
