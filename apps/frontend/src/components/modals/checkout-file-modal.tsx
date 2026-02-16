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
  RefreshCcw,
  CheckCheck,
  Eraser,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { UploadVersionModal } from "./upload-version-modal";
import { FullPageLoader } from "@/components/reuseable/full-page-loader";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

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
  documentGroupId?: string | null;
  documentGroupName?: string | null;
}

interface FileItem {
  id: string;
  name: string;
  type: "file" | "version-group" | "document-group";
  data: DocumentFile | null;
  children?: DocumentFile[];
  childItems?: FileItem[];
}

interface CheckoutFileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string | null;
  action?: "edit" | "signature";
  onSuccess?: () => void;
}

const groupFilesToItems = (filesToGroup: DocumentFile[]): FileItem[] => {
  // First level: Group by documentGroupId
  const filesByDocGroup = new Map<string, DocumentFile[]>();
  const ungroupedByDocGroup: DocumentFile[] = [];

  filesToGroup.forEach((file) => {
    if (file.documentGroupId) {
      if (!filesByDocGroup.has(file.documentGroupId)) {
        filesByDocGroup.set(file.documentGroupId, []);
      }
      filesByDocGroup.get(file.documentGroupId)!.push(file);
    } else {
      ungroupedByDocGroup.push(file);
    }
  });

  // Helper: Group files by versionGroupId (second level)
  const groupByVersionGroup = (files: DocumentFile[]): FileItem[] => {
    const filesByVersion = new Map<string, DocumentFile[]>();
    const ungroupedFiles: DocumentFile[] = [];

    files.forEach((file) => {
      const groupId = file.versionGroupId || file.id;
      if (file.versionGroupId) {
        if (!filesByVersion.has(groupId)) {
          filesByVersion.set(groupId, []);
        }
        filesByVersion.get(groupId)!.push(file);
      } else {
        ungroupedFiles.push(file);
      }
    });

    const items: FileItem[] = [];

    filesByVersion.forEach((groupFiles, groupId) => {
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

  const items: FileItem[] = [];

  // Create document group items
  filesByDocGroup.forEach((groupFiles, docGroupId) => {
    const groupName = groupFiles[0]?.documentGroupName || `Group ${docGroupId.substring(0, 8)}`;
    const childItems = groupByVersionGroup(groupFiles);
    items.push({
      id: docGroupId,
      name: groupName,
      type: "document-group",
      data: null,
      childItems,
    });
  });

  // Add ungrouped files (grouped by version)
  const ungroupedItems = groupByVersionGroup(ungroupedByDocGroup);
  items.push(...ungroupedItems);

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
  const [isNavigating, setIsNavigating] = useState(false);
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
      setIsNavigating(true);
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
      setIsNavigating(true);
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
      setIsNavigating(true);
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

  // Get all selectable file IDs from a document group
  const getSelectableFileIdsFromDocumentGroup = (item: FileItem): string[] => {
    const fileIds: string[] = [];
    if (item.childItems) {
      item.childItems.forEach((child) => {
        if (child.type === "version-group" && child.children) {
          child.children.forEach((file) => {
            if (isSelectableForSignature(file)) {
              fileIds.push(file.id);
            }
          });
        } else if (child.type === "file" && child.data) {
          if (isSelectableForSignature(child.data)) {
            fileIds.push(child.data.id);
          }
        }
      });
    }
    return fileIds;
  };

  // Get all selectable file IDs from a version group
  const getSelectableFileIdsFromVersionGroup = (item: FileItem): string[] => {
    const fileIds: string[] = [];
    if (item.children) {
      item.children.forEach((file) => {
        if (isSelectableForSignature(file)) {
          fileIds.push(file.id);
        }
      });
    }
    return fileIds;
  };

  // Check if all selectable files in a group are selected
  const isDocumentGroupFullySelected = (item: FileItem): boolean => {
    const selectableIds = getSelectableFileIdsFromDocumentGroup(item);
    if (selectableIds.length === 0) return false;
    return selectableIds.every((id) => selectedFileIds.includes(id));
  };

  const isDocumentGroupPartiallySelected = (item: FileItem): boolean => {
    const selectableIds = getSelectableFileIdsFromDocumentGroup(item);
    if (selectableIds.length === 0) return false;
    const selectedInGroup = selectableIds.filter((id) => selectedFileIds.includes(id));
    return selectedInGroup.length > 0 && selectedInGroup.length < selectableIds.length;
  };

  const isVersionGroupFullySelected = (item: FileItem): boolean => {
    const selectableIds = getSelectableFileIdsFromVersionGroup(item);
    if (selectableIds.length === 0) return false;
    return selectableIds.every((id) => selectedFileIds.includes(id));
  };

  const isVersionGroupPartiallySelected = (item: FileItem): boolean => {
    const selectableIds = getSelectableFileIdsFromVersionGroup(item);
    if (selectableIds.length === 0) return false;
    const selectedInGroup = selectableIds.filter((id) => selectedFileIds.includes(id));
    return selectedInGroup.length > 0 && selectedInGroup.length < selectableIds.length;
  };

  // Toggle selection of all files in a document group
  const handleDocumentGroupSelection = (item: FileItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const selectableIds = getSelectableFileIdsFromDocumentGroup(item);
    if (selectableIds.length === 0) return;

    const allSelected = isDocumentGroupFullySelected(item);
    if (allSelected) {
      // Deselect all files in this group
      setSelectedFileIds((prev) => prev.filter((id) => !selectableIds.includes(id)));
    } else {
      // Select all files in this group
      setSelectedFileIds((prev) => {
        const newIds = new Set([...prev, ...selectableIds]);
        return Array.from(newIds);
      });
    }
  };

  // Toggle selection of all files in a version group
  const handleVersionGroupSelection = (item: FileItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const selectableIds = getSelectableFileIdsFromVersionGroup(item);
    if (selectableIds.length === 0) return;

    const allSelected = isVersionGroupFullySelected(item);
    if (allSelected) {
      // Deselect all files in this group
      setSelectedFileIds((prev) => prev.filter((id) => !selectableIds.includes(id)));
    } else {
      // Select all files in this group
      setSelectedFileIds((prev) => {
        const newIds = new Set([...prev, ...selectableIds]);
        return Array.from(newIds);
      });
    }
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

  const handleDocumentGroupClick = (item: FileItem) => {
    if (item.childItems && item.childItems.length > 0) {
      setCurrentPath((prev) => [...prev, { id: item.id, name: item.name }]);
      setFileItems(item.childItems);
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
      {isNavigating && <FullPageLoader message="Opening document" />}
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
            <div className="flex flex-row justify-between items-center">
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

              <div className="flex gap-4 items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchFiles}
                      disabled={isProcessing}
                      className="justify-center"
                    >
                      <RefreshCcw />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh files</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllSignatureFiles}
                      disabled={
                        !isSignatureAction ||
                        !selectableSignatureFileIds.length ||
                        isProcessing
                      }
                      className="justify-center text-xs w-fit"
                    >
                      <CheckCheck />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Select all PDF/s</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSignatureSelection}
                      disabled={
                        !isSignatureAction ||
                        !selectedFileIds.length ||
                        isProcessing
                      }
                      className="justify-center w-fit border border-black"
                    >
                      <Eraser />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clear all selected</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <ScrollArea className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div>
                  <div className="hidden md:grid grid-cols-[32px_1.6fr_0.6fr_0.6fr_0.6fr] gap-3 text-xs uppercase text-muted-foreground px-2 pb-2">
                    <span />
                    <span>Name</span>
                    <span>Version</span>
                    <span>Status</span>
                    <span className="text-right">Actions</span>
                  </div>
                  <div className="space-y-2">
                    {fileItems.length > 0 ? (
                      fileItems.map((item) => {
                        if (item.type === "document-group") {
                          const totalFiles = item.childItems?.reduce((sum, child) => {
                            if (child.type === "version-group") {
                              return sum + (child.children?.length || 0);
                            }
                            return sum + (child.data ? 1 : 0);
                          }, 0) || 0;
                          const selectableCount = getSelectableFileIdsFromDocumentGroup(item).length;
                          const isFullySelected = isDocumentGroupFullySelected(item);
                          const isPartiallySelected = isDocumentGroupPartiallySelected(item);
                          return (
                            <div
                              key={item.id}
                              className={`grid grid-cols-[32px_1.6fr_0.6fr_0.6fr_0.6fr] items-center gap-3 rounded-lg border px-2 py-2 text-sm transition-colors cursor-pointer ${
                                isFullySelected
                                  ? "bg-primary/15 border-primary/50"
                                  : isPartiallySelected
                                    ? "bg-primary/8 border-primary/40"
                                    : "bg-primary/5 border-primary/30 hover:border-primary/50 hover:bg-primary/10"
                              }`}
                              onClick={() => handleDocumentGroupClick(item)}
                              role="button"
                              tabIndex={0}
                            >
                              <div onClick={(e) => e.stopPropagation()}>
                                {isSignatureAction ? (
                                  <Checkbox
                                    checked={isFullySelected}
                                    ref={(el) => {
                                      if (el && isPartiallySelected) {
                                        (el as any).indeterminate = true;
                                      }
                                    }}
                                    disabled={selectableCount === 0}
                                    onCheckedChange={() => handleDocumentGroupSelection(item)}
                                    className="data-[state=indeterminate]:bg-primary/50"
                                  />
                                ) : (
                                  <Folder className="h-5 w-5 text-primary" />
                                )}
                              </div>
                              <div className="min-w-0 flex items-center gap-2">
                                {isSignatureAction && (
                                  <Folder className="h-4 w-4 text-primary flex-shrink-0" />
                                )}
                                <div>
                                  <p
                                    className="truncate font-medium"
                                    title={item.name}
                                  >
                                    {item.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Document Group
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {totalFiles} file{totalFiles !== 1 ? "s" : ""}
                              </span>
                              <Badge variant="default" className="w-fit">
                                Group
                              </Badge>
                              <span className="text-right text-xs text-muted-foreground">
                                Open
                              </span>
                            </div>
                          );
                        }

                        if (item.type === "version-group") {
                          const selectableCount = getSelectableFileIdsFromVersionGroup(item).length;
                          const isFullySelected = isVersionGroupFullySelected(item);
                          const isPartiallySelected = isVersionGroupPartiallySelected(item);
                          return (
                            <div
                              key={item.id}
                              className={`grid grid-cols-[32px_1.6fr_0.6fr_0.6fr_0.6fr] items-center gap-3 rounded-lg border px-2 py-2 text-sm transition-colors cursor-pointer ${
                                isFullySelected
                                  ? "bg-blue-500/15 border-blue-500/50"
                                  : isPartiallySelected
                                    ? "bg-blue-500/8 border-blue-500/40"
                                    : "bg-card hover:border-primary/50 hover:bg-accent/40"
                              }`}
                              onClick={() => handleVersionGroupClick(item)}
                              role="button"
                              tabIndex={0}
                            >
                              <div onClick={(e) => e.stopPropagation()}>
                                {isSignatureAction ? (
                                  <Checkbox
                                    checked={isFullySelected}
                                    ref={(el) => {
                                      if (el && isPartiallySelected) {
                                        (el as any).indeterminate = true;
                                      }
                                    }}
                                    disabled={selectableCount === 0}
                                    onCheckedChange={() => handleVersionGroupSelection(item)}
                                    className="data-[state=indeterminate]:bg-blue-500/50"
                                  />
                                ) : (
                                  <Folder className="h-5 w-5 text-blue-500" />
                                )}
                              </div>
                              <div className="min-w-0 flex items-center gap-2">
                                {isSignatureAction && (
                                  <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                )}
                                <div>
                                  <p
                                    className="truncate font-medium"
                                    title={item.name}
                                  >
                                    {item.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Version Group
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {item.children?.length || 0} file{(item.children?.length || 0) !== 1 ? "s" : ""}
                              </span>
                              <Badge variant="outline" className="w-fit">
                                Versions
                              </Badge>
                              <span className="text-right text-xs text-muted-foreground">
                                Open
                              </span>
                            </div>
                          );
                        }

                        if (item.data) {
                          const file = item.data;
                          const isLocked = file.checkout;
                          const isLockedByMe =
                            isLocked &&
                            file.checkedOutBy?.accountId === user?.accountId;
                          const isLockedByOther = isLocked && !isLockedByMe;
                          const isSelectable =
                            !isSignatureAction ||
                            isSelectableForSignature(file);
                          const isSelected = isSignatureAction
                            ? selectedFileIds.includes(file.id)
                            : selectedFileId === file.id;

                          return (
                            <div
                              key={file.id}
                              className={`grid grid-cols-[32px_1.6fr_0.6fr_0.6fr_0.6fr] items-center gap-3 rounded-lg border px-2 py-2 text-sm transition-colors ${
                                !isSelectable
                                  ? "cursor-not-allowed bg-muted/20 opacity-60"
                                  : "cursor-pointer bg-card hover:border-primary/50 hover:bg-accent/40"
                              } ${isSelected ? "border-primary/60 bg-primary/5" : ""}`}
                              onClick={() =>
                                isSignatureAction
                                  ? isSelectable &&
                                    handleSignatureSelection(file)
                                  : !isLockedByOther && handleFileClick(file)
                              }
                            >
                              <div onClick={(e) => e.stopPropagation()}>
                                {isSignatureAction ? (
                                  <Checkbox
                                    checked={isSelected}
                                    disabled={!isSelectable}
                                    onCheckedChange={() =>
                                      handleSignatureSelection(file)
                                    }
                                  />
                                ) : (
                                  <File className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p
                                  className="truncate font-medium"
                                  title={file.name}
                                >
                                  {file.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {file.type || "Unknown type"}
                                </p>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {file.version ? `v${file.version}` : "v1.0"}
                              </span>
                              <div className="text-xs text-muted-foreground">
                                {isLockedByOther ? (
                                  <Badge variant="destructive">Locked</Badge>
                                ) : isLockedByMe ? (
                                  <Badge variant="default">Checked out</Badge>
                                ) : (
                                  <Badge variant="outline">Available</Badge>
                                )}
                              </div>
                              <div className="flex items-center justify-end gap-2">
                                {isLockedByMe && (
                                  <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) =>
                                      handleUnlockFile(file.id, e)
                                    }
                                    title="Unlock"
                                  >
                                    <Unlock className="h-4 w-4" />
                                  </Button>
                                )}
                                {currentPath.length > 0 &&
                                  !isLockedByOther &&
                                  !file.isPrimary && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFileToDelete(file);
                                      }}
                                      title="Delete Version"
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
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <div className="mb-4 rounded-full bg-muted/50 p-4">
                          <File className="h-8 w-8 opacity-50" />
                        </div>
                        <p>No files found in this location.</p>
                      </div>
                    )}
                  </div>
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
