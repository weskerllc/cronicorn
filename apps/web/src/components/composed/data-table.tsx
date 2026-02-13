"use client";

import {
  IconChevronDown,
  IconChevronUp,
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
import { cn } from "@cronicorn/ui-library/lib/utils";
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@cronicorn/ui-library/components/pagination";

import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  SortingState,
  Table,
  VisibilityState,
} from "@tanstack/react-table";

/**
 * Generate page numbers to display with ellipsis for large page counts
 */
function getPageNumbers(currentPage: number, totalPages: number): Array<number | "ellipsis-start" | "ellipsis-end"> {
  const pages: Array<number | "ellipsis-start" | "ellipsis-end"> = [];

  if (totalPages <= 7) {
    // Show all pages if 7 or fewer
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else if (currentPage <= 3) {
    // Near the start: 1 2 3 4 5 ... last
    for (let i = 1; i <= 5; i++) {
      pages.push(i);
    }
    pages.push("ellipsis-end");
    pages.push(totalPages);
  } else if (currentPage >= totalPages - 2) {
    // Near the end: 1 ... last-4 last-3 last-2 last-1 last
    pages.push(1);
    pages.push("ellipsis-start");
    for (let i = totalPages - 4; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // In the middle: 1 ... current-1 current current+1 ... last
    pages.push(1);
    pages.push("ellipsis-start");
    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
      pages.push(i);
    }
    pages.push("ellipsis-end");
    pages.push(totalPages);
  }

  return pages;
}

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  pageSizeOptions: Array<number>;
  enableRowSelection: boolean;
}

function DataTablePagination<TData>({
  table,
  pageSizeOptions,
  enableRowSelection,
}: DataTablePaginationProps<TData>) {
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const pageCount = table.getPageCount();
  const totalRows = table.getFilteredRowModel().rows.length;

  const currentPage = pageIndex + 1; // Convert to 1-indexed
  const startItem = pageIndex * pageSize + 1;
  const endItem = Math.min((pageIndex + 1) * pageSize, totalRows);

  const pageNumbers = getPageNumbers(currentPage, pageCount);

  const canGoPrev = table.getCanPreviousPage();
  const canGoNext = table.getCanNextPage();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2 py-2 shrink-0">
      {/* Left side: Row info */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          Showing {startItem}–{endItem} of {totalRows}
        </span>
        {enableRowSelection && table.getFilteredSelectedRowModel().rows.length > 0 && (
          <span>
            ({table.getFilteredSelectedRowModel().rows.length} selected)
          </span>
        )}
      </div>

      {/* Center: Page navigation */}
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => canGoPrev && table.previousPage()}
              className={!canGoPrev ? "pointer-events-none opacity-50" : "cursor-pointer"}
              aria-disabled={!canGoPrev}
            />
          </PaginationItem>

          {pageNumbers.map((page, index) => (
            <PaginationItem key={index} className="hidden sm:block">
              {page === "ellipsis-start" || page === "ellipsis-end" ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  onClick={() => table.setPageIndex(page - 1)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          {/* Mobile: Show current page indicator */}
          <PaginationItem className="sm:hidden">
            <span className="flex h-9 items-center justify-center px-3 text-sm">
              {currentPage} / {pageCount}
            </span>
          </PaginationItem>

          <PaginationItem>
            <PaginationNext
              onClick={() => canGoNext && table.nextPage()}
              className={!canGoNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
              aria-disabled={!canGoNext}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      {/* Right side: Rows per page */}
      <div className="hidden items-center gap-2 lg:flex">
        <Label htmlFor="rows-per-page" className="text-sm text-muted-foreground whitespace-nowrap">
          Rows per page
        </Label>
        <Select
          value={`${pageSize}`}
          onValueChange={(value) => {
            table.setPageSize(Number(value));
          }}
        >
          <SelectTrigger size="sm" className="w-[70px]" id="rows-per-page">
            <SelectValue placeholder={pageSize} />
          </SelectTrigger>
          <SelectContent side="top">
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={`${size}`}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

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

      <div className={cn("overflow-hidden rounded-md border flex-1 min-h-0 flex flex-col", containerClassName)}>
        <div className="overflow-auto flex-1 min-h-0 relative">
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
        <DataTablePagination
          table={table}
          pageSizeOptions={pageSizeOptions}
          enableRowSelection={enableRowSelection}
        />
      )}
    </div>
  );
}
