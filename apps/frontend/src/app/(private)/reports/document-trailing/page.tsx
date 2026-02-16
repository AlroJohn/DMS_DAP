"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Search,
  Calendar,
  Building,
  User,
  Filter,
  ChevronRight,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  ReportFilters,
  type ReportFilters as ReportFiltersType,
} from "@/components/reports/report-filters";
import { calculateDuration, calculateTotalDocumentDuration, getExpectedDuration, compareDurations } from "@/utils/duration";

interface DocumentTrail {
  id: string;
  documentId: string;
  documentTitle: string;
  documentCode: string;
  documentType: string;
  status: string;
  actionName: string; // Specific action taken (e.g., Checkout, Checkin, Dispatch, etc.)
  fromDepartment: string;
  toDepartment: string;
  user: string;
  actionDate: string; // When the action was performed
  createdAt?: string; // When the trail record was created
  updatedAt?: string; // When the trail record was last updated
  remarks: string;
  isOwned: boolean; // Whether the document was created by the current user's department
  durationMs?: number | null; // Time held in this stage before next action (in milliseconds)
  documentCreatedAt?: string | null; // Document creation date for total duration calculation
  processType?: {
    id: string;
    code: string;
    name: string;
    description: string;
    durationValue: number | null;
    durationUnit: string | null;
  } | null;
}

export default function DocumentTrailingPage() {
  const [documents, setDocuments] = useState<DocumentTrail[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentTrail[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownershipFilter, setOwnershipFilter] = useState("all");
  const [departments, setDepartments] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [documentTypes, setDocumentTypes] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [reportFilters, setReportFilters] = useState<ReportFiltersType>({
    dateRange: { from: undefined, to: undefined },
    dateRangePreset: "all",
    department: "all",
    classification: "all",
    documentType: "all",
  });
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  // Fetch departments and document types for filters
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [deptsRes, typesRes] = await Promise.all([
          fetch("/api/departments", { credentials: "include" }),
          fetch("/api/document-types", { credentials: "include" }),
        ]);

        if (deptsRes.ok) {
          const deptsData = await deptsRes.json();
          if (deptsData.success && Array.isArray(deptsData.data)) {
            setDepartments(
              deptsData.data.map((d: any) => ({
                id: d.department_id,
                name: d.name,
              }))
            );
          }
        }

        if (typesRes.ok) {
          const typesData = await typesRes.json();
          if (typesData.success && Array.isArray(typesData.data)) {
            setDocumentTypes(
              typesData.data.map((t: any) => ({
                id: t.type_id,
                name: t.type_name,
              }))
            );
          }
        }
      } catch (error) {
        // Silently handle filter options fetch errors
      }
    };

    fetchFilterOptions();
  }, []);

  const collapseTrailsToDocuments = (trails: DocumentTrail[]) => {
    const byDocument = new Map<string, DocumentTrail>();

    for (const trail of trails) {
      const existing = byDocument.get(trail.documentId);
      if (!existing) {
        byDocument.set(trail.documentId, trail);
        continue;
      }

      // If the existing trail is 'completed', keep it regardless of date
      if (existing.status === "completed") {
        continue;
      }

      // If the new trail is 'completed', use it regardless of date
      if (trail.status === "completed") {
        byDocument.set(trail.documentId, trail);
        continue;
      }

      // Otherwise, use the most recent trail
      const existingDate = new Date(existing.actionDate).getTime();
      const currentDate = new Date(trail.actionDate).getTime();
      if (currentDate > existingDate) {
        byDocument.set(trail.documentId, trail);
      }
    }

    return Array.from(byDocument.values());
  };

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const departmentId = user?.department_id;
      if (!departmentId) {
        const msg = "Department information not available";
        toast.error(msg);
        setError(msg);
        setDocuments([]);
        setFilteredDocuments([]);
        return;
      }

      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (ownershipFilter !== "all")
        params.append("ownership", ownershipFilter);
      if (searchTerm) params.append("searchTerm", searchTerm);

      // Add date range filters
      if (reportFilters.dateRange.from) {
        params.append("fromDate", reportFilters.dateRange.from.toISOString());
      }
      if (reportFilters.dateRange.to) {
        params.append("toDate", reportFilters.dateRange.to.toISOString());
      }

      // Add classification filter
      if (reportFilters.classification !== "all") {
        params.append("classification", reportFilters.classification);
      }

      // Add document type filter
      if (reportFilters.documentType !== "all") {
        params.append("documentType", reportFilters.documentType);
      }

      const query = params.toString();
      const url = query
        ? `/api/documents/departments/${departmentId}/trails?${query}`
        : `/api/documents/departments/${departmentId}/trails`;

      const response = await fetch(url, { credentials: "include" });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        const msg = result?.message || "Failed to load document trails";
        toast.error(msg);
        setError(msg);
        setDocuments([]);
        setFilteredDocuments([]);
        return;
      }

      const trails = Array.isArray(result.data) ? result.data : [];
      console.log('📊 Document Trails Data:', trails.slice(0, 2)); // Log first 2 trails for debugging
      const uniqueDocuments = collapseTrailsToDocuments(trails);
      console.log('📄 Unique Documents with Process Types:', uniqueDocuments.map(d => ({
        title: d.documentTitle,
        processType: d.processType,
      })).slice(0, 3));
      setDocuments(uniqueDocuments);
      setFilteredDocuments(uniqueDocuments);
    } catch (e) {
      const msg = "Failed to load document data. Please try again.";
      toast.error(msg);
      setError(msg);
      setDocuments([]);
      setFilteredDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [
    user?.department_id,
    statusFilter,
    ownershipFilter,
    searchTerm,
    reportFilters,
  ]);

  // Fetch data from API
  useEffect(() => {
    if (!isAuthLoading) {
      fetchDocuments();
    }
  }, [isAuthLoading, fetchDocuments]); // Include filters in dependency array

  // Apply filters whenever search term or filters change
  useEffect(() => {
    let result = documents;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (doc) =>
          doc.documentTitle.toLowerCase().includes(term) ||
          doc.documentCode.toLowerCase().includes(term) ||
          doc.user.toLowerCase().includes(term) ||
          doc.remarks.toLowerCase().includes(term)
      );
    }

    if (statusFilter && statusFilter !== "all") {
      result = result.filter((doc) => doc.status === statusFilter);
    }

    if (ownershipFilter && ownershipFilter !== "all") {
      if (ownershipFilter === "owned") {
        result = result.filter((doc) => doc.isOwned);
      } else if (ownershipFilter === "shared") {
        result = result.filter((doc) => !doc.isOwned);
      }
    }

    setFilteredDocuments(result);
  }, [searchTerm, statusFilter, ownershipFilter, documents]);

  const getStatusColor = (
    actionName: string,
    status: string,
    remarks?: string
  ) => {
    // Prioritize action name for more specific colors
    const action = actionName?.toLowerCase().trim() || "";
    const remarksLower = remarks?.toLowerCase().trim() || "";

    // Check for checkout/checkin in action name or remarks
    if (
      action.includes("checkout") ||
      action.includes("check out") ||
      action === "checkout" ||
      remarksLower.includes("checkout") ||
      remarksLower.includes("check out") ||
      remarksLower.includes("checked out")
    ) {
      return "bg-orange-50 text-orange-700";
    }
    if (
      action.includes("checkin") ||
      action.includes("check in") ||
      action === "checkin" ||
      remarksLower.includes("checkin") ||
      remarksLower.includes("check in") ||
      remarksLower.includes("checked in")
    ) {
      return "bg-teal-50 text-teal-700";
    }

    // Check status field directly for checkout/checkin
    if (status === "checkout") {
      return "bg-orange-50 text-orange-700";
    }
    if (status === "checkin") {
      return "bg-teal-50 text-teal-700";
    }

    // Check for signature-related statuses
    if (status === "placeholder_added") {
      return "bg-violet-50 text-violet-700";
    }
    if (status === "signed") {
      return "bg-emerald-50 text-emerald-700";
    }

    // If action name exists and is not empty, use a default color
    if (action && action !== "pending" && action !== "pendinged") {
      return "bg-indigo-50 text-indigo-700";
    }

    // Fall back to status-based colors
    switch (status) {
      case "pending":
        return "bg-blue-50 text-blue-700";
      case "intransit":
        return "bg-yellow-50 text-yellow-700";
      case "received":
        return "bg-green-50 text-green-700";
      case "completed":
        return "bg-purple-50 text-purple-700";
      case "deleted":
        return "bg-red-50 text-red-700";
      case "archive":
        return "bg-gray-50 text-gray-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  const getStatusText = (
    actionName: string,
    status: string,
    remarks?: string
  ) => {
    // Check remarks first for checkout/checkin keywords
    const remarksLower = remarks?.toLowerCase().trim() || "";
    if (
      remarksLower.includes("checkout") ||
      remarksLower.includes("check out") ||
      remarksLower.includes("checked out")
    ) {
      return "Check Out";
    }
    if (
      remarksLower.includes("checkin") ||
      remarksLower.includes("check in") ||
      remarksLower.includes("checked in")
    ) {
      return "Check In";
    }

    // Check status field directly for checkout/checkin and signature statuses

    // Check status field directly for checkout/checkin
    if (status === "checkout") {
      return "Check Out";
    }
    if (status === "checkin") {
      return "Check In";
    }
    if (status === "placeholder_added") {
      return "Signature Placeholder Added";
    }
    if (status === "signed") {
      return "Document Signed";
    }

    // Prioritize action name for more specific display
    const action = actionName?.trim();

    // If action name exists and is not empty, use it
    if (action && action !== "") {
      // Ensure checkout/checkin are properly capitalized
      const lowerAction = action.toLowerCase();
      if (
        lowerAction.includes("checkout") ||
        lowerAction.includes("check out")
      ) {
        return "Check Out";
      }
      if (lowerAction.includes("checkin") || lowerAction.includes("check in")) {
        return "Check In";
      }
      // Return the action name as-is for other actions
      return action;
    }

    // Fall back to status-based text only if no action name
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
      default:
        return status;
    }
  };

  const handleViewTrails = (documentId: string) => {
    router.push(`/reports/document-trailing/${documentId}`);
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
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Document Trailing
            </h1>
            <p className="text-muted-foreground text-sm">
              Track documents created by departments and shared documents
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All tracked documents
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Transit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter((d) => d.status === "intransit").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Currently moving</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {[...new Set(documents.map((d) => d.fromDepartment))].length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {[...new Set(documents.map((d) => d.user))].length}
            </div>
            <p className="text-xs text-muted-foreground">Users involved</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Document Trails
            {filteredDocuments.length > 0 && (
              <Badge variant="secondary">{filteredDocuments.length} Result{filteredDocuments.length !== 1 ? 's' : ''}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            {/* Search Bar and Filters */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between">
              {/* Search Bar - Left Side */}
              <div className="w-full lg:w-80">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Search
                </label>
                <Input
                  placeholder="Search documents, users, or remarks..."
                  className="w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filters - Right Side */}
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Ownership
                  </label>
                  <Select
                    value={ownershipFilter}
                    onValueChange={setOwnershipFilter}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Ownership" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Documents</SelectItem>
                      <SelectItem value="owned">Owned</SelectItem>
                      <SelectItem value="shared">Shared</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Status
                  </label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-37.5">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Dispatched</SelectItem>
                      <SelectItem value="intransit">In Transit</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="placeholder_added">
                        Placeholder Added
                      </SelectItem>
                      <SelectItem value="signed">Signed</SelectItem>
                      <SelectItem value="deleted">Deleted</SelectItem>
                      <SelectItem value="archive">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Date Range
                  </label>
                  <Select
                    value={reportFilters.dateRangePreset}
                    onValueChange={(preset) => {
                      const today = new Date();
                      let from: Date | undefined;
                      let to: Date | undefined = new Date(
                        today.setHours(23, 59, 59, 999)
                      );

                      if (preset === "all") {
                        from = undefined;
                        to = undefined;
                      } else if (preset === "today") {
                        from = new Date(new Date().setHours(0, 0, 0, 0));
                        to = new Date(new Date().setHours(23, 59, 59, 999));
                      } else if (preset === "thismonth") {
                        from = new Date(
                          today.getFullYear(),
                          today.getMonth(),
                          1
                        );
                      } else if (preset === "thisyear") {
                        from = new Date(today.getFullYear(), 0, 1);
                      } else {
                        const days = parseInt(preset.replace("days", ""));
                        if (!isNaN(days)) {
                          from = new Date(new Date().setHours(0, 0, 0, 0));
                          from.setDate(from.getDate() - days);
                        }
                      }

                      setReportFilters({
                        ...reportFilters,
                        dateRangePreset: preset,
                        dateRange: { from, to },
                      });
                    }}
                  >
                    <SelectTrigger className="w-35">
                      <SelectValue placeholder="Date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="7days">Last 7 Days</SelectItem>
                      <SelectItem value="10days">Last 10 Days</SelectItem>
                      <SelectItem value="20days">Last 20 Days</SelectItem>
                      <SelectItem value="30days">Last 30 Days</SelectItem>
                      <SelectItem value="60days">Last 60 Days</SelectItem>
                      <SelectItem value="75days">Last 75 Days</SelectItem>
                      <SelectItem value="90days">Last 90 Days</SelectItem>
                      <SelectItem value="thismonth">This Month</SelectItem>
                      <SelectItem value="thisyear">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Classification
                  </label>
                  <Select
                    value={reportFilters.classification}
                    onValueChange={(value) =>
                      setReportFilters({
                        ...reportFilters,
                        classification: value,
                      })
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Classification" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classifications</SelectItem>
                      <SelectItem value="simple">Simple</SelectItem>
                      <SelectItem value="compound">Compound</SelectItem>
                      <SelectItem value="complex">Complex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {documentTypes.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Document Type
                    </label>
                    <Select
                      value={reportFilters.documentType}
                      onValueChange={(value) =>
                        setReportFilters({
                          ...reportFilters,
                          documentType: value,
                        })
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Document Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {documentTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Document List */}
            <div className="space-y-4 pt-4">
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-8">
                  {error ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold">
                          Failed to load documents
                        </h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                          {error}
                        </p>
                        <Button onClick={fetchDocuments}>Retry</Button>
                      </div>
                    </div>
                  ) : documents.length === 0 ? (
                    // No documents at all (empty state)
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold">
                          No Document Trails Yet
                        </h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                          There are no document trails to display. Documents
                          will appear here once they are created or shared with
                          your department.
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Documents exist but none match the current filters
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold">
                          No Matching Documents
                        </h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                          No documents match your current filter criteria. Try
                          adjusting your search or filter settings.
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSearchTerm("");
                            setStatusFilter("all");
                            setOwnershipFilter("all");
                            setReportFilters({
                              dateRange: { from: undefined, to: undefined },
                              dateRangePreset: "all",
                              department: "all",
                              classification: "all",
                              documentType: "all",
                            });
                          }}
                        >
                          Clear Filters
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="border rounded-lg p-4 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-semibold text-base truncate max-w-50 sm:max-w-md" title={doc.documentTitle}>
                              {doc.documentTitle}
                            </h3>
                            <Badge variant="secondary" className="text-xs font-mono">
                              {doc.documentCode}
                            </Badge>
                            <Badge
                              className={`${getStatusColor(
                                doc.actionName,
                                doc.status,
                                doc.remarks
                              )} px-2 py-1 text-xs`}
                            >
                              {getStatusText(
                                doc.actionName,
                                doc.status,
                                doc.remarks
                              )}
                            </Badge>
                          </div>
                          <div className="items-center gap-2">
                            <p className="text-sm text-muted-foreground truncate max-w-50 sm:max-w-md" title={doc.documentType}>
                              {doc.documentType}
                            </p>
                          </div>
                          {doc.processType && (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded-md">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <div className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                                  <Badge variant="default" className="text-xs bg-blue-600 hover:bg-blue-700">
                                    {doc.processType.name}
                                  </Badge>
                                </div>
                                {doc.processType.code && (
                                  <Badge variant="outline" className="text-xs">
                                    {doc.processType.code}
                                  </Badge>
                                )}
                                {doc.processType.durationValue && doc.processType.durationUnit && (
                                  <div className="flex items-center gap-1 px-2 py-0.5 bg-muted rounded">
                                    <span className="text-xs font-semibold">
                                      {doc.processType.durationValue} {doc.processType.durationUnit}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewTrails(doc.documentId)}
                          className="w-full sm:w-auto shrink-0"
                        >
                          View Trails
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                        <div className="p-2 rounded-md bg-muted/20">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-muted-foreground text-xs font-medium">
                              From: {doc.fromDepartment}
                            </span>
                            <span className="text-muted-foreground text-xs mx-1">→</span>
                            <span className="text-muted-foreground text-xs font-medium">
                              {doc.toDepartment}
                            </span>
                          </div>
                        </div>
                        <div className="p-2 rounded-md bg-muted/20">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-muted-foreground text-xs">
                              {doc.status === "signed"
                                ? "Signed by:"
                                : doc.status === "placeholder_added"
                                ? "Added by:"
                                : "By:"}
                            </span>
                            <span className="truncate font-medium text-xs">
                              {doc.user}
                            </span>
                          </div>
                        </div>
                        <div className="p-2 rounded-md bg-muted/20">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-muted-foreground text-xs">
                              {doc.status === "signed"
                                ? "Signed:"
                                : doc.status === "placeholder_added"
                                ? "Added:"
                                : "Action:"}
                            </span>
                            <span
                              className="truncate font-medium text-xs"
                              title={`Action Date: ${format(
                                new Date(doc.actionDate),
                                "PPpp"
                              )}`}
                            >
                              {format(
                                new Date(doc.actionDate),
                                "MMM d, yyyy h:mm a"
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Timestamp Details Section */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs bg-linear-to-br from-muted/30 to-muted/10 p-3 rounded-lg border border-muted">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="shrink-0 font-semibold">Action:</span>
                            <span
                              className="truncate text-muted-foreground"
                              title={format(new Date(doc.actionDate), "PPpp")}
                            >
                              {format(
                                new Date(doc.actionDate),
                                "MMM d, yyyy h:mm a"
                              )}
                            </span>
                          </div>
                        </div>
                        {doc.createdAt && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="shrink-0 font-semibold">Created:</span>
                              <span
                                className="truncate text-muted-foreground"
                                title={format(new Date(doc.createdAt), "PPpp")}
                              >
                                {format(
                                  new Date(doc.createdAt),
                                  "MMM d, yyyy h:mm a"
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                        {doc.updatedAt && doc.updatedAt !== doc.createdAt && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="shrink-0 font-semibold">
                                Updated:
                              </span>
                              <span
                                className="truncate text-muted-foreground"
                                title={format(new Date(doc.updatedAt), "PPpp")}
                              >
                                {format(
                                  new Date(doc.updatedAt),
                                  "MMM d, yyyy h:mm a"
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {doc.remarks && (
                        <div
                          className="text-sm p-3 rounded-md bg-muted/20"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-foreground text-xs uppercase tracking-wider">
                              {doc.status === "signed"
                                ? "Signature Details"
                                : doc.status === "placeholder_added"
                                ? "Placeholder Details"
                                : "Remarks"}
                            </span>
                            <div className="text-foreground/90 whitespace-pre-line leading-relaxed">
                              {doc.remarks}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Duration Summary - Only show when user held the document */}
                      {doc.durationMs !== null && doc.durationMs !== undefined && doc.durationMs > 0 && (
                        <div className="border-t pt-3 mt-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* Time held by user/department before release */}
                            <div className="p-3 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                              <div className="mb-1">
                                <span className="text-xs font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wider">
                                  Duration Held
                                </span>
                              </div>
                              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                {(() => {
                                  const durationInSeconds = Math.floor(doc.durationMs / 1000);
                                  const days = Math.floor(durationInSeconds / (24 * 60 * 60));
                                  const hours = Math.floor((durationInSeconds % (24 * 60 * 60)) / (60 * 60));
                                  const minutes = Math.floor((durationInSeconds % (60 * 60)) / 60);
                                  
                                  const parts: string[] = [];
                                  if (days > 0) parts.push(`${days}d`);
                                  if (hours > 0) parts.push(`${hours}h`);
                                  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
                                  
                                  return parts.join(' ');
                                })()}
                              </p>
                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                {doc.user} held document before next action
                              </p>
                            </div>

                            {/* Total document duration */}
                            {doc.documentCreatedAt && (
                              <div className={`p-3 rounded-md border ${
                                doc.status === "completed" 
                                  ? "bg-linear-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800"
                                  : "bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800"
                              }`}>
                                <div className="mb-1">
                                  <span className={`text-xs font-semibold uppercase tracking-wider ${
                                    doc.status === "completed"
                                      ? "text-green-900 dark:text-green-100"
                                      : "text-purple-900 dark:text-purple-100"
                                  }`}>
                                    {doc.status === "completed" ? "Completed At" : "Total Document Age"}
                                  </span>
                                </div>
                                {doc.status === "completed" ? (
                                  <>
                                    <p className="text-lg font-bold text-green-700 dark:text-green-300">
                                      {format(new Date(doc.actionDate), "MMM d, yyyy h:mm a")}
                                    </p>
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                                      {(() => {
                                        const duration = calculateDuration(doc.documentCreatedAt, doc.actionDate);
                                        return `Completed in ${duration.shortFormat}`;
                                      })()}
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                                      {(() => {
                                        const duration = calculateTotalDocumentDuration(doc.documentCreatedAt);
                                        return duration.shortFormat;
                                      })()}
                                    </p>
                                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                                      Since {format(new Date(doc.documentCreatedAt), "MMM d, yyyy")}
                                    </p>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Process status if available */}
                          {doc.processType && doc.processType.durationValue && doc.processType.durationUnit && doc.documentCreatedAt && doc.status !== "completed" && (
                            <div className={`p-3 rounded-md border mt-2 ${(() => {
                                const duration = calculateTotalDocumentDuration(doc.documentCreatedAt);
                                const comparison = compareDurations(duration.days, doc.processType.durationValue, doc.processType.durationUnit);
                                if (comparison.status === 'on-time') return 'bg-linear-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800';
                                if (comparison.status === 'warning') return 'bg-linear-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/20 border-yellow-200 dark:border-yellow-800';
                                return 'bg-linear-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800';
                              })()}`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className={`text-xs font-semibold uppercase tracking-wider ${(() => {
                                      const duration = calculateTotalDocumentDuration(doc.documentCreatedAt);
                                      const comparison = compareDurations(duration.days, doc.processType.durationValue, doc.processType.durationUnit);
                                      if (comparison.status === 'on-time') return 'text-green-900 dark:text-green-100';
                                      if (comparison.status === 'warning') return 'text-yellow-900 dark:text-yellow-100';
                                      return 'text-red-900 dark:text-red-100';
                                    })()}`}>
                                    Process Status: 
                                  </span>
                                  <span className={`ml-1 text-sm font-bold ${(() => {
                                      const duration = calculateTotalDocumentDuration(doc.documentCreatedAt);
                                      const comparison = compareDurations(duration.days, doc.processType.durationValue, doc.processType.durationUnit);
                                      if (comparison.status === 'on-time') return 'text-green-700 dark:text-green-300';
                                      if (comparison.status === 'warning') return 'text-yellow-700 dark:text-yellow-300';
                                      return 'text-red-700 dark:text-red-300';
                                    })()}`}>
                                    {(() => {
                                        const duration = calculateTotalDocumentDuration(doc.documentCreatedAt);
                                        const comparison = compareDurations(duration.days, doc.processType.durationValue, doc.processType.durationUnit);
                                        return comparison.message;
                                      })()}
                                  </span>
                                </div>
                                <p className={`text-xs ${(() => {
                                    const duration = calculateTotalDocumentDuration(doc.documentCreatedAt);
                                    const comparison = compareDurations(duration.days, doc.processType.durationValue, doc.processType.durationUnit);
                                    if (comparison.status === 'on-time') return 'text-green-600 dark:text-green-400';
                                    if (comparison.status === 'warning') return 'text-yellow-600 dark:text-yellow-400';
                                    return 'text-red-600 dark:text-red-400';
                                  })()}`}>
                                  Expected: {getExpectedDuration(doc.processType.durationValue, doc.processType.durationUnit)}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
