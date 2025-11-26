import { Badge } from "@/components/ui/badge";
import { CheckCircle, Loader2, XCircle, FileSearch } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type OcrStatus = "processing" | "completed" | "failed" | "not_started" | "searchable";

interface OcrStatusBadgeProps {
  status: OcrStatus;
  progress?: number; // 0-100
  error?: string;
  className?: string;
}

export function OcrStatusBadge({
  status,
  progress,
  error,
  className,
}: OcrStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "processing":
        return {
          icon: Loader2,
          label: progress ? `Processing ${progress}%` : "Processing",
          variant: "secondary" as const,
          iconClass: "animate-spin",
          tooltip: "OCR conversion in progress",
        };
      case "completed":
      case "searchable":
        return {
          icon: CheckCircle,
          label: "Searchable",
          variant: "default" as const,
          iconClass: "text-green-500",
          tooltip: "Document has been converted to searchable text",
        };
      case "failed":
        return {
          icon: XCircle,
          label: "OCR Failed",
          variant: "destructive" as const,
          iconClass: "",
          tooltip: error || "Failed to convert document",
        };
      case "not_started":
        return {
          icon: FileSearch,
          label: "Not Processed",
          variant: "outline" as const,
          iconClass: "text-muted-foreground",
          tooltip: "OCR has not been run on this document",
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
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact icon version for tables
export function OcrStatusIcon({
  status,
  progress,
  error,
  className,
}: OcrStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "processing":
        return {
          icon: Loader2,
          color: "text-yellow-500",
          iconClass: "animate-spin",
          tooltip: progress ? `OCR Processing: ${progress}%` : "OCR in progress",
        };
      case "completed":
      case "searchable":
        return {
          icon: CheckCircle,
          color: "text-green-500",
          iconClass: "",
          tooltip: "Searchable document",
        };
      case "failed":
        return {
          icon: XCircle,
          color: "text-red-500",
          iconClass: "",
          tooltip: error || "OCR conversion failed",
        };
      case "not_started":
        return {
          icon: FileSearch,
          color: "text-gray-400",
          iconClass: "",
          tooltip: "Not processed",
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
            <Icon className={`h-4 w-4 ${config.color} ${config.iconClass}`} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
