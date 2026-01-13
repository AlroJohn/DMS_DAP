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
  Eye,
  Download,
  Filter,
  ChevronRight,
  Clock,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import jsPDF from "jspdf";
import "jspdf-autotable";

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
  actionDate: string;
  remarks: string;
  isOwned: boolean; // Whether the document was created by the current user's department
}

export default function DocumentTrailingPage() {
  const [documents, setDocuments] = useState<DocumentTrail[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentTrail[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownershipFilter, setOwnershipFilter] = useState("all"); // Added ownership filter
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

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
      const uniqueDocuments = collapseTrailsToDocuments(trails);
      setDocuments(uniqueDocuments);
      setFilteredDocuments(uniqueDocuments);
    } catch (e) {
      console.error("Error fetching documents:", e);
      const msg = "Failed to load document data. Please try again.";
      toast.error(msg);
      setError(msg);
      setDocuments([]);
      setFilteredDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [user?.department_id, statusFilter, ownershipFilter, searchTerm]);

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

    if (departmentFilter && departmentFilter !== "all") {
      result = result.filter(
        (doc) =>
          doc.fromDepartment
            .toLowerCase()
            .includes(departmentFilter.toLowerCase()) ||
          doc.toDepartment
            .toLowerCase()
            .includes(departmentFilter.toLowerCase())
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
  }, [searchTerm, departmentFilter, statusFilter, ownershipFilter, documents]);

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
      return "bg-orange-100 text-orange-800";
    }
    if (
      action.includes("checkin") ||
      action.includes("check in") ||
      action === "checkin" ||
      remarksLower.includes("checkin") ||
      remarksLower.includes("check in") ||
      remarksLower.includes("checked in")
    ) {
      return "bg-teal-100 text-teal-800";
    }

    // Check status field directly for checkout/checkin
    if (status === "checkout") {
      return "bg-orange-100 text-orange-800";
    }
    if (status === "checkin") {
      return "bg-teal-100 text-teal-800";
    }

    // If action name exists and is not empty, use a default color
    if (action && action !== "dispatch" && action !== "dispatched") {
      return "bg-indigo-100 text-indigo-800";
    }

    // Fall back to status-based colors
    switch (status) {
      case "dispatch":
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
      default:
        return "bg-gray-100 text-gray-800";
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

    // Check status field directly for checkout/checkin
    if (status === "checkout") {
      return "Check Out";
    }
    if (status === "checkin") {
      return "Check In";
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
      case "dispatch":
        return "Dispatched";
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

  const handleExportPDF = () => {
    if (filteredDocuments.length === 0) {
      toast.error("No documents to export");
      return;
    }

    // Create a new PDF instance
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text("Document Trailing Report", 14, 20);

    // Add subtitle with date
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    // Add summary statistics
    doc.setFontSize(12);
    doc.text(`Total Documents: ${documents.length}`, 14, 40);
    doc.text(
      `In Transit: ${documents.filter((d) => d.status === "intransit").length}`,
      14,
      48
    );
    doc.text(
      `Departments: ${
        [...new Set(documents.map((d) => d.fromDepartment))].length
      }`,
      14,
      56
    );
    doc.text(
      `Active Users: ${[...new Set(documents.map((d) => d.user))].length}`,
      14,
      64
    );

    // Prepare table data
    const tableColumn = [
      "Document Title",
      "Document Code",
      "Type",
      "Status",
      "From Department",
      "To Department",
      "User",
      "Action Date",
      "Remarks",
    ];

    const tableRows = filteredDocuments.map((doc) => [
      doc.documentTitle,
      doc.documentCode,
      doc.documentType,
      getStatusText(doc.actionName, doc.status, doc.remarks),
      doc.fromDepartment,
      doc.toDepartment,
      doc.user,
      format(new Date(doc.actionDate), "MMM d, yyyy h:mm a"),
      doc.remarks,
    ]);

    // Add table
    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 75,
      styles: {
        fontSize: 8,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [59, 130, 246], // blue-500
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251], // gray-50
      },
      columnStyles: {
        0: { cellWidth: 40 }, // Document Title
        1: { cellWidth: 25 }, // Document Code
        2: { cellWidth: 20 }, // Type
        3: { cellWidth: 20 }, // Status
        4: { cellWidth: 30 }, // From Department
        5: { cellWidth: 30 }, // To Department
        6: { cellWidth: 30 }, // User
        7: { cellWidth: 30 }, // Action Date
        8: { cellWidth: 35 }, // Remarks
      },
    });

    // Save the PDF
    doc.save(
      `document-trailing-report-${new Date().toISOString().split("T")[0]}.pdf`
    );

    toast.success("PDF exported successfully!");
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
    <div className="flex flex-col gap-6 p-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Document Trailing</h1>
        <p className="text-muted-foreground">
          Track documents created by departments and shared documents
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
            <p className="text-xs text-muted-foreground">+5 from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              In Transit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter((d) => d.status === "intransit").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Documents in transit
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building className="h-4 w-4" />
              Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {[...new Set(documents.map((d) => d.fromDepartment))].length}
            </div>
            <p className="text-xs text-muted-foreground">Active departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
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
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Document Trails</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="h-4 w-4 mr-2" />
                Export All to PDF
              </Button>
            </div>
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search documents, users, or remarks..."
                className="pl-9 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {" "}
            {/* This is line 507 */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2 flex-shrink-0">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Filters:
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={departmentFilter}
                  onValueChange={setDepartmentFilter}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="IT">IT</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Procurement">Procurement</SelectItem>
                    <SelectItem value="Executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={ownershipFilter}
                  onValueChange={setOwnershipFilter}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by ownership" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Documents</SelectItem>
                    <SelectItem value="owned">Owned Documents</SelectItem>
                    <SelectItem value="shared">Shared Documents</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="dispatch">Dispatched</SelectItem>
                    <SelectItem value="intransit">In Transit</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                    <SelectItem value="archive">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-4">
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-12">
                  {error ? (
                    <div className="space-y-4">
                      <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
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
                      <FileText className="h-16 w-16 mx-auto text-muted" />
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
                      <FileText className="h-16 w-16 mx-auto text-muted" />
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
                            setDepartmentFilter("all");
                            setStatusFilter("all");
                            setOwnershipFilter("all");
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
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors hover:shadow-sm"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="font-medium">
                                {doc.documentTitle}
                              </h3>
                              <Badge variant="secondary" className="text-xs">
                                {doc.documentCode}
                              </Badge>
                              <Badge
                                className={getStatusColor(
                                  doc.actionName,
                                  doc.status,
                                  doc.remarks
                                )}
                              >
                                {getStatusText(
                                  doc.actionName,
                                  doc.status,
                                  doc.remarks
                                )}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {doc.documentType}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewTrails(doc.documentId)}
                          className="w-full sm:w-auto flex-shrink-0"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Trails
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-muted-foreground flex-shrink-0">
                              From:
                            </span>
                            <span className="truncate font-medium">
                              {doc.fromDepartment}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-muted-foreground flex-shrink-0">
                              To:
                            </span>
                            <span className="truncate font-medium">
                              {doc.toDepartment}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-muted-foreground flex-shrink-0">
                              By:
                            </span>
                            <span className="truncate font-medium">
                              {doc.user}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-muted-foreground flex-shrink-0">
                              On:
                            </span>
                            <span className="truncate font-medium">
                              {format(
                                new Date(doc.actionDate),
                                "MMM d, yyyy h:mm a"
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {doc.remarks && (
                        <div className="text-sm bg-muted/50 p-3 rounded-md">
                          <span className="font-medium text-muted-foreground">
                            Remarks:
                          </span>{" "}
                          <span className="text-foreground">{doc.remarks}</span>
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
