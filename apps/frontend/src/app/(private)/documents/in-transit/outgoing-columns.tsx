"use client";

import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableRowActions } from "@/components/reuseable/tables/data-table-row-action";
import { DataTableColumnHeader } from "@/components/reuseable/tables/data-table-column-header";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Calendar, Copy, User, Building2 } from "lucide-react";
import { ScanCodes } from "@/components/ui/scan-codes";

export type OutgoingDocument = {
  id: string;
  qrCode: string;
  barcode: string;
  document: string;
  documentId: string;
  contactPerson: string;
  contactOrganization: string;
  type: string;
  classification: string;
  status: string;
  activity: string;
  activityTime: string;
};

const formatText = (text: string): string => {
  return text
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
};

export const outgoingColumns: ColumnDef<OutgoingDocument>[] = [
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
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
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
      const document = row.original as OutgoingDocument;

      return (
        document.id?.toLowerCase().includes(searchTerm) ||
        document.document?.toLowerCase().includes(searchTerm) ||
        document.documentId?.toLowerCase().includes(searchTerm) ||
        document.type?.toLowerCase().includes(searchTerm) ||
        document.classification?.toLowerCase().includes(searchTerm) ||
        document.contactPerson?.toLowerCase().includes(searchTerm) ||
        document.contactOrganization?.toLowerCase().includes(searchTerm) ||
        document.status?.toLowerCase().includes(searchTerm)
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
      const data = row.original;
      return (
        <div className="flex flex-col gap-1.5 py-1">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-xs font-medium">{data.contactPerson}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs text-muted-foreground">
              {data.contactOrganization}
            </span>
          </div>
        </div>
      );
    },
    enableSorting: true,
    filterFn: (row, id, filterValue) => {
      const searchTerm = (filterValue as string).toLowerCase();
      const document = row.original as OutgoingDocument;
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
        <span className="text-xs text-muted-foreground">
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

      // Define status styling
      const statusConfig: {
        [key: string]: { color: string; bgColor: string; label: string };
      } = {
        sent: { color: "text-blue-600", bgColor: "bg-blue-500", label: "Sent" },
        in_transit: {
          color: "text-orange-600",
          bgColor: "bg-orange-500",
          label: "In Transit",
        },
        delivered: {
          color: "text-emerald-600",
          bgColor: "bg-emerald-500",
          label: "Delivered",
        },
        incoming: {
          color: "text-purple-600",
          bgColor: "bg-purple-500",
          label: "Incoming",
        },
        processing: {
          color: "text-amber-600",
          bgColor: "bg-amber-500",
          label: "Processing",
        },
        completed: {
          color: "text-emerald-600",
          bgColor: "bg-emerald-500",
          label: "Completed",
        },
        cancelled: {
          color: "text-red-600",
          bgColor: "bg-red-500",
          label: "Cancelled",
        },
        dispatch: {
          color: "text-cyan-600",
          bgColor: "bg-cyan-500",
          label: "Dispatch",
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
          <span className={`text-xs ${config.color}`}>{config.label}</span>
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
      const formattedActivity = data.activity
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l: string) => l.toUpperCase());
      const formattedDate = new Date(data.activityTime).toLocaleString(
        "en-US",
        {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );

      return (
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-orange-500" />
            <span className="text-muted-foreground">{formattedActivity}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-blue-500" />
            <span className="text-muted-foreground">{formattedDate}</span>
          </div>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} viewType="outgoing" />,
    enableSorting: false,
    enableHiding: false,
  },
];
