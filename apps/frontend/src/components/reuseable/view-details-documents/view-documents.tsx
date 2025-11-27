"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  FileText,
  Building2,
  Calendar,
  User,
  Clock,
  Shield,
  Tag,
} from "lucide-react";
import { useViewDocument } from "@/hooks/use-view-documents";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState, useEffect } from 'react';

interface ViewDocumentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string | null;
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
    case "dispatch":
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
}: ViewDocumentsModalProps) {
  // All state hooks must be at the top to follow React Hooks rules
  const [documentTrails, setDocumentTrails] = useState<any[]>([]);
  const [trailsLoading, setTrailsLoading] = useState(false);

  const { document, isLoading, error } = useViewDocument(documentId);

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
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDocumentTrails(data.data || []);
      } else {
        console.error('Failed to load document trails:', response.statusText);
        setDocumentTrails([]);
      }
    } catch (error) {
      console.error('Error loading document trails:', error);
      setDocumentTrails([]);
    } finally {
      setTrailsLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!document) return;

    const printContent = `
      <html>
        <head>
          <title>Document Report - ${document.detail?.document_name || 'Document'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; }
            .timeline { margin-left: 20px; }
            .timeline-item { margin-bottom: 15px; padding: 10px; border-left: 3px solid #ccc; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Document Report</h1>
            <h2>${document.detail?.document_name || 'Document'}</h2>
            <p>Code: ${document.detail?.document_code || document.document_id}</p>
          </div>

          <div class="section">
            <h3>Document Details</h3>
            <p><span class="label">Status:</span> ${document.status}</p>
            <p><span class="label">Classification:</span> ${document.detail?.classification || 'N/A'}</p>
            <p><span class="label">Created:</span> ${formatDateTime(document.created_at).full}</p>
            <p><span class="label">Origin:</span> ${document.detail?.origin || 'N/A'}</p>
          </div>

          ${document.document_logs && document.document_logs.length > 0 ? `
            <div class="section">
              <h3>Document History</h3>
              <div class="timeline">
                ${document.document_logs.map(log => `
                  <div class="timeline-item">
                    <p><span class="label">Action:</span> ${formatText(log.action)}</p>
                    <p><span class="label">Date:</span> ${formatDateTime(log.performed_at).full}</p>
                    ${log.performed_by_user ? `<p><span class="label">By:</span> ${log.performed_by_user.first_name} ${log.performed_by_user.last_name}</p>` : ''}
                    ${log.remarks ? `<p><span class="label">Remarks:</span> ${log.remarks}</p>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const handleLatestUpdates = async () => {
    if (!documentId) return;

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Document data refreshed');
      } else {
        toast.error('Failed to refresh document data');
      }
    } catch (error) {
      toast.error('Failed to refresh document data');
    }
  };

  if (!open) return null;

  // Ensure detail object exists even if backend doesn't return it
  const safeDetail = document?.detail || {
    document_code: (document as any)?.document_code,
    document_name: (document as any)?.title,
    classification: (document as any)?.classification,
    origin: (document as any)?.origin,
    delivery: null,
    created_by: null,
    created_by_account: null,
    department: null,
    document_type: null,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98dvw] h-[96dvh] flex flex-col p-0 data-[state=open]:animate-dialog-open data-[state=closed]:animate-dialog-close">
        {" "}
        {/* Custom animation classes applied based on dialog state */}
        <DialogHeader className="p-6 pb-4 border-b">
          {" "}
          {/* Added padding and border to fix header styling */}
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <DialogTitle className="text-2xl font-semibold">
                {isLoading ? (
                  <Skeleton className="h-8 w-48" />
                ) : (
                  safeDetail?.document_name ||
                  (document as any)?.title ||
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="routing">Document Routing</TabsTrigger>
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
                  <Button variant="outline" size="sm" onClick={handleExportPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
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

                  {documentTrails.map((trail, index) => {
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
                                  : 'System'}
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

            {/* Document Details Tab */}
            <TabsContent value="details" className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Document Metadata
                </h3>

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

                    {/* Released By and Receiving Office */}
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                          <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <label className="text-sm text-muted-foreground block mb-1">
                            Released By
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
                              From:
                            </span>
                            <span className="text-xs font-medium">
                              {document?.originating_department?.name || "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                          <Building2 className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <label className="text-sm text-muted-foreground block mb-1">
                            Receiving Office
                          </label>
                          <p className="font-semibold">
                            {document?.current_department?.name || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

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
