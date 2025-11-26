"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/reuseable/tables/data-table";
import { columns as staticColumns } from "./columns";
import { useRecycleBinDocuments } from "@/hooks/use-recycle-bin-documents";
import { useAuth } from "@/hooks/use-auth";
import {
  Loader2,
  AlertCircle,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Clock,
  LogIn,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RecycleBinDocument } from "@/hooks/use-recycle-bin-documents";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableRowActions } from "@/components/reuseable/tables/data-table-row-action";
import { DataTableColumnHeader } from "@/components/reuseable/tables/data-table-column-header";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Copy, User } from "lucide-react";
import { ScanCodes } from "@/components/ui/scan-codes";
import { DateTime } from "@/components/wrapper/DateTime";

export default function RecycleBinPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedDocuments, setSelectedDocuments] = useState<
    RecycleBinDocument[]
  >([]);
  const [isConfirmEmptyRecycleBinOpen, setIsConfirmEmptyRecycleBinOpen] = useState(false);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const { documents, pagination, isLoading, error, refetch } =
    useRecycleBinDocuments(page, limit);

  // Format text utility function
  const formatText = (text: string): string => {
    return text
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  // Create dynamic columns with access to the refetch function
  const dynamicColumns: ColumnDef<RecycleBinDocument, unknown>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px] data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
        />
      ),
      cell: ({ row }) => {
        return (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px] data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "scan",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Scan" />
      ),
      cell: ({ row }) => {
        const data = row.original;
        return <ScanCodes qrCode={data.qrCode} barcode={data.barcode} />;
      },
      enableSorting: false,
    },
    {
      id: "document",
      accessorFn: (row) => row,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Document" />
      ),
      cell: ({ row }) => {
        const data = row.original;
        return (
          <div className="flex flex-col gap-1.5 py-1">
            <div className="font-medium">{data.document}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm text-muted-foreground">
                {data.documentId}
              </span>
              <Copy
                className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-primary transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(data.documentId);
                  toast.success("Document ID copied to clipboard!");
                }}
              />
            </div>
          </div>
        );
      },
      filterFn: (row, id, filterValue) => {
        const searchTerm = (filterValue as string).toLowerCase();
        const document = row.original as RecycleBinDocument;

        return (
          document.id?.toLowerCase().includes(searchTerm) ||
          document.document?.toLowerCase().includes(searchTerm) ||
          document.documentId?.toLowerCase().includes(searchTerm) ||
          document.currentLocation?.toLowerCase().includes(searchTerm) ||
          document.type?.toLowerCase().includes(searchTerm) ||
          document.classification?.toLowerCase().includes(searchTerm) ||
          document.status?.toLowerCase().includes(searchTerm) ||
          document.activity?.toLowerCase().includes(searchTerm) ||
          document.contactPerson?.toLowerCase().includes(searchTerm) ||
          document.contactOrganization?.toLowerCase().includes(searchTerm)
        );
      },
    },
    {
      accessorKey: "currentLocation",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Current Location" />
      ),
      cell: ({ row }) => {
        const currentLocation = row.original.currentLocation;
        const formatText = (text: string): string => {
          return text
            .replace(/_/g, " ")
            .toLowerCase()
            .replace(/^\w/, (c) => c.toUpperCase());
        };
        return (
          <span className="text-sm text-muted-foreground">
            {currentLocation ? formatText(currentLocation) : "N/A"}
          </span>
        );
      },
      enableSorting: true,
      enableHiding: true,
      filterFn: (row, id, value) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return true;
        const currentLocation = row.original.currentLocation;
        return Array.isArray(value) ? value.includes(currentLocation) : false;
      },
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const type = row.original.type;
        return (
          <span className="text-sm text-muted-foreground">
            {formatText(type)}
          </span>
        );
      },
      enableSorting: true,
      enableHiding: true,
      filterFn: (row, id, value) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return true;
        const type = row.getValue(id) as string;
        return Array.isArray(value) ? value.includes(type) : false;
      },
    },
    {
      accessorKey: "classification",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Classification" />
      ),
      cell: ({ row }) => {
        const classification = row.original.classification;
        return (
          <Badge
            variant={
              classification === "Highly technical" ? "destructive" : "secondary"
            }
            className="font-medium"
          >
            {formatText(classification)}
          </Badge>
        );
      },
      enableSorting: true,
      enableHiding: true,
      filterFn: (row, id, value) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return true;
        const classification = row.getValue(id) as string;
        return Array.isArray(value) ? value.includes(classification) : false;
      },
    },
    {
      id: "status",
      accessorFn: (row) => row.status,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <div className="flex items-center gap-1.5">
            <div
              className={`h-2 w-2 rounded-full ${
                status === "Dispatch" ? "bg-emerald-500" : "bg-gray-300"
              }`}
            />
            <span
              className={`text-sm ${
                status === "Dispatch"
                  ? "text-emerald-600"
                  : "text-muted-foreground"
              }`}
            >
              {status}
            </span>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return true;
        return value.includes(row.getValue(id));
      },
    },
    {
      id: "dates",
      accessorFn: (row) => row,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Activity" />
      ),
      cell: ({ row }) => {
        const data = row.original;
        return (
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-orange-500" />
              <span className="text-muted-foreground">{data.activity}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-blue-500" />
              <span className="text-muted-foreground">{data.activityTime}</span>
            </div>
          </div>
        );
      },
    },
    {
      id: "deletedBy",
      accessorFn: (row) => row.deletedBy,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Deleted By" />
      ),
      cell: ({ row }) => {
        const deletedBy = row.original.deletedBy;
        return (
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 text-red-500" />
            <span className="text-sm text-muted-foreground">{deletedBy}</span>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: "deletedAt",
      accessorFn: (row) => row.deletedAt,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Deleted At" />
      ),
      cell: ({ row }) => {
        const deletedAt = row.original.deletedAt;
        return (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-red-500" />
            <span className="text-sm text-muted-foreground">
              <DateTime value={deletedAt} format="date" />
            </span>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const document = row.original;
        const handleRestore = async () => {
          try {
            const response = await fetch(`/api/documents/${document.id}/restore`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include', // This will send HttpOnly cookies
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error?.message || 'Failed to restore document');
            }

            const result = await response.json();
            toast.success(result.message || 'Document restored successfully.');
            refetch(); // Refresh the data using the refetch function from the parent
          } catch (error: any) {
            console.error('Error restoring document:', error);
            toast.error(error.message || 'Failed to restore document');
          }
        };

        return (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRestore();
              }}
              className="p-1.5 rounded hover:bg-green-100 text-green-600 hover:text-green-700 transition-colors"
              title="Restore Document"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <DataTableRowActions row={row} />
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  // Empty state when no documents in recycle bin
  if (!isLoading && documents.length === 0) {
    return (
      <div className="flex h-full flex-col gap-4 px-4 pb-4 bg-background">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Recycle Bin</h1>
              <p className="text-muted-foreground">Manage deleted documents</p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-8 w-8 text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Recycle bin is empty</h3>
            <p className="text-muted-foreground mb-4">
              Deleted documents will appear here. You can restore them within 30
              days before they are permanently deleted.
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleRestoreDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/restore`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // This will send HttpOnly cookies
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to restore document');
      }

      const result = await response.json();
      toast.success(result.message || 'Document restored successfully.');
      refetch(); // Refresh the data
      return true;
    } catch (error: any) {
      console.error('Error restoring document:', error);
      toast.error(error.message || 'Failed to restore document');
      return false;
    }
  };

  const handleRestoreSelected = async () => {
    if (selectedDocuments.length === 0) {
      toast.error("Select at least one document to restore.");
      return;
    }

    // Show a loading toast while restoring
    toast.info(`Restoring ${selectedDocuments.length} document${selectedDocuments.length > 1 ? "s" : ""}...`);

    let successCount = 0;
    for (const document of selectedDocuments) {
      const success = await handleRestoreDocument(document.id);
      if (success) {
        successCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} document${successCount > 1 ? "s" : ""} restored successfully.`);
    } else {
      toast.error("Failed to restore any documents.");
    }

    setSelectedDocuments([]); // Clear selection
  };

  const handleDeleteSelected = () => {
    if (selectedDocuments.length === 0) {
      toast.error("Select documents to delete permanently.");
      return;
    }
    toast.warning(
      `${selectedDocuments.length} document${
        selectedDocuments.length > 1 ? "s" : ""
      } marked for permanent deletion.`
    );
  };

  const handleEmptyRecycleBin = () => {
    setIsConfirmEmptyRecycleBinOpen(true);
  };

  const handleConfirmEmptyRecycleBin = async () => {
    const documentIds = documents.map(doc => doc.id);
    if (documentIds.length === 0) {
      toast.info("No documents to delete.");
      setIsConfirmEmptyRecycleBinOpen(false);
      return;
    }

    try {
      const response = await fetch('/api/documents/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentIds }),
      });

      if (response.ok) {
        toast.success(`${documentIds.length} documents permanently deleted.`);
        refetch(); // Refetch the documents for the current page
      } else {
        const errorData = await response.json();
        toast.error(errorData.error?.message || "Failed to delete documents.");
      }
    } catch (error) {
      toast.error("An error occurred while deleting documents.");
    } finally {
      setIsConfirmEmptyRecycleBinOpen(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Recycle Bin</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>
                {documents.length} deleted document
                {documents.length !== 1 ? "s" : ""}
              </span>
              {selectedDocuments.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedDocuments.length} selected
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={selectedDocuments.length === 0}
            onClick={handleRestoreSelected}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restore Selected
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={selectedDocuments.length === 0}
            onClick={handleDeleteSelected}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </Button>
                    <AlertDialog open={isConfirmEmptyRecycleBinOpen} onOpenChange={setIsConfirmEmptyRecycleBinOpen}>
                      <AlertDialogTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setIsConfirmEmptyRecycleBinOpen(true)}
                        >
                          Empty Recycle Bin
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete all documents in the recycle bin.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleConfirmEmptyRecycleBin}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
        </div>
      </div>

      {/* Warning Alert */}
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertTitle className="text-orange-800">
          Auto-deletion Notice
        </AlertTitle>
        <AlertDescription className="text-orange-700">
          Documents in the recycle bin will be permanently deleted after 30
          days.
          <Badge variant="outline" className="ml-2">
            <Clock className="h-3 w-3 mr-1" />
            Auto-purge enabled
          </Badge>
        </AlertDescription>
      </Alert>

      {/* Data Table */}
      <div className="flex-1">
        {error && (
          <div className="mb-4">
            {/* Handle authentication errors specifically */}
            {error.includes("authentication") || error.includes("login") ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>{error}</span>
                  <Button
                    size="sm"
                    onClick={() => router.push("/login")}
                    className="h-8 ml-4"
                  >
                    <LogIn className="h-3 w-3 mr-1" />
                    Login
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>{error}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={refetch}
                    className="h-8 ml-4"
                  >
                    Try again
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        <DataTable<RecycleBinDocument, unknown>
          columns={dynamicColumns}
          data={documents}
          selection={true}
          onSelectionChange={setSelectedDocuments}
          viewType="document" // Recycle bin uses document view type for consistency
          initialState={{
            columnVisibility: {
              dates: false,
            },
          }}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
