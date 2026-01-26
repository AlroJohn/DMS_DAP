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
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const normalizedApiBaseUrl = apiBaseUrl.replace(/\/$/, "");
  const ocrDefaultEnabled = false;
  const buildApiUrl = (path: string) => {
    if (!normalizedApiBaseUrl) {
      return `/api${path}`;
    }
    if (normalizedApiBaseUrl.endsWith("/api")) {
      return `${normalizedApiBaseUrl}${path}`;
    }
    return `${normalizedApiBaseUrl}/api${path}`;
  };
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedClassification, setSelectedClassification] =
    useState("simple");
  const [selectedOrigin, setSelectedOrigin] = useState("external");
  const [enableOcr, setEnableOcr] = useState(ocrDefaultEnabled);
  const [enableEncryption, setEnableEncryption] = useState(true);
  const maxInlineChecksumMB = 15;

  // Get socket instance for real-time updates
  const { socket } = useSocket();

  // Fetch data from database
  const { documentTypes, isLoading: typesLoading } = useDocumentTypes();

  // File integrity checking
  const { verifyFile } = useFileIntegrity({ maxInlineChecksumMB });

  const validateAndAddFiles = async (incomingFiles: File[]) => {
    if (incomingFiles.length === 0) return;

    const validations = await Promise.all(
      incomingFiles.map(async (file) => {
        if (
          !file.type.includes("pdf") &&
          !file.name.toLowerCase().endsWith(".pdf")
        ) {
          toast.error(`File "${file.name}" is not a PDF file`);
          return null;
        }

        const corruption = detectPotentialCorruption(file);
        if (corruption.isCorrupted) {
          toast.error(`File "${file.name}" rejected`, {
            description: corruption.reason,
          });
          return null;
        }

        try {
          const integrity = await verifyFile(file);
          if (integrity.status === "corrupted") {
            toast.error(`File "${file.name}" appears corrupted`, {
              description: "File integrity check failed",
            });
            return null;
          }

          if (
            integrity.status === "unknown" &&
            integrity.error?.includes("Checksum skipped")
          ) {
            toast.info(`Skipped checksum for "${file.name}"`, {
              description: `Large files over ${maxInlineChecksumMB}MB skip client-side checks.`,
            });
          } else {
            toast.success(`File "${file.name}" validated`, {
              description: "File passed integrity checks",
            });
          }

          return file;
        } catch (error) {
          console.error("Error validating file:", error);
          toast.warning(`Could not validate "${file.name}"`, {
            description: "File will be uploaded without validation",
          });
          return file;
        }
      }),
    );

    const validFiles = validations.filter(
      (file): file is File => file !== null,
    );

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFiles = Array.from(event.target.files || []);
    await validateAndAddFiles(selectedFiles);
    event.target.value = "";
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
        "Please complete all required fields and select at least one file.",
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
      formData.append("origin", selectedOrigin);
      formData.append("enableOcr", String(enableOcr));
      formData.append("file", files[0]); // Only send the first file to create the document

      setUploadProgress(20);

      const response = await fetch(buildApiUrl("/documents/upload"), {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: { message: "Failed to create document" } }));
        throw new Error(
          errorData.error?.message || "Failed to create document",
        );
      }

      const result = await response.json();
      const createdDocument = result.data ?? result;
      const documentId = createdDocument.document_id;

      if (files.length > 1) {
        const additionalFiles = files.slice(1);
        let completed = 0;
        const total = additionalFiles.length;
        setUploadProgress(30);

        const uploads = additionalFiles.map((file) => {
          const additionalFileForm = new FormData();
          additionalFileForm.append("files", file);
          additionalFileForm.append("enableOcr", String(enableOcr));

          const versionGroupId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
            /[xy]/g,
            function (c) {
              const r = (Math.random() * 16) | 0;
              const v = c === "x" ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            },
          );
          additionalFileForm.append("versionGroupId", versionGroupId);

          return fetch(buildApiUrl(`/documents/${documentId}/files`), {
            method: "POST",
            credentials: "include",
            body: additionalFileForm,
          })
            .then(async (additionalResponse) => {
              if (!additionalResponse.ok) {
                const errorData = await additionalResponse.json().catch(() => ({
                  error: { message: "Failed to upload additional file" },
                }));
                throw new Error(
                  errorData.error?.message ||
                    `Failed to upload additional file: ${file.name}`,
                );
              }
            })
            .finally(() => {
              completed += 1;
              const progress = 30 + Math.floor((completed / total) * 60);
              setUploadProgress(progress);
            });
        });
        await Promise.all(uploads);
      }

      setUploadProgress(100);
      toast.success(
        `Document "${title}" created with ${files.length} file${
          files.length > 1 ? "s" : ""
        }!`,
      );
      if (enableOcr) {
        toast.info("OCR processing started", {
          description: "OCR runs in the background after upload.",
        });
      }

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
      <DialogContent className="max-w-xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 max-h-[70vh] overflow-y-auto"
        >
          <div className="w-full grid grid-cols-1 gap-6">
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
                        "bg-primary/10",
                      );
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove(
                        "border-primary",
                        "bg-primary/10",
                      );
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove(
                        "border-primary",
                        "bg-primary/10",
                      );
                      const dt = e.dataTransfer;
                      const newFiles = Array.from(dt.files || []);
                      await validateAndAddFiles(newFiles);
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

            <div className="space-y-6 lg:col-span-2">
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
                    {!title && (
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                          } text-base w-full transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary`}
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
                          } text-base w-full transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary`}
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
                    <div className="space-y-2">
                      <Label htmlFor="origin" className="text-sm font-medium">
                        Origin
                      </Label>
                      <Select
                        value={selectedOrigin}
                        onValueChange={setSelectedOrigin}
                      >
                        <SelectTrigger
                          className={`${
                            selectedOrigin
                              ? "border-primary/50 ring-1 ring-primary/20"
                              : ""
                          } text-base w-full transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary`}
                        >
                          <SelectValue placeholder="Select origin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="internal"
                            className="text-base py-2 px-3"
                          >
                            Internal
                          </SelectItem>
                          <SelectItem
                            value="external"
                            className="text-base py-2 px-3"
                          >
                            External
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm rounded-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileSearch className="h-4 w-4 text-primary" />
                    Additional Options
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enable-ocr"
                      checked={enableOcr}
                      onCheckedChange={(checked) =>
                        setEnableOcr(checked as boolean)
                      }
                    />
                    <label
                      htmlFor="enable-ocr"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Run OCR after upload (background)
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Extracts text from the PDF after upload. OCR runs in the
                    background and will not block document creation.
                  </p>
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
