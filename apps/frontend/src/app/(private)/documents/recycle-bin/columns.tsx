"use client";

import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableRowActions } from "@/components/reuseable/tables/data-table-row-action";
import { DataTableColumnHeader } from "@/components/reuseable/tables/data-table-column-header";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Calendar, Copy, User, Trash2, RotateCcw } from "lucide-react";

import { RecycleBinDocument } from "@/hooks/use-recycle-bin-documents";
import { ScanCodes } from "@/components/ui/scan-codes";
import { DateTime } from "@/components/wrapper/DateTime";

export type { RecycleBinDocument };

const formatText = (text: string): string => {
  return text
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
};

export const columns: ColumnDef<RecycleBinDocument, unknown>[] = [
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
            <span className="text-xs text-muted-foreground">
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
      return (
        <span className="text-xs text-muted-foreground">
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
        <span className="text-xs text-muted-foreground">
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
            className={`text-xs ${
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
        <div className="flex flex-col gap-1.5 text-xs">
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
          <span className="text-xs text-muted-foreground">{deletedBy}</span>
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
          <span className="text-xs text-muted-foreground">
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
      // The refetch function will be passed from the parent component
      // This is a static version that assumes a global refresh
      const document = row.original;
      const handleRestore = async () => {
        try {
          const response = await fetch(
            `/api/documents/${document.id}/restore`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include", // This will send HttpOnly cookies
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error?.message || "Failed to restore document"
            );
          }

          const result = await response.json();
          toast.success(result.message || "Document restored successfully.");
          // The parent component will handle the refresh
        } catch (error: any) {
          console.error("Error restoring document:", error);
          toast.error(error.message || "Failed to restore document");
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
