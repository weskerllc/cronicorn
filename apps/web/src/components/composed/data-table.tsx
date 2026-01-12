"use client";

import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconChevronsLeft,
  IconChevronsRight,
  IconLoader,
  IconRefresh
} from "@tabler/icons-react";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import * as React from "react";

import { Button } from "@cronicorn/ui-library/components/button";
import { Input } from "@cronicorn/ui-library/components/input";
import { Label } from "@cronicorn/ui-library/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cronicorn/ui-library/components/select";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@cronicorn/ui-library/components/table";

import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";

interface DataTableProps<TData, TValue> {
  columns: Array<ColumnDef<TData, TValue>>;
  tableTitle?: string;
  data: Array<TData>;
  searchKey?: string;
  searchPlaceholder?: string;
  enableRowSelection?: boolean;
  enablePagination?: boolean;
  defaultPageSize?: number;
  pageSizeOptions?: Array<number>;
  emptyMessage?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  getRowId?: (row: TData) => string;
  // Server-side pagination props
  manualPagination?: boolean;
  pageCount?: number;
  pageIndex?: number; // For controlled pagination state (0-indexed)
  onPaginationChange?: (pagination: PaginationState) => void;
  // Row click handler
  onRowClick?: (row: TData) => void;
  // Initial sorting state
  initialSorting?: SortingState;
  // Custom header styling
  headerClassName?: string;
  // Custom container styling
  containerClassName?: string;
}

export function DataTable<TData, TValue>({
  columns,
  tableTitle,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  enableRowSelection = false,
  enablePagination = true,
  defaultPageSize = 10,
  pageSizeOptions = [5, 10, 20, 30, 40, 50],
  emptyMessage = "No results found.",
  onRefresh,
  isRefreshing = false,
  getRowId,
  manualPagination = false,
  pageCount,
  pageIndex: controlledPageIndex,
  onPaginationChange: externalOnPaginationChange,
  onRowClick,
  initialSorting = [],
  headerClassName,
  containerClassName,
}: DataTableProps<TData, TValue>) {
  const tableRef = React.useRef<HTMLDivElement>(null);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: controlledPageIndex ?? 0,
    pageSize: defaultPageSize,
  });

  // Sync controlled pagination state from props
  React.useEffect(() => {
    if (controlledPageIndex !== undefined) {
      setPagination(prev => ({ ...prev, pageIndex: controlledPageIndex }));
    }
  }, [controlledPageIndex]);

  const handlePaginationChange = React.useCallback(
    (updaterOrValue: PaginationState | ((old: PaginationState) => PaginationState)) => {
      const newPagination = typeof updaterOrValue === "function"
        ? updaterOrValue(pagination)
        : updaterOrValue;

      setPagination(newPagination);

      if (manualPagination && externalOnPaginationChange) {
        externalOnPaginationChange(newPagination);
      }
    },
    [pagination, manualPagination, externalOnPaginationChange]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    pageCount: manualPagination ? pageCount : undefined,
    manualPagination,
    enableRowSelection,
    getRowId,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div ref={tableRef} className="flex flex-col gap-4 h-full">
      {tableTitle && (<p className="text-lg font-medium">{tableTitle}</p>
      )}
      {(searchKey || onRefresh) && (
        <div className="flex items-center gap-2">
          {searchKey && (
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) || ""}
              onChange={(event) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
          )}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="ml-auto"
            >
              {isRefreshing ? (
                <>
                  <IconLoader className=" size-4 animate-spin" />
                </>
              ) : (
                <IconRefresh className="size-4" />
              )}
            </Button>
          )}
        </div>
      )}

      <div className={containerClassName ?? "overflow-hidden rounded-md border"}>
        <div className="overflow-y-auto flex-1 min-h-0 relative">
          <table className="w-full caption-bottom text-sm">
            <TableHeader className={headerClassName ?? "bg-muted sticky top-0 z-10"}>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();

                    return (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            onClick={() => {
                              if (sorted === "asc") {
                                header.column.toggleSorting(true);
                              } else if (sorted === "desc") {
                                header.column.clearSorting();
                              } else {
                                header.column.toggleSorting(false);
                              }
                            }}
                            className="flex items-center"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sorted === "asc" && <IconChevronUp className="ml-2 h-4 w-4" />}
                            {sorted === "desc" && <IconChevronDown className="ml-2 h-4 w-4" />}
                            {!sorted && <IconChevronUp className="ml-2 h-4 w-4 opacity-0" />}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}

                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={onRowClick ? "cursor-pointer hover:bg-muted/50" : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </div>

      {enablePagination && table.getPageCount() > 0 && (
        <div className="flex items-center justify-between px-2">

          <div className={`flex  flex-col gap-2 ${enableRowSelection ? "lg:w-fit" : "w-full justify-between"}`}>

            <div className="flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>

            {enableRowSelection && (
              <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
                {table.getFilteredSelectedRowModel().rows.length} of{" "}
                {table.getFilteredRowModel().rows.length} row(s) selected.
              </div>
            )}
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {pageSizeOptions.map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex text-sm font-medium pb-2">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
