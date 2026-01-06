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
import { toast } from "sonner";
import {
  Edit,
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
  MoreHorizontal
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

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

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'version-group';
  data: DocumentFile | null;
  children?: DocumentFile[];
}

interface CheckoutFileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string | null;
  action?: "edit" | "signature";
}

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPath, setCurrentPath] = useState<{ id: string; name: string }[]>([]);

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
          const fetchedFiles = result.data || [];
          setFiles(fetchedFiles);

          // Group files by versionGroupId to create a folder-like structure
          const filesByGroup = new Map<string, DocumentFile[]>();
          const ungroupedFiles: DocumentFile[] = [];

          fetchedFiles.forEach(file => {
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

          // Create file items
          const items: FileItem[] = [];

          // Add version groups as folders
          filesByGroup.forEach((groupFiles, groupId) => {
            items.push({
              id: groupId,
              name: groupFiles.length > 1
                ? `${groupFiles[0].name.substring(0, 30)}${groupFiles[0].name.length > 30 ? '...' : ''} (${groupFiles.length} versions)`
                : groupFiles[0].name.substring(0, 30) + (groupFiles[0].name.length > 30 ? '...' : ''),
              type: 'version-group',
              data: null,
              children: groupFiles
            });
          });

          // Add ungrouped files
          ungroupedFiles.forEach(file => {
            items.push({
              id: file.id,
              name: file.name,
              type: 'file',
              data: file
            });
          });

          setFileItems(items);
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

    if (action === "signature") {
      onOpenChange(false);
      router.push(
        `/documents/${documentId}?mode=signature&fileId=${selectedFileId}`
      );
      return;
    }

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

  const handleFileClick = (file: DocumentFile) => {
    setSelectedFileId(file.id);
  };

  const handleVersionGroupClick = (item: FileItem) => {
    if (item.children && item.children.length > 0) {
      setCurrentPath(prev => [...prev, { id: item.id, name: item.name }]);
      setFileItems(item.children.map(child => ({
        id: child.id,
        name: `${child.name} (v${child.version || '1.0'})`,
        type: 'file',
        data: child
      })));
    }
  };

  const handleBack = () => {
    if (currentPath.length > 0) {
      const newPath = currentPath.slice(0, -1);
      setCurrentPath(newPath);

      if (newPath.length === 0) {
        // Go back to root
        const filesByGroup = new Map<string, DocumentFile[]>();
        const ungroupedFiles: DocumentFile[] = [];

        files.forEach(file => {
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

        // Add version groups as folders
        filesByGroup.forEach((groupFiles, groupId) => {
          items.push({
            id: groupId,
            name: groupFiles.length > 1
              ? `${groupFiles[0].name.substring(0, 30)}${groupFiles[0].name.length > 30 ? '...' : ''} (${groupFiles.length} versions)`
              : groupFiles[0].name.substring(0, 30) + (groupFiles[0].name.length > 30 ? '...' : ''),
            type: 'version-group',
            data: null,
            children: groupFiles
          });
        });

        // Add ungrouped files
        ungroupedFiles.forEach(file => {
          items.push({
            id: file.id,
            name: file.name,
            type: 'file',
            data: file
          });
        });

        setFileItems(items);
      }
    }
  };

  const handleHome = () => {
    setCurrentPath([]);
    setSelectedFileId(null);

    // Recreate the root file items
    const filesByGroup = new Map<string, DocumentFile[]>();
    const ungroupedFiles: DocumentFile[] = [];

    files.forEach(file => {
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

    // Add version groups as folders
    filesByGroup.forEach((groupFiles, groupId) => {
      items.push({
        id: groupId,
        name: groupFiles.length > 1
          ? `${groupFiles[0].name.substring(0, 30)}${groupFiles[0].name.length > 30 ? '...' : ''} (${groupFiles.length} versions)`
          : groupFiles[0].name.substring(0, 30) + (groupFiles[0].name.length > 30 ? '...' : ''),
        type: 'version-group',
        data: null,
        children: groupFiles
      });
    });

    // Add ungrouped files
    ungroupedFiles.forEach(file => {
      items.push({
        id: file.id,
        name: file.name,
        type: 'file',
        data: file
      });
    });

    setFileItems(items);
  };

  const selectedFile = files.find((f) => f.id === selectedFileId);

  let buttonText = "Select a file";
  let buttonDisabled = true;

  if (selectedFile) {
    if (selectedFile.checkout) {
      if (selectedFile.checkedOutBy?.accountId === user?.accountId) {
        buttonText = action === "signature" ? "Open Signature Mode" : "Edit PDF";
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

  const handleUploadFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || !documentId) return;

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

      // Use the current path's folder ID (version group ID) for versioning
      if (currentPath.length > 0) {
        // The current path's last item is the version group we're in
        const currentGroupId = currentPath[currentPath.length - 1].id;
        if (currentGroupId) {
          formData.append("versionGroupId", currentGroupId);
        }
      } else if (selectedFileId) {
        // If not in a version group, use the selected file's version group if available
        const selectedFileObj = files.find(f => f.id === selectedFileId);
        if (selectedFileObj) {
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
        `New version uploaded successfully!`
      );

      // Refresh the file list
      if (open && documentId) {
        const response = await fetch(`/api/documents/${documentId}/files`);
        if (response.ok) {
          const data = await response.json();
          setFiles(data.data || []);

          // Update file items to reflect the new upload
          const filesByGroup = new Map<string, DocumentFile[]>();
          const ungroupedFiles: DocumentFile[] = [];

          data.data.forEach(file => {
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

          // Add version groups as folders
          filesByGroup.forEach((groupFiles, groupId) => {
            items.push({
              id: groupId,
              name: groupFiles.length > 1
                ? `${groupFiles[0].name.substring(0, 30)}${groupFiles[0].name.length > 30 ? '...' : ''} (${groupFiles.length} versions)`
                : groupFiles[0].name.substring(0, 30) + (groupFiles[0].name.length > 30 ? '...' : ''),
              type: 'version-group',
              data: null,
              children: groupFiles
            });
          });

          // Add ungrouped files
          ungroupedFiles.forEach(file => {
            items.push({
              id: file.id,
              name: file.name,
              type: 'file',
              data: file
            });
          });

          setFileItems(items);
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
              : "Select a file to check out for editing or upload a new version of an existing file. This will lock the file for other users."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 py-4 space-y-4">
          {/* Breadcrumb */}
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

            {currentPath.map((path, index) => (
              <div key={path.id} className="flex items-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-auto"
                  onClick={() => {
                    // Navigate back to this path level
                    const newPath = currentPath.slice(0, index + 1);
                    setCurrentPath(newPath);

                    // For simplicity, we'll just go back to root for now
                    // In a real implementation, you'd need to reconstruct the state
                    handleHome();
                  }}
                >
                  {path.name}
                </Button>
              </div>
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              disabled={currentPath.length === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="text-sm text-muted-foreground">
              {fileItems.length} items
            </div>
          </div>

          {/* File List */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : fileItems.length > 0 ? (
                fileItems.map((item) => {
                  if (item.type === 'version-group') {
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
                            <div className="text-xs text-muted-foreground">Version Group</div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    );
                  } else if (item.data) {
                    const file = item.data;
                    const isLocked = file.checkout;
                    const isLockedByMe = isLocked && file.checkedOutBy?.accountId === user?.accountId;
                    const isLockedByOther = isLocked && !isLockedByMe;

                    return (
                      <div
                        key={file.id}
                        className={`flex items-center justify-between rounded-md border p-3 ${
                          isLockedByOther
                            ? "cursor-not-allowed bg-muted/30 text-muted-foreground"
                            : "cursor-pointer hover:bg-accent"
                        } ${selectedFileId === file.id ? "bg-accent border-primary" : ""}`}
                        onClick={() => !isLockedByOther && handleFileClick(file)}
                      >
                        <div className="flex items-center space-x-3">
                          <File className="h-5 w-5 text-green-500" />
                          <div>
                            <div className="font-medium">{file.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {file.version ? `Version ${file.version}` : 'No version'}
                            </div>
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
                            Locked by {file.checkedOutBy?.name || "another user"}
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

          {/* Show upload option only when inside a version group */}
          {currentPath.length > 0 && (
            <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium text-blue-900">Upload New Version</h3>
              </div>
              <p className="text-sm text-blue-700 mb-3">
                Add a new version to this version group. Select a file to upload a new version.
              </p>

              <Button
                type="button"
                variant="outline"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
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
                    Select File to Upload
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
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
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
