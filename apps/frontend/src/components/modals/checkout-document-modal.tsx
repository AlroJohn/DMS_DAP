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
import { Lock, Unlock, LockKeyhole, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CheckoutDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "checkout" | "checkin" | "override";
  documentTitle?: string;
  lockedBy?: {
    id: string;
    name: string;
  };
  lockedAt?: Date | string;
  onConfirm: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function CheckoutDocumentModal({
  open,
  onOpenChange,
  action,
  documentTitle,
  lockedBy,
  lockedAt,
  onConfirm,
  onCancel,
  isLoading,
}: CheckoutDocumentModalProps) {
  const getActionConfig = () => {
    switch (action) {
      case "checkout":
        return {
          icon: Lock,
          iconColor: "text-blue-500",
          title: "Check Out Document",
          description: `You are about to check out "${documentTitle}". Other users will not be able to edit this document while you have it checked out.`,
          confirmText: "Check Out",
          confirmVariant: "default" as const,
        };
      case "checkin":
        return {
          icon: Unlock,
          iconColor: "text-green-500",
          title: "Check In Document",
          description: `You are about to check in "${documentTitle}". This will make the document available for others to edit.`,
          confirmText: "Check In",
          confirmVariant: "default" as const,
        };
      case "override":
        return {
          icon: LockKeyhole,
          iconColor: "text-red-500",
          title: "Override Document Lock",
          description: `This document is currently checked out by ${lockedBy?.name || "another user"}${
            lockedAt ? ` since ${new Date(lockedAt).toLocaleString()}` : ""
          }. Are you sure you want to override the lock?`,
          confirmText: "Override Lock",
          confirmVariant: "destructive" as const,
        };
    }
  };

  const config = getActionConfig();
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Icon className={`h-6 w-6 ${config.iconColor}`} />
            <DialogTitle>{config.title}</DialogTitle>
          </div>
          <DialogDescription className="pt-4">
            {config.description}
          </DialogDescription>
        </DialogHeader>
        <div className="pt-4 space-y-4">
          {action === "override" && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> Overriding a lock may cause conflicts
                if {lockedBy?.name || "the user"} is currently editing the
                document.
              </AlertDescription>
            </Alert>
          )}

          {action === "checkout" && (
            <div className="bg-muted p-3 rounded-md text-sm space-y-1">
              <div className="font-medium">
                Remember to check in the document when finished:
              </div>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Save your changes</li>
                <li>Check in the document to unlock it</li>
                <li>Others can then edit the document</li>
              </ul>
            </div>
          )}

          {action === "checkin" && (
            <div className="bg-muted p-3 rounded-md text-sm">
              <div>
                <strong>Note:</strong> Make sure all your changes are saved
                before checking in the document.
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={config.confirmVariant}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : config.confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
