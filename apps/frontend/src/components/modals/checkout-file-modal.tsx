"use client";

import { useState, useEffect, useCallback } from "react";
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
          new Date(a.uploadDate as string).getTime()
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
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<DocumentFile | null>(null);
  const [currentPath, setCurrentPath] = useState<
    { id: string; name: string }[]
  >([]);

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
    } catch (error) {
      console.error(error);
      toast.error("Could not load document files.");
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  }, [documentId, onOpenChange]);

  useEffect(() => {
    if (open) {
      fetchFiles();
    }
  }, [open, fetchFiles]);

  const handleConfirm = async () => {
    if (!selectedFileId || !documentId) return;
    const selectedFile = files.find((f) => f.id === selectedFileId);
    if (!selectedFile) return;

    if (action === "signature") {
      onOpenChange(false);
      router.push(
        `/documents/${documentId}?mode=signature&fileId=${selectedFileId}`
      );
      return;
    }

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
        }
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

  const handleFileClick = (file: DocumentFile) => {
    setSelectedFileId(file.id);
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
        }))
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

  if (selectedFile) {
    if (selectedFile.checkout) {
      if (selectedFile.checkedOutBy?.accountId === user?.accountId) {
        buttonText =
          action === "signature" ? "Open Signature Mode" : "Edit PDF";
        buttonDisabled = false;
      } else {
        buttonText = "Locked by another user";
        buttonDisabled = true;
      }
    } else {
      buttonText =
        action === "signature" ? "Open Signature Mode" : "Checkout & Edit";
      buttonDisabled = false;
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
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

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                disabled={currentPath.length === 0 || isProcessing}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
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
                      return (
                        <div
                          key={file.id}
                          className={`flex items-center justify-between rounded-md border p-3 group ${
                            isLockedByOther
                              ? "cursor-not-allowed bg-muted/30 text-muted-foreground"
                              : "cursor-pointer hover:bg-accent"
                          } ${
                            selectedFileId === file.id
                              ? "bg-accent border-primary"
                              : ""
                          }`}
                          onClick={() =>
                            !isLockedByOther && handleFileClick(file)
                          }
                        >
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <File className="h-5 w-5 text-green-500 flex-shrink-0" />
                            <div className="overflow-hidden">
                              <div className="font-medium truncate">
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
              {isProcessing &&
                selectedFileId === files.find((f) => f.id === selectedFileId)?.id && (
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
