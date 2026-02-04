"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface WorkflowCompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTitle: string;
  originDepartmentName?: string | null;
  onComplete: () => Promise<void> | void;
  onReturnToOrigin: () => Promise<void> | void;
}

export function WorkflowCompletionModal({
  open,
  onOpenChange,
  documentTitle,
  originDepartmentName,
  onComplete,
  onReturnToOrigin,
}: WorkflowCompletionModalProps) {
  const [selection, setSelection] = useState<"complete" | "return">("complete");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      if (selection === "complete") {
        await onComplete();
      } else {
        await onReturnToOrigin();
      }
    } finally {
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finalize workflow</DialogTitle>
          <DialogDescription>
            Choose what to do with <strong>{documentTitle}</strong> now that the
            sequence is complete.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup
          className="space-y-3"
          value={selection}
          onValueChange={(value) =>
            setSelection(value as "complete" | "return")
          }
        >
          <label className="flex items-start gap-3 rounded border border-input p-3 text-sm">
            <RadioGroupItem value="complete" />
            <span className="space-y-1">
              <span className="font-medium">Complete document</span>
              <span className="block text-xs text-muted-foreground">
                Marks the document as completed and closes the workflow.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded border border-input p-3 text-sm">
            <RadioGroupItem value="return" />
            <span className="space-y-1">
              <span className="font-medium">Return to originating office</span>
              <span className="block text-xs text-muted-foreground">
                Sends the document back to
                {originDepartmentName
                  ? ` ${originDepartmentName}.`
                  : " the originating office."}
              </span>
            </span>
          </label>
        </RadioGroup>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Processing..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}