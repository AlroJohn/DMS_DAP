import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, LockKeyhole } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type LockStatus = "locked" | "available" | "locked_by_you";

interface DocumentLockBadgeProps {
  status: LockStatus;
  lockedBy?: {
    id: string;
    name: string;
  };
  lockedAt?: Date | string;
  className?: string;
}

export function DocumentLockBadge({
  status,
  lockedBy,
  lockedAt,
  className,
}: DocumentLockBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "locked":
        return {
          icon: Lock,
          label: "Checked Out",
          variant: "destructive" as const,
          tooltip: lockedBy
            ? `Checked out by ${lockedBy.name}${
                lockedAt
                  ? ` on ${new Date(lockedAt).toLocaleDateString()}`
                  : ""
              }`
            : "Document is checked out",
        };
      case "locked_by_you":
        return {
          icon: LockKeyhole,
          label: "Checked Out by You",
          variant: "default" as const,
          tooltip: `You checked out this document${
            lockedAt ? ` on ${new Date(lockedAt).toLocaleDateString()}` : ""
          }`,
        };
      case "available":
        return {
          icon: Unlock,
          label: "Available",
          variant: "secondary" as const,
          tooltip: "Document is available for editing",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className={className}>
            <Icon className="mr-1 h-3 w-3" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact version for table cells
export function DocumentLockIcon({
  status,
  lockedBy,
  lockedAt,
  className,
}: DocumentLockBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "locked":
        return {
          icon: Lock,
          color: "text-red-500",
          tooltip: lockedBy
            ? `Checked out by ${lockedBy.name}${
                lockedAt
                  ? ` on ${new Date(lockedAt).toLocaleDateString()}`
                  : ""
              }`
            : "Document is checked out",
        };
      case "locked_by_you":
        return {
          icon: LockKeyhole,
          color: "text-blue-500",
          tooltip: `You checked out this document${
            lockedAt ? ` on ${new Date(lockedAt).toLocaleDateString()}` : ""
          }`,
        };
      case "available":
        return {
          icon: Unlock,
          color: "text-green-500",
          tooltip: "Available for editing",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex ${className}`}>
            <Icon className={`h-4 w-4 ${config.color}`} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
