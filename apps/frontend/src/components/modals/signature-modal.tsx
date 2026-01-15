"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SignaturePad } from "../signature-pad";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState } from "react";

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signature: string) => void;
  onChange?: (signature: string | null) => void;
  initialSignature?: string | null;
  title?: string;
}

export function SignatureModal({
  isOpen,
  onClose,
  onSave,
  onChange,
  onCancel,
  initialSignature,
  title = "Create Signature"
}: SignatureModalProps & { onCancel?: () => void }) {
  const [signatureData, setSignatureData] = useState<string | null>(initialSignature || null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    if (!signatureData) return;

    setIsSaving(true);
    onSave(signatureData);
    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 300);
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  const handleClear = () => {
    setSignatureData(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{title}</DialogTitle>
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="py-4">
          <SignaturePad
            value={signatureData || undefined}
            onChange={(value) => {
              setSignatureData(value);
              onChange?.(value);
            }}
            width={600}
            height={200}
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={isSaving || !signatureData}
            >
              Clear
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !signatureData}
            >
              {isSaving ? "Saving..." : "Save Signature"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
