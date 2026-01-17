"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  FileText,
  Building2,
  Calendar,
  User,
  Clock,
  GitBranch,
  Shield,
  Tag,
  MoreHorizontal,
} from "lucide-react";
import { useViewDocument } from "@/hooks/use-view-documents";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  generateDocumentPDF,
  downloadCSV,
  downloadExcel,
  downloadRoutingHistoryCSV,
  exportRoutingHistoryPDF,
} from "@/utils/document-export";
import { DocumentViewerWithSignatures } from "@/components/reuseable/document-viewer-with-signatures/document-viewer-with-signatures";

interface DocumentMetadata {
  file_type?: string;
  mime_type?: string;
  author?: string;
  creator?: string;
  producer?: string;
  creation_date?: string;
  modification_date?: string;
  security_level?: string;
  retention_period?: number;
  is_encrypted?: boolean;
  checksum?: string;
  version?: string;
}

interface DocumentFile {
  file_id: string;
  original_name: string;
  mime_type: string;
  is_primary: boolean;
  downloadUrl: string;
  version?: string;
  uploadDate?: string;
  file_size?: number;
  version_group_id?: string;
  uploaded_by_account?: {
    email?: string;
    user?: {
      first_name: string;
      last_name: string;
    };
  };
  DocumentMetadata?: DocumentMetadata | null;
}

interface DocumentDetail {
  document_code?: string;
  document_name?: string;
  classification?: string;
  origin?: string;
  delivery?: string | null;
  created_by?: string | null;
  created_by_account?: {
    email?: string;
    user?: {
      first_name: string;
      last_name: string;
    };
  } | null;
  department?: {
    name: string;
  } | null;
  document_type?: {
    name: string;
  } | null;
}

interface Document {
  document_id: string;
  tracking_code?: string;
  status: string;
  created_at: string;
  detail?: DocumentDetail;
  current_department?: {
    name: string;
  } | null;
  originating_department?: {
    name: string;
  } | null;
  document_logs: any[];
  qrCode?: string;
  barcode?: string;
  blockchain?: {
    status?: string | null;
    projectUuid?: string | null;
    transactionHash?: string | null;
    redirectUrl?: string | null;
    signedAt?: string | null;
    signedBy?: string | null;
  } | null;
  files?: DocumentFile[];
  title?: string;
  document_code?: string;
  classification?: string;
  description?: string;
  origin?: string;
}

interface DocumentTrail {
  trail_id: string;
  document_id: string;
  action_id?: string;
  from_department?: string;
  to_department?: string;
  user_id?: string;
  action_date: string;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  documentAction?: {
    action_name: string;
    description?: string;
    sender_tag?: string;
    recipient_tag?: string;
    status: boolean;
    action_date: string;
    created_at: string;
    updated_at: string;
    permission_id?: string;
  };
  document: {
    title: string;
    description?: string;
    document_code: string;
    document_type: string;
    classification: string;
    origin: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
  fromDept?: {
    name: string;
  };
  toDept?: {
    name: string;
  };
  user?: {
    first_name: string;
    last_name: string;
  };
}

interface ViewDocumentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string | null;
  activeSignatureData?: string | null;
  onConfirmSignaturePlacement?: (coords: {
    signatureData: string;
    x_position: number;
    y_position: number;
    width: number;
    height: number;
    page_number: number;
  }) => Promise<void>;
}

const formatText = (text: string): string => {
  return text
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
};

const formatDateTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      full: date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  } catch {
    return { date: "Invalid Date", time: "", full: "Invalid Date" };
  }
};

const getStatusColor = (status: string) => {
  const st = status.toLowerCase();
  switch (st) {
    case "pending":
      return {
        dot: "bg-emerald-500",
        text: "text-emerald-600",
        bg: "bg-emerald-50",
      };
    case "intransit":
      return { dot: "bg-blue-500", text: "text-blue-600", bg: "bg-blue-50" };
    case "completed":
      return { dot: "bg-green-500", text: "text-green-600", bg: "bg-green-50" };
    case "canceled":
    case "cancelled":
      return { dot: "bg-red-500", text: "text-red-600", bg: "bg-red-50" };
    default:
      return {
        dot: "bg-gray-300",
        text: "text-muted-foreground",
        bg: "bg-gray-50",
      };
  }
};

const getClassificationVariant = (classification: string) => {
  const cls = classification.toLowerCase();
  if (cls.includes("highly") || cls === "highly_technical")
    return "destructive";
  if (cls === "complex") return "default";
  return "secondary";
};

const getActionIcon = (action: string) => {
  const actionLower = action.toLowerCase();
  if (actionLower === "created") return "●";
  if (actionLower === "released") return "●";
  if (actionLower === "received") return "●";
  if (actionLower === "completed") return "✓";
  if (actionLower === "cancelled" || actionLower === "canceled") return "✕";
  return "●";
};

export function ViewDocumentsModal({
  open,
  onOpenChange,
  documentId,
  activeSignatureData,
  onConfirmSignaturePlacement,
}: ViewDocumentsModalProps) {
  // All state hooks must be at the top to follow React Hooks rules
  const [documentTrails, setDocumentTrails] = useState<DocumentTrail[]>([]);
  const [trailsLoading, setTrailsLoading] = useState<boolean>(false);

  const { document, isLoading, error } = useViewDocument(documentId) as {
    document?: Document;
    isLoading: boolean;
    error?: string;
  };

  // Function to load document trails - moved to maintain consistent hook order
  useEffect(() => {
    if (open && documentId) {
      loadDocumentTrails();
    }
  }, [open, documentId]);

  const loadDocumentTrails = async () => {
    if (!documentId) return;

    setTrailsLoading(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/trails`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDocumentTrails(data.data || []);
      } else {
        console.error("Failed to load document trails:", response.statusText);
        setDocumentTrails([]);
      }
    } catch (error) {
      console.error("Error loading document trails:", error);
      setDocumentTrails([]);
    } finally {
      setTrailsLoading(false);
    }
  };

  const createExportDocument = () => {
    if (!document) return null;

    const exportDetail = {
      document_code:
        document.detail?.document_code || document.document_code || "N/A",
      document_name:
        document.detail?.document_name || document.title || "Untitled",
      classification:
        document.detail?.classification || document.classification || "N/A",
      origin: document.detail?.origin || document.origin || "N/A",
      delivery:
        document.detail?.delivery || (document as any)?.delivery || null,
      created_by:
        document.detail?.created_by || (document as any)?.created_by || null,
      document_type:
        document.detail?.document_type ||
        (document as any)?.document_type ||
        null,
      department:
        document.detail?.department ||
        document.originating_department ||
        (document as any)?.department ||
        null,
      created_by_account: document.detail?.created_by_account ||
        (document as any)?.created_by_account || {
          email: "unknown@example.com",
          user: { first_name: "Unknown", last_name: "User" },
        },
    };

    // Include files with their metadata
    const filesWithMetadata =
      document.files?.map((file) => ({
        ...file,
        DocumentMetadata: file.DocumentMetadata || null,
      })) || [];

    return {
      ...document,
      detail: exportDetail,
      document_trails: documentTrails,
      files: filesWithMetadata,
    };
  };

  const handleExportPDF = () => {
    const docData = createExportDocument();
    if (!docData) return;
    generateDocumentPDF(docData as any);
  };

  const handleExportCSV = () => {
    const docData = createExportDocument();
    if (!docData) return;
    downloadCSV(docData as any);
    toast.success("CSV exported successfully");
  };

  const handleExportExcel = () => {
    const docData = createExportDocument();
    if (!docData) return;
    downloadExcel(docData as any);
    toast.success("Excel exported successfully");
  };

  const handleExportRoutingHistoryPDF = () => {
    if (!document || !documentTrails) return;
    const docData = createExportDocument();
    if (!docData) return;
    exportRoutingHistoryPDF(docData as any, documentTrails);
  };

  const handleExportRoutingHistoryCSV = () => {
    if (!document || !documentTrails) return;
    const docData = createExportDocument();
    if (!docData) return;
    downloadRoutingHistoryCSV(docData as any, documentTrails);
    toast.success("Routing history CSV exported successfully");
  };

  const handleLatestUpdates = async () => {
    if (!documentId) return;

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("Document data refreshed");
      } else {
        toast.error("Failed to refresh document data");
      }
    } catch (error) {
      toast.error("Failed to refresh document data");
    }
  };

  // Ensure detail object exists even if backend doesn't return it
  const safeDetail: DocumentDetail = document?.detail || {
    document_code: document?.document_code,
    document_name: document?.title,
    classification: document?.classification,
    origin: document?.origin,
    delivery: (document as any)?.delivery || null,
    created_by: (document as any)?.created_by || null,
    created_by_account: (document as any)?.created_by_account || null,
    department:
      document?.originating_department || (document as any)?.department || null,
    document_type: (document as any)?.document_type || null,
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98dvw] h-[96dvh] flex flex-col p-0 data-[state=open]:animate-dialog-open data-[state=closed]:animate-dialog-close">
        {" "}
        {/* Custom animation classes applied based on dialog state */}
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <DialogTitle className="text-2xl font-semibold">
                {isLoading ? (
                  <Skeleton className="h-8 w-48" />
                ) : (
                  "Document Details"
                )}
              </DialogTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="font-mono">
                  {isLoading ? (
                    <Skeleton className="h-4 w-32 inline-block" />
                  ) : (
                    `CODE: ${
                      safeDetail?.document_code ||
                      (document as any)?.document_code ||
                      "N/A"
                    }`
                  )}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>
        {error && (
          <div className="rounded-b-lg bg-red-50 p-4 text-red-900 border border-red-200 border-t-0 border-x-0">
            {" "}
            {/* Added rounded-b and border styling to match header */}
            <p className="text-sm font-medium">Error loading document</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}
        {/* Scrollable body area */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {" "}
          {/* Changed to flex-1 with proper padding for scrollable body */}
          <Tabs defaultValue="routing" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="routing">Document Routing</TabsTrigger>
              <TabsTrigger value="versions">Version History</TabsTrigger>
              <TabsTrigger value="details">Document Details</TabsTrigger>
            </TabsList>

            {/* Document Routing Tab - using document_trails for historical data */}
            <TabsContent value="routing" className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Document Routing History
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadDocumentTrails}
                    disabled={trailsLoading}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                        <MoreHorizontal className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleExportPDF}>
                        <FileText className="h-4 w-4 mr-2" />
                        Export Full Report (PDF)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportCSV}>
                        <FileText className="h-4 w-4 mr-2" />
                        Export Full Report (CSV)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportExcel}>
                        <FileText className="h-4 w-4 mr-2" />
                        Export Full Report (Excel)
                      </DropdownMenuItem>
                      <div className="border-t my-1"></div>
                      <DropdownMenuItem onClick={handleExportRoutingHistoryPDF}>
                        <FileText className="h-4 w-4 mr-2" />
                        Export Routing History (PDF)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportRoutingHistoryCSV}>
                        <FileText className="h-4 w-4 mr-2" />
                        Export Routing History (CSV)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {trailsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ))}
                </div>
              ) : documentTrails && documentTrails.length > 0 ? (
                <div className="relative space-y-6 pl-8">
                  {/* Timeline line */}
                  <div className="absolute left-[19px] top-[30px] bottom-[30px] w-[2px] bg-border" />

                  {documentTrails.map((trail: DocumentTrail, index) => {
                    const isFirst = index === 0;
                    const isLast = index === documentTrails.length - 1;
                    const datetime = formatDateTime(trail.action_date);
                    const statusName = formatText(trail.status);

                    return (
                      <div key={trail.trail_id} className="relative">
                        {/* Timeline node */}
                        <div
                          className={cn(
                            "absolute left-[-32px] w-10 h-10 rounded-full flex items-center justify-center border-2 border-border bg-background"
                          )}
                        >
                          <span className="text-muted-foreground text-xl">
                            {isLast ? (
                              <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M12 2L15 9H22L17 14L19 21L12 17L5 21L7 14L2 9H9L12 2Z"
                                  fill="currentColor"
                                />
                              </svg>
                            ) : (
                              <Clock className="w-5 h-5" />
                            )}
                          </span>
                        </div>

                        {/* Trail card */}
                        <div className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow ml-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="text-sm text-muted-foreground">
                              {datetime.full}
                            </div>
                          </div>

                          {/* Department flow */}
                          {trail.fromDept && trail.toDept && (
                            <div className="flex items-center gap-3 mb-4 text-sm">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {trail.fromDept.name}
                                </span>
                              </div>
                              <div className="text-muted-foreground">→</div>
                              <div className="flex items-center gap-1.5">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {trail.toDept.name}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Action and User */}
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <label className="text-sm text-muted-foreground block mb-1.5">
                                Status
                              </label>
                              <p className="font-medium flex items-center gap-2">
                                <span>{getActionIcon(trail.status)}</span>
                                {statusName}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm text-muted-foreground block mb-1.5">
                                Performed By
                              </label>
                              <p className="font-medium flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {trail.user
                                  ? `${trail.user.first_name} ${trail.user.last_name}`
                                  : "System"}
                              </p>
                            </div>
                          </div>

                          {/* Action details */}
                          {trail.documentAction && (
                            <div className="mt-4 pt-4 border-t">
                              <label className="text-sm text-muted-foreground block mb-1.5">
                                Action Type
                              </label>
                              <p className="font-medium">
                                {trail.documentAction.action_name}
                              </p>
                            </div>
                          )}

                          {/* Remarks */}
                          {trail.remarks && (
                            <div className="mt-4 pt-4 border-t">
                              <label className="text-sm text-muted-foreground block mb-1.5">
                                Remarks
                              </label>
                              <p className="text-sm">{trail.remarks}</p>
                            </div>
                          )}

                          {/* Status badge */}
                          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-muted text-muted-foreground">
                            ✓ {statusName} at {datetime.full}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No routing history available</p>
                </div>
              )}
            </TabsContent>

            {/* Version History Tab */}
            <TabsContent value="versions" className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Version History</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLatestUpdates}
                    disabled={isLoading}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                        <MoreHorizontal className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleExportPDF}>
                        <FileText className="h-4 w-4 mr-2" />
                        Export Full Report (PDF)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportCSV}>
                        <FileText className="h-4 w-4 mr-2" />
                        Export Full Report (CSV)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportExcel}>
                        <FileText className="h-4 w-4 mr-2" />
                        Export Full Report (Excel)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ))}
                </div>
              ) : document && document.files && document.files.length > 0 ? (
                <div className="relative space-y-6 pl-8">
                  {/* Timeline line */}
                  <div className="absolute left-[19px] top-[30px] bottom-[30px] w-[2px] bg-border" />

                  {(document.files as DocumentFile[])
                    .slice()
                    .sort((a: DocumentFile, b: DocumentFile) => {
                      // Sort by version number (e.g., 1.0, 1.1, 1.2, etc.)
                      const aParts = a.version?.split(".").map(Number) || [
                        0, 0,
                      ];
                      const bParts = b.version?.split(".").map(Number) || [
                        0, 0,
                      ];

                      // Compare major version first
                      if (aParts[0] !== bParts[0]) {
                        return bParts[0] - aParts[0]; // Higher major version first
                      }
                      // Compare minor version
                      return bParts[1] - aParts[1]; // Higher minor version first
                    })
                    .map((file: DocumentFile, index, sortedFiles) => {
                      const isCurrent = index === 0; // Most recent version is first after sorting
                      const datetime = file.uploadDate
                        ? formatDateTime(file.uploadDate)
                        : { full: "N/A" };

                      return (
                        <div key={file.file_id} className="relative">
                          {/* Timeline node */}
                          <div
                            className={cn(
                              "absolute left-[-32px] w-10 h-10 rounded-full flex items-center justify-center border-2 border-border bg-background"
                            )}
                          >
                            <span className="text-muted-foreground text-xl">
                              {isCurrent ? (
                                <svg
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M12 2L15 9H22L17 14L19 21L12 17L5 21L7 14L2 9H9L12 2Z"
                                    fill="currentColor"
                                  />
                                </svg>
                              ) : (
                                <FileText className="w-5 h-5" />
                              )}
                            </span>
                          </div>

                          {/* Version card */}
                          <div
                            className={`bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow ml-6 ${
                              isCurrent ? "border-primary bg-primary/5" : ""
                            }`}
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="text-sm text-muted-foreground">
                                {datetime.full}
                              </div>
                              {isCurrent && (
                                <Badge variant="default">Current</Badge>
                              )}
                            </div>

                            {/* Version info */}
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <label className="text-sm text-muted-foreground block mb-1.5">
                                  Version
                                </label>
                                <p className="font-medium">
                                  v{file.version || "N/A"}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground block mb-1.5">
                                  File Name
                                </label>
                                <p className="font-medium truncate">
                                  {file.original_name}
                                </p>
                              </div>
                            </div>

                            {/* Additional file details */}
                            <div className="mt-4 pt-4 border-t">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm text-muted-foreground block mb-1.5">
                                    File Size
                                  </label>
                                  <p className="font-medium">
                                    {file.file_size
                                      ? Math.round(file.file_size / 1024) +
                                        " KB"
                                      : "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm text-muted-foreground block mb-1.5">
                                    Uploaded By
                                  </label>
                                  <p className="font-medium">
                                    {file.uploaded_by_account?.user
                                      ? `${file.uploaded_by_account.user.first_name} ${file.uploaded_by_account.user.last_name}`
                                      : "System"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* File type and status */}
                            <div className="mt-4 flex items-center gap-4">
                              <Badge variant="outline" className="text-xs">
                                {file.mime_type || "Unknown type"}
                              </Badge>
                              {file.is_primary && (
                                <Badge variant="secondary" className="text-xs">
                                  Primary
                                </Badge>
                              )}
                            </div>

                            {/* Document Metadata for this file */}
                            {file.DocumentMetadata && (
                              <div className="mt-4 pt-4 border-t">
                                <h6 className="text-sm font-medium text-muted-foreground mb-2">
                                  File Metadata
                                </h6>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {file.DocumentMetadata.file_type && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">
                                        Type:
                                      </span>
                                      <span className="font-medium">
                                        {file.DocumentMetadata.file_type}
                                      </span>
                                    </div>
                                  )}
                                  {file.DocumentMetadata.author && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">
                                        Author:
                                      </span>
                                      <span className="font-medium">
                                        {file.DocumentMetadata.author}
                                      </span>
                                    </div>
                                  )}
                                  {file.DocumentMetadata.creator && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">
                                        Creator:
                                      </span>
                                      <span className="font-medium">
                                        {file.DocumentMetadata.creator}
                                      </span>
                                    </div>
                                  )}
                                  {file.DocumentMetadata.creation_date && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">
                                        Created:
                                      </span>
                                      <span className="font-medium">
                                        {
                                          formatDateTime(
                                            file.DocumentMetadata.creation_date
                                          ).date
                                        }
                                      </span>
                                    </div>
                                  )}
                                  {file.DocumentMetadata.security_level && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">
                                        Security:
                                      </span>
                                      <span className="font-medium">
                                        {file.DocumentMetadata.security_level}
                                      </span>
                                    </div>
                                  )}
                                  {file.DocumentMetadata.is_encrypted !==
                                    undefined && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">
                                        Encrypted:
                                      </span>
                                      <span className="font-medium">
                                        {file.DocumentMetadata.is_encrypted
                                          ? "Yes"
                                          : "No"}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No version history available</p>
                </div>
              )}
            </TabsContent>

            {/* Document Details Tab */}
            <TabsContent value="details" className="space-y-6 mt-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Document Metadata</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                        <MoreHorizontal className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleExportPDF}>
                        <FileText className="h-4 w-4 mr-2" />
                        Export Full Report (PDF)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportCSV}>
                        <FileText className="h-4 w-4 mr-2" />
                        Export Full Report (CSV)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportExcel}>
                        <FileText className="h-4 w-4 mr-2" />
                        Export Full Report (Excel)
                      </DropdownMenuItem>
                      <div className="border-t my-1"></div>
                      <DropdownMenuItem onClick={handleExportRoutingHistoryPDF}>
                        <FileText className="h-4 w-4 mr-2" />
                        Export Routing History (PDF)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportRoutingHistoryCSV}>
                        <FileText className="h-4 w-4 mr-2" />
                        Export Routing History (CSV)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-40 w-full" />
                  </div>
                ) : document ? (
                  <>
                    {/* Creator and Date Info */}
                    <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b">
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                          <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <label className="text-sm text-muted-foreground block mb-1">
                            Created By
                          </label>
                          <p className="font-semibold">
                            {safeDetail?.created_by_account?.user
                              ? `${
                                  safeDetail.created_by_account.user
                                    .first_name || ""
                                } ${
                                  safeDetail.created_by_account.user
                                    .last_name || ""
                                }`.trim() || "Unknown"
                              : safeDetail?.created_by_account?.email ||
                                safeDetail?.created_by ||
                                "Unknown"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs text-muted-foreground">
                              Office:
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs font-normal"
                            >
                              {safeDetail?.department?.name ||
                                document?.originating_department?.name ||
                                "N/A"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                          <Calendar className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <label className="text-sm text-muted-foreground block mb-1">
                            Date Created
                          </label>
                          <p className="font-semibold">
                            {formatDateTime(document.created_at).date}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {formatDateTime(document.created_at).time}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Classification and Status */}
                    <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b">
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                          <Shield className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <label className="text-sm text-muted-foreground block mb-1.5">
                            Classification
                          </label>
                          <Badge
                            variant={getClassificationVariant(
                              safeDetail?.classification ||
                                (document as any)?.classification ||
                                "simple"
                            )}
                            className="font-semibold text-sm px-3 py-1"
                          >
                            {formatText(
                              safeDetail?.classification ||
                                (document as any)?.classification ||
                                "simple"
                            )}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                          <Tag className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <label className="text-sm text-muted-foreground block mb-1.5">
                            Status
                          </label>
                          <div
                            className={cn(
                              "inline-flex items-center gap-2 px-3 py-1 rounded-full font-medium text-sm",
                              getStatusColor(document.status).bg,
                              getStatusColor(document.status).text
                            )}
                          >
                            <div
                              className={cn(
                                "h-2 w-2 rounded-full",
                                getStatusColor(document.status).dot
                              )}
                            />
                            {formatText(document.status)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Department and Document Type */}
                    <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b">
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                          <Building2 className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <label className="text-sm text-muted-foreground block mb-1">
                            Department
                          </label>
                          <p className="font-semibold">
                            {document?.current_department?.name ||
                              document?.originating_department?.name ||
                              safeDetail?.department?.name ||
                              "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <label className="text-sm text-muted-foreground block mb-1">
                            Document Type
                          </label>
                          <p className="font-semibold">
                            {safeDetail?.document_type?.name ||
                              (document as any)?.document_type?.name ||
                              (document as any)?.type?.name ||
                              "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Origin */}
                    <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b">
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                          <Building2 className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <label className="text-sm text-muted-foreground block mb-1">
                            Origin
                          </label>
                          <p className="font-semibold">
                            {formatText(
                              safeDetail?.origin ||
                                document?.detail?.origin ||
                                (document as any)?.origin ||
                                "N/A"
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Document Metadata Section */}
                    {document?.files && document.files.length > 0 && (
                      <div className="mb-6 pb-6 border-b">
                        <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Additional Document Metadata
                        </h4>
                        <div className="grid grid-cols-1 gap-6 w-full">
                          {(document.files as DocumentFile[]).map(
                            (file: DocumentFile, index: number) => (
                              <div
                                key={file.file_id}
                                className="border rounded-lg p-4 bg-gray-50"
                              >
                                <h5 className="font-medium text-sm mb-3 text-muted-foreground">
                                  File {index + 1}: {file.original_name}
                                </h5>
                                {file.DocumentMetadata && (
                                  <div className="space-y-2 text-sm">
                                    {file.DocumentMetadata.file_type && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          File Type:
                                        </span>
                                        <span className="font-medium">
                                          {file.DocumentMetadata.file_type}
                                        </span>
                                      </div>
                                    )}
                                    {file.DocumentMetadata.mime_type && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          MIME Type:
                                        </span>
                                        <span className="font-medium">
                                          {file.DocumentMetadata.mime_type}
                                        </span>
                                      </div>
                                    )}
                                    {file.DocumentMetadata.author && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Author:
                                        </span>
                                        <span className="font-medium">
                                          {file.DocumentMetadata.author}
                                        </span>
                                      </div>
                                    )}
                                    {file.DocumentMetadata.creator && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Creator:
                                        </span>
                                        <span className="font-medium">
                                          {file.DocumentMetadata.creator}
                                        </span>
                                      </div>
                                    )}
                                    {file.DocumentMetadata.producer && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Producer:
                                        </span>
                                        <span className="font-medium">
                                          {file.DocumentMetadata.producer}
                                        </span>
                                      </div>
                                    )}
                                    {file.DocumentMetadata.creation_date && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Creation Date:
                                        </span>
                                        <span className="font-medium">
                                          {
                                            formatDateTime(
                                              file.DocumentMetadata
                                                .creation_date
                                            ).date
                                          }
                                        </span>
                                      </div>
                                    )}
                                    {file.DocumentMetadata
                                      .modification_date && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Modification Date:
                                        </span>
                                        <span className="font-medium">
                                          {
                                            formatDateTime(
                                              file.DocumentMetadata
                                                .modification_date
                                            ).date
                                          }
                                        </span>
                                      </div>
                                    )}
                                    {file.DocumentMetadata.security_level && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Security Level:
                                        </span>
                                        <span className="font-medium">
                                          {file.DocumentMetadata.security_level}
                                        </span>
                                      </div>
                                    )}
                                    {file.DocumentMetadata.retention_period && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Retention Period:
                                        </span>
                                        <span className="font-medium">
                                          {
                                            file.DocumentMetadata
                                              .retention_period
                                          }{" "}
                                          days
                                        </span>
                                      </div>
                                    )}
                                    {file.DocumentMetadata.is_encrypted !==
                                      undefined && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Encrypted:
                                        </span>
                                        <span className="font-medium">
                                          {file.DocumentMetadata.is_encrypted
                                            ? "Yes"
                                            : "No"}
                                        </span>
                                      </div>
                                    )}
                                    {file.DocumentMetadata.version && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Version:
                                        </span>
                                        <span className="font-medium">
                                          {file.DocumentMetadata.version}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {!file.DocumentMetadata && (
                                  <p className="text-muted-foreground text-sm">
                                    No metadata available for this file
                                  </p>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* QR Code and Barcode */}
                    <div className="bg-gray-50 rounded-lg p-6 border">
                      <h4 className="font-semibold text-center mb-6">
                        QR Code and Barcode
                      </h4>
                      <div className="flex items-center justify-around gap-8">
                        <div className="text-center">
                          <label className="text-sm text-muted-foreground block mb-3">
                            QR Code
                          </label>
                          {document.qrCode ? (
                            <img
                              src={document.qrCode}
                              alt="QR Code"
                              className="w-48 h-48 mx-auto border-2 border-gray-200 rounded-lg p-2 bg-white"
                            />
                          ) : (
                            <div className="w-48 h-48 mx-auto border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-white">
                              <FileText className="h-12 w-12 text-gray-400" />
                            </div>
                          )}
                        </div>

                        <div className="text-center flex-1 max-w-lg">
                          <label className="text-sm text-muted-foreground block mb-3">
                            Barcode
                          </label>
                          {document.barcode ? (
                            <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                              <img
                                src={document.barcode}
                                alt="Barcode"
                                className="w-full h-32 object-contain"
                              />
                            </div>
                          ) : (
                            <div className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-white">
                              <FileText className="h-12 w-12 text-gray-400" />
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2 font-mono">
                            {document.tracking_code || document.document_id}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No document details available</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
