import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, ShieldAlert, Lock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type EncryptionStatus = "encrypted" | "unencrypted" | "transit_only" | "encrypting";

interface EncryptionBadgeProps {
  status: EncryptionStatus;
  algorithm?: "AES-256" | "AES-128" | "RSA-2048";
  encryptedAt?: Date | string;
  className?: string;
}

export function EncryptionBadge({
  status,
  algorithm = "AES-256",
  encryptedAt,
  className,
}: EncryptionBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "encrypted":
        return {
          icon: ShieldCheck,
          label: "Encrypted",
          variant: "default" as const,
          iconClass: "text-green-500",
          tooltip: `File encrypted at rest using ${algorithm}`,
        };
      case "encrypting":
        return {
          icon: Shield,
          label: "Encrypting",
          variant: "secondary" as const,
          iconClass: "animate-pulse text-blue-500",
          tooltip: `Encrypting file with ${algorithm}`,
        };
      case "transit_only":
        return {
          icon: ShieldAlert,
          label: "Transit Only",
          variant: "secondary" as const,
          iconClass: "text-yellow-500",
          tooltip: "File encrypted in transit only (HTTPS/TLS)",
        };
      case "unencrypted":
        return {
          icon: Shield,
          label: "Not Encrypted",
          variant: "outline" as const,
          iconClass: "text-gray-400",
          tooltip: "File is not encrypted at rest",
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
            {encryptedAt && status === "encrypted" && (
              <p className="text-xs text-muted-foreground">
                Encrypted: {new Date(encryptedAt).toLocaleString()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact icon version
export function EncryptionIcon({
  status,
  algorithm = "AES-256",
  encryptedAt,
  className,
}: EncryptionBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "encrypted":
        return {
          icon: Lock,
          color: "text-green-500",
          tooltip: `Encrypted (${algorithm})`,
        };
      case "encrypting":
        return {
          icon: Lock,
          color: "text-blue-500 animate-pulse",
          tooltip: "Encrypting...",
        };
      case "transit_only":
        return {
          icon: ShieldAlert,
          color: "text-yellow-500",
          tooltip: "Transit only (HTTPS)",
        };
      case "unencrypted":
        return {
          icon: Shield,
          color: "text-gray-400",
          tooltip: "Not encrypted",
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
            {encryptedAt && status === "encrypted" && (
              <p className="text-xs text-muted-foreground">
                {new Date(encryptedAt).toLocaleString()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Security level indicator component
export function SecurityLevelIndicator({
  encryption,
  integrity,
  className,
}: {
  encryption: EncryptionStatus;
  integrity?: IntegrityStatus;
  className?: string;
}) {
  const getSecurityLevel = () => {
    if (encryption === "encrypted" && integrity === "verified") {
      return { level: "High", color: "text-green-500", icon: ShieldCheck };
    }
    if (encryption === "encrypted" || encryption === "transit_only") {
      return { level: "Medium", color: "text-yellow-500", icon: ShieldAlert };
    }
    return { level: "Low", color: "text-red-500", icon: Shield };
  };

  const security = getSecurityLevel();
  const Icon = security.icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Icon className={`h-4 w-4 ${security.color}`} />
      <span className={`text-sm font-medium ${security.color}`}>
        Security: {security.level}
      </span>
    </div>
  );
}

export type { IntegrityStatus } from "./file-integrity-badge";
