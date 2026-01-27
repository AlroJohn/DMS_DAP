"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2,
  Lock,
  Unlock,
  UserCheck,
  Upload,
  ChevronLeft,
  ChevronRight,
  Folder,
  File,
  Home,
  Trash2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { UploadVersionModal } from "./upload-version-modal";

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
  parentFileId?: string;
  versionGroupId?: string;
}

interface FileItem {
  id: string;
  name: string;
  type: "file" | "version-group";
  data: DocumentFile | null;
  children?: DocumentFile[];
}

interface CheckoutFileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string | null;
  action?: "edit" | "signature";
}

const groupFilesToItems = (filesToGroup: DocumentFile[]): FileItem[] => {
  const filesByGroup = new Map<string, DocumentFile[]>();
  const ungroupedFiles: DocumentFile[] = [];

  filesToGroup.forEach((file) => {
    const groupId = file.versionGroupId || file.id;
    if (file.versionGroupId) {
      if (!filesByGroup.has(groupId)) {
        filesByGroup.set(groupId, []);
      }
      filesByGroup.get(groupId)!.push(file);
    } else {
      ungroupedFiles.push(file);
    }
  });

  const items: FileItem[] = [];

  filesByGroup.forEach((groupFiles, groupId) => {
    items.push({
      id: groupId,
      name:
        groupFiles.length > 1
          ? `${groupFiles[0].name.substring(0, 30)}${
              groupFiles[0].name.length > 30 ? "..." : ""
            } (${groupFiles.length} versions)`
          : groupFiles[0].name.substring(0, 30) +
            (groupFiles[0].name.length > 30 ? "..." : ""),
      type: "version-group",
      data: null,
      children: groupFiles.sort(
        (a, b) =>
          new Date(b.uploadDate as string).getTime() -
          new Date(a.uploadDate as string).getTime(),
      ),
    });
  });

  ungroupedFiles.forEach((file) => {
    items.push({
      id: file.id,
      name: file.name,
      type: "file",
      data: file,
    });
  });

  return items;
};

export function CheckoutFileModal({
  open,
  onOpenChange,
  documentId,
  action = "edit",
}: CheckoutFileModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<DocumentFile | null>(null);
  const [currentPath, setCurrentPath] = useState<
    { id: string; name: string }[]
  >([]);
  const prevSelectedFileIdsRef = useRef<string[]>([]);

  const isSignatureAction = action === "signature";

  const isPdfFile = (file?: DocumentFile | null) => {
    if (!file) return false;
    const type = (file.type || "").toLowerCase();
    const name = (file.name || "").toLowerCase();
    return type.includes("pdf") || name.endsWith(".pdf");
  };

  const isSelectableForSignature = (file: DocumentFile) => {
    const isLockedByOther =
      file.checkout && file.checkedOutBy?.accountId !== user?.accountId;
    return isPdfFile(file) && !isLockedByOther;
  };

  const fetchFiles = useCallback(async () => {
    if (!documentId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/files`);
      if (!response.ok) throw new Error("Failed to fetch files");
      const result = (await response.json()) as { data?: DocumentFile[] };
      const fetchedFiles = result.data ?? [];
      setFiles(fetchedFiles);
      setFileItems(groupFilesToItems(fetchedFiles));
      setCurrentPath([]);
      setSelectedFileId(null);
      setSelectedFileIds([]);
    } catch (error) {
      console.error(error);
      toast.error("Could not load document files.");
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (open) {
      fetchFiles();
    }
  }, [open, fetchFiles]);

  useEffect(() => {
    if (!isSignatureAction) {
      if (selectedFileIds.length) {
        setSelectedFileIds([]);
      }
      return;
    }

    // Check if selectedFileIds actually changed
    const idsChanged =
      prevSelectedFileIdsRef.current.length !== selectedFileIds.length ||
      prevSelectedFileIdsRef.current.some((id, i) => id !== selectedFileIds[i]);

    if (!idsChanged) return;

    prevSelectedFileIdsRef.current = selectedFileIds;

    // Only update selectedFileId if needed to avoid infinite loop
    if (!selectedFileIds.length) {
      if (selectedFileId !== null) {
        setSelectedFileId(null);
      }
      if (selectedFileId !== null) {
        setSelectedFileId(null);
      }
      return;
    }
    if (!selectedFileId || !selectedFileIds.includes(selectedFileId)) {
      setSelectedFileId(selectedFileIds[0]);
    }
  }, [isSignatureAction, selectedFileIds, selectedFileId]);

  const handleConfirm = async () => {
    if (!documentId) return;
    if (action === "signature") {
      const signatureTargets = selectedFileIds.length
        ? selectedFileIds
        : selectedFileId
          ? [selectedFileId]
          : [];
      if (!signatureTargets.length) return;
      const primaryFileId = signatureTargets[0];
      onOpenChange(false);
      const params = new URLSearchParams();
      params.set("mode", "signature");
      params.set("fileId", primaryFileId);
      params.set("fileIds", signatureTargets.join(","));
      router.push(`/documents/${documentId}?${params.toString()}`);
      return;
    }

    if (!selectedFileId) return;
    const selectedFile = files.find((f) => f.id === selectedFileId);
    if (!selectedFile) return;

    if (
      selectedFile.checkout &&
      selectedFile.checkedOutBy?.accountId === user?.accountId
    ) {
      // File is already checked out by the current user, just navigate to edit
      onOpenChange(false);
      router.push(
        `/documents/${documentId}?mode=edit&fileId=${selectedFileId}`,
      );
      return;
    }

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
      // Update local state to reflect the checkout
      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.id === selectedFileId
            ? {
                ...file,
                checkout: true,
                checkedOutBy: {
                  accountId: user?.accountId || "",
                  name: user?.name || "",
                },
              }
            : file,
        ),
      );
      // Refresh the file list to ensure consistency with server state
      await fetchFiles();
      onOpenChange(false);
      router.push(
        `/documents/${documentId}?mode=edit&fileId=${selectedFileId}`,
      );
    } catch (error: any) {
      toast.error(error.message);
      // Refresh files to ensure UI is consistent with server state
      await fetchFiles();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!documentId) return;

    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    setIsProcessing(true);
    try {
      const response = await fetch(
        `/api/documents/${documentId}/files/${fileId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete file.");
      }

      toast.success("File deleted successfully!");
      fetchFiles();
    } catch (error: any) {
      toast.error("Delete failed", { description: error.message });
    } finally {
      setFileToDelete(null);
      setIsProcessing(false);
    }
  };

  const handleUnlockFile = async (fileId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    if (!documentId) return;

    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    // Verify the file is locked by the current user
    if (!file.checkout || file.checkedOutBy?.accountId !== user?.accountId) {
      toast.error("You can only unlock files that you have checked out.");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/files/${fileId}/checkin`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to unlock file.");
      }

      toast.success("File unlocked successfully!");
      // Explicitly refresh the file list to ensure UI updates properly
      await fetchFiles();
    } catch (error: any) {
      toast.error("Unlock failed", { description: error.message });
      console.error("Unlock error:", error);
      // Refresh files to ensure UI is consistent with server state
      await fetchFiles();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileClick = (file: DocumentFile) => {
    setSelectedFileId(file.id);
  };

  const handleSignatureSelection = (file: DocumentFile) => {
    if (!isSelectableForSignature(file)) return;
    setSelectedFileIds((prev) => {
      const isSelected = prev.includes(file.id);
      if (isSelected) {
        return prev.filter((id) => id !== file.id);
      }
      return [...prev, file.id];
    });
  };

  const selectableSignatureFileIds = files
    .filter((file) => isSelectableForSignature(file))
    .map((file) => file.id);

  const handleSelectAllSignatureFiles = () => {
    setSelectedFileIds(selectableSignatureFileIds);
  };

  const handleClearSignatureSelection = () => {
    setSelectedFileIds([]);
  };

  const handleVersionGroupClick = (item: FileItem) => {
    if (item.children && item.children.length > 0) {
      setCurrentPath((prev) => [...prev, { id: item.id, name: item.name }]);
      setFileItems(
        item.children.map((child) => ({
          id: child.id,
          name: `${child.name} (v${child.version || "1.0"})`,
          type: "file",
          data: child,
        })),
      );
    }
  };

  const handleBack = () => {
    if (currentPath.length > 0) {
      const newPath = currentPath.slice(0, -1);
      setCurrentPath(newPath);
      if (newPath.length === 0) {
        setFileItems(groupFilesToItems(files));
      }
    }
  };

  const handleHome = () => {
    setCurrentPath([]);
    setSelectedFileId(null);
    setFileItems(groupFilesToItems(files));
  };

  const selectedFile = files.find((f) => f.id === selectedFileId);
  let buttonText = "Select a file";
  let buttonDisabled = true;

  if (isSignatureAction) {
    const selectedCount = selectedFileIds.length;
    if (selectedCount > 0) {
      buttonText = `Open Signature Mode (${selectedCount} file${selectedCount > 1 ? "s" : ""})`;
      buttonDisabled = false;
    } else {
      buttonText = "Select files for signature";
      buttonDisabled = true;
    }
  } else if (selectedFile) {
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {action === "signature"
                ? "Select a File for Signature Placement"
                : "Checkout a File"}
            </DialogTitle>
            <DialogDescription>
              {action === "signature"
                ? "Choose a file to place signature placeholders before releasing or signing."
                : "Select a file to check out for editing or upload a new version."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col flex-1 py-4 space-y-4 min-h-0">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-auto"
                onClick={handleHome}
              >
                <Home className="h-4 w-4 mr-1" />
                Home
              </Button>
              {currentPath.map((path) => (
                <div key={path.id} className="flex items-center">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">
                    {path.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                disabled={currentPath.length === 0 || isProcessing}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchFiles}
                disabled={isProcessing}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 mr-2"
                >
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                  <path d="M21 3v5h-5"></path>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                  <path d="M8 16H3v5"></path>
                </svg>
                Refresh
              </Button>
              {isSignatureAction && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    Selected {selectedFileIds.length} of{" "}
                    {selectableSignatureFileIds.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllSignatureFiles}
                    disabled={
                      !selectableSignatureFileIds.length || isProcessing
                    }
                  >
                    Select all PDFs
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSignatureSelection}
                    disabled={!selectedFileIds.length || isProcessing}
                  >
                    Clear
                  </Button>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                {fileItems.length} items
              </div>
            </div>

            <ScrollArea className="flex-1 pr-4 overflow-y-auto">
              <div className="space-y-2">
                {isLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : fileItems.length > 0 ? (
                  fileItems.map((item) => {
                    if (item.type === "version-group") {
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-md border p-3 hover:bg-accent cursor-pointer"
                          onClick={() => handleVersionGroupClick(item)}
                        >
                          <div className="flex items-center space-x-3">
                            <Folder className="h-5 w-5 text-blue-500" />
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Version Group
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      );
                    } else if (item.data) {
                      const file = item.data;
                      const isLocked = file.checkout;
                      const isLockedByMe =
                        isLocked &&
                        file.checkedOutBy?.accountId === user?.accountId;
                      const isLockedByOther = isLocked && !isLockedByMe;
                      const isSelectable =
                        !isSignatureAction || isSelectableForSignature(file);
                      const isSelected =
                        isSignatureAction && selectedFileIds.includes(file.id);
                      return (
                        <div
                          key={file.id}
                          className={`flex items-center justify-between rounded-md border p-3 group ${
                            !isSelectable
                              ? "cursor-not-allowed bg-muted/30 text-muted-foreground"
                              : "cursor-pointer hover:bg-accent"
                          } ${
                            (!isSignatureAction &&
                              selectedFileId === file.id) ||
                            isSelected
                              ? "bg-accent border-primary"
                              : ""
                          }`}
                          onClick={() =>
                            isSignatureAction
                              ? isSelectable && handleSignatureSelection(file)
                              : !isLockedByOther && handleFileClick(file)
                          }
                        >
                          <div className="flex items-center space-x-3 overflow-hidden">
                            {isSignatureAction && (
                              <Checkbox
                                checked={isSelected}
                                disabled={!isSelectable}
                                onClick={(event) => event.stopPropagation()}
                                onCheckedChange={() =>
                                  handleSignatureSelection(file)
                                }
                              />
                            )}
                            <File className="h-5 w-5 text-green-500 flex-shrink-0" />
                            <div className="overflow-hidden">
                              <div
                                className={`font-medium  ${file.name.length > 10 ? "truncate" : ""}`}
                              >
                                {file.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {file.version
                                  ? `Version ${file.version}`
                                  : "No version"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 pl-2">
                            {isLockedByMe ? (
                              <div className="flex items-center gap-1">
                                <Badge
                                  variant="default"
                                  className="flex items-center gap-1 bg-green-600"
                                >
                                  <UserCheck className="h-3 w-3" />
                                  Locked by you
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2"
                                  onClick={(event) =>
                                    handleUnlockFile(file.id, event)
                                  }
                                  disabled={isProcessing}
                                  title="Unlock file"
                                >
                                  <Lock className="h-3 w-3 mr-1" />
                                  Unlock
                                </Button>
                              </div>
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
                            {currentPath.length > 0 &&
                              !isLockedByOther &&
                              !file.isPrimary && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFileToDelete(file);
                                  }}
                                  disabled={isProcessing}
                                  title="Delete file"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No files found in this document.
                  </div>
                )}
              </div>
            </ScrollArea>

            {currentPath.length > 0 && (
              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUploadModalOpen(true)}
                  disabled={isProcessing}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload New Version
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Close
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={buttonDisabled || isProcessing}
            >
              {isProcessing && selectedFileId && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {buttonText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {documentId && (
        <UploadVersionModal
          open={isUploadModalOpen}
          onOpenChange={setIsUploadModalOpen}
          documentId={documentId}
          versionGroupId={
            currentPath.length > 0
              ? currentPath[currentPath.length - 1].id
              : null
          }
          onUploadComplete={() => {
            setIsUploadModalOpen(false);
            fetchFiles();
          }}
        />
      )}

      <AlertDialog
        open={!!fileToDelete}
        onOpenChange={(open) => !open && setFileToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              file <span className="font-bold">{fileToDelete?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => fileToDelete && handleDeleteFile(fileToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Yes, delete file"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
