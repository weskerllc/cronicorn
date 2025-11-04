"use client";

import { IconDotsVertical } from "@tabler/icons-react";

import { Badge } from "@cronicorn/ui-library/components/badge";
import { Button } from "@cronicorn/ui-library/components/button";
import { Checkbox } from "@cronicorn/ui-library/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@cronicorn/ui-library/components/dropdown-menu";

import { Link } from "@tanstack/react-router";
import { DataTable } from "../data-table";

import type { ColumnDef } from "@tanstack/react-table";

interface AISessionRow {
  id: string;
  endpointId: string;
  endpointName: string;
  jobName: string;
  analyzedAt: string;
  reasoning: string;
  tokenUsage: number | null;
  durationMs: number | null;
  toolCallCount: number;
}

const columns: Array<ColumnDef<AISessionRow>> = [
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
    accessorKey: "reasoning",
    header: "Reasoning",
    cell: ({ row }) => (
      <div className="max-w-md" title={row.original.reasoning}>
        <span className="text-sm line-clamp-2">{row.original.reasoning}</span>
      </div>
    ),
  },
  {
    accessorKey: "toolCallCount",
    header: "Tools",
    cell: ({ row }) => (
      <Badge variant="outline">
        {row.original.toolCallCount} {row.original.toolCallCount === 1 ? "call" : "calls"}
      </Badge>
    ),
  },
  {
    accessorKey: "analyzedAt",
    header: "Analyzed At",
    cell: ({ row }) => {
      const date = new Date(row.original.analyzedAt);
      return (
        <div className="flex flex-col text-sm">
          <span>{date.toLocaleDateString()}</span>
          <span className="text-muted-foreground text-xs">{date.toLocaleTimeString()}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "tokenUsage",
    header: () => <div className="w-full text-right">Tokens</div>,
    cell: ({ row }) => (
      <div className="text-right text-sm font-medium">
        {row.original.tokenUsage ? row.original.tokenUsage.toLocaleString() : "—"}
      </div>
    ),
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
              to="/endpoints/$id"
              params={{ id: row.original.endpointId }}
            >
              View Endpoint
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

interface RecentAISessionsTableProps {
  data: Array<AISessionRow>;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function RecentAISessionsTable({ data, onRefresh, isRefreshing = false }: RecentAISessionsTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      onRefresh={onRefresh}
      isRefreshing={isRefreshing}
      enableRowSelection={true}
      emptyMessage="No AI sessions found."
      getRowId={(row) => row.id}
    />
  );
}
