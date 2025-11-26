import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ShieldX, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CorruptionAlertProps {
  variant?: "warning" | "error";
  documentTitle?: string;
  error?: string;
  checksum?: string;
  onReupload?: () => void;
  onViewDetails?: () => void;
  className?: string;
}

export function CorruptionAlert({
  variant = "error",
  documentTitle,
  error,
  checksum,
  onReupload,
  onViewDetails,
  className,
}: CorruptionAlertProps) {
  return (
    <Alert
      variant={variant === "error" ? "destructive" : "default"}
      className={className}
    >
      <ShieldX className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>File Corruption Detected</span>
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          {error || `The file "${documentTitle}" appears to be corrupted and may not open correctly.`}
        </p>

        {checksum && (
          <div className="text-xs font-mono bg-muted p-2 rounded">
            <span className="text-muted-foreground">Checksum mismatch:</span> {checksum.substring(0, 32)}...
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {onReupload && (
            <Button size="sm" variant="outline" onClick={onReupload}>
              Re-upload File
            </Button>
          )}
          {onViewDetails && (
            <Button size="sm" variant="outline" onClick={onViewDetails}>
              View Details
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
          <strong>What this means:</strong> The file may have been damaged during upload or storage. Try downloading and re-uploading the file. If the problem persists, the original file may be corrupted.
        </div>
      </AlertDescription>
    </Alert>
  );
}

// Inline compact version
export function CorruptionWarningInline({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-md ${
        onClick ? "cursor-pointer hover:bg-red-100 dark:hover:bg-red-900" : ""
      } ${className}`}
      onClick={onClick}
    >
      <FileWarning className="h-4 w-4" />
      <span>File may be corrupted</span>
    </div>
  );
}

// Banner version for document viewer
export function CorruptionBanner({
  documentTitle,
  onDismiss,
  onReupload,
  onContactSupport,
  className,
}: {
  documentTitle?: string;
  onDismiss?: () => void;
  onReupload?: () => void;
  onContactSupport?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 p-4 bg-red-50 dark:bg-red-950 border-l-4 border-red-500 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-red-900 dark:text-red-100">
            Corrupted File Warning
          </p>
          <p className="text-sm text-red-700 dark:text-red-300">
            {documentTitle
              ? `"${documentTitle}" may be corrupted. The file may not display or download correctly.`
              : "This file may be corrupted and may not work correctly."}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onReupload && (
          <Button size="sm" variant="outline" onClick={onReupload}>
            Re-upload
          </Button>
        )}
        {onContactSupport && (
          <Button size="sm" variant="outline" onClick={onContactSupport}>
            Get Help
          </Button>
        )}
        {onDismiss && (
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}
