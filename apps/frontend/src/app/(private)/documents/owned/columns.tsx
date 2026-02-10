"use client";

import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableRowActions } from "@/components/reuseable/tables/data-table-row-action";
import { DataTableColumnHeader } from "@/components/reuseable/tables/data-table-column-header";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Calendar, Copy, User, Building2, Clock } from "lucide-react";

import { Document } from "@/hooks/use-documents-owned";
import { ScanCodes } from "@/components/ui/scan-codes";
import { convertDateTime } from "@/lib/convertDateTime";
import { CountdownTimer, ElapsedTimer } from "@/components/reuseable/countdown-timer";

export type { Document };

const formatText = (text: string): string => {
  return text
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
};

type DocumentTypeMap = Record<string, string>;
type ProcessTypeMap = Record<
  string,
  { name?: string; duration_value?: number | null; duration_unit?: string | null }
>;

type CreateColumnOptions = {
  documentTypeMap?: DocumentTypeMap;
  processTypeMap?: ProcessTypeMap;
};

export const createOwnedDocumentColumns = (
  options: CreateColumnOptions = {}
): ColumnDef<Document, unknown>[] => {
  const { documentTypeMap = {}, processTypeMap = {} } = options;
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

  const resolveProcessType = (document: Document) => {
    const processTypeId =
      document.process_type_id || (document as any).processTypeId || "";
    const record = processTypeId ? processTypeMap[processTypeId] : undefined;
    return {
      id: processTypeId,
      durationValue: record?.duration_value ?? null,
      durationUnit: record?.duration_unit ?? null,
    };
  };

  const formatDuration = (totalSeconds: number) => {
    const clamped = Math.max(0, Math.floor(totalSeconds));
    const days = Math.floor(clamped / 86400);
    const hours = Math.floor((clamped % 86400) / 3600);
    const minutes = Math.floor((clamped % 3600) / 60);
    const seconds = clamped % 60;

    const pad = (value: number) => String(value).padStart(2, "0");
    return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
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
          className="translate-y-0.5 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
        />
      ),
      cell: ({ row }) => {
        return (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-0.5 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
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
        const processType = resolveProcessType(data);
        const startAt =
          data.process_timer_start_at || data.created_at || data.activityTime;
        const completedAt = data.process_timer_complete_at;
        const delaySeconds = data.process_delay_seconds ?? null;
        const hasDelayedAt = Boolean(data.process_delayed_at);
        const durationUnit = (processType.durationUnit || "days").toLowerCase();
        const durationValue = processType.durationValue ?? null;
        const durationMultiplier =
          durationUnit === "seconds"
            ? 1
            : durationUnit === "minutes"
              ? 60
              : durationUnit === "hours"
                ? 60 * 60
                : 24 * 60 * 60;
        const durationSeconds =
          durationValue && durationValue > 0
            ? durationValue * durationMultiplier
            : null;
        const computedDelayStartAt =
          !data.process_delayed_at &&
          startAt &&
          durationSeconds
            ? new Date(
                new Date(startAt).getTime() + durationSeconds * 1000
              ).toISOString()
            : null;
        const delayStartAt = data.process_delayed_at || computedDelayStartAt;
        const resolvedDelaySeconds =
          delaySeconds && delaySeconds > 0
            ? delaySeconds
            : delayStartAt
              ? Math.max(
                  0,
                  Math.floor(
                    ((completedAt ? new Date(completedAt) : new Date()).getTime() -
                      new Date(delayStartAt).getTime()) /
                      1000
                  )
                )
              : null;
        const isDelayed =
          data.process_status === "delayed" ||
          hasDelayedAt ||
          (resolvedDelaySeconds !== null && resolvedDelaySeconds > 0);
        const isCompleted =
          !isDelayed &&
          (data.process_status === "completed" || Boolean(completedAt));
        const completedDurationSeconds =
          completedAt && startAt
            ? Math.max(
                0,
                Math.floor(
                  (new Date(completedAt).getTime() -
                    new Date(startAt).getTime()) /
                    1000
                )
              )
            : null;
        const showTimer = Boolean(processType.id);
        const timerIconClass = isDelayed
          ? "text-red-500"
          : "text-emerald-500";
        const timerTextClass = isDelayed
          ? "text-red-500"
          : "text-foreground";
        return (
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-orange-500" />
              <span className="text-muted-foreground">Created</span>
            </div>
            {formattedActivityDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-blue-500" />
                <span className="text-muted-foreground">
                  {formattedActivityDate}
                </span>
              </div>
            )}
            {showTimer && (
              <div className="flex items-center gap-1.5">
                <Clock className={`w-3 h-3 ${timerIconClass}`} />
                {isDelayed ? (
                  <span className={`font-medium ${timerTextClass}`}>
                    Delayed for{" "}
                    {delayStartAt ? (
                      <ElapsedTimer
                        startAt={delayStartAt}
                        endAt={completedAt}
                      />
                    ) : resolvedDelaySeconds !== null ? (
                      formatDuration(resolvedDelaySeconds)
                    ) : (
                      "0d 00h 00m 00s"
                    )}
                  </span>
                ) : isCompleted ? (
                  <span className="text-muted-foreground">
                    {completedDurationSeconds !== null
                      ? `Completed in ${formatDuration(completedDurationSeconds)}`
                      : "Completed"}
                  </span>
                ) : startAt && processType.durationValue ? (
                  <span className={`font-medium ${timerTextClass}`}>
                    <CountdownTimer
                      startAt={startAt}
                      durationValue={processType.durationValue || undefined}
                      durationUnit={processType.durationUnit || undefined}
                      className={timerTextClass}
                    />
                  </span>
                ) : (
                  <span className="text-muted-foreground">Waiting</span>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => <DataTableRowActions row={row} viewType="owned" onActionSuccess={meta?.onRefetch} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
};

export const columns = createOwnedDocumentColumns();
