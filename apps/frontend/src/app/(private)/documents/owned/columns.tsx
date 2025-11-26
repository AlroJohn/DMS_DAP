"use client";

import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableRowActions } from "@/components/reuseable/tables/data-table-row-action";
import { DataTableColumnHeader } from "@/components/reuseable/tables/data-table-column-header";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Calendar, Copy, User, Building2 } from "lucide-react";

import { Document } from "@/hooks/use-documents-owned";
import { ScanCodes } from "@/components/ui/scan-codes";
import { convertDateTime } from "@/lib/convertDateTime";

export type { Document };

const formatText = (text: string): string => {
  return text
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
};

type DocumentTypeMap = Record<string, string>;

type CreateColumnOptions = {
  documentTypeMap?: DocumentTypeMap;
};

export const createOwnedDocumentColumns = (
  options: CreateColumnOptions = {}
): ColumnDef<Document, unknown>[] => {
  const { documentTypeMap = {} } = options;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const resolveDocumentTypeName = (typeValue?: string | null): string => {
    if (!typeValue) return "N/A";

    const trimmedValue = typeValue.trim();
    if (!trimmedValue) return "N/A";

    const mapped = documentTypeMap[trimmedValue];
    if (mapped) return mapped;

    if (uuidRegex.test(trimmedValue)) {
      return "Unknown Type";
    }

    return formatText(trimmedValue);
  };

  return [
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
        const document = row.original as Document;

        return (
          document.id?.toLowerCase().includes(searchTerm) ||
          document.document?.toLowerCase().includes(searchTerm) ||
          document.documentId?.toLowerCase().includes(searchTerm) ||
          document.type?.toLowerCase().includes(searchTerm) ||
          resolveDocumentTypeName(document.type)
            .toLowerCase()
            .includes(searchTerm) ||
          document.classification?.toLowerCase().includes(searchTerm) ||
          document.currentLocation?.toLowerCase().includes(searchTerm) ||
          document.status?.toLowerCase().includes(searchTerm) ||
          document.contactPerson?.toLowerCase().includes(searchTerm) ||
          document.contactOrganization?.toLowerCase().includes(searchTerm)
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
              <span className="text-xs font-medium" title={data.contactPerson}>
                {data.contactPerson}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-blue-500" />
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
      enableHiding: true,
      filterFn: (row, id, filterValue) => {
        const searchTerm = (filterValue as string).toLowerCase();
        const document = row.original as Document;
        return (
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
      id: "type",
      accessorFn: (row) => resolveDocumentTypeName(row.type),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const type =
          (row.getValue("type") as string) ||
          resolveDocumentTypeName(row.original.type);
        return <span className="text-xs text-muted-foreground">{type}</span>;
      },
      enableSorting: true,
      enableHiding: true,
      filterFn: (row, id, value) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return true;
        const type = String(row.getValue(id) ?? "").toLowerCase();
        const rawType = String(row.original.type ?? "").toLowerCase();
        return Array.isArray(value)
          ? (value as string[]).some((v) => {
              const candidate = String(v).toLowerCase();
              return candidate === type || candidate === rawType;
            })
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
            variant={
              classification === "Highly technical"
                ? "destructive"
                : "secondary"
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
        const formattedActivityDate = data.activityTime
          ? convertDateTime(data.activityTime, { dateOnly: true })
          : "";
        return (
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-orange-500" />
              <span className="text-muted-foreground">{data.activity}</span>
            </div>
            {formattedActivityDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-blue-500" />
                <span className="text-muted-foreground">
                  {formattedActivityDate}
                </span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => <DataTableRowActions row={row} viewType="owned" />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
};

export const columns = createOwnedDocumentColumns();
