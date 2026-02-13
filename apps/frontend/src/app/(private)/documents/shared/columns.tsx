"use client";

import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/reuseable/tables/data-table-column-header";
import { ScanCodes } from "@/components/ui/scan-codes";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableRowActions } from "@/components/reuseable/tables/data-table-row-action";
import { toast } from "sonner";
import { Copy, User, Building2 } from "lucide-react";
import { CheckoutStatusCell } from "./checkout-status-cell";
import { SharedDocument } from "@dms/types/document.types";
import { ActivityCell } from "@/components/reuseable/tables/activity-cell";
import { ProcessTypeCell } from "@/components/reuseable/tables/process-type-cell";

// Flag to prevent duplicate logging in React Strict Mode
let hasLoggedColumns = false;
const loggedDocuments = new Set<string>();

const formatText = (text: string | null | undefined): string => {
  if (!text) return "N/A";
  return text
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
};

const getDocumentTitle = (document: SharedDocument): string => {
  if (document.documentTitle && document.documentTitle.length > 0) {
    return document.documentTitle;
  }
  return document.document || "";
};

const resolveProcessType = (
  document: SharedDocument,
  processTypeMap: Record<
    string,
    {
      code?: string;
      name?: string;
      duration_value?: number | null;
      duration_unit?: string | null;
    }
  >
) => {
  const processTypeId =
    (document as any).process_type_id || (document as any).processTypeId || "";
  const record = processTypeId ? processTypeMap[processTypeId] : undefined;
  return {
    code: record?.code || "",
    name: record?.name || "N/A",
  };
};

const resolveProcessTypeName = (
  document: SharedDocument,
  processTypeMap: Record<
    string,
    {
      code?: string;
      name?: string;
      duration_value?: number | null;
      duration_unit?: string | null;
    }
  >
) => resolveProcessType(document, processTypeMap).name;

export const getColumns = ({
  onSign,
  onRefetch,
  processTypeMap = {},
}: {
  onSign: (document: SharedDocument) => void;
  onRefetch?: () => void;
  processTypeMap?: Record<
    string,
    {
      code?: string;
      name?: string;
      duration_value?: number | null;
      duration_unit?: string | null;
    }
  >;
}): ColumnDef<SharedDocument>[] => {
  // Debug log to see what data we're getting (only log once)
  if (!hasLoggedColumns) {
    console.log('🔍 Columns: Sample document data for debugging');
    hasLoggedColumns = true;
  }
  
  return [
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
        <div className="flex justify-center items-center">
          <ScanCodes
            qrCode={data.qrCode || ""}
            barcode={data.barcode || ""}
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
      const d = row.original;
      
      // Debug log (only log each document once)
      if (d.documentId && !loggedDocuments.has(d.documentId)) {
        console.log('🔍 Document in row:', d.documentId, {
          assignedActionType: d.assignedActionType,
          hasAssignedSignature: d.hasAssignedSignature,
          fullDoc: d
        });
        loggedDocuments.add(d.documentId);
      }

      return (
        <div className="flex flex-col gap-1.5 py-1 min-w-45 max-w-60">
          <div className="font-medium" title={getDocumentTitle(d)}>
            {getDocumentTitle(d)}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="text-xs text-muted-foreground"
              title={d.documentId || ""}
            >
              {d.documentId || "N/A"}
            </span>
            <Copy
              className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-primary transition-colors shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(d.documentId || "");
                toast.success("Document ID copied to clipboard!");
              }}
            />
          </div>
        </div>
      );
    },
  },
  {
    id: "contact",
    accessorFn: (row) => row,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Contact" />
    ),
    cell: ({ row }) => {
      const d = row.original;
      return (
        <div className="flex flex-col gap-1.5 py-1 min-w-40 max-w-50">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-orange-500 shrink-0" />
            <span className="text-xs font-medium" title={d.contactPerson || ""}>
              {d.contactPerson || "N/A"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span
              className="text-xs text-muted-foreground"
              title={d.contactOrganization || ""}
            >
              {d.contactOrganization || "N/A"}
            </span>
          </div>
        </div>
      );
    },
    enableSorting: false,
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
    accessorFn: (row) => resolveProcessTypeName(row, processTypeMap),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Process Type" />
    ),
    cell: ({ row }) => {
      const { name, code } = resolveProcessType(row.original, processTypeMap);
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
          className="font-medium text-xs px-1.5 py-0.5"
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
        <span
          className="text-xs text-muted-foreground"
          title={formatText(classification)}
        >
          {formatText(classification)}
        </span>
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
      const status = row.original.status?.toLowerCase() || "";

      // Define status styling for shared documents
      const statusConfig: {
        [key: string]: { color: string; bgColor: string; label: string };
      } = {
        received: {
          color: "text-emerald-600",
          bgColor: "bg-emerald-500",
          label: "Received",
        },
        completed: {
          color: "text-emerald-600",
          bgColor: "bg-emerald-500",
          label: "Completed",
        },
        pending: {
          color: "text-blue-600",
          bgColor: "bg-blue-500",
          label: "Dispatch",
        },
        shared: {
          color: "text-blue-600",
          bgColor: "bg-blue-500",
          label: "Shared",
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
    id: "checkout",
    accessorFn: (row) => row,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Checkout Status" />
    ),
    cell: ({ row }) => {
      const document = row.original;
      return <CheckoutStatusCell document={document} />;
    },
  },
  {
    id: "activity",
    accessorFn: (row) => row,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Activity" />
    ),
    cell: ({ row }) => {
      const data = row.original as any;
      const normalizedDocument = {
        ...data,
        process_type_id: data.process_type_id || data.processTypeId || null,
        process_timer_start_at:
          data.process_timer_start_at || data.processTimerStartAt || null,
        process_timer_complete_at:
          data.process_timer_complete_at || data.processTimerCompleteAt || null,
        process_status: data.process_status || data.processStatus || null,
        process_delayed_at: data.process_delayed_at || data.processDelayedAt || null,
        process_delay_seconds:
          data.process_delay_seconds || data.processDelaySeconds || null,
      };
      return (
        <ActivityCell
          document={normalizedDocument}
          processTypeMap={processTypeMap}
        />
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-center">
        <DataTableRowActions 
          row={row} 
          viewType="shared" 
          onSign={onSign}
          onActionSuccess={onRefetch}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
];
};
