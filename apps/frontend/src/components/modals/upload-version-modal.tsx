"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

interface UploadVersionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string | null;
  versionGroupId: string | null;
  onUploadComplete: () => void;
}

export function UploadVersionModal({
  open,
  onOpenChange,
  documentId,
  versionGroupId,
  onUploadComplete,
}: UploadVersionModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetSelection = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!open) {
      resetSelection();
    }
  }, [open]);

  const handleSelectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!file.type.includes("pdf")) {
      toast.error("Only PDF files are allowed for versioning.");
      resetSelection();
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadFile = async () => {
    if (!selectedFile || !documentId) {
      return;
    }
    if (!versionGroupId) {
      toast.error("Version group ID is missing. Cannot upload new version.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append("files", selectedFile);
      formData.append("versionGroupId", versionGroupId);

      const response = await fetch(`/api/documents/${documentId}/files`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      setUploadProgress(80);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Upload failed" }));
        throw new Error(errorData.error?.message || "Failed to upload file");
      }

      await response.json();

      setUploadProgress(100);
      toast.success("New version uploaded successfully!");
      onUploadComplete();
      resetSelection();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Upload failed", {
        description:
          error?.message || "An error occurred while uploading the file.",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleVersionUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[40dvw]">
        <DialogHeader>
          <DialogTitle>Upload New Version</DialogTitle>
          <DialogDescription>
            Select a PDF file to upload as a new version for this document
            group.
          </DialogDescription>
        </DialogHeader>

        <div className="border rounded-lg p-4 bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800/50">
          <div className="flex items-center gap-2 mb-2">
            <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-medium text-blue-900 dark:text-blue-200">
              Upload New Version
            </h3>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
            Add a new version to this version group. Select a file to upload.
          </p>

          <Button
            type="button"
            variant="outline"
            className="w-full border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/20"
            onClick={handleVersionUploadClick}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading... {uploadProgress}%
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Select File
              </>
            )}
          </Button>

          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf"
            onChange={handleSelectFile}
            className="hidden"
          />

          {selectedFile && (
            <p className="text-xs text-blue-700 dark:text-blue-200 mt-2">
              Selected: {selectedFile.name}
            </p>
          )}

          {isUploading && (
            <div className="mt-3">
              <div className="flex justify-between text-sm mb-1 text-blue-800 dark:text-blue-200">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800/50 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleUploadFile}
            disabled={!selectedFile || isUploading}
          >
            Save
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              resetSelection();
              onOpenChange(false);
            }}
            disabled={isUploading}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
