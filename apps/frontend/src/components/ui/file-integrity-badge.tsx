import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, ShieldQuestion, ShieldX } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type IntegrityStatus = "verified" | "corrupted" | "unknown" | "checking";

interface FileIntegrityBadgeProps {
  status: IntegrityStatus;
  checksum?: string;
  algorithm?: "MD5" | "SHA256" | "SHA512";
  error?: string;
  className?: string;
}

export function FileIntegrityBadge({
  status,
  checksum,
  algorithm,
  error,
  className,
}: FileIntegrityBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "verified":
        return {
          icon: ShieldCheck,
          label: "Verified",
          variant: "default" as const,
          iconClass: "text-green-500",
          tooltip: checksum
            ? `File integrity verified (${algorithm || "SHA256"})`
            : "File integrity verified",
        };
      case "corrupted":
        return {
          icon: ShieldX,
          label: "Corrupted",
          variant: "destructive" as const,
          iconClass: "",
          tooltip: error || "File may be corrupted and cannot be opened",
        };
      case "checking":
        return {
          icon: ShieldQuestion,
          label: "Checking",
          variant: "secondary" as const,
          iconClass: "animate-pulse",
          tooltip: "Verifying file integrity",
        };
      case "unknown":
        return {
          icon: ShieldAlert,
          label: "Unknown",
          variant: "outline" as const,
          iconClass: "text-yellow-500",
          tooltip: "File integrity has not been verified",
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
            <Icon className={`mr-1 h-3 w-3 ${config.iconClass}`} />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p>{config.tooltip}</p>
            {checksum && (
              <p className="text-xs text-muted-foreground font-mono">
                {algorithm}: {checksum.substring(0, 16)}...
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact icon version
export function FileIntegrityIcon({
  status,
  checksum,
  algorithm,
  error,
  className,
}: FileIntegrityBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "verified":
        return {
          icon: ShieldCheck,
          color: "text-green-500",
          tooltip: "File verified",
        };
      case "corrupted":
        return {
          icon: ShieldX,
          color: "text-red-500",
          tooltip: error || "File corrupted",
        };
      case "checking":
        return {
          icon: ShieldQuestion,
          color: "text-blue-500 animate-pulse",
          tooltip: "Checking integrity",
        };
      case "unknown":
        return {
          icon: ShieldAlert,
          color: "text-yellow-500",
          tooltip: "Integrity unknown",
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
          <div className="space-y-1">
            <p>{config.tooltip}</p>
            {checksum && (
              <p className="text-xs text-muted-foreground font-mono">
                {algorithm}: {checksum.substring(0, 16)}...
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
