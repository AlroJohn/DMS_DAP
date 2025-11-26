"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Edit, Loader2, Lock, Unlock, UserCheck, Upload } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

interface DocumentFile {
  id: string;
  name: string;
  type: string;
  size: number;
  checkout: boolean;
  version?: string;
  isPrimary: boolean;
  checksum?: string | null;
  uploadDate?: string | Date | null;
  downloadUrl?: string | null;
  checkedOutBy?: {
    accountId: string;
    name: string;
  };
  parentFileId?: string; // Links file to its parent for branching
  versionGroupId?: string; // UUID to group related versions of the same document
}

interface CheckoutFileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string | null;
}

export function CheckoutFileModal({
  open,
  onOpenChange,
  documentId,
}: CheckoutFileModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchFiles() {
      if (open && documentId) {
        setIsLoading(true);
        setSelectedFileId(null);
        try {
          const response = await fetch(`/api/documents/${documentId}/files`);
          if (!response.ok) {
            throw new Error("Failed to fetch files");
          }
          const result = await response.json();
          setFiles(result.data || []);
        } catch (error) {
          console.error(error);
          toast.error("Could not load document files.");
          onOpenChange(false);
        } finally {
          setIsLoading(false);
        }
      }
    }

    fetchFiles();
  }, [open, documentId, onOpenChange]);

  const handleConfirm = async () => {
    if (!selectedFileId || !documentId) return;

    const selectedFile = files.find((f) => f.id === selectedFileId);
    if (!selectedFile) return;

    // Debug logging
    console.log("DEBUG: In handleConfirm");
    console.log("selectedFile.checkout:", selectedFile.checkout);
    console.log(
      "selectedFile.checkedOutBy?.accountId:",
      selectedFile.checkedOutBy?.accountId
    );
    console.log("user?.accountId:", user?.accountId);
    console.log(
      "Comparison result:",
      selectedFile.checkout &&
        selectedFile.checkedOutBy?.accountId === user?.accountId
    );

    // If file is already checked out by current user, just go to editor
    if (
      selectedFile.checkout &&
      selectedFile.checkedOutBy?.accountId === user?.accountId
    ) {
      onOpenChange(false);
      router.push(
        `/documents/${documentId}?mode=edit&fileId=${selectedFileId}`
      );
      return;
    }

    // If file is available, check it out
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/files/${selectedFileId}/checkout`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to checkout file.");
      }

      toast.success("File checked out successfully!");
      onOpenChange(false);
      router.push(
        `/documents/${documentId}?mode=edit&fileId=${selectedFileId}`
      );
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedFile = files.find((f) => f.id === selectedFileId);

  // Debug logging for button text
  console.log("DEBUG: In button text logic");
  console.log("selectedFile:", selectedFile);
  console.log("user:", user);
  if (selectedFile) {
    console.log("selectedFile.checkout:", selectedFile.checkout);
    console.log(
      "selectedFile.checkedOutBy?.accountId:",
      selectedFile.checkedOutBy?.accountId
    );
    console.log("user?.accountId:", user?.accountId);
  }

  let buttonText = "Select a file";
  let buttonDisabled = true;

  if (selectedFile) {
    if (selectedFile.checkout) {
      if (selectedFile.checkedOutBy?.accountId === user?.accountId) {
        buttonText = "Edit PDF";
        buttonDisabled = false;
      } else {
        buttonText = "Locked by another user";
        buttonDisabled = true;
      }
    } else {
      buttonText = "Checkout & Edit";
      buttonDisabled = false;
    }
  }

  const handleUploadFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || !documentId || !selectedFileId) return;

    // Validate file type - only allow PDF files
    if (!selectedFile.type.includes("pdf")) {
      toast.error("Only PDF files are allowed for versioning.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append("files", selectedFile);
      if (selectedFileId) {
        // Find the selected file in the files array to get its versionGroupId
        const selectedFileObj = files.find(f => f.id === selectedFileId);
        if (selectedFileObj) {
          // If the selected file already has a versionGroupId, use it
          if (selectedFileObj.versionGroupId) {
            formData.append("versionGroupId", selectedFileObj.versionGroupId);
          } else {
            // Otherwise, use the selectedFileId as the versionGroupId to create a new group
            formData.append("versionGroupId", selectedFileId);
          }
        }
      }

      // Upload the file to the document as a new version
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

      const result = await response.json();

      setUploadProgress(100);
      toast.success(
        `New branch of "${selectedFile.name}" uploaded successfully!`
      );

      // Refresh the file list
      if (open && documentId) {
        const response = await fetch(`/api/documents/${documentId}/files`);
        if (response.ok) {
          const data = await response.json();
          setFiles(data.data || []);
        }
      }

      // Reset file input
      if (event.target) {
        event.target.value = "";
      }
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Checkout a File</DialogTitle>
          <DialogDescription>
            Select a file to check out for editing or upload a new version of an
            existing file. This will lock the file for other users.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              {/* Group files by versionGroupId for document versioning */}
              <ScrollArea className="h-48 pr-4">
                <RadioGroup
                  value={selectedFileId ?? ""}
                  onValueChange={setSelectedFileId}
                >
                  <div className="space-y-2">
                    {files.length > 0 ? (
                      (() => {
                        // Group files by versionGroupId to organize document versions
                        const filesByGroup = new Map<string, DocumentFile[]>();

                        files.forEach(file => {
                          const groupId = file.versionGroupId || file.id; // Use versionGroupId if available, else file id

                          if (!filesByGroup.has(groupId)) {
                            filesByGroup.set(groupId, []);
                          }
                          filesByGroup.get(groupId)!.push(file);
                        });

                        return (
                          <>
                            {Array.from(filesByGroup.entries()).map(([groupId, groupFiles]) => {
                              // Display each group as a collapsible section
                              return (
                                <div key={groupId} className="space-y-1 border rounded-lg p-2">
                                  {/* Group header */}
                                  <div className="font-medium text-sm pb-1 border-b">
                                    {groupFiles.length > 1
                                      ? `Version Group: ${groupFiles.length} Versions`
                                      : `Document: ${groupFiles[0].name.substring(0, 30)}${groupFiles[0].name.length > 30 ? '...' : ''}`}
                                    {groupId !== groupFiles[0].id && (
                                      <span className="text-xs text-muted-foreground ml-2">
                                        (ID: {groupId.substring(0, 8)}...)
                                      </span>
                                    )}
                                  </div>

                                  {/* List all files in this group */}
                                  <div className="ml-2 space-y-1">
                                    {groupFiles.map((file) => {
                                      const isLocked = file.checkout;
                                      const isLockedByMe = isLocked && file.checkedOutBy?.accountId === user?.accountId;
                                      const isLockedByOther = isLocked && !isLockedByMe;

                                      return (
                                        <Label
                                          key={file.id}
                                          htmlFor={file.id}
                                          className={`flex items-center justify-between rounded-md border p-2 ${
                                            isLockedByOther
                                              ? "cursor-not-allowed bg-muted/30 text-muted-foreground"
                                              : "cursor-pointer hover:bg-accent"
                                          }`}
                                        >
                                          <div className="flex items-center space-x-3">
                                            <RadioGroupItem value={file.id} id={file.id} />
                                            <div className="flex flex-col">
                                              <span className="text-sm">{file.name}</span>
                                              {file.version && (
                                                <span className="text-xs text-muted-foreground">
                                                  Version {file.version}
                                                </span>
                                              )}
                                              {file.versionGroupId && (
                                                <span className="text-xs text-muted-foreground">
                                                  Group: {file.versionGroupId.substring(0, 8)}...
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          {isLockedByMe ? (
                                            <Badge
                                              variant="default"
                                              className="flex items-center gap-1 bg-green-600"
                                            >
                                              <UserCheck className="h-3 w-3" />
                                              Locked by you
                                            </Badge>
                                          ) : isLockedByOther ? (
                                            <Badge
                                              variant="destructive"
                                              className="flex items-center gap-1"
                                            >
                                              <Lock className="h-3 w-3" />
                                              Locked by{" "}
                                              {file.checkedOutBy?.name || "another user"}
                                            </Badge>
                                          ) : (
                                            <Badge
                                              variant="secondary"
                                              className="flex items-center gap-1"
                                            >
                                              <Unlock className="h-3 w-3" />
                                              Available
                                            </Badge>
                                          )}
                                        </Label>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        );
                      })()
                    ) : (
                      <p className="text-center text-muted-foreground">
                        No files found in this document.
                      </p>
                    )}
                  </div>
                </RadioGroup>
              </ScrollArea>

              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload New Version
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Select a file to upload a new branch/version. The system will
                  create a new branch linked to the selected file.
                </p>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleVersionUploadClick}
                  disabled={isUploading || !selectedFileId}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading... {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {selectedFileId
                        ? "Upload Branch/Version"
                        : "Select a file first"}
                    </>
                  )}
                </Button>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf"
                  onChange={handleUploadFile}
                  className="hidden"
                />

                {isUploading && (
                  <div className="mt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={buttonDisabled || isProcessing || isUploading}
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
