"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Calendar,
  Building,
  User,
  ArrowRight,
  Download,
  ChevronLeft,
} from "lucide-react";
import { format as formatDate } from "date-fns";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import exportDocumentTrailsPDF, { exportDocumentTrailsCSV, exportDocumentTrailsExcel } from "@/utils/document-trails-export";
import { calculateDuration, getExpectedDuration, compareDurations } from "@/utils/duration";

interface DocumentTrailDetail {
  id: string;
  documentId: string;
  actionDate: string; // When the action was performed
  createdAt?: string; // When the trail record was created
  updatedAt?: string; // When the trail record was last updated
  user: string;
  fromDepartment: string;
  toDepartment: string;
  status: string;
  remarks: string;
  durationMs?: number | null; // Duration to next trail in milliseconds
}

interface DocumentInfo {
  id: string;
  title: string;
  code: string;
  type: string;
  classification: string;
  status: string;
  createdAt: string;
  processType?: {
    id: string;
    code: string;
    name: string;
    description: string;
    durationValue: number | null;
    durationUnit: string | null;
  } | null;
}

export default function DocumentTrailsDetailPage() {
  const { documentId } = useParams();
  const router = useRouter();
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);
  const [trails, setTrails] = useState<DocumentTrailDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from API
  useEffect(() => {
    const fetchDocumentTrails = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/documents/documents/${documentId}/trails`,
          {
            credentials: "include",
          }
        );
        const result = await response.json();

        if (!response.ok || !result?.success) {
          throw new Error(
            result?.message || "Failed to load document trail data"
          );
        }

        setDocumentInfo(result?.data?.documentInfo ?? null);
        setTrails(
          Array.isArray(result?.data?.trails) ? result.data.trails : []
        );
      } catch (error) {
        toast.error("Failed to load document trail data");
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      fetchDocumentTrails();
    }
  }, [documentId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "intransit":
        return "bg-yellow-100 text-yellow-800";
      case "received":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-purple-100 text-purple-800";
      case "deleted":
        return "bg-red-100 text-red-800";
      case "archive":
        return "bg-gray-100 text-gray-800";
      case "placeholder_added":
        return "bg-violet-100 text-violet-800";
      case "signed":
        return "bg-emerald-100 text-emerald-800";
      case "checkout":
        return "bg-orange-100 text-orange-800";
      case "checkin":
        return "bg-teal-100 text-teal-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "intransit":
        return "In Transit";
      case "received":
        return "Received";
      case "completed":
        return "Completed";
      case "deleted":
        return "Deleted";
      case "archive":
        return "Archived";
      case "placeholder_added":
        return "Signature Placeholder Added";
      case "signed":
        return "Document Signed";
      case "checkout":
        return "Check Out";
      case "checkin":
        return "Check In";
      default:
        return status;
    }
  };

  const handleExport = async (exportFormat: "pdf" | "csv" | "excel") => {
    if (!documentInfo || trails.length === 0) {
      toast.error("No document data to export");
      return;
    }

    try {
      if (exportFormat === "pdf") {
        await exportDocumentTrailsPDF(documentInfo, trails);
        toast.success("PDF exported successfully!");
      } else if (exportFormat === "csv") {
        await exportDocumentTrailsCSV(documentInfo, trails);
        toast.success("CSV exported successfully!");
      } else if (exportFormat === "excel") {
        await exportDocumentTrailsExcel(documentInfo, trails);
        toast.success("Excel exported successfully!");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Failed to export ${exportFormat.toUpperCase()}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading document trails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold">Document Trail Details</h1>
          <p className="text-muted-foreground text-sm">
            Complete history for{" "}
            {documentInfo?.title || `document ${documentId}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            Back
          </Button>
          <div className="relative group inline-block">
            <Button size="sm">
              Export
            </Button>
            <div className="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-background border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="py-1">
                <button
                  onClick={() => handleExport("pdf")}
                  className="w-full px-4 py-2 text-sm hover:bg-accent transition-colors"
                >
                  Export as PDF
                </button>
                <button
                  onClick={() => handleExport("excel")}
                  className="w-full px-4 py-2 text-sm hover:bg-accent transition-colors"
                >
                  Export as Excel
                </button>
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full px-4 py-2 text-sm hover:bg-accent transition-colors"
                >
                  Export as CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {documentInfo && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">
              Document Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Title</p>
                <p className="font-medium">{documentInfo.title}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Code</p>
                <p className="font-medium">{documentInfo.code}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{documentInfo.type}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Classification</p>
                <p className="font-medium capitalize">
                  {documentInfo.classification}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={getStatusColor(documentInfo.status)}>
                  {getStatusText(documentInfo.status)}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {formatDate(
                    new Date(documentInfo.createdAt),
                    "MMM d, yyyy h:mm a"
                  )}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Duration</p>
                <p className="font-medium text-blue-700 dark:text-blue-300">
                  {(() => {
                    const duration = calculateDuration(documentInfo.createdAt, new Date().toISOString());
                    return duration.shortFormat;
                  })()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Since {formatDate(new Date(documentInfo.createdAt), "MMM d, yyyy")}
                </p>
              </div>
              {documentInfo.processType && (
                <div className="sm:col-span-2 lg:col-span-3 space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">
                    Process Information
                  </p>
                  <div className="p-3 bg-muted rounded-md space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="text-xs bg-blue-600 hover:bg-blue-700">
                        {documentInfo.processType.name}
                      </Badge>
                      {documentInfo.processType.code && (
                        <Badge variant="outline" className="text-xs">
                          Code: {documentInfo.processType.code}
                        </Badge>
                      )}
                      {documentInfo.processType.durationValue && documentInfo.processType.durationUnit && (
                        <Badge variant="secondary" className="text-xs">
                          Duration: {documentInfo.processType.durationValue} {documentInfo.processType.durationUnit}
                        </Badge>
                      )}
                    </div>
                    {documentInfo.processType.description && (
                      <div>
                        <p className="text-sm text-foreground leading-relaxed">
                          {documentInfo.processType.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Trail History</h2>
        <Badge variant="secondary">{trails.length} {trails.length === 1 ? 'Entry' : 'Entries'}</Badge>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="space-y-6">
            {trails.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-lg font-medium">No trail history found</p>
                <p className="text-sm">
                  This document has no recorded trail history
                </p>
              </div>
            ) : (
              trails.map((trail, index) => (
                <div key={trail.id} className="border rounded-lg p-4 hover:bg-accent/20 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={getStatusColor(trail.status)}>
                        {getStatusText(trail.status)}
                      </Badge>
                      {documentInfo && documentInfo.processType && documentInfo.processType.durationValue && documentInfo.processType.durationUnit && (
                        <Badge variant="secondary" className="text-xs">
                          {documentInfo.processType.durationValue} {documentInfo.processType.durationUnit}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-foreground">Action:</span>
                        <span
                          className="text-muted-foreground"
                          title={formatDate(new Date(trail.actionDate), "PPpp")}
                        >
                          {formatDate(
                            new Date(trail.actionDate),
                            "MMM d, yyyy h:mm a"
                          )}
                        </span>
                      </div>
                      {trail.createdAt && (
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-foreground">Created:</span>
                          <span
                            className="text-muted-foreground"
                            title={formatDate(
                              new Date(trail.createdAt),
                              "PPpp"
                            )}
                          >
                            {formatDate(
                              new Date(trail.createdAt),
                              "MMM d, yyyy h:mm a"
                            )}
                          </span>
                        </div>
                      )}
                      {trail.updatedAt &&
                        trail.updatedAt !== trail.createdAt && (
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-foreground">
                              Updated:
                            </span>
                            <span
                              className="text-muted-foreground"
                              title={formatDate(
                                new Date(trail.updatedAt),
                                "PPpp"
                              )}
                            >
                              {formatDate(
                                new Date(trail.updatedAt),
                                "MMM d, yyyy h:mm a"
                              )}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/20">
                      <span className="text-sm">
                        {trail.status === "signed" && (
                          <>
                            <span className="font-semibold text-emerald-700">
                              {trail.user}
                            </span>{" "}
                            signed this document
                          </>
                        )}
                        {trail.status === "placeholder_added" && (
                          <>
                            <span className="font-semibold text-violet-700">
                              {trail.user}
                            </span>{" "}
                            added signature placeholder(s)
                          </>
                        )}
                        {trail.status !== "signed" &&
                          trail.status !== "placeholder_added" && (
                            <>
                              <span className="font-semibold">
                                {trail.user}
                              </span>{" "}
                              performed this action
                            </>
                          )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/20">
                      <span className="text-sm">
                        <span className="font-medium">
                          {trail.fromDepartment}
                        </span>
                        <span className="mx-1">→</span>
                        <span className="font-medium">
                          {trail.toDepartment}
                        </span>
                      </span>
                    </div>

                    {trail.remarks && (
                      <div className="mt-3 p-3 bg-muted/20 rounded-md">
                        <div>
                          <p className="text-xs font-semibold text-foreground mb-1 uppercase tracking-wider">
                            {trail.status === "signed"
                              ? "Signature Details"
                              : trail.status === "placeholder_added"
                              ? "Placeholder Details"
                              : "Remarks"}
                          </p>
                          <div className="text-sm whitespace-pre-line leading-relaxed">
                            {trail.remarks}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Duration in this stage - Only shown when user held document */}
                    {trail.durationMs && trail.durationMs > 0 && (
                      <div className="mt-3 p-4 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 rounded-r-md shadow-sm">
                        <div>
                          <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wider mb-2">
                            DURATION HELD BY USER
                          </p>
                          <div className="space-y-1">
                            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                              {(() => {
                                const durationInSeconds = Math.floor(trail.durationMs / 1000);
                                const days = Math.floor(durationInSeconds / (24 * 60 * 60));
                                const hours = Math.floor((durationInSeconds % (24 * 60 * 60)) / (60 * 60));
                                const minutes = Math.floor((durationInSeconds % (60 * 60)) / 60);
                                
                                const longParts: string[] = [];
                                if (days > 0) longParts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
                                if (hours > 0) longParts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
                                if (minutes > 0 || longParts.length === 0) longParts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
                                
                                return longParts.join(', ');
                              })()}
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              {trail.user} held this document {index === trails.length - 1 ? "and is currently in this stage" : "before releasing to next user"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
