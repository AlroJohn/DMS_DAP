"use client";

import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableRowActions } from "@/components/reuseable/tables/data-table-row-action";
import { DataTableColumnHeader } from "@/components/reuseable/tables/data-table-column-header";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Copy, User, Building2 } from "lucide-react";
import { ScanCodes } from "@/components/ui/scan-codes";
import { ActivityCell } from "@/components/reuseable/tables/activity-cell";
import { ProcessTypeCell } from "@/components/reuseable/tables/process-type-cell";

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
  origin: string;
  activity: string;
  activityTime: string;
  created_at?: string;
  process_type_id?: string | null;
  process_timer_start_at?: string | null;
  process_timer_complete_at?: string | null;
  process_status?: "ongoing" | "delayed" | "completed" | null;
  process_delayed_at?: string | null;
  process_delay_seconds?: number | null;
  deletedBy: string;
  deletedAt: string;
  restoredBy?: string;
  restoredAt?: string;
};

const formatText = (text: string | null | undefined): string => {
  if (!text) return "N/A";
  return text
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
};

export const createArchiveColumns = ({
  documentTypeMap,
  processTypeMap = {},
  onRefetch,
}: {
  documentTypeMap: Record<string, string>;
  processTypeMap?: Record<
    string,
    {
      code?: string;
      name?: string;
      duration_value?: number | null;
      duration_unit?: string | null;
    }
  >;
  onRefetch?: () => void;
}): ColumnDef<ArchiveDocument>[] => [
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
          className="translate-y-0.5 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-0.5 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
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
        <div className="flex items-center">
          <ScanCodes
            qrCode={data.qrCode}
            barcode={data.barcode}
            documentCode={data.documentId}
          />
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
        <div className="flex flex-col gap-1.5 py-1 min-w-45 max-w-60">
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
              className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-primary transition-colors shrink-0"
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
        <div className="flex flex-col gap-1.5 py-1 min-w-40 max-w-50">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-orange-500 shrink-0" />
            <span className="text-xs font-medium" title={data.contactPerson}>
              {data.contactPerson}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
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
    id: "processType",
    accessorFn: (row) => {
      const processTypeId =
        (row as any).process_type_id || (row as any).processTypeId || "";
      const record = processTypeId ? processTypeMap[processTypeId] : undefined;
      return record?.name || "N/A";
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Process Type" />
    ),
    cell: ({ row }) => {
      const processTypeId =
        (row.original as any).process_type_id ||
        (row.original as any).processTypeId ||
        "";
      const record = processTypeId ? processTypeMap[processTypeId] : undefined;
      const name = record?.name || "N/A";
      const code = record?.code || "";
      return <ProcessTypeCell name={name} code={code} minClampLength={20} />;
    },
    enableSorting: true,
    enableHiding: true,
    filterFn: (row, id, value) => {
      if (!value || (Array.isArray(value) && value.length === 0)) return true;
      const processType = String(row.getValue(id) ?? "").toLowerCase();
      return Array.isArray(value)
        ? (value as string[]).some(
            (v) => String(v).toLowerCase() === processType
          )
        : false;
    },
  },
  {
    accessorKey: "origin",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Origin" />
    ),
    cell: ({ row }) => {
      const origin = (row.original as any).origin;
      if (!origin) return <span className="text-xs text-muted-foreground">-</span>;
      return (
        <Badge
          variant={origin === "internal" ? "default" : "outline"}
          className="font-medium bg-primary text-xs px-1.5 py-0.5"
        >
          {formatText(origin)}
        </Badge>
      );
    },
    enableSorting: true,
    enableHiding: true,
    filterFn: (row, id, value) => {
      if (!value || (Array.isArray(value) && value.length === 0)) return true;
      const origin = String(row.getValue(id) ?? "").toLowerCase();
      return Array.isArray(value)
        ? (value as string[]).some(
            (v) => String(v).toLowerCase() === origin,
          )
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
        'archive': {
          color: "text-blue-600",
          bgColor: "bg-blue-500",
          label: "Archived",
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
      return (
        <ActivityCell document={row.original} />
      );
    },
    enableHiding: true,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const status = row.original.status?.toLowerCase();
      // Hide actions for completed documents
      if (status === "completed") {
        return null;
      }
      return (
        <div className="flex justify-center">
          <DataTableRowActions
            row={row}
            viewType="archive"
            onActionSuccess={onRefetch}
          />
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];
