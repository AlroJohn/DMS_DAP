"use client";

import React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Loader2 } from "lucide-react";
import { DataTablePagination, DataTableToolbar } from "./data-table-toolbar";

const formatText = (text: string): string => {
  return text
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  selection?: boolean;
  excludedFilters?: string[];
  onSelectionChange?: (selectedRows: TData[]) => void;
  showUploadButton?: boolean; // Prop to control upload button visibility
  viewType?: "document" | "owned" | "shared" | "outgoing" | "archive" | "recycle-bin"; // View type to control which actions are shown in toolbar
  initialState?: {
    columnVisibility?: Record<string, boolean>;
  };
  isLoading?: boolean; // Prop to handle loading state within the table
}

export function DataTable<TData, TValue>({
  columns,
  data,
  selection = true,
  excludedFilters = [],
  onSelectionChange,
  showUploadButton = false, // Default to false to maintain existing behavior
  viewType = "document", // Default to document view
  initialState = {},
  isLoading = false, // Default to false to maintain existing behavior
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialState?.columnVisibility || {});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    initialState,
    enableRowSelection: selection ? true : false,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  React.useEffect(() => {
    let isMounted = true; // Track if component is still mounted

    if (onSelectionChange && isMounted) {
      const selectedRows = table
        .getSelectedRowModel()
        .rows.map((row) => row.original as TData);
      onSelectionChange(selectedRows);
    }

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [onSelectionChange, table, rowSelection]);

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar
        table={table}
        excludedFilters={excludedFilters}
        showUploadButton={showUploadButton}
        viewType={viewType}
      />
      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : typeof header.column.columnDef.header === "string"
                      ? formatText(header.column.columnDef.header)
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Show loading state when data is being fetched
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={row.getIsSelected() ? "bg-muted/50" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {typeof cell.getValue() === "string"
                        ? formatText(cell.getValue() as string)
                        : flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <p className="text-lg font-medium">No Results Found</p>
                    <p className="text-xs">
                      {columnFilters.length > 0
                        ? "Try adjusting your filters or search terms"
                        : "There are no items to display at the moment"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination
        table={table}
        showSelected={selection ? true : false}
      />
    </div>
  );
}
