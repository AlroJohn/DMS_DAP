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
} from "lucide-react";
import { ScanCodes } from "@/components/ui/scan-codes";
import { DocumentLockIcon } from "@/components/ui/document-lock-badge";
import { OcrStatusIcon } from "@/components/ui/ocr-status-badge";
import { FileIntegrityIcon } from "@/components/ui/file-integrity-badge";
import { EncryptionIcon } from "@/components/ui/encryption-badge";

// Define the ArchiveDocument type based on the actual API response
// This is adapted from RecycleBinDocument structure which should be similar to what we need
export type ArchiveDocument = {
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

export const columns: ColumnDef<ArchiveDocument>[] = [
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
        const document = row.original as ArchiveDocument;
        return filterValue.includes('archived');
      }

      // Handle string filter values (for search)
      if (typeof filterValue === "string") {
        const searchTerm = filterValue.toLowerCase();
        const document = row.original as ArchiveDocument;

        return (
          document.id?.toLowerCase().includes(searchTerm) ||
          document.document?.toLowerCase().includes(searchTerm) ||
          document.documentId?.toLowerCase().includes(searchTerm) ||
          document.type?.toLowerCase().includes(searchTerm) ||
          document.classification?.toLowerCase().includes(searchTerm) ||
          document.contactPerson?.toLowerCase().includes(searchTerm) ||
          document.contactOrganization?.toLowerCase().includes(searchTerm) ||
          document.status?.toLowerCase().includes(searchTerm) ||
          'archived'.includes(searchTerm)
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
      const document = row.original as ArchiveDocument;
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
          variant={classification === "Complex" ? "destructive" : "secondary"}
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
    id: "blockchain",
    accessorFn: (row) => row.blockchainStatus,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Blockchain" />
    ),
    cell: ({ row }) => {
      const data = row.original;
      const status = data.blockchainStatus;

      if (!status) {
        return (
          <span className="text-xs text-muted-foreground" title="Not signed">
            Not signed
          </span>
        );
      }

      const statusConfig: {
        [key: string]: { color: string; bgColor: string; label: string };
      } = {
        signed: {
          color: "text-green-600",
          bgColor: "bg-green-100",
          label: "Signed",
        },
        pending: {
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
          label: "Pending",
        },
        failed: {
          color: "text-red-600",
          bgColor: "bg-red-100",
          label: "Failed",
        },
      };

      const config = statusConfig[status] || {
        color: "text-muted-foreground",
        bgColor: "bg-gray-100",
        label: status,
      };

      return (
        <div className="flex flex-col gap-1">
          <Badge
            className={`${config.bgColor} ${config.color} border-0 text-xs px-1.5 py-0.5`}
            variant="secondary"
          >
            <Shield className="h-2.5 w-2.5 mr-1" />
            {config.label}
          </Badge>
          {data.blockchainTxHash && (
            <span
              className="text-[0.6rem] text-muted-foreground font-mono cursor-pointer hover:text-primary"
              onClick={() => {
                navigator.clipboard.writeText(data.blockchainTxHash!);
                toast.success("Transaction hash copied to clipboard!");
              }}
              title={data.blockchainTxHash}
            >
              {data.blockchainTxHash.substring(0, 12)}...
            </span>
          )}
        </div>
      );
    },
    enableSorting: true,
    filterFn: (row, id, value) => {
      if (!value || (Array.isArray(value) && value.length === 0)) return true;
      const status = String(row.getValue(id) ?? "unsigned").toLowerCase();
      return Array.isArray(value)
        ? (value as string[]).some((v) => String(v).toLowerCase() === status)
        : false;
    },
  },
  {
    id: "security",
    accessorFn: (row) => row,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Security" />
    ),
    cell: ({ row }) => {
      const data = row.original;

      // Lock status
      const lockStatus = data.lockStatus || "available";
      const ocrStatus = data.ocrStatus || "not_started";
      const integrityStatus = data.integrityStatus || "unknown";
      const encryptionStatus = data.encryptionStatus || "transit_only";

      return (
        <div className="flex flex-col gap-1 py-1 min-w-[160px] max-w-[200px]">
          <div className="flex items-center gap-2">
            <DocumentLockIcon
              status={lockStatus}
              lockedBy={data.lockedBy}
              lockedAt={data.lockedAt}
            />
            <span className="text-xs font-medium text-muted-foreground">Lock</span>
          </div>
          <div className="flex items-center gap-2">
            <OcrStatusIcon status={ocrStatus} progress={data.ocrProgress} />
            <span className="text-xs font-medium text-muted-foreground">OCR</span>
          </div>
          <div className="flex items-center gap-2">
            <FileIntegrityIcon status={integrityStatus} checksum={data.checksum} />
            <span className="text-xs font-medium text-muted-foreground">Integrity</span>
          </div>
          <div className="flex items-center gap-2">
            <EncryptionIcon status={encryptionStatus} />
            <span className="text-xs font-medium text-muted-foreground">Encryption</span>
          </div>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: "dates",
    accessorFn: (row) => row,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Activity" />
    ),
    cell: ({ row }) => {
      const data = row.original;
      // show date only (no time)
      const formattedDate = data.activityTime
        ? new Date(data.activityTime).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "";

      return (
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5 text-emerald-500 flex-shrink-0" />
            <span className="text-muted-foreground" title="Received">
              Delete Date
            </span>
          </div>
          {formattedDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5 text-blue-500 flex-shrink-0" />
              <span className="text-muted-foreground" title={formattedDate}>
                {formattedDate}
              </span>
            </div>
          )}
        </div>
      );
    },
    enableHiding: true,
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-center">
        <DataTableRowActions row={row} viewType="archive" />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
];