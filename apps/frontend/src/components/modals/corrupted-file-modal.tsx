"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldX, AlertTriangle, FileWarning, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface CorruptedFileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTitle?: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: Date | string;
  checksum?: string;
  expectedChecksum?: string;
  error?: string;
  onReupload?: () => void;
  onDownloadOriginal?: () => void;
  onContactSupport?: () => void;
}

export function CorruptedFileModal({
  open,
  onOpenChange,
  documentTitle,
  fileName,
  fileSize,
  uploadedAt,
  checksum,
  expectedChecksum,
  error,
  onReupload,
  onDownloadOriginal,
  onContactSupport,
}: CorruptedFileModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldX className="h-6 w-6 text-red-500" />
            <DialogTitle>File Corruption Detected</DialogTitle>
          </div>
          <DialogDescription className="pt-4 space-y-4">
            <Alert variant="destructive">
              <FileWarning className="h-4 w-4" />
              <AlertDescription>
                The file <strong>"{fileName || documentTitle}"</strong> appears to be corrupted and may not be accessible.
              </AlertDescription>
            </Alert>

            {error && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Error Details:</p>
                <div className="bg-muted p-3 rounded-md text-sm font-mono">
                  {error}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">File Information:</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {fileName && (
                  <div>
                    <p className="text-muted-foreground">File Name</p>
                    <p className="font-medium">{fileName}</p>
                  </div>
                )}
                {fileSize && (
                  <div>
                    <p className="text-muted-foreground">File Size</p>
                    <p className="font-medium">{(fileSize / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}
                {uploadedAt && (
                  <div>
                    <p className="text-muted-foreground">Uploaded</p>
                    <p className="font-medium">{new Date(uploadedAt).toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="destructive">Corrupted</Badge>
                </div>
              </div>
            </div>

            {checksum && expectedChecksum && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Checksum Verification:</p>
                <div className="space-y-1 text-xs font-mono bg-muted p-3 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Expected:</span>
                    <span className="text-green-600">{expectedChecksum.substring(0, 16)}...</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Actual:</span>
                    <span className="text-red-600">{checksum.substring(0, 16)}...</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-md space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    What caused this?
                  </p>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                    <li>Network interruption during upload</li>
                    <li>Storage system error</li>
                    <li>Original file was already corrupted</li>
                    <li>Incomplete file transfer</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-muted p-3 rounded-md space-y-2">
              <p className="text-sm font-medium">Recommended Actions:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Re-upload the file from your original source</li>
                <li>Verify the original file opens correctly</li>
                <li>Try downloading and re-uploading</li>
                <li>Contact support if the problem persists</li>
              </ol>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {onDownloadOriginal && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onDownloadOriginal();
                onOpenChange(false);
              }}
            >
              Try Download
            </Button>
          )}
          {onReupload && (
            <Button
              type="button"
              onClick={() => {
                onReupload();
                onOpenChange(false);
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-upload File
            </Button>
          )}
          {onContactSupport && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onContactSupport();
                onOpenChange(false);
              }}
            >
              Contact Support
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
