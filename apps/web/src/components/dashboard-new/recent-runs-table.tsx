"use client";

import { IconDotsVertical } from "@tabler/icons-react";

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

interface RunRow {
  id: string;
  endpointId: string;
  endpointName: string;
  jobName: string;
  status: string;
  startedAt: string;
  durationMs: number | null;
  source: string;
}

const columns: Array<ColumnDef<RunRow>> = [
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
    accessorKey: "endpointName",
    header: "Endpoint",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.endpointName}</span>
        <span className="text-muted-foreground text-xs">{row.original.jobName}</span>
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={
          row.original.status === "success"
            ? "default"
            : row.original.status === "failure"
              ? "destructive"
              : "outline"
        }
      >
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.source}</span>
    ),
  },
  {
    accessorKey: "startedAt",
    header: "Started At",
    cell: ({ row }) => {
      const date = new Date(row.original.startedAt);
      return (
        <div className="flex flex-col text-sm">
          <span>{date.toLocaleDateString()}</span>
          <span className="text-muted-foreground text-xs">{date.toLocaleTimeString()}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "durationMs",
    header: () => <div className="w-full text-right">Duration</div>,
    cell: ({ row }) => (
      <div className="text-right text-sm font-medium">
        {row.original.durationMs ? `${row.original.durationMs}ms` : "—"}
      </div>
    ),
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
              to="/runs/$id"
              params={{ id: row.original.id }}
            >
              View Details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Retry</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

interface RecentRunsTableProps {
  data: Array<RunRow>;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function RecentRunsTable({ data, onRefresh, isRefreshing = false }: RecentRunsTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      onRefresh={onRefresh}
      isRefreshing={isRefreshing}
      enableRowSelection={true}
      emptyMessage="No runs found."
      getRowId={(row) => row.id}
    />
  );
}
