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
import {
  useDocumentFiles,
  type DocumentFileMetadata,
} from "@/hooks/use-document-files";
import { toast } from "sonner";
import { EditablePdfViewer } from "./components/editable-pdf-viewer";
import {
  SignaturePdfViewer,
  SignatureBox,
  TextBox,
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

const parseVersion = (value?: string | null) => {
  if (!value) return null;
  const parts = value.split(".").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return null;
  return parts;
};

const compareDocumentFilesByVersionDesc = (
  left: DocumentFileMetadata,
  right: DocumentFileMetadata
) => {
  const leftParts = parseVersion(left.version);
  const rightParts = parseVersion(right.version);

  if (leftParts && rightParts) {
    const length = Math.max(leftParts.length, rightParts.length);
    for (let index = 0; index < length; index += 1) {
      const leftValue = leftParts[index] ?? 0;
      const rightValue = rightParts[index] ?? 0;
      if (leftValue !== rightValue) {
        return rightValue - leftValue;
      }
    }
  } else if (leftParts) {
    return -1;
  } else if (rightParts) {
    return 1;
  }

  const leftDate = left.uploadDate ? new Date(left.uploadDate).getTime() : 0;
  const rightDate = right.uploadDate ? new Date(right.uploadDate).getTime() : 0;
  if (leftDate !== rightDate) {
    return rightDate - leftDate;
  }

  return left.name.localeCompare(right.name);
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
  const [isRedirectingToList, setIsRedirectingToList] = useState(false);
  const [selectedLeftVersion, setSelectedLeftVersion] = useState<string | null>(
    null
  );
  const [selectedRightVersion, setSelectedRightVersion] = useState<
    string | null
  >(null);
  const { document, isLoading, error, refetch } = useDocumentDetail(documentId);
  const {
    files,
    isLoading: filesLoading,
    error: filesError,
    refetch: refetchFiles,
  } = useDocumentFiles(documentId);
  const modeParam = searchParams?.get("mode");
  const fileIdFromUrl = searchParams?.get("fileId");
  const fileIdsFromUrl = searchParams?.get("fileIds");
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
  const sortedPdfFiles = useMemo(
    () => [...pdfFiles].sort(compareDocumentFilesByVersionDesc),
    [pdfFiles]
  );
  const signatureFileIdsFromUrl = useMemo(() => {
    if (!fileIdsFromUrl) return [];
    return fileIdsFromUrl.split(",").filter(Boolean);
  }, [fileIdsFromUrl]);

  const editableFileFromUrl = useMemo(() => {
    const candidateId = fileIdFromUrl || signatureFileIdsFromUrl[0];
    if (candidateId) {
      const file = pdfFiles.find((f) => f.id === candidateId);
      if (file) return file;
    }
    return null;
  }, [pdfFiles, fileIdFromUrl, signatureFileIdsFromUrl]);

  const defaultEditableFileId =
    editableFileFromUrl?.id ?? sortedPdfFiles[0]?.id ?? null;
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
      nextQuery ? `/documents/${documentId}?${nextQuery}` : `/documents/owned`,
      { scroll: false }
    );
  };

  const updateEditorQuery = (shouldOpen: boolean) => {
    const currentParams = new URLSearchParams(searchParams?.toString() || "");
    if (shouldOpen) {
      currentParams.set("mode", "edit");
    } else {
      currentParams.delete("mode");
    }
    const nextQuery = currentParams.toString();
    router.replace(
      nextQuery ? `/documents/${documentId}?${nextQuery}` : `/documents/owned`,
      { scroll: false }
    );
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    const currentParams = new URLSearchParams(searchParams?.toString() || "");
    currentParams.delete("mode");
    const nextQuery = currentParams.toString();
    router.replace(
      nextQuery ? `/documents/${documentId}?${nextQuery}` : `/documents/owned`,
      { scroll: false }
    );
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

    router.replace("/documents");

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
    router.push("/documents");
  };

  const handleCloseSigningMode = () => {
    setIsSigningModeOpen(false);
    router.back();
  };

  const handleSigned = () => {
    if (isRedirectingToList) return;
    toast.success("Document signed successfully");
    refetch();
    setIsRedirectingToList(true);
    router.push("/documents");
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
  });

  const handleConfirmSignatures = async ({
    fileId,
    boxes,
    textBoxes,
    targetFileIds,
  }: {
    fileId: string;
    boxes: SignatureBox[];
    textBoxes: TextBox[];
    targetFileIds?: string[];
  }) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    const departmentId = params.get("releaseDepartmentId");
    const requestActionsRaw = params.get("releaseActions");
    const remarks = params.get("releaseRemarks") || undefined;

    const RENDER_SCALE = 1.4;
    const normalizedTargetIds = Array.from(
      new Set([...(targetFileIds || []), fileId].filter(Boolean))
    );

    // Prepare signature placeholders data
    const signaturePlaceholders = normalizedTargetIds.flatMap((targetFileId) =>
      boxes.map((box) => ({
        document_file_id: targetFileId,
        page_number: box.pageNumber,
        x_position: box.x / RENDER_SCALE, // Adjust for scale
        y_position: box.y / RENDER_SCALE,
        width: box.width / RENDER_SCALE,
        height: box.height / RENDER_SCALE,
      }))
    );

    const textPlaceholders = normalizedTargetIds.flatMap((targetFileId) =>
      textBoxes.map((box) => ({
        document_file_id: targetFileId,
        page_number: box.pageNumber,
        x_position: box.x / RENDER_SCALE,
        y_position: box.y / RENDER_SCALE,
        width: box.width / RENDER_SCALE,
        height: box.height / RENDER_SCALE,
        font_family: box.fontFamily,
        font_size: box.fontSize,
        font_color: box.fontColor,
        text_value: box.text?.trim() || "",
      }))
    );

    const saveSignaturePlaceholders = async (
      placeholders: Array<{
        document_file_id: string;
        page_number: number;
        x_position: number;
        y_position: number;
        width: number;
        height: number;
      }>
    ) => {
      await Promise.all(
        placeholders.map(async (placeholder) => {
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
            const errorData = await response.json().catch(() => ({
              error: "Failed to save signature placeholder.",
            }));
            throw new Error(
              errorData.error || "Failed to save signature placeholder."
            );
          }
        })
      );
    };

    const saveTextPlaceholders = async (
      placeholders: Array<{
        document_file_id: string;
        page_number: number;
        x_position: number;
        y_position: number;
        width: number;
        height: number;
        font_family: string;
        font_size: number;
        font_color: string;
        text_value: string;
      }>
    ) => {
      await Promise.all(
        placeholders.map(async (placeholder) => {
          const response = await fetch(
            `/api/document-texts/documents/${documentIdForRoutes}/text-placeholders`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(placeholder),
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({
              error: "Failed to save text placeholder.",
            }));
            throw new Error(
              errorData.error || "Failed to save text placeholder."
            );
          }
        })
      );
    };

    const hasAnyPlaceholders =
      signaturePlaceholders.length > 0 || textPlaceholders.length > 0;

    if (!departmentId || !requestActionsRaw) {
      if (!hasAnyPlaceholders) {
        toast.error("Add at least one signature or text placeholder.");
        return;
      }

      try {
        await Promise.all([
          signaturePlaceholders.length
            ? saveSignaturePlaceholders(signaturePlaceholders)
            : Promise.resolve(),
          textPlaceholders.length
            ? saveTextPlaceholders(textPlaceholders)
            : Promise.resolve(),
        ]);

        const successMessage =
          signaturePlaceholders.length && textPlaceholders.length
            ? "Signature and text placeholders saved."
            : signaturePlaceholders.length
            ? "Signature placeholders saved."
            : "Text placeholders saved.";
        toast.success(successMessage);
        refetch();
        // Redirect to owned documents page instead of back to document detail
        router.push("/documents");
      } catch (error: any) {
        toast.error(error.message || "Failed to save placeholders.");
      }
      return;
    }

    const requestActions = requestActionsRaw.split(",");

    try {
      await releaseWithSignaturesMutation.mutateAsync({
        departmentId,
        requestActions,
        remarks,
        signatures: signaturePlaceholders,
      });

      if (textPlaceholders.length) {
        await saveTextPlaceholders(textPlaceholders);
      }

      toast.success("Document released with signature requests.");
      refetch();
      // Redirect to owned documents page instead of back to document detail
      router.push("/documents");
    } catch (error: any) {
      toast.error(
        error.message || "Failed to release document with signatures."
      );
    }
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
      <div className="mx-auto max-w-[80dvw] flex flex-col gap-2 p-1 md:p-2 lg:p-4 w-full pb-2">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              {title} – Signature Positions
            </h1>
            {/* <p className="text-muted-foreground text-sm">
              Document ID: {document.document_id || documentId}
            </p> */}
          </div>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              Back to Document
            </Button>
          </div>
        </div>

        <SignaturePdfViewer
          documentId={documentIdForRoutes}
          files={files}
          initialFileId={defaultEditableFileId}
          targetFileIds={signatureFileIdsFromUrl}
          isLoadingFiles={filesLoading}
          onExit={() => router.back()}
          onConfirm={handleConfirmSignatures}
        />
      </div>
    );
  }

  if (isSigningModeOpen) {
    return (
      <div className="flex flex-col gap-2 p-1 md:p-2 lg:p-4 mx-auto w-full pb-2">
        {isRedirectingToList && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-md border bg-white/90 px-4 py-3 text-sm text-muted-foreground shadow-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Returning to documents…</span>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">
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
          onExit={() => router.back()}
          onSigned={handleSigned}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mx-auto w-full pb-2">
      {isRedirectingToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-md border bg-white/90 px-4 py-3 text-sm text-muted-foreground shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Opening the updated document…</span>
          </div>
        </div>
      )}

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
          <div className="w-full max-h-[95vh] flex flex-col gap-2">
            <SignaturePdfViewer
              documentId={documentIdForRoutes}
              files={files}
              initialFileId={defaultEditableFileId}
              targetFileIds={signatureFileIdsFromUrl}
              isLoadingFiles={filesLoading}
              onExit={() => {
                // Redirect to owned documents page instead of back to document detail
                router.push("/documents");
              }}
              onConfirm={handleConfirmSignatures}
            />
          </div>
        </div>
      )}

      {/* Main Document Content */}
      {!isEditorOpen && !isSignatureModeOpen && (
        <div className="space-y-4">
          {/* Header Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  <span>
                    {document.document_code ||
                      document.detail?.document_code ||
                      "N/A"}
                  </span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span>{classification}</span>
                </div>
                <span>•</span>
                <Badge
                  variant={
                    document.status === "completed" ? "default" : "secondary"
                  }
                >
                  {document.status}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canSign && (
                <Button size="sm" onClick={() => setIsSigningModalOpen(true)}>
                  <Shield className="h-4 w-4 mr-1" />
                  Sign with Blockchain
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsShareModalOpen(true)}
              >
                <Share className="h-4 w-4 mr-1" />
                Share
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadClick}
                disabled={!downloadUrl}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>

          {/* Document Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previewFile && isPreviewSupported ? (
                <div className="border rounded-lg overflow-hidden bg-muted/10">
                  <div className="aspect-[8.5/11] relative">
                    {previewMime.includes("pdf") ? (
                      <iframe
                        src={previewBaseUrl || ""}
                        className="w-full h-full"
                        title="Document Preview"
                      />
                    ) : (
                      <img
                        src={previewBaseUrl || ""}
                        alt="Document Preview"
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                  <div className="p-4 border-t bg-background">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviewClick}
                      className="w-full"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Full Document
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No preview available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document Details */}
          <Card>
            <CardHeader>
              <CardTitle>Document Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building className="h-4 w-4" />
                    <span className="font-medium">Department</span>
                  </div>
                  <p className="text-sm">{department}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Created By</span>
                  </div>
                  <p className="text-sm">{author}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Created Date</span>
                  </div>
                  <p className="text-sm">{formatDate(document.created_at)}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Last Modified</span>
                  </div>
                  <p className="text-sm">{formatDate(document.updated_at)}</p>
                </div>
              </div>
              {document.description && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Description
                  </p>
                  <p className="text-sm">{document.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Blockchain Status */}
          {blockchainStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Blockchain Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge
                      variant={
                        blockchainStatus === "signed" ? "default" : "secondary"
                      }
                    >
                      {blockchainStatus}
                    </Badge>
                  </div>
                  {transactionHash && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Transaction Hash:</span>
                      <code className="text-xs">{transactionHash}</code>
                    </div>
                  )}
                  {blockchainRedirectUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(blockchainRedirectUrl, "_blank")
                      }
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on Blockchain
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* File Versions */}
          {files && files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  File Versions ({files.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sortedPdfFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Version {file.version} • {formatFileSize(file.size)}{" "}
                            • {formatDate(file.uploadDate)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          window.open(
                            `/api/documents/${documentIdForRoutes}/files/${file.id}/stream?download=1`,
                            "_blank"
                          )
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

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
              : `/documents/owned`,
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

      <BlockchainSigningModal
        open={isSigningModalOpen}
        onOpenChange={setIsSigningModalOpen}
        document={{
          id: documentId,
          title: title,
          hash: document?.blockchain?.transactionHash || undefined,
          blockchainStatus: blockchainStatus || undefined,
        }}
        onSigned={() => {
          refetch();
          setIsSigningModalOpen(false);
        }}
      />
    </div>
  );
}
