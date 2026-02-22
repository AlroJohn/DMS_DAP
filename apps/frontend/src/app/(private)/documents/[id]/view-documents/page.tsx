"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DocumentPreviewModal } from "@/components/modals/document-preview-modal";
import { useDocumentDetail } from "@/hooks/use-document-detail";
import { useDocumentFiles, DocumentFileMetadata } from "@/hooks/use-document-files";
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
  Folder,
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
   

  // Group files by document group name
  const groupedFiles = useMemo(() => {
    if (!files || files.length === 0) return [];

    const groups = new Map<string, DocumentFileMetadata[]>();
    
    files.forEach((file) => {
      const groupName = file.documentGroupName?.trim() || "Ungrouped";
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName)!.push(file);
    });

    // Sort groups: Primary groups first, then alphabetically
    const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
      // "Ungrouped" should be last
      if (a[0] === "Ungrouped") return 1;
      if (b[0] === "Ungrouped") return -1;
      return a[0].localeCompare(b[0]);
    });

    return sortedGroups;
  }, [files]);

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
  const cacheBuster = useMemo(() => Date.now(), [previewFile?.id]);
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

  if (filesLoading) {
    return <FullPageLoader message="Loading document files" />;
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
        <div className="flex items-center gap-2 shrink-0">
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
                    className="h-9 min-w-[12rem] max-w-[20rem] justify-between"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {previewFile?.documentGroupName || "Ungrouped"}
                      </span>
                      <span className="text-muted-foreground">/</span>
                      <span className="truncate font-normal">
                        {previewFile?.name || "Select file"}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80 max-h-96 overflow-y-auto p-0">
                  {groupedFiles.map(([groupName, groupFiles], groupIndex) => (
                    <div key={groupName}>
                      {groupIndex > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 flex items-center gap-2">
                        <Folder className="h-3.5 w-3.5" />
                        {groupName}
                        <Badge variant="secondary" className="ml-auto text-xs h-5">
                          {groupFiles.length}
                        </Badge>
                      </DropdownMenuLabel>
                      {groupFiles.map((file) => (
                        <DropdownMenuItem
                          key={file.id}
                          onSelect={() => setActiveFileId(file.id)}
                          className={`cursor-pointer px-3 py-2.5 mx-1 rounded-sm ${
                            file.id === previewFile?.id ? "bg-accent" : ""
                          }`}
                        >
                          <div className="flex flex-col gap-1 w-full min-w-0">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-medium text-sm truncate flex-1">
                                {file.name}
                              </span>
                              {file.isPrimary && (
                                <Badge variant="default" className="h-5 text-xs shrink-0 bg-green-600 hover:bg-green-600">
                                  Primary
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
                              <span className="truncate">{file.type || "Unknown"}</span>
                              <span>•</span>
                              <span>{formatFileSize(file.size)}</span>
                              {file.version && (
                                <>
                                  <span>•</span>
                                  <Badge variant="outline" className="text-xs h-4 px-1">
                                    v{file.version}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
          <CardHeader className="pb-3 shrink-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              Document Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {filesLoading ? (
              <div className="flex items-center justify-center flex-1 min-h-175 rounded-lg border bg-muted/10">
                <Skeleton className="h-8 w-8" />
              </div>
            ) : previewFile && isPreviewSupported && previewBaseUrl ? (
              <div
                className="relative w-full flex-1 min-h-175 rounded-lg border bg-muted/5 overflow-hidden cursor-pointer"
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
                className="flex flex-col items-center justify-center gap-4 flex-1 min-h-175 rounded-lg border-2 border-dashed bg-muted/10 p-8 text-center cursor-pointer hover:bg-muted/20 transition-colors"
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
              <CardTitle className="text-base flex items-center justify-between">
                <span>Attached Files</span>
                {files && files.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {files.length} file{files.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : files && files.length > 0 ? (
                <div className="space-y-4 max-h-150 overflow-y-auto pr-1">
                  {groupedFiles.map(([groupName, groupFiles]) => (
                    <div key={groupName} className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground px-1">
                        <Folder className="h-4 w-4" />
                        <span>{groupName}</span>
                        <Badge variant="outline" className="text-xs h-5 ml-auto">
                          {groupFiles.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {groupFiles.map((file) => {
                          const isPlaceholder = /placeholder/i.test(file.name);
                          const isActive = file.id === previewFile?.id;
                          return (
                            <div
                              key={file.id}
                              className={`flex flex-col gap-2 rounded-lg border p-3 transition-all cursor-pointer hover:bg-muted/50 hover:shadow-sm ${
                                isActive ? "bg-muted border-primary ring-1 ring-primary/20" : ""
                              }`}
                              onClick={() => setActiveFileId(file.id)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                  <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                  <p className="text-sm font-medium line-clamp-2">
                                    {file.name}
                                  </p>
                                </div>
                                {file.isPrimary && (
                                  <Badge variant="default" className="shrink-0 h-5 text-xs bg-green-600 hover:bg-green-600">
                                    Primary
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center justify-between pl-6">
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
                    </div>
                  ))}
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
