"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/reuseable/tables/data-table-column-header";
import { ScanCodes } from "@/components/ui/scan-codes";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableRowActions } from "@/components/reuseable/tables/data-table-row-action";
import { toast } from "sonner";
import { Copy, User, Building2, Calendar } from "lucide-react";
import { CheckoutStatusCell } from "./checkout-status-cell";

export type SharedDocument = {
  id: string;
  qrCode?: string;
  barcode?: string;
  document: string;
  documentTitle?: string;
  documentId?: string;
  contactPerson?: string; // Will now be the root owner of the document
  contactOrganization?: string;
  type: string; // Backend ensures this is always present after our changes
  classification?: string;
  status?: string;
  activity?: string;
  activityTime?: string;
  checkedOutBy?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  checkedOutAt?: string | null;
};

const formatText = (text: string | undefined): string => {
  if (!text) return "";
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

export const columns: ColumnDef<SharedDocument>[] = [
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
          <ScanCodes qrCode={data.qrCode || ""} barcode={data.barcode || ""} />
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

      return (
        <div className="flex flex-col gap-1.5 py-1 min-w-[180px] max-w-[240px]">
          <div className="font-medium" title={getDocumentTitle(d)}>
            {getDocumentTitle(d)}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="text-xs text-muted-foreground"
              title={d.documentId}
            >
              {d.documentId}
            </span>
            <Copy
              className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
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
        <div className="flex flex-col gap-1.5 py-1 min-w-[160px] max-w-[200px]">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
            <span className="text-xs font-medium" title={d.contactPerson}>
              {d.contactPerson}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
            <span
              className="text-xs text-muted-foreground"
              title={d.contactOrganization}
            >
              {d.contactOrganization}
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
        dispatch: {
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
      const d = row.original;
      // show date only (no time)
      const formattedDate = d.activityTime
        ? new Date(d.activityTime).toLocaleDateString("en-US", {
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
              Rec
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
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-center">
        <DataTableRowActions row={row} viewType="shared" />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
];
