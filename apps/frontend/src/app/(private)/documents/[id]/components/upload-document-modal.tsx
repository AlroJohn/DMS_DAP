"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useDocumentTypes } from "@/hooks/use-document-types";
import {
  useFileIntegrity,
  detectPotentialCorruption,
} from "@/hooks/useFileIntegrity";
import { useSocket } from "@/components/providers/providers";
import {
  Upload,
  FileText,
  X,
  Plus,
  Loader2,
  Shield,
  FileSearch,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface UploadDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadDocumentModal({
  open,
  onOpenChange,
}: UploadDocumentModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedClassification, setSelectedClassification] =
    useState("simple");
  const [enableOcr, setEnableOcr] = useState(false);
  const [enableEncryption, setEnableEncryption] = useState(true);

  // Get socket instance for real-time updates
  const { socket } = useSocket();

  // Fetch data from database
  const { documentTypes, isLoading: typesLoading } = useDocumentTypes();

  // File integrity checking
  const { verifyFile } = useFileIntegrity({});

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = Array.from(event.target.files || []);
    const validFiles: File[] = [];

    for (const file of selectedFiles) {
      // Only accept PDF files
      if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
        toast.error(`File "${file.name}" is not a PDF file`);
        continue;
      }

      // Check for potential corruption
      const corruption = detectPotentialCorruption(file);
      if (corruption.isCorrupted) {
        toast.error(`File "${file.name}" rejected`, {
          description: corruption.reason,
        });
        continue;
      }

      // Verify file integrity
      try {
        const integrity = await verifyFile(file);
        if (integrity.status === "corrupted") {
          toast.error(`File "${file.name}" appears corrupted`, {
            description: "File integrity check failed",
          });
          continue;
        }

        // File is valid
        validFiles.push(file);
        toast.success(`File "${file.name}" validated`, {
          description: "File passed integrity checks",
        });
      } catch (error) {
        console.error("Error validating file:", error);
        toast.warning(`Could not validate "${file.name}"`, {
          description: "File will be uploaded without validation",
        });
        validFiles.push(file);
      }
    }

    setFiles((prev) => [...prev, ...validFiles]);
    event.target.value = ""; // Reset input to allow re-selecting same file
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 || !title || !selectedType) {
      toast.error(
        "Please complete all required fields and select at least one file."
      );
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      // Create the initial document with the first file
      const formData = new FormData();
      formData.append("document_name", title);
      formData.append("description", description || "");
      formData.append("classification", selectedClassification);
      formData.append("type_id", selectedType);
      formData.append("origin", "internal");
      formData.append("file", files[0]); // Only send the first file to create the document

      setUploadProgress(20);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: { message: "Failed to create document" } }));
        throw new Error(
          errorData.error?.message || "Failed to create document"
        );
      }

      const result = await response.json();
      const createdDocument = result.data ?? result;
      const documentId = createdDocument.document_id;

      // If there are additional files, upload them to the created document
      if (files.length > 1) {
        for (let i = 1; i < files.length; i++) {
          setUploadProgress(Math.floor(30 + (i / files.length) * 50)); // Distribute progress among additional files

          const additionalFileForm = new FormData();
          additionalFileForm.append("files", files[i]); // Use the 'files' field for additional uploads

          // Generate a unique versionGroupId for each file during bulk upload
          const versionGroupId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
          additionalFileForm.append("versionGroupId", versionGroupId);

          const additionalResponse = await fetch(`/api/documents/${documentId}/files`, {
            method: "POST",
            credentials: "include",
            body: additionalFileForm,
          });

          if (!additionalResponse.ok) {
            const errorData = await additionalResponse.json().catch(() => ({ error: { message: "Failed to upload additional file" } }));
            throw new Error(
              errorData.error?.message || `Failed to upload additional file: ${files[i].name}`
            );
          }
        }
      }

      setUploadProgress(100);
      toast.success(`Document "${title}" created with ${files.length} file${files.length > 1 ? 's' : ''}!`);

      // Emit document upload completed event via Socket.IO
      if (socket) {
        socket.emit("documentUploadCompleted", {
          documentId: createdDocument.document_id,
          documentTitle: createdDocument.title,
        });
      }

      // Reset form and close modal
      setFiles([]);
      setTitle("");
      setDescription("");
      setSelectedType("");
      setSelectedClassification("simple");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Upload failed", {
        description:
          error?.message || "An error occurred while uploading the document.",
      });
    } finally {
      setTimeout(() => setUploadProgress(0), 300);
      setUploading(false);
    }
  };

  // Listen for real-time progress updates if available
  useEffect(() => {
    if (socket && uploading) {
      socket.on("documentUploadProgress", (data) => {
        if (data.documentId) {
          setUploadProgress(data.progress);
          toast.info(`Upload progress: ${data.progress}%`);
        }
      });

      return () => {
        socket.off("documentUploadProgress");
      };
    }
  }, [socket, uploading]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 max-h-[70vh] overflow-y-auto"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6 lg:col-span-2">
              <Card className="border shadow-sm rounded-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Upload className="h-4 w-4 text-primary" />
                    File Upload
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="border-2 border-dashed border-muted-foreground/40 rounded-xl p-6 text-center transition-all hover:border-primary/50 hover:bg-primary/5"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add(
                        "border-primary",
                        "bg-primary/10"
                      );
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove(
                        "border-primary",
                        "bg-primary/10"
                      );
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove(
                        "border-primary",
                        "bg-primary/10"
                      );
                      const dt = e.dataTransfer;
                      const newFiles = Array.from(dt.files || []);
                      // Handle dropped files similar to input change
                      const validFiles: File[] = [];
                      for (const file of newFiles) {
                        // Only accept PDF files
                        if (file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) {
                          validFiles.push(file);
                        } else {
                          toast.error(`File "${file.name}" is not a PDF file`);
                        }
                      }
                      setFiles((prev) => [...prev, ...validFiles]);
                    }}
                  >
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-lg font-medium mb-2">
                      Drop files here or click to browse
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Supports: PDF files only
                    </p>
                    <input
                      type="file"
                      multiple
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload-modal"
                    />
                    <Button
                      asChild
                      variant="secondary"
                      className="px-4 py-2 text-sm"
                    >
                      <label
                        htmlFor="file-upload-modal"
                        className="cursor-pointer"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Select Files
                      </label>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {files.length > 0 && (
                <Card className="border shadow-sm rounded-xl">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Selected Files ({files.length})
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="text-base py-1 px-3"
                      >
                        {files.length} file{files.length !== 1 ? "s" : ""}{" "}
                        selected
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-xl bg-card hover:bg-accent/20 transition-all border-muted-foreground/20 group"
                        >
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="flex-shrink-0">
                              <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                                <FileText className="h-5 w-5 text-blue-600" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm sm:text-base truncate">
                                {file.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  {formatFileSize(file.size)}
                                </p>
                                <div className="flex items-center gap-1">
                                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                  <span className="text-xs text-green-600">
                                    Validated
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-3 opacity-0 sm:opacity-100 group-hover:opacity-100 transition-opacity w-full sm:w-auto">
                            <Badge
                              variant="outline"
                              className="text-xs sm:text-sm py-1 px-2 border-green-500 text-green-700 bg-green-50"
                            >
                              Validated
                            </Badge>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => removeFile(index)}
                              className="h-8 w-8 border-destructive/50 hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {uploading && (
                <Card className="border shadow-sm rounded-xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      Upload Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-base mb-2">
                        <span className="font-medium">Uploading files...</span>
                        <span className="font-medium text-primary">
                          {uploadProgress}%
                        </span>
                      </div>
                      <Progress value={uploadProgress} className="h-3" />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Preparing upload</span>
                        <span>Finalizing</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-sm text-green-600">
                          Secure transfer active
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card className="border shadow-sm rounded-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Document Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">
                      Document Title *
                    </Label>
                    <Input
                      id="title"
                      placeholder="Enter document title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className={`${
                        title ? "border-primary/50 ring-1 ring-primary/20" : ""
                      } text-base transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary`}
                    />
                    {title && (
                      <p className="text-xs text-muted-foreground">
                        Document title is required
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="description"
                      className="text-sm font-medium"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Enter description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="text-base transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type" className="text-sm font-medium">
                        Document Type *
                      </Label>
                      <Select
                        disabled={typesLoading}
                        value={selectedType}
                        onValueChange={setSelectedType}
                      >
                        <SelectTrigger
                          className={`${
                            selectedType
                              ? "border-primary/50 ring-1 ring-primary/20"
                              : ""
                          } text-base transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary`}
                        >
                          <SelectValue
                            placeholder={
                              typesLoading ? "Loading..." : "Select type"
                            }
                          />
                          {typesLoading && (
                            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {documentTypes.map((type) => (
                            <SelectItem
                              key={type.type_id}
                              value={type.type_id}
                              className="text-base py-2 px-3"
                            >
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="classification"
                      className="text-sm font-medium"
                    >
                      Classification
                    </Label>
                    <Select
                      value={selectedClassification}
                      onValueChange={setSelectedClassification}
                    >
                      <SelectTrigger
                        className={`${
                          selectedClassification
                            ? "border-primary/50 ring-1 ring-primary/20"
                            : ""
                        } text-base transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary`}
                      >
                        <SelectValue placeholder="Select classification" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="simple"
                          className="text-base py-2 px-3"
                        >
                          Simple
                        </SelectItem>
                        <SelectItem
                          value="complex"
                          className="text-base py-2 px-3"
                        >
                          Complex
                        </SelectItem>
                        <SelectItem
                          value="highly_technical"
                          className="text-base py-2 px-3"
                        >
                          Highly Technical
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border shadow-sm rounded-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="h-4 w-4 text-primary" />
                    Processing Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* OCR Toggle */}
                  <div className="flex flex-col sm:flex-row items-start gap-3 space-x-0 sm:space-x-4">
                    <Checkbox
                      id="enable-ocr-modal"
                      checked={enableOcr}
                      onCheckedChange={(checked) =>
                        setEnableOcr(checked as boolean)
                      }
                      className="mt-1 h-4 w-4"
                    />
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor="enable-ocr-modal"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                      >
                        <FileSearch className="h-4 w-4 text-primary" />
                        Enable OCR Processing
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Convert scanned documents to searchable text.
                        Recommended for images and non-searchable PDFs.
                      </p>
                    </div>
                  </div>

                  {/* Encryption Toggle */}
                  <div className="flex flex-col sm:flex-row items-start gap-3 space-x-0 sm:space-x-4">
                    <Checkbox
                      id="enable-encryption-modal"
                      checked={enableEncryption}
                      onCheckedChange={(checked) =>
                        setEnableEncryption(checked as boolean)
                      }
                      className="mt-1 h-4 w-4"
                    />
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor="enable-encryption-modal"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                      >
                        <Shield className="h-4 w-4 text-primary" />
                        Encrypt at Rest
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Encrypt files using AES-256 encryption. Files are always
                        encrypted in transit.
                      </p>
                      {enableEncryption && (
                        <Badge
                          variant="secondary"
                          className="mt-2 flex items-center w-fit py-1 px-2 text-xs"
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          AES-256 Encryption Enabled
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Info Banner */}
                  <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs sm:text-sm text-blue-900">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-blue-900">
                        File Validation Active
                      </p>
                      <p className="text-blue-700 mt-1">
                        All files are automatically checked for corruption and
                        integrity before upload.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                files.length === 0 || uploading || !title || !selectedType
              }
            >
              {uploading ? "Uploading..." : "Upload Documents"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
