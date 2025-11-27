"use client";

import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableRowActions } from "@/components/reuseable/tables/data-table-row-action";
import { DataTableColumnHeader } from "@/components/reuseable/tables/data-table-column-header";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Calendar,
  Copy,
  User,
  Building2,
  Shield,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { ScanCodes } from "@/components/ui/scan-codes";
import { DateTime } from "@/components/wrapper/DateTime";

// Define the RecycleBinDocument type based on the API response
export type RecycleBinDocument = {
  id: string;
  qrCode: string;
  barcode: string;
  document: string;
  documentId: string;
  contactPerson: string;
  contactOrganization: string;
  type: string;
  classification: string;
  currentLocation: string;
  status: string;
  activity: string;
  activityTime: string;
  deletedBy: string;
  deletedAt: string;
  restoredBy?: string;
  restoredAt?: string;
  // Security fields
  lockStatus?: "locked" | "available" | "locked_by_you";
  lockedBy?: { id: string; name: string };
  lockedAt?: string;
  ocrStatus?: "processing" | "completed" | "failed" | "not_started" | "searchable";
  ocrProgress?: number;
  integrityStatus?: "verified" | "corrupted" | "unknown" | "checking";
  checksum?: string;
  encryptionStatus?: "encrypted" | "unencrypted" | "transit_only" | "encrypting";
  blockchainStatus?: string | null;
  blockchainProjectUuid?: string | null;
  blockchainTxHash?: string | null;
  signedAt?: string | null;
};

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
      <div className="flex justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px] data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px] data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "scan",
    header: ({ column }) => (
      <DataTableColumnHeader className="w-20" column={column} title="Scan" />
    ),
    cell: ({ row }) => {
      const data = row.original;
      return (
        <div className="flex justify-center items-center">
          <ScanCodes qrCode={data.qrCode} barcode={data.barcode} />
        </div>
      );
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
        <div className="flex flex-col gap-1.5 py-1 min-w-[180px] max-w-[240px]">
          <div className="font-medium" title={data.document}>
            {data.document}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="text-xs text-muted-foreground"
              title={data.documentId}
            >
              {data.documentId}
            </span>
            <Copy
              className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
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
      // Handle array filter values (for faceted filters)
      if (Array.isArray(filterValue) && filterValue.length > 0) {
        const document = row.original as RecycleBinDocument;
        return filterValue.includes('deleted');
      }

      // Handle string filter values (for search)
      if (typeof filterValue === "string") {
        const searchTerm = filterValue.toLowerCase();
        const document = row.original as RecycleBinDocument;

        return (
          document.id?.toLowerCase().includes(searchTerm) ||
          document.document?.toLowerCase().includes(searchTerm) ||
          document.documentId?.toLowerCase().includes(searchTerm) ||
          document.currentLocation?.toLowerCase().includes(searchTerm) ||
          document.type?.toLowerCase().includes(searchTerm) ||
          document.classification?.toLowerCase().includes(searchTerm) ||
          document.contactPerson?.toLowerCase().includes(searchTerm) ||
          document.contactOrganization?.toLowerCase().includes(searchTerm) ||
          document.status?.toLowerCase().includes(searchTerm) ||
          'deleted'.includes(searchTerm)
        );
      }

      return true;
    },
  },
  {
    id: "contact",
    accessorFn: (row) => row,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Contact" />
    ),
    cell: ({ row }) => {
      const data = row.original;
      return (
        <div className="flex flex-col gap-1.5 py-1 min-w-[160px] max-w-[200px]">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
            <span className="text-xs font-medium" title={data.contactPerson}>
              {data.contactPerson}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
            <span
              className="text-xs text-muted-foreground"
              title={data.contactOrganization}
            >
              {data.contactOrganization}
            </span>
          </div>
        </div>
      );
    },
    enableSorting: false,
    filterFn: (row, id, filterValue) => {
      const searchTerm = (filterValue as string).toLowerCase();
      const document = row.original as RecycleBinDocument;
      return (
        document.contactPerson?.toLowerCase().includes(searchTerm) ||
        document.contactOrganization?.toLowerCase().includes(searchTerm)
      );
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
        <span
          className="text-xs text-muted-foreground"
          title={formatText(type)}
        >
          {formatText(type)}
        </span>
      );
    },
    enableSorting: true,
    enableHiding: true,
    filterFn: (row, id, value) => {
      if (!value || (Array.isArray(value) && value.length === 0)) return true;
      const type = String(row.getValue(id) ?? "").toLowerCase();
      return Array.isArray(value)
        ? (value as string[]).some((v) => String(v).toLowerCase() === type)
        : false;
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
          variant={classification === "Highly technical" ? "destructive" : "secondary"}
          className="font-medium text-xs px-1.5 py-0.5"
        >
          {formatText(classification)}
        </Badge>
      );
    },
    enableSorting: true,
    enableHiding: true,
    filterFn: (row, id, value) => {
      if (!value || (Array.isArray(value) && value.length === 0)) return true;
      const classification = String(row.getValue(id) ?? "").toLowerCase();
      return Array.isArray(value)
        ? (value as string[]).some(
            (v) => String(v).toLowerCase() === classification
          )
        : false;
    },
  },
  {
    id: "status",
    accessorFn: (row) => row.status,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.original.status.toLowerCase();

      // Define status styling for archived documents
      const statusConfig: {
        [key: string]: { color: string; bgColor: string; label: string };
      } = {
        'dispatch': {
          color: "text-emerald-600",
          bgColor: "bg-emerald-500",
          label: "Dispatch",
        },
        'deleted': {
          color: "text-red-600",
          bgColor: "bg-red-500", 
          label: "Deleted",
        },
        'completed': {
          color: "text-emerald-600",
          bgColor: "bg-emerald-500",
          label: "Completed",
        },
      };

      const config = statusConfig[status] || {
        color: "text-muted-foreground",
        bgColor: "bg-gray-300",
        label: formatText(status),
      };

      return (
        <div className="flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full ${config.bgColor}`} />
          <span className={`text-xs ${config.color}`} title={config.label}>
            {config.label}
          </span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      if (!value || (Array.isArray(value) && value.length === 0)) return true;
      const status = String(row.getValue(id) ?? "").toLowerCase();
      return Array.isArray(value)
        ? (value as string[]).some((v) => String(v).toLowerCase() === status)
        : false;
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
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-2.5 h-2.5 text-orange-500 flex-shrink-0" />
            <span className="text-muted-foreground">{data.activity}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-2.5 h-2.5 text-blue-500 flex-shrink-0" />
            <span className="text-muted-foreground">
              <DateTime value={data.activityTime} format="date" />
            </span>
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
          <User className="w-2.5 h-2.5 text-red-500 flex-shrink-0" />
          <span className="text-xs text-muted-foreground">{deletedBy}</span>
        </div>
      );
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "deletedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Deleted At" />
    ),
    cell: ({ row }) => {
      const deletedAt = row.original.deletedAt;

      const formatDateTime = (dateString: string | undefined) => {
        if (!dateString) return 'N/A';
        try {
          // JavaScript Date constructor should handle most ISO string formats
          // including "2025-11-27t01:38:32.058z" format
          const date = new Date(dateString);

          // Check if the date is valid
          if (isNaN(date.getTime())) {
            console.warn('Invalid date value:', dateString);
            return 'Invalid Date';
          }

          // Format as "Nov 27, 2025, 1:38 AM"
          return date.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true
          });
        } catch (e) {
          console.error('Error parsing date:', e, dateString);
          return 'Invalid Date';
        }
      };

      return (
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-red-500 flex-shrink-0" />
          <span className="text-sm text-muted-foreground">
            {formatDateTime(deletedAt)}
          </span>
        </div>
      );
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-center">
        <DataTableRowActions row={row} viewType="recycle-bin" />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
];