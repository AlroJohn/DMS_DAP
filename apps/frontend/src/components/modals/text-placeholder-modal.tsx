"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface TextPlaceholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
  onChange?: (text: string) => void;
  onCancel?: () => void;
  initialText?: string;
  title?: string;
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
}

export function TextPlaceholderModal({
  isOpen,
  onClose,
  onSave,
  onChange,
  onCancel,
  initialText = "",
  title = "Add Text",
  fontFamily,
  fontSize,
  fontColor,
}: TextPlaceholderModalProps) {
  const [textValue, setTextValue] = useState(initialText);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTextValue(initialText);
    }
  }, [initialText, isOpen]);

  const handleSave = () => {
    setIsSaving(true);
    onSave(textValue.trim());
    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 200);
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  const handleClear = () => {
    setTextValue("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{title}</DialogTitle>
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <Textarea
            value={textValue}
            onChange={(event) => {
              const nextValue = event.target.value;
              setTextValue(nextValue);
              onChange?.(nextValue);
            }}
            placeholder="Enter text for this placeholder"
            className="min-h-[80px]"
          />

          <div
            className="rounded-md border bg-muted/20 px-3 text-center text-sm"
            style={{
              fontFamily: fontFamily || "Arial",
              fontSize: fontSize || 14,
              color: fontColor || "#111827",
            }}
          >
            {textValue.trim() || "Text preview"}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button variant="outline" onClick={handleClear} disabled={isSaving}>
              Clear
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Text"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
