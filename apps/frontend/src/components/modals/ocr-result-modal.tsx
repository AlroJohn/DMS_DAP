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
import { CheckCircle, XCircle, FileSearch, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface OcrResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: "success" | "partial" | "failed";
  documentTitle?: string;
  pagesProcessed?: number;
  totalPages?: number;
  wordsExtracted?: number;
  confidence?: number; // 0-100
  error?: string;
  warnings?: string[];
  onViewDocument?: () => void;
  onRetry?: () => void;
}

export function OcrResultModal({
  open,
  onOpenChange,
  status,
  documentTitle,
  pagesProcessed,
  totalPages,
  wordsExtracted,
  confidence,
  error,
  warnings,
  onViewDocument,
  onRetry,
}: OcrResultModalProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "success":
        return {
          icon: CheckCircle,
          iconColor: "text-green-500",
          title: "OCR Completed Successfully",
          description: `Your document "${documentTitle}" has been successfully converted to searchable text.`,
          variant: "default" as const,
        };
      case "partial":
        return {
          icon: AlertTriangle,
          iconColor: "text-yellow-500",
          title: "OCR Partially Completed",
          description: `OCR conversion completed with some warnings for "${documentTitle}".`,
          variant: "default" as const,
        };
      case "failed":
        return {
          icon: XCircle,
          iconColor: "text-red-500",
          title: "OCR Conversion Failed",
          description: `Failed to convert "${documentTitle}" to searchable text.`,
          variant: "destructive" as const,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Icon className={`h-6 w-6 ${config.iconColor}`} />
            <DialogTitle>{config.title}</DialogTitle>
          </div>
          <DialogDescription className="pt-4 space-y-4">
            <p>{config.description}</p>

            {status !== "failed" && (
              <div className="grid grid-cols-2 gap-4">
                {pagesProcessed !== undefined && totalPages !== undefined && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Pages Processed</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{pagesProcessed}</span>
                      <span className="text-sm text-muted-foreground">/ {totalPages}</span>
                    </div>
                  </div>
                )}

                {wordsExtracted !== undefined && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Words Extracted</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{wordsExtracted.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {confidence !== undefined && (
                  <div className="space-y-1 col-span-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">OCR Confidence</p>
                      <Badge variant={confidence >= 90 ? "default" : confidence >= 70 ? "secondary" : "destructive"}>
                        {confidence}%
                      </Badge>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          confidence >= 90
                            ? "bg-green-500"
                            : confidence >= 70
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${confidence}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {status === "failed" && error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Error:</strong> {error}
                </AlertDescription>
              </Alert>
            )}

            {status === "partial" && warnings && warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warnings:</strong>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    {warnings.map((warning, index) => (
                      <li key={index} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {status === "success" && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                <FileSearch className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your document is now searchable. You can search for text within the document content.
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {status === "failed" && onRetry && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onRetry();
                onOpenChange(false);
              }}
            >
              Retry OCR
            </Button>
          )}
          {onViewDocument && status !== "failed" && (
            <Button
              type="button"
              onClick={() => {
                onViewDocument();
                onOpenChange(false);
              }}
            >
              View Document
            </Button>
          )}
          <Button
            type="button"
            variant={status === "failed" ? "default" : "outline"}
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
