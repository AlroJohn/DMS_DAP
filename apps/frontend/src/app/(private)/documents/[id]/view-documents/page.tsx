"use client";

import { useMemo, useState, useEffect } from "react";
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
import { useBreadcrumb } from "@/context/breadcrumb-context";
import { useDocumentSidebarCounts } from "@/hooks/use-document-sidebar-counts";
import { FullPageLoader } from "@/components/reuseable/full-page-loader";
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
  const { setOverride, clearOverride } = useBreadcrumb();
  const { setCounts } = useDocumentSidebarCounts();

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

  // Update page title for better UX
  useEffect(() => {
    if (title && title !== "Document" && document) {
      document.title = `${title} - View Document`;
    }
  }, [title, document]);

  useEffect(() => {
    setCounts({ pendingDocuments: document ? 1 : 0 });
  }, [document, setCounts]);

  // Update breadcrumb with document name
  useEffect(() => {
    if (document && documentId) {
      const displayName = document?.detail?.document_code || document?.title || document?.detail?.document_name || "Document";
      setOverride(documentId, displayName);
    }
    
    return () => {
      if (documentId) {
        clearOverride(documentId);
      }
    };
  }, [document, documentId]);
   

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
      <FullPageLoader message="Loading document" />
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
    <div className="flex flex-col gap-4 p-4 w-full max-w-full overflow-x-hidden">
      {/* Header Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight truncate">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Document Code: {document?.detail?.document_code || documentId}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {files && files.length > 0 && (
            <>
              <span className="text-sm font-medium whitespace-nowrap">File version:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 min-w-[180px] max-w-[250px]"
                  >
                    <span className="truncate flex-1 text-left">
                      {previewFile?.name || `File ${files.findIndex((f) => f.id === previewFile?.id) + 1}`}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
                  {files.map((file, index) => (
                    <DropdownMenuItem
                      key={file.id}
                      onSelect={() => setActiveFileId(file.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col gap-1 w-full">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate flex-1">
                            {file.name || `File ${index + 1}`}
                          </span>
                          {file.isPrimary && (
                            <Badge variant="default" className="h-5 text-xs">Primary</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {file.type || "Unknown"} • {formatFileSize(file.size)}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadClick}
            disabled={!previewBaseUrl || filesLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handlePreviewClick}
            disabled={!isPreviewSupported || filesLoading}
          >
            <Eye className="h-4 w-4 mr-2" />
            Open Preview
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Preview Section */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              Document Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {filesLoading ? (
              <div className="flex items-center justify-center flex-1 min-h-[700px] rounded-lg border bg-muted/10">
                <Skeleton className="h-8 w-8" />
              </div>
            ) : previewFile && isPreviewSupported && previewBaseUrl ? (
              <div
                className="relative w-full flex-1 min-h-[700px] rounded-lg border bg-muted/5 overflow-hidden cursor-pointer"
                onClick={handlePreviewClick}
              >
                {previewMime.startsWith("image/") ? (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <img
                      src={previewBaseUrl}
                      alt={previewFile.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <iframe
                    src={`${previewBaseUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                    title={previewFile.name}
                    className="w-full h-full"
                    style={{ border: 0 }}
                  />
                )}
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center gap-4 flex-1 min-h-[700px] rounded-lg border-2 border-dashed bg-muted/10 p-8 text-center cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={handlePreviewClick}
              >
                <FileText className="h-16 w-16 text-muted-foreground" />
                {previewFile ? (
                  <>
                    <div>
                      <p className="font-medium text-muted-foreground">
                        {isPlaceholderPreview
                          ? "Placeholder Document"
                          : "Preview Not Available"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {isPlaceholderPreview
                          ? "Upload the original file to enable preview"
                          : "This file type cannot be previewed in the browser"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click download to open the file locally
                    </p>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="font-medium text-muted-foreground">No Files Available</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Upload a file to enable preview and signing
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {filesError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{filesError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Files Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Attached Files</CardTitle>
            </CardHeader>
            <CardContent>
              {filesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : files && files.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {files.map((file) => {
                    const isPlaceholder = /placeholder/i.test(file.name);
                    const isActive = file.id === previewFile?.id;
                    return (
                      <div
                        key={file.id}
                        className={`flex flex-col gap-2 rounded-lg border p-3 transition-colors cursor-pointer hover:bg-muted/50 ${
                          isActive ? "bg-muted border-primary" : ""
                        }`}
                        onClick={() => setActiveFileId(file.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium line-clamp-2 flex-1">
                            {file.name}
                          </p>
                          {file.isPrimary && (
                            <Badge variant="default" className="flex-shrink-0 h-5">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {file.type || "Unknown type"}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </span>
                          <div className="flex gap-1">
                            {isPlaceholder && (
                              <Badge variant="secondary" className="h-5 text-xs">
                                Placeholder
                              </Badge>
                            )}
                            {file.version && (
                              <Badge variant="outline" className="h-5 text-xs">
                                v{file.version}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No files attached yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
