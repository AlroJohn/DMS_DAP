"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DocumentPreviewModal } from "@/components/modals/document-preview-modal";
import { useDocumentDetail } from "@/hooks/use-document-detail";
import { useDocumentFiles } from "@/hooks/use-document-files";
import {
  AlertCircle,
  ArrowLeft,
  Download,
  Eye,
  FileText,
  ChevronsUpDown,
} from "lucide-react";

export default function ViewDocumentPage() {
  const routeParams = useParams<{ id: string }>();
  const documentId = routeParams.id as string;

  const router = useRouter();
  const searchParams = useSearchParams();
  const { document, isLoading, error } = useDocumentDetail(documentId);
  const {
    files,
    isLoading: filesLoading,
    error: filesError,
  } = useDocumentFiles(documentId);

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const fileIdFromUrl = searchParams?.get("fileId") || null;

  const title = useMemo(() => {
    return (
      document?.title ||
      document?.detail?.document_name ||
      document?.detail?.document_code ||
      "Document"
    );
  }, [document]);

  const previewFile = useMemo(() => {
    if (!files || files.length === 0) return null;

    if (fileIdFromUrl) {
      const matchByUrl = files.find((file) => file.id === fileIdFromUrl);
      if (matchByUrl) return matchByUrl;
    }

    const placeholderPattern = /placeholder/i;
    const primaryCandidate = files.find(
      (file) => !placeholderPattern.test(file.name)
    );
    const fallback = primaryCandidate || files[0];

    if (!activeFileId) {
      return fallback;
    }

    const matchByActive = files.find((file) => file.id === activeFileId);
    return matchByActive || fallback;
  }, [files, fileIdFromUrl, activeFileId]);

  const previewMime = (previewFile?.type || "").toLowerCase();
  const isPreviewSupported =
    Boolean(previewFile) &&
    (previewMime.includes("pdf") || previewMime.startsWith("image/"));
  const isPlaceholderPreview = previewFile
    ? /placeholder/i.test(previewFile.name)
    : false;

  const documentIdForRoutes = document?.document_id || documentId;
  const cacheBuster = Date.now();
  const previewBaseUrl = previewFile
    ? `/api/documents/${documentIdForRoutes}/files/${previewFile.id}/stream?v=${cacheBuster}`
    : null;
  const downloadUrl = previewFile
    ? `/api/documents/${documentIdForRoutes}/files/${previewFile.id}/stream?download=1&v=${cacheBuster}`
    : null;

  const handleDownloadClick = () => {
    if (!downloadUrl) return;
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  };

  const handlePreviewClick = () => {
    if (!previewBaseUrl || !isPreviewSupported) return;
    setIsPreviewModalOpen(true);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || Number.isNaN(bytes)) return "-";
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-1 md:p-2 lg:p-4 max-w-[95%] mx-auto w-full pt-2 pb-4">
        <Skeleton className="h-12 w-2/3" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <div className="space-y-3">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-1 md:p-2 lg:p-4 max-w-[95%] mx-auto w-full pt-2 pb-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load document</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-1 md:p-2 lg:p-4 max-w-[95%] mx-auto w-full pt-2 pb-4">
        <Alert>
          <AlertTitle>Document not found</AlertTitle>
          <AlertDescription>
            The requested document could not be located.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4 mx-auto w-full h-[calc(100vh-100px)] flex-1">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">{title}</h1>
          {/* <p className="text-muted-foreground">
            Document ID: {document.document_id || documentId}
          </p> */}
        </div>
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0 items-center">
          {files && files.length > 0 && (
            <div className="flex items-center gap-2 mr-2">
              <span className="text-xs text-muted-foreground">
                File version:
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded border bg-background px-2 text-xs flex justify-between items-center w-48"
                  >
                    <span className="truncate max-w-[100px]">
                      {previewFile?.name ||
                        `File ${
                          files.findIndex((f) => f.id === previewFile?.id) + 1
                        }`}
                      {previewFile?.isPrimary && " (Primary)"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 max-h-64 overflow-y-auto"
                >
                  {files.map((file, index) => (
                    <DropdownMenuItem
                      key={file.id}
                      onSelect={() => setActiveFileId(file.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium truncate max-w-[160px]">
                          {file.name || `File ${index + 1}`}
                        </span>
                        <div className="flex items-center gap-1">
                          {file.isPrimary && (
                            <Badge variant="secondary" className="h-4 text-xs">
                              Primary
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            ({file.type || "Unknown type"})
                          </span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadClick}
            disabled={!previewBaseUrl || filesLoading}
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button
            variant="outline"
            onClick={handlePreviewClick}
            disabled={!isPreviewSupported || filesLoading}
            className="max-w-[150px] md:max-w-[200px] truncate"
          >
            <Eye className="mr-2 h-4 w-4" />
            <span className="truncate">Open Preview</span>
          </Button>
        </div>
      </div>

      <Card className="h-full w-full flex flex-col flex-1 min-h-[calc(100vh-200px)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            <FileText className="h-5 w-5" />
            Document Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          {filesLoading ? (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-muted bg-muted/10">
              <Skeleton className="h-8 w-8" />
            </div>
          ) : previewFile && isPreviewSupported && previewBaseUrl ? (
            <div
              className="flex-1 flex items-center justify-center overflow-hidden rounded-lg border bg-background cursor-pointer"
              onClick={handlePreviewClick}
            >
              {previewMime.startsWith("image/") ? (
                <img
                  src={previewBaseUrl}
                  alt={previewFile.name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="w-full max-w-3xl aspect-[8.5/11]">
                  <iframe
                    src={`${previewBaseUrl}#toolbar=0&status=0&view=Fit&pagemode=none&zoom=140`}
                    title={previewFile.name}
                    className="w-full h-full"
                    style={{ border: 0 }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div
              className="flex-1 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/10 p-6 text-center cursor-pointer"
              onClick={handlePreviewClick}
            >
              <FileText className="h-12 w-12 text-muted-foreground" />
              {previewFile ? (
                <>
                  <p className="text-muted-foreground text-center">
                    {isPlaceholderPreview
                      ? "A placeholder document is currently attached. Upload the original file to enable preview."
                      : "Preview is not available for this file type."}
                  </p>
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    Use the download action to open the file locally.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    No files uploaded for this document yet.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Upload a file to enable previews and DocOnChain signing.
                  </p>
                </>
              )}
            </div>
          )}

          {filesError && (
            <p className="mt-3 text-sm text-destructive">{filesError}</p>
          )}

          <div className="overflow-y-auto max-h-40 mt-4 space-y-2 flex-shrink-0">
            {!filesLoading && files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Files</p>
                <div className="space-y-1">
                  {files.map((file) => {
                    const isPlaceholder = /placeholder/i.test(file.name);
                    return (
                      <div
                        key={file.id}
                        className="flex flex-col gap-2 rounded-lg border p-2"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.type || "Unknown type"} •{" "}
                            {formatFileSize(file.size)}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {file.isPrimary && (
                              <Badge variant="default">Primary</Badge>
                            )}
                            {isPlaceholder && (
                              <Badge variant="secondary">Placeholder</Badge>
                            )}
                            {file.version && (
                              <Badge variant="outline">v{file.version}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <DocumentPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        previewUrl={previewBaseUrl || ""}
        fileName={previewFile?.name || "Document"}
        previewMime={previewMime}
        onDownload={handleDownloadClick}
      />
    </div>
  );
}
