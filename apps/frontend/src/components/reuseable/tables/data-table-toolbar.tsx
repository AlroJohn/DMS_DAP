"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Check,
  PlusCircle,
  Search,
  FileText,
  Upload,
  Send,
  Settings2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Filter,
  Archive,
  Trash2,
  CheckCircle,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { Table, Column } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateDocumentModal } from "@/components/modals/create-document-modal";
import { UploadDocumentModal } from "@/app/(private)/documents/[id]/components/upload-document-modal";
import { DocumentFiltersModal } from "@/components/modals/document-filters-modal";
import { useAuth } from "@/hooks/use-auth";
import {
  canViewDocuments,
  canEditDocumentDetails,
  canEditDocument,
  canViewDocument,
  canSignDocument,
  canReleaseDocument,
  canCompleteDocument,
  canCancelDocument,
  canArchiveDocument,
  canDeleteDocument,
  hasAnyPermission,
  hasPermission
} from "@/lib/document-permissions";

import {
  DOC_CLASSIFICATION_OPTIONS,
  DOC_STATUS_OPTIONS,
} from "@/lib/doc-enums";

// ============================================================================
// DataTableFacetedFilter Component
// ============================================================================

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  options: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
  onFilterChange?: (values: string[]) => void; // For modal usage
  selectedValues?: string[]; // For modal usage
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
  onFilterChange,
  selectedValues: externalSelectedValues,
}: DataTableFacetedFilterProps<TData, TValue>) {
  // Determine if we're using internal state (for table usage) or external state (for modal usage)
  const isModalMode =
    onFilterChange !== undefined && externalSelectedValues !== undefined;

  let internalSelectedValues: Set<string>;
  let setInternalSelectedValues: (values: string[]) => void;

  if (isModalMode) {
    internalSelectedValues = new Set(externalSelectedValues);
    setInternalSelectedValues = onFilterChange;
  } else {
    // For table usage
    const facets = column?.getFacetedUniqueValues();
    internalSelectedValues = new Set(column?.getFilterValue() as string[]);
    setInternalSelectedValues = (values) => {
      if (column) {
        column.setFilterValue(values.length > 0 ? values : undefined);
      }
    };
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-dashed w-full"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {title}
          {internalSelectedValues.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden"
              >
                {internalSelectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {internalSelectedValues.size > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {internalSelectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((option) =>
                      internalSelectedValues.has(option.value)
                    )
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        key={option.value}
                        className="rounded-sm px-1 font-normal"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = internalSelectedValues.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        internalSelectedValues.delete(option.value);
                      } else {
                        internalSelectedValues.add(option.value);
                      }
                      const filterValues = Array.from(internalSelectedValues);
                      setInternalSelectedValues(filterValues);
                    }}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className={cn("h-4 w-4")} />
                    </div>
                    {option.icon && (
                      <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{option.label}</span>
                    {isModalMode || (column && column.getCanFilter()) ? (
                      <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                        {/* Show count if available */}
                      </span>
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {internalSelectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => setInternalSelectedValues([])}
                    className="justify-center text-center"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
import { toast } from "sonner";
import { BulkTransmitModal } from "@/components/modals/bulk-transmit-modal";

// DataTableViewOptions Component
// ============================================================================

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  const resetToDefault = () => {
    // Reset to default column visibility (hide security and dates columns)
    table.setColumnVisibility({
      security: false,
      dates: false,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
        >
          <Settings2 className="mr-2 h-4 w-4" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter(
            (column) =>
              typeof column.accessorFn !== "undefined" && column.getCanHide()
          )
          .map((column) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            );
          })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={resetToDefault}
          className="flex items-center justify-between"
        >
          <span>Reset to default</span>
          <X className="h-4 w-4 ml-2" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// DataTablePagination Component
// ============================================================================

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  showSelected?: boolean;
}

export function DataTablePagination<TData>({
  table,
  showSelected = true,
}: DataTablePaginationProps<TData>) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1 text-sm text-muted-foreground">
        {showSelected && (
          <>
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </>
        )}
      </div>
      <div className="flex items-center gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DataTableToolbar Component
// ============================================================================

// Remove the duplicate interface - keep only the one with 'archive' type
interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  excludedFilters?: string[]; // New prop
  showUploadButton?: boolean; // Prop to control upload button visibility
  viewType?: 'document' | 'owned' | 'shared' | 'outgoing' | 'archive' | 'recycle-bin'; // View type to control which actions are shown
}

export function DataTableToolbar<TData>({
  table,
  excludedFilters = [],
  showUploadButton = false, // Default to false to maintain existing behavior
  viewType = 'document', // Default to document view
}: DataTableToolbarProps<TData>) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const isFiltered = table.getState().columnFilters.length > 0;
  const [isCreateModalOpen, setCreateModalOpen] = React.useState(false);
  const [isBulkTransmitOpen, setBulkTransmitOpen] = React.useState(false);
  const [isUploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [isFiltersModalOpen, setFiltersModalOpen] = React.useState(false);
  const [selectedDocuments, setSelectedDocuments] = React.useState<any[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = React.useState(false);
  const [isBulkArchiveOpen, setIsBulkArchiveOpen] = React.useState(false);
  const [isBulkCompleteOpen, setIsBulkCompleteOpen] = React.useState(false);
  const [isBulkCancelOpen, setIsBulkCancelOpen] = React.useState(false);
  const [isBulkRestoreOpen, setIsBulkRestoreOpen] = React.useState(false);
  const [isEmptyRecycleBinOpen, setIsEmptyRecycleBinOpen] = React.useState(false);

  // Get selected rows
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const hasSelection = selectedRows.length > 0;

  // Permission checks - similar to data-table-row-action
  const canViewDetails = canViewDocuments(currentUser);
  const canViewDoc = canViewDocument(currentUser);

  // Since toolbar doesn't have individual documents, we'll create a mock document for permission checks
  // We'll use basic document structure for permission evaluations based on view type
  const effectiveDocument = {
    id: "",
    documentId: "",
    status: viewType === 'outgoing' ? 'outgoing' : 'active',
    isOwned: viewType === 'owned' || viewType === 'document' || viewType === 'recycle-bin' || viewType === 'archive',
    department_id: currentUser?.department_id
  };

  const canEditDetails = canEditDocumentDetails(currentUser, effectiveDocument);
  const canEditDoc = canEditDocument(currentUser, effectiveDocument);
  const canSignDoc = canSignDocument(currentUser, effectiveDocument);
  const canRelease = canReleaseDocument(currentUser, effectiveDocument);
  const canComplete = canCompleteDocument(currentUser, effectiveDocument);
  const canCancel = canCancelDocument(currentUser, effectiveDocument);
  const canArchive = canArchiveDocument(currentUser, effectiveDocument);
  const canDelete = canDeleteDocument(currentUser, effectiveDocument);

  // Action handlers
  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;

    try {
      // Extract IDs safely, only processing rows that have an 'id' property
      const documentIds = selectedRows
        .map((row) => {
          const item = row.original as Record<string, unknown>;
          return typeof item.id === 'string' ? item.id : undefined;
        })
        .filter((id): id is string => id !== undefined && id.length > 0);

      if (documentIds.length === 0) {
        toast.error("No valid document IDs found for deletion");
        return;
      }

      // Process each document individually using the same endpoint as single delete
      const results = await Promise.allSettled(
        documentIds.map(id =>
          fetch(`/api/documents/${id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          })
        )
      );

      // Count successful operations
      const successfulCount = results.filter(result =>
        result.status === 'fulfilled' && result.value.ok
      ).length;

      if (successfulCount > 0) {
        toast.success(`${successfulCount} document(s) moved to recycle bin successfully.`);
      }

      // Handle any failures
      const failedCount = results.length - successfulCount;
      if (failedCount > 0) {
        toast.error(`${failedCount} document(s) failed to move to recycle bin.`);
      }

      table.toggleAllRowsSelected(false); // Clear selection
    } catch (error: any) {
      console.error('Error moving documents to recycle bin:', error);
      toast.error('Failed to move documents to recycle bin');
    } finally {
      setIsBulkDeleteOpen(false);
    }
  };

  const handleBulkCancel = async () => {
    if (selectedRows.length === 0) return;

    try {
      // Extract IDs safely, only processing rows that have an 'id' property
      const documentIds = selectedRows
        .map((row) => {
          const item = row.original as Record<string, unknown>;
          return typeof item.id === 'string' ? item.id : undefined;
        })
        .filter((id): id is string => id !== undefined && id.length > 0);

      if (documentIds.length === 0) {
        toast.error("No valid document IDs found for cancellation");
        return;
      }

      // Process each document individually using the same endpoint as single cancel
      const results = await Promise.allSettled(
        documentIds.map(id =>
          fetch(`/api/documents/${id}/cancel`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          })
        )
      );

      // Count successful operations
      const successfulCount = results.filter(result =>
        result.status === 'fulfilled' && result.value.ok
      ).length;

      if (successfulCount > 0) {
        toast.success(`${successfulCount} document(s) cancelled successfully.`);
      }

      // Handle any failures
      const failedCount = results.length - successfulCount;
      if (failedCount > 0) {
        toast.error(`${failedCount} document(s) failed to cancel.`);
      }

      table.toggleAllRowsSelected(false); // Clear selection
    } catch (error: any) {
      console.error('Error cancelling documents:', error);
      toast.error('Failed to cancel documents');
    } finally {
      setIsBulkCancelOpen(false);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedRows.length === 0) return;

    try {
      // Extract IDs safely, only processing rows that have an 'id' property
      const documentIds = selectedRows
        .map((row) => {
          const item = row.original as Record<string, unknown>;
          return typeof item.id === 'string' ? item.id : undefined;
        })
        .filter((id): id is string => id !== undefined && id.length > 0);

      if (documentIds.length === 0) {
        toast.error("No valid document IDs found for archiving");
        return;
      }

      // Process each document individually using the same endpoint as single archive
      const results = await Promise.allSettled(
        documentIds.map(id =>
          fetch(`/api/archive/${id}/archive`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          })
        )
      );

      // Count successful operations
      const successfulCount = results.filter(result =>
        result.status === 'fulfilled' && result.value.ok
      ).length;

      if (successfulCount > 0) {
        toast.success(`${successfulCount} document(s) archived successfully.`);
      }

      // Handle any failures
      const failedCount = results.length - successfulCount;
      if (failedCount > 0) {
        toast.error(`${failedCount} document(s) failed to archive.`);
      }

      table.toggleAllRowsSelected(false); // Clear selection
    } catch (error: any) {
      console.error('Error archiving documents:', error);
      toast.error('Failed to archive documents');
    } finally {
      setIsBulkArchiveOpen(false);
    }
  };

  const handleBulkComplete = async () => {
    if (selectedRows.length === 0) return;

    try {
      // Extract IDs safely, only processing rows that have an 'id' property
      const documentIds = selectedRows
        .map((row) => {
          const item = row.original as Record<string, unknown>;
          return typeof item.id === 'string' ? item.id : undefined;
        })
        .filter((id): id is string => id !== undefined && id.length > 0);

      if (documentIds.length === 0) {
        toast.error("No valid document IDs found for completion");
        return;
      }

      // Process each document individually using the same endpoint as single complete
      const results = await Promise.allSettled(
        documentIds.map(id =>
          fetch(`/api/documents/${id}/complete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          })
        )
      );

      // Count successful operations
      const successfulCount = results.filter(result =>
        result.status === 'fulfilled' && result.value.ok
      ).length;

      if (successfulCount > 0) {
        toast.success(`${successfulCount} document(s) completed successfully.`);
      }

      // Handle any failures
      const failedCount = results.length - successfulCount;
      if (failedCount > 0) {
        toast.error(`${failedCount} document(s) failed to complete.`);
      }

      table.toggleAllRowsSelected(false); // Clear selection
    } catch (error: any) {
      console.error('Error completing documents:', error);
      toast.error('Failed to complete documents');
    } finally {
      setIsBulkCompleteOpen(false);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedRows.length === 0) return;

    try {
      // Extract IDs safely, only processing rows that have an 'id' property
      const documentIds = selectedRows
        .map((row) => {
          const item = row.original as Record<string, unknown>;
          // For archive and recycle-bin views, we might have document_id instead of id
          const id = typeof item.id === 'string' ? item.id :
                    typeof item.document_id === 'string' ? item.document_id : undefined;
          return id;
        })
        .filter((id): id is string => id !== undefined && id.length > 0);

      if (documentIds.length === 0) {
        toast.error("No valid document IDs found for restoration");
        return;
      }

      // Process each document individually using the appropriate restore endpoint
      const results = await Promise.allSettled(
        documentIds.map(id => {
          // Use different endpoints based on view type
          const endpoint = viewType === 'recycle-bin'
            ? `/api/documents/${id}/restore`
            : `/api/archive/${id}/restore`;

          return fetch(endpoint, {
            method: 'POST', // Using POST for restore action
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });
        })
      );

      // Count successful operations
      const successfulCount = results.filter(result =>
        result.status === 'fulfilled' && result.value.ok
      ).length;

      if (successfulCount > 0) {
        toast.success(`${successfulCount} document(s) restored successfully.`);
      }

      // Handle any failures
      const failedCount = results.length - successfulCount;
      if (failedCount > 0) {
        toast.error(`${failedCount} document(s) failed to restore.`);
      }

      table.toggleAllRowsSelected(false); // Clear selection
    } catch (error: any) {
      console.error('Error restoring documents:', error);
      toast.error('Failed to restore documents');
    } finally {
      setIsBulkRestoreOpen(false);
    }
  };

  const handleEmptyRecycleBin = async () => {
    try {
      // We need to first fetch all documents in the recycle bin to get their IDs
      // Then send them to the bulk delete endpoint
      const response = await fetch('/api/documents/recycle-bin?page=1&limit=1000', { // Fetch a large number to get all
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch documents from recycle bin');
      }

      const data = await response.json();
      const documents = data.documents || data.data?.documents || [];
      const documentIds = documents.map((doc: any) => doc.id || doc.document_id).filter(Boolean);

      if (documentIds.length === 0) {
        toast.info("No documents to delete.");
        setIsEmptyRecycleBinOpen(false);
        return;
      }

      // Now delete all documents permanently using the bulk delete endpoint
      const deleteResponse = await fetch('/api/documents/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ documentIds })
      });

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        throw new Error(errorData.error?.message || 'Failed to empty recycle bin');
      }

      toast.success("Recycle bin emptied successfully.");
      // Refresh the table after emptying
      window.location.reload(); // Simple refresh for now
    } catch (error: any) {
      console.error('Error emptying recycle bin:', error);
      toast.error(error.message || 'Failed to empty recycle bin');
    } finally {
      setIsEmptyRecycleBinOpen(false);
    }
  };

  // Check if specific columns exist before attempting to get them
  const allColumnIds = table.getAllColumns().map((column) => column.id);
  const documentColumn = allColumnIds.includes("document")
    ? table.getColumn("document")
    : null;
  const statusColumn = allColumnIds.includes("status")
    ? table.getColumn("status")
    : null;
  const typeColumn = allColumnIds.includes("type")
    ? table.getColumn("type")
    : null;
  const classificationColumn = allColumnIds.includes("classification")
    ? table.getColumn("classification")
    : null;

  // Data for filters — use values consistent with Prisma enums (lowercase literals)
  const statusOptions = DOC_STATUS_OPTIONS;

  const typeOptions = [
    { label: "Report", value: "Report" },
    { label: "Invoice", value: "Invoice" },
    { label: "Guideline", value: "Guideline" },
    { label: "Delivery notes", value: "Delivery notes" },
  ];

  const classificationOptions = DOC_CLASSIFICATION_OPTIONS;

  const fileStatusOptions = [
    { label: "Uploaded", value: "uploaded" },
    { label: "Enrolled", value: "enrolled" },
  ];

  return (
    <>
      <CreateDocumentModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
      <UploadDocumentModal
        open={isUploadModalOpen}
        onOpenChange={setUploadModalOpen}
      />
      <DocumentFiltersModal
        open={isFiltersModalOpen}
        onOpenChange={setFiltersModalOpen}
        table={table}
      />
      <BulkTransmitModal
        isOpen={isBulkTransmitOpen}
        onClose={() => setBulkTransmitOpen(false)}
        documents={selectedDocuments}
      />
      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedRows.length} document(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Bulk Archive Confirmation Dialog */}
      <Dialog open={isBulkArchiveOpen} onOpenChange={setIsBulkArchiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Bulk Archive</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive {selectedRows.length} document(s)?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkArchiveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkArchive}
            >
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Bulk Complete Confirmation Dialog */}
      <Dialog open={isBulkCompleteOpen} onOpenChange={setIsBulkCompleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Bulk Complete</DialogTitle>
            <DialogDescription>
              Are you sure you want to complete {selectedRows.length} document(s)?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkCompleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkComplete}
            >
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Bulk Cancel Confirmation Dialog */}
      <Dialog open={isBulkCancelOpen} onOpenChange={setIsBulkCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Bulk Cancel</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel {selectedRows.length} document(s)?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkCancelOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkCancel}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Bulk Restore Confirmation Dialog */}
      <Dialog open={isBulkRestoreOpen} onOpenChange={setIsBulkRestoreOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Bulk Restore</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore {selectedRows.length} document(s) from archive?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkRestoreOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkRestore}
            >
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Empty Recycle Bin Confirmation Dialog */}
      <Dialog open={isEmptyRecycleBinOpen} onOpenChange={setIsEmptyRecycleBinOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Empty Recycle Bin</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete all documents in the recycle bin? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEmptyRecycleBinOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleEmptyRecycleBin}
            >
              Empty Recycle Bin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          {/* Only show the search bar and filters directly if we're not implementing the modal approach */}
          {/* For now, we'll keep the search bar but add a filter button instead of individual filters */}
          {documentColumn && (
            <div className="relative">
              <Search className="absolute h-5 w-5 left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search documents..."
                value={(documentColumn.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  documentColumn.setFilterValue(event.target.value)
                }
                className="h-10 w-[200px] lg:w-[300px] pl-10"
              />
            </div>
          )}

          {/* Replace individual filter chips with a single filter button that opens the modal */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersModalOpen(true)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {isFiltered && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 w-5 p-0 rounded-full flex items-center justify-center"
              >
                {table.getState().columnFilters.length}
              </Badge>
            )}
          </Button>

          {/* Reset button if there are active filters */}
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.resetColumnFilters()}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk Actions - Only show when there are selected rows */}
          {hasSelection && (
            <div className="flex gap-2">
              {/* Show Complete only in shared view and if user has permission */}
              {viewType === 'shared' && canComplete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkCompleteOpen(true)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete
                </Button>
              )}
              {/* Show Cancel and Archive in outgoing view and if user has permissions */}
              {viewType === 'outgoing' && (
                <>
                  {canCancel && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsBulkCancelOpen(true)}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  )}
                  {canArchive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsBulkArchiveOpen(true)}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </Button>
                  )}
                </>
              )}
              {/* Show Archive and Delete in document and owned views and if user has permissions */}
              {(viewType === 'document' || viewType === 'owned') && (
                <>
                  {canArchive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsBulkArchiveOpen(true)}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsBulkDeleteOpen(true)}
                      className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  )}
                </>
              )}
              {/* Show Restore in archive and recycle-bin views and if user has permission */}
              {(viewType === 'archive' || viewType === 'recycle-bin') && canArchive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkRestoreOpen(true)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </Button>
              )}
            </div>
          )}
          {/* Show Transmit button only if not in recycle-bin view and user has release permission */}
          {viewType !== 'recycle-bin' && canRelease && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (selectedRows.length === 0) {
                  toast.error("Please select documents to transmit");
                  return;
                }
                setSelectedDocuments(selectedRows.map((row) => row.original));
                toast.info(`Preparing to transmit ${selectedRows.length} document${selectedRows.length !== 1 ? 's' : ''}`);
                setBulkTransmitOpen(true);
              }}
            >
              <Send className="mr-2 h-4 w-4" />
              Transmit
            </Button>
          )}
          {/* Show Empty Recycle Bin button for recycle-bin view and if user has delete permission */}
          {viewType === 'recycle-bin' && canDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsEmptyRecycleBinOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Empty Recycle Bin
            </Button>
          )}
          {showUploadButton && canEditDoc && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setUploadModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Document
            </Button>
          )}
          <DataTableViewOptions table={table} />
        </div>
      </div>
    </>
  );
}
