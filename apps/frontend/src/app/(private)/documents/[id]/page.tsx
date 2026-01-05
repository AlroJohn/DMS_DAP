"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { BlockchainSigningModal } from "@/components/modals/blockchain-signing-modal";
import { DocumentPreviewModal } from "@/components/modals/document-preview-modal";
import { ReleaseDocumentModal } from "@/components/modals/release-document-modal";
import { ShareDocumentModal } from "@/components/modals/share-document-modal";
import { useDocumentDetail } from "@/hooks/use-document-detail";
import { useDocumentFiles } from "@/hooks/use-document-files";
import { toast } from "sonner";
import { EditablePdfViewer } from "./components/editable-pdf-viewer";
import {
  SignaturePdfViewer,
  SignatureBox,
} from "./components/signature-pdf-viewer";
import { SigningPdfViewer } from "./components/signing-pdf-viewer";
import {
  AlertCircle,
  Building,
  Calendar,
  Clock,
  Download,
  Edit,
  ExternalLink,
  Eye,
  FileText,
  GitBranch,
  Hash,
  Loader2,
  Send,
  Share,
  Shield,
  User,
  ArrowLeft,
} from "lucide-react";

const isPdfFile = (file?: { type?: string | null; name?: string | null }) => {
  if (!file) return false;
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return type.includes("pdf") || name.endsWith(".pdf");
};

export default function DocumentDetailPage() {
  const routeParams = useParams<{ id: string }>();
  const documentId = routeParams.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [selectedLeftVersion, setSelectedLeftVersion] = useState<string | null>(null);
  const [selectedRightVersion, setSelectedRightVersion] = useState<string | null>(null);
  const { document, isLoading, error, refetch } = useDocumentDetail(documentId);
  const {
    files,
    isLoading: filesLoading,
    error: filesError,
    refetch: refetchFiles,
  } = useDocumentFiles(documentId);
  const modeParam = searchParams?.get("mode");
  const fileIdFromUrl = searchParams?.get("fileId");
  const [isEditorOpen, setIsEditorOpen] = useState(modeParam === "edit");
  const [isSignatureModeOpen, setIsSignatureModeOpen] = useState(
    modeParam === "signature"
  );
  const [isSigningModeOpen, setIsSigningModeOpen] = useState(
    modeParam === "sign"
  );
  const [isRedirectingToView, setIsRedirectingToView] = useState(false);

  useEffect(() => {
    setIsEditorOpen(modeParam === "edit");
    setIsSignatureModeOpen(modeParam === "signature");
    setIsSigningModeOpen(modeParam === "sign");
  }, [modeParam]);

  // Initialize version comparison selectors when files are loaded
  useEffect(() => {
    if (files && files.length >= 2) {
      // Set default values for version comparison
      if (!selectedLeftVersion && files[0]) {
        setSelectedLeftVersion(files[0].id);
      }
      if (!selectedRightVersion && files[1]) {
        setSelectedRightVersion(files[1].id);
      }
    }
  }, [files, selectedLeftVersion, selectedRightVersion]);

  useEffect(() => {
    router.prefetch(`/documents/${documentId}/view-documents`);
  }, [documentId, router]);

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
    // Prioritize fileId from URL if provided
    if (fileIdFromUrl) {
      const fileById = files.find((file) => file.id === fileIdFromUrl);
      if (fileById) return fileById;
    }
    // Fallback to primary candidate or first file if no specific fileId or it's not found
    const placeholderPattern = /placeholder/i;
    const primaryCandidate = files.find(
      (file) => !placeholderPattern.test(file.name)
    );
    return primaryCandidate || files[0];
  }, [files, fileIdFromUrl]);

  const pdfFiles = useMemo(
    () => files.filter((file) => isPdfFile(file)),
    [files]
  );
  const editableFileFromUrl = useMemo(() => {
    if (fileIdFromUrl) {
      const file = pdfFiles.find((f) => f.id === fileIdFromUrl);
      if (file) return file;
    }
    return null;
  }, [pdfFiles, fileIdFromUrl]);

  const defaultEditableFileId =
    editableFileFromUrl?.id ?? pdfFiles[0]?.id ?? null;
  const hasEditableFile = pdfFiles.length > 0;

  const previewMime = (previewFile?.type || "").toLowerCase();
  const isPreviewSupported =
    Boolean(previewFile) &&
    (previewMime.includes("pdf") || previewMime.startsWith("image/"));
  const isPlaceholderPreview = previewFile
    ? /placeholder/i.test(previewFile.name)
    : false;

  const documentIdForRoutes = document?.document_id || documentId;
  const previewBaseUrl = previewFile
    ? `/api/documents/${documentIdForRoutes}/files/${previewFile.id}/stream`
    : null;
  const downloadUrl = previewBaseUrl ? `${previewBaseUrl}?download=1` : null;

  const blockchainStatus = document?.blockchain?.status ?? null;
  const blockchainRedirectUrl = document?.blockchain?.redirectUrl ?? null;
  const transactionHash = document?.blockchain?.transactionHash ?? null;
  const projectUuid = document?.blockchain?.projectUuid ?? null;

  const canSign = !blockchainStatus || blockchainStatus === "failed";

  const handlePreviewClick = () => {
    if (!previewBaseUrl || !isPreviewSupported) return;
    setIsPreviewModalOpen(true);
  };

  const handleDownloadClick = () => {
    if (!downloadUrl) return;
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  };

  const updateModeQuery = (mode?: "edit" | "signature" | null) => {
    const currentParams = new URLSearchParams(searchParams?.toString() || "");
    if (mode) {
      currentParams.set("mode", mode);
    } else {
      currentParams.delete("mode");
    }
    const nextQuery = currentParams.toString();
    router.replace(
      nextQuery
        ? `/documents/${documentId}?${nextQuery}`
        : `/documents/${documentId}`,
      { scroll: false }
    );
  };

  const updateEditorQuery = (shouldOpen: boolean) => {
    updateModeQuery(shouldOpen ? "edit" : null);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    updateEditorQuery(false);
  };

  const handleEditorSaved = async (newFileId?: string) => {
    const targetFileId =
      newFileId ||
      (files?.length ? files[files.length - 1]?.id : null) ||
      fileIdFromUrl ||
      "";

    setIsRedirectingToView(true);

    // refresh data in background but redirect immediately
    refetchFiles();
    refetch();

    router.replace(
      targetFileId
        ? `/documents/${documentId}/view-documents?fileId=${targetFileId}`
        : `/documents/${documentId}/view-documents`
    );

    setIsEditorOpen(false);
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

  const formatDate = (value?: string | Date | null) => {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  };

  const handleContinueSigning = () => {
    if (blockchainRedirectUrl) {
      window.open(blockchainRedirectUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleShareDocument = async (userIds: string[]) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          userIds,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to share document");
      }

      // Show success toast notification
      toast.success("Document shared successfully!", {
        description: `${userIds.length} user(s) have been granted access to this document.`,
      });

      // Optionally refetch document data to update UI
      refetch();
    } catch (error: any) {
      console.error("Error sharing document:", error);
      // Show error toast notification
      toast.error("Failed to share document", {
        description:
          error.message ||
          "An unexpected error occurred while sharing the document.",
      });
      throw error;
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleCloseSignatureMode = () => {
    setIsSignatureModeOpen(false);
    const currentParams = new URLSearchParams(searchParams?.toString() || "");
    currentParams.delete("mode");
    currentParams.delete("releaseDepartmentId");
    currentParams.delete("releaseActions");
    currentParams.delete("releaseRemarks");
    const nextQuery = currentParams.toString();
    router.replace(
      nextQuery
        ? `/documents/${documentId}?${nextQuery}`
        : `/documents/${documentId}`,
      { scroll: false }
    );
  };

  const handleCloseSigningMode = () => {
    setIsSigningModeOpen(false);
    updateModeQuery(null);
  };

  const handleSigned = () => {
    toast.success("Document signed successfully");
    refetch();
  };

  const releaseWithSignaturesMutation = useMutation({
    mutationFn: async (data: {
      departmentId: string;
      requestActions: string[];
      remarks?: string;
      signatures: {
        document_file_id: string;
        page_number: number;
        x_position: number;
        y_position: number;
        width: number;
        height: number;
      }[];
    }) => {
      const response = await fetch(`/api/documents/${documentId}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          departmentId: data.departmentId,
          requestActions: data.requestActions,
          remarks: data.remarks,
          signatures: data.signatures, // This matches the expected format in the backend
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to release document with signatures."
        );
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Document released with signature requests.");
      refetch();
      handleCloseSignatureMode();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleConfirmSignatures = async ({
    fileId,
    boxes,
  }: {
    fileId: string;
    boxes: SignatureBox[];
  }) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    const departmentId = params.get("releaseDepartmentId");
    const requestActionsRaw = params.get("releaseActions");
    const remarks = params.get("releaseRemarks") || undefined;

    const RENDER_SCALE = 1.4;

    // Prepare signature placeholders data
    const signaturePlaceholders = boxes.map((box) => ({
      document_file_id: fileId,
      page_number: box.pageNumber,
      x_position: box.x / RENDER_SCALE, // Adjust for scale
      y_position: box.y / RENDER_SCALE,
      width: box.width / RENDER_SCALE,
      height: box.height / RENDER_SCALE,
    }));

    if (!departmentId || !requestActionsRaw) {
      if (signaturePlaceholders.length === 0) {
        toast.error("Add at least one signature placeholder.");
        return;
      }

      try {
        await Promise.all(
          signaturePlaceholders.map(async (placeholder) => {
            const response = await fetch(
              `/api/document-signatures/documents/${documentIdForRoutes}/signature-placeholders`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(placeholder),
              }
            );

            if (!response.ok) {
              const errorData = await response
                .json()
                .catch(() => ({ error: "Failed to save signature placeholder." }));
              throw new Error(
                errorData.error || "Failed to save signature placeholder."
              );
            }
          })
        );

        toast.success("Signature placeholders saved.");
        refetch();
        handleCloseSignatureMode();
      } catch (error: any) {
        toast.error(error.message || "Failed to save signature placeholders.");
      }
      return;
    }

    const requestActions = requestActionsRaw.split(",");

    // Create signature placeholders in the database
    releaseWithSignaturesMutation.mutate({
      departmentId,
      requestActions,
      remarks,
      signatures: signaturePlaceholders,
    });
  };

  const statusBadge = () => {
    const status = document?.status || "unknown";
    const normalized = status.toLowerCase().replace(/[\s_-]+/g, "");

    const variants: Record<
      string,
      {
        label: string;
        variant: "default" | "outline" | "secondary" | "destructive";
        className?: string;
      }
    > = {
      completed: { label: "Completed", variant: "default", className: "" },
      intransit: {
        label: "In Transit",
        variant: "secondary",
        className: "text-black dark:text-white",
      },
      intransitsignature: {
        // Combined without underscore for the regex replacement
        label: "In Transit for Signature",
        variant: "secondary",
        className: "text-black dark:text-white",
      },
      dispatch: { label: "Dispatch", variant: "secondary", className: "" },
      canceled: { label: "Cancelled", variant: "destructive", className: "" },
      deleted: { label: "Deleted", variant: "destructive", className: "" },
      processing: { label: "Processing", variant: "secondary", className: "" },
      signed: { label: "Signed", variant: "default", className: "" },
    };

    const config = variants[normalized] ?? {
      label: status,
      variant: "secondary",
      className: "",
    };

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
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

  const classification =
    document.classification ||
    document.detail?.classification ||
    "Unclassified";
  const department =
    document.current_department?.name ||
    document.detail?.department?.name ||
    "Unknown department";
  const author = document.detail?.created_by || "Unknown";

  if (isSignatureModeOpen) {
    return (
      <div className="flex flex-col gap-2 p-1 md:p-2 lg:p-4 mx-auto w-full pb-2">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {title} – Signature Positions
            </h1>
            <p className="text-muted-foreground">
              Document ID: {document.document_id || documentId}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseSignatureMode}
            >
              Back to Document
            </Button>
          </div>
        </div>

        <SignaturePdfViewer
          documentId={documentIdForRoutes}
          files={files}
          initialFileId={defaultEditableFileId}
          isLoadingFiles={filesLoading}
          onExit={handleCloseSignatureMode}
          onConfirm={handleConfirmSignatures}
        />
      </div>
    );
  }

  if (isSigningModeOpen) {
    return (
      <div className="flex flex-col gap-2 p-1 md:p-2 lg:p-4 mx-auto w-full pb-2">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {title} – Sign Document
            </h1>
            <p className="text-muted-foreground">
              Document ID: {document.document_id || documentId}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseSigningMode}
            >
              Back to Document
            </Button>
          </div>
        </div>

        <SigningPdfViewer
          documentId={documentIdForRoutes}
          files={files}
          initialFileId={defaultEditableFileId}
          isLoadingFiles={filesLoading}
          onExit={handleCloseSigningMode}
          onSigned={handleSigned}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-1 md:p-2 lg:p-4 mx-auto w-full pb-2">
      {isRedirectingToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-md border bg-white/90 px-4 py-3 text-sm text-muted-foreground shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Opening the updated document…</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">
            Document ID: {document.document_id || documentId}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoBack}
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
            onClick={() => setIsSigningModalOpen(true)}
            className="bg-green-600 hover:bg-green-700"
            disabled={!canSign}
          >
            <Shield className="mr-2 h-4 w-4" />
            {canSign ? "Sign Document" : "Signing In Progress"}
          </Button>
        </div>
      </div>

      {isEditorOpen && (
        <EditablePdfViewer
          documentId={documentIdForRoutes}
          files={files}
          initialFileId={defaultEditableFileId}
          isLoadingFiles={filesLoading}
          onExit={handleCloseEditor}
          onSaved={handleEditorSaved}
        />
      )}

      {isSignatureModeOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/90 p-2 md:p-4">
          <div className="w-full max-w-6xl max-h-[95vh] flex flex-col gap-2">
            <SignaturePdfViewer
              documentId={documentIdForRoutes}
              files={files}
              initialFileId={defaultEditableFileId}
              isLoadingFiles={filesLoading}
              onExit={handleCloseSignatureMode}
              onConfirm={handleConfirmSignatures}
            />
          </div>
        </div>
      )}

      {blockchainRedirectUrl &&
        blockchainStatus &&
        blockchainStatus !== "signed" && (
          <Alert className="bg-blue-50 text-blue-900">
            <ExternalLink className="h-4 w-4" />
            <AlertTitle>DocOnChain signing required</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <span>
                Continue the signing process on DocOnChain to finalize this
                document.
              </span>
              <Button size="sm" onClick={handleContinueSigning}>
                Open DocOnChain
              </Button>
            </AlertDescription>
          </Alert>
        )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-2">
          <Card className="h-full w-full min-h-[1100px] flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-1">
                  <FileText className="h-5 w-5" />
                  Document Preview
                </CardTitle>
                <div className="flex items-center gap-2">
                  {previewFile?.version && (
                    <Badge variant="outline">
                      Version {previewFile.version}
                    </Badge>
                  )}
                  {files.length > 1 && (
                    <select
                      value={previewFile?.id || ''}
                      onChange={(e) => {
                        // Update the URL to show the selected file
                        const newParams = new URLSearchParams(searchParams?.toString() || "");
                        newParams.set('fileId', e.target.value);
                        router.push(`/documents/${documentId}?${newParams.toString()}`);
                      }}
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {files
                        .slice()
                        .sort((a, b) => {
                          // Sort by version number (e.g., 1.0, 1.1, 1.2, etc.)
                          const aParts = a.version?.split('.').map(Number) || [0, 0];
                          const bParts = b.version?.split('.').map(Number) || [0, 0];

                          // Compare major version first
                          if (aParts[0] !== bParts[0]) {
                            return bParts[0] - aParts[0]; // Higher major version first
                          }
                          // Compare minor version
                          return bParts[1] - aParts[1]; // Higher minor version first
                        })
                        .map((file) => (
                          <option key={file.id} value={file.id}>
                            v{file.version} - {file.name}
                          </option>
                        ))}
                    </select>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePreviewClick}
                    disabled={!isPreviewSupported || filesLoading}
                    className="max-w-[150px] md:max-w-[200px] truncate"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    <span className="truncate">{title}</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {filesLoading ? (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-muted bg-muted/10 min-h-[400px] md:min-h-[500px] lg:min-h-[650px]">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : previewFile && isPreviewSupported && previewBaseUrl ? (
                <div className="flex-1 flex flex-col">
                  {/* Version info bar */}
                  <div className="mb-2 flex items-center justify-between p-2 bg-muted rounded-t-md">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">File: {previewFile.name}</span>
                      {previewFile.version && (
                        <Badge variant="secondary" className="text-xs">
                          v{previewFile.version}
                        </Badge>
                      )}
                      {previewFile.isPrimary && (
                        <Badge variant="default" className="text-xs">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Uploaded {formatDate(previewFile.uploadDate)}
                    </div>
                  </div>

                  <div
                    className="flex-1 flex items-center justify-center overflow-hidden rounded-b-lg border bg-background min-h-[400px] md:min-h-[500px] lg:min-h-[650px] cursor-pointer"
                    onClick={handlePreviewClick}
                  >
                    {previewMime.startsWith("image/") ? (
                      <img
                        src={previewBaseUrl}
                        alt={previewFile.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <iframe
                        src={`${previewBaseUrl}#toolbar=1&status=0`}
                        title={previewFile.name}
                        className="w-full h-full min-h-[400px] md:min-h-[500px] lg:min-h-[650px]"
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className="flex-1 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/10 min-h-[400px] md:min-h-[500px] lg:min-h-[650px] p-6 text-center cursor-pointer"
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
            </CardContent>
          </Card>
        </div>

        {/* Version comparison section - appears when multiple versions exist */}
        {files.length > 1 && (
          <div className="space-y-2 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Compare Versions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Left Version</label>
                    <select
                      value={selectedLeftVersion || files[0]?.id || ''}
                      onChange={(e) => setSelectedLeftVersion(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {files
                        .slice()
                        .sort((a, b) => {
                          // Sort by version number (e.g., 1.0, 1.1, 1.2, etc.)
                          const aParts = a.version?.split('.').map(Number) || [0, 0];
                          const bParts = b.version?.split('.').map(Number) || [0, 0];

                          // Compare major version first
                          if (aParts[0] !== bParts[0]) {
                            return bParts[0] - aParts[0]; // Higher major version first
                          }
                          // Compare minor version
                          return bParts[1] - aParts[1]; // Higher minor version first
                        })
                        .map((file) => (
                          <option key={file.id} value={file.id}>
                            v{file.version} - {file.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Right Version</label>
                    <select
                      value={selectedRightVersion || files[1]?.id || ''}
                      onChange={(e) => setSelectedRightVersion(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {files
                        .slice()
                        .sort((a, b) => {
                          // Sort by version number (e.g., 1.0, 1.1, 1.2, etc.)
                          const aParts = a.version?.split('.').map(Number) || [0, 0];
                          const bParts = b.version?.split('.').map(Number) || [0, 0];

                          // Compare major version first
                          if (aParts[0] !== bParts[0]) {
                            return bParts[0] - aParts[0]; // Higher major version first
                          }
                          // Compare minor version
                          return bParts[1] - aParts[1]; // Higher minor version first
                        })
                        .map((file) => (
                          <option key={file.id} value={file.id}>
                            v{file.version} - {file.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/documents/${documentId}/compare`)}
                  >
                    <GitBranch className="mr-2 h-4 w-4" />
                    Open Full Comparison
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-2">
          <Card>
            <CardHeader>
              <CardTitle>Document Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Type</p>
                      <p className="text-sm text-muted-foreground">
                        {document.detail?.document_type?.name || "Unknown"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Department</p>
                      <p className="text-sm text-muted-foreground">
                        {department}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {statusBadge()}
                    <Badge variant="outline">{classification}</Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Author</p>
                      <p className="text-sm text-muted-foreground">{author}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-sm text-muted-foreground">
                        {document.created_at
                          ? new Date(document.created_at).toLocaleString()
                          : "Unknown"}
                      </p>
                    </div>
                  </div>

                  {transactionHash && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">Transaction Hash</p>
                      </div>
                      <p className="break-all text-xs font-mono text-muted-foreground">
                        {transactionHash}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Blockchain Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge
                  variant={
                    blockchainStatus === "signed" ? "default" : "secondary"
                  }
                >
                  {blockchainStatus
                    ? blockchainStatus.toUpperCase()
                    : "UNSIGNED"}
                </Badge>
              </div>

              {projectUuid && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Project UUID
                  </p>
                  <p className="break-all text-xs font-mono text-muted-foreground">
                    {projectUuid}
                  </p>
                </div>
              )}

              {document.blockchain?.signedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Signed At</span>
                  <span>
                    {new Date(document.blockchain.signedAt).toLocaleString()}
                  </span>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={!blockchainRedirectUrl}
                onClick={handleContinueSigning}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View on DocOnChain
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Version History</span>
                <Badge variant="outline" className="text-xs">
                  {new Set(files.filter(f => f.versionGroupId).map(f => f.versionGroupId)).size} versions
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Group files by versionGroupId to show version history */}
                {(() => {
                  // Group files by versionGroupId
                  const groupedFiles: Record<string, any[]> = {};
                  files.forEach(file => {
                    const groupId = file.versionGroupId || 'no-group';
                    if (!groupedFiles[groupId]) {
                      groupedFiles[groupId] = [];
                    }
                    groupedFiles[groupId].push(file);
                  });

                  // Get all unique version groups
                  const versionGroups = Object.entries(groupedFiles);

                  // Find the most recent file across all groups to identify the current version
                  const allFilesSorted = [...files].sort((a, b) =>
                    new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime()
                  );
                  const currentFile = allFilesSorted[0];

                  return (
                    <div className="space-y-4">
                      {/* Current version info */}
                      {currentFile && (
                        <div className="rounded-lg border bg-accent/30 p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">Current Version</p>
                              <p className="text-sm">
                                v{currentFile.version} • {currentFile.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Uploaded {formatDate(currentFile.uploadDate)}
                              </p>
                            </div>
                            <Badge variant="default">Active</Badge>
                          </div>
                        </div>
                      )}

                      {/* Version timeline */}
                      {versionGroups.length > 0 && (
                        <div className="relative space-y-4 pl-6">
                          {/* Timeline line */}
                          <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-border" />

                          {versionGroups
                            .sort(([groupIdA, groupFilesA], [groupIdB, groupFilesB]) => {
                              // Sort groups by the upload date of their latest file
                              const latestFileA = [...groupFilesA].sort((a, b) =>
                                new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime()
                              )[0];
                              const latestFileB = [...groupFilesB].sort((a, b) =>
                                new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime()
                              )[0];

                              return new Date(latestFileB.uploadDate || 0).getTime() -
                                     new Date(latestFileA.uploadDate || 0).getTime();
                            })
                            .map(([groupId, groupFiles]) => {
                              // Sort files within the group by version
                              const sortedGroupFiles = [...groupFiles].sort((a, b) => {
                                const aParts = a.version?.split('.').map(Number) || [0, 0];
                                const bParts = b.version?.split('.').map(Number) || [0, 0];

                                if (aParts[0] !== bParts[0]) {
                                  return bParts[0] - aParts[0];
                                }
                                return bParts[1] - aParts[1];
                              });

                              // Get the most recent file in this group
                              const latestFileInGroup = sortedGroupFiles[0];

                              return (
                                <div key={groupId} className="relative">
                                  {/* Timeline dot */}
                                  <div className="absolute -left-1.5 top-3.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />

                                  <div className={`rounded-lg border p-3 ${latestFileInGroup.id === currentFile?.id ? 'bg-primary/10 border-primary' : 'bg-background'}`}>
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-medium">Version {latestFileInGroup.version}</p>
                                        <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                                          {latestFileInGroup.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Uploaded {formatDate(latestFileInGroup.uploadDate)}
                                        </p>
                                      </div>
                                      {latestFileInGroup.id === currentFile?.id && (
                                        <Badge variant="secondary" className="text-xs">
                                          Current
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}

                      {/* View all versions button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => router.push(`/documents/${documentId}/versions`)}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        View All Versions
                      </Button>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document Files</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filesError && !filesLoading && (
                <p className="text-sm text-destructive">{filesError}</p>
              )}
              {filesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : files.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No files uploaded yet. Upload a file to enable preview,
                  downloads, and signing.
                </p>
              ) : (
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
                            {formatFileSize(file.size)} • Uploaded{" "}
                            {formatDate(file.uploadDate)}
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <BlockchainSigningModal
        open={isSigningModalOpen}
        onOpenChange={setIsSigningModalOpen}
        document={{
          id: document.document_id,
          title,
          hash:
            transactionHash || document.blockchain?.projectUuid || undefined,
          blockchainStatus,
        }}
        onSigned={() => {
          refetch();
          refetchFiles();
        }}
      />

      <DocumentPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        previewUrl={previewBaseUrl || ""}
        fileName={previewFile?.name || "Document"}
        previewMime={previewMime}
        onDownload={handleDownloadClick}
      />

      <ShareDocumentModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
        documentId={documentId}
        documentTitle={title}
        onShare={handleShareDocument}
        onShared={refetch} // Refetch document data after sharing
      />

      <ReleaseDocumentModal
        isOpen={isReleaseModalOpen}
        onClose={() => setIsReleaseModalOpen(false)}
        onSignatureSetup={({ departmentId, requestActions, remarks }) => {
          const params = new URLSearchParams(searchParams?.toString() || "");
          params.set("mode", "signature");
          params.set("releaseDepartmentId", departmentId);
          params.set("releaseActions", requestActions.join(","));
          if (remarks) {
            params.set("releaseRemarks", remarks);
          } else {
            params.delete("releaseRemarks");
          }
          const nextQuery = params.toString();
          router.replace(
            nextQuery
              ? `/documents/${documentId}?${nextQuery}`
              : `/documents/${documentId}`,
            { scroll: false }
          );
          setIsReleaseModalOpen(false);
        }}
        document={{
          id: documentId,
          qrCode: document.qrCode || "",
          barcode: document.barcode || "",
          document: title,
          documentId: document.document_id || documentId,
          contactPerson: document.detail?.created_by || "Unknown",
          contactOrganization: "",
          type: document.detail?.document_type?.name || "",
          classification:
            document.classification ||
            document.detail?.classification ||
            "Unclassified",
          status: document.status || "unknown",
          activity: "",
          activityTime: "",
        }}
      />
    </div>
  );
}
