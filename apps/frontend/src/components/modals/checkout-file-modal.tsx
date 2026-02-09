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
  onSuccess?: () => void;
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
  onSuccess,
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
      onSuccess?.();
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

            <ScrollArea className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4">
                  {fileItems.length > 0 ? (
                    fileItems.map((item) => {
                      if (item.type === "version-group") {
                        return (
                          <div
                            key={item.id}
                            className="group flex aspect-4/5 cursor-pointer flex-col items-center justify-between rounded-xl border bg-card p-4 shadow-sm transition-all hover:bg-accent/50 hover:shadow-md"
                            onClick={() => handleVersionGroupClick(item)}
                          >
                            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4">
                              <div className="rounded-full bg-blue-100/50 p-4 ring-1 ring-blue-100 dark:bg-blue-900/20 dark:ring-blue-900">
                                <Folder className="h-10 w-10 text-blue-500 fill-blue-500/20" />
                              </div>
                              <div className="space-y-1 text-center">
                                <p
                                  className="line-clamp-2 text-sm font-medium leading-tight"
                                  title={item.name}
                                >
                                  {item.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Version Group
                                </p>
                              </div>
                            </div>
                            <div className="w-full border-t pt-3 text-center text-xs text-muted-foreground">
                              {item.children?.length} versions
                            </div>
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
                        const isSelected = isSignatureAction
                          ? selectedFileIds.includes(file.id)
                          : selectedFileId === file.id;

                        return (
                          <div
                            key={file.id}
                            className={`group relative flex aspect-4/5 flex-col rounded-xl border p-3 shadow-sm transition-all ${
                              !isSelectable
                                ? "cursor-not-allowed bg-muted/20 opacity-60"
                                : "cursor-pointer bg-card hover:bg-accent/5 hover:shadow-md"
                            } ${
                              isSelected
                                ? "bg-primary/5 ring-2 ring-primary border-primary/50"
                                : "hover:border-primary/50"
                            }`}
                            onClick={() =>
                              isSignatureAction
                                ? isSelectable && handleSignatureSelection(file)
                                : !isLockedByOther && handleFileClick(file)
                            }
                          >
                            {/* Selection Checkbox (Signature Mode) */}
                            {isSignatureAction && (
                              <div
                                className="absolute left-3 top-3 z-20"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  disabled={!isSelectable}
                                  onCheckedChange={() =>
                                    handleSignatureSelection(file)
                                  }
                                />
                              </div>
                            )}

                            {/* Status Indicators (Top Right) */}
                            <div className="absolute right-2 top-2 z-10 flex flex-col gap-1">
                              {isLockedByMe && (
                                <div className="flex flex-col gap-1">
                                  <Badge
                                    variant="default"
                                    className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 p-0 shadow-sm"
                                    title="Locked by you"
                                  >
                                    <UserCheck className="h-3 w-3" />
                                  </Badge>
                                  <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-6 w-6 rounded-full bg-white opacity-0 shadow-sm transition-opacity hover:bg-white/90 group-hover:opacity-100 dark:bg-gray-800"
                                    onClick={(e) =>
                                      handleUnlockFile(file.id, e)
                                    }
                                    title="Unlock"
                                  >
                                    <Unlock className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                              {isLockedByOther ? (
                                <Badge
                                  variant="destructive"
                                  className="flex h-6 w-6 items-center justify-center rounded-full p-0 shadow-sm"
                                  title={`Locked by ${file.checkedOutBy?.name}`}
                                >
                                  <Lock className="h-3 w-3" />
                                </Badge>
                              ) : (
                                !isLockedByMe &&
                                !isLocked && (
                                  <div className="opacity-0 transition-opacity group-hover:opacity-100">
                                    {/* Placeholder for potential actions like delete on hover for available files */}
                                  </div>
                                )
                              )}
                            </div>

                            {/* Main Content */}
                            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-2">
                              <div
                                className={`rounded-xl p-4 ring-1 ${isSelected ? "bg-primary/10 ring-primary/20" : "bg-muted/30 ring-border"}`}
                              >
                                <File
                                  className={`h-10 w-10 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                                />
                              </div>
                            </div>

                            {/* Footer Info */}
                            <div className="w-full space-y-1 text-center">
                              <p
                                className="truncate px-1 text-sm font-medium"
                                title={file.name}
                              >
                                {file.name}
                              </p>
                              <div className="flex h-4 items-center justify-center gap-2 text-xs text-muted-foreground">
                                <span>
                                  {file.version ? `v${file.version}` : "v1.0"}
                                </span>
                                {currentPath.length > 0 &&
                                  !isLockedByOther &&
                                  !file.isPrimary && (
                                    <div
                                      className="absolute bottom-3 right-3 opacity-0 transition-opacity group-hover:opacity-100"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                        onClick={() => setFileToDelete(file)}
                                        title="Delete Version"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                              </div>
                            </div>

                            {/* Locked By Badge at bottom if needed */}
                            {isLockedByOther && (
                              <div className="absolute bottom-14 left-1/2 w-[90%] -translate-x-1/2 text-center">
                                <span className="inline-block max-w-full truncate rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive">
                                  Locked:{" "}
                                  {file.checkedOutBy?.name?.split(" ")[0]}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })
                  ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <div className="mb-4 rounded-full bg-muted/50 p-4">
                        <File className="h-8 w-8 opacity-50" />
                      </div>
                      <p>No files found in this location.</p>
                    </div>
                  )}
                </div>
              )}
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
