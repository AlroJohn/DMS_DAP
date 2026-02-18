"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Edit,
  Trash2,
  Download,
  ArrowRightLeft,
  CheckCircle,
  Archive,
  FileSignature,
  Loader2,
  Search,
  RefreshCw,
  CheckSquare,
  Square,
} from "lucide-react";
import { useActivityLogs } from "@/hooks/use-activity.log";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReportFilters, type ReportFilters as ReportFiltersType } from "@/components/reports/report-filters";

export default function ActivityLogsPage() {
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [documentTypes, setDocumentTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [reportFilters, setReportFilters] = useState<ReportFiltersType>({
    dateRange: { from: undefined, to: undefined },
    dateRangePreset: "all",
    department: "all",
    classification: "all",
    documentType: "all",
    documentCode: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(
    new Set(),
  );

  const { activities: rawActivities, stats, isLoading, error, refetch } = useActivityLogs({
    startDate: reportFilters.dateRange.from,
    endDate: reportFilters.dateRange.to,
    documentCode: reportFilters.documentCode || undefined,
  });

  // Filter activities based on search term and time filter
  const activities = useMemo(() => {
    let result = rawActivities;

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (activity) =>
          (activity.document || "").toLowerCase().includes(term) ||
          (activity.user || "").toLowerCase().includes(term) ||
          (activity.documentCode || "").toLowerCase().includes(term) ||
          (activity.action || "").toLowerCase().includes(term),
      );
    }

    // Apply time filter
    if (filter !== "all") {
      const now = new Date();
      result = result.filter((activity) => {
        const activityDate = new Date(activity.timestamp);
        switch (filter) {
          case "today":
            return activityDate.toDateString() === now.toDateString();
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return activityDate >= weekAgo;
          case "month":
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return activityDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    return result;
  }, [rawActivities, searchTerm, filter]);

  // Get entries to export (selected ones or all if none selected)
  const entriesToExport = useMemo(() => {
    if (selectedEntries.size === 0) return activities;
    return activities.filter((activity) =>
      selectedEntries.has(activity.id),
    );
  }, [activities, selectedEntries]);

  // Toggle entry selection
  const toggleEntry = (entryId: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  // Select all visible entries
  const selectAll = () => {
    const allIds = new Set(
      activities.map((activity) => activity.id),
    );
    setSelectedEntries(allIds);
  };

  // Clear all selections
  const clearAll = () => {
    setSelectedEntries(new Set());
  };

  // Check if all visible entries are selected
  const allSelected =
    activities.length > 0 &&
    activities.every((activity) => selectedEntries.has(activity.id));

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
        console.error("Error fetching filter options:", error);
      }
    };

    fetchFilterOptions();
  }, []);

  // Get icon based on activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "create":
        return <FileText className="h-4 w-4" />;
      case "update":
        return <Edit className="h-4 w-4" />;
      case "delete":
        return <Trash2 className="h-4 w-4" />;
      case "download":
        return <Download className="h-4 w-4" />;
      case "transfer":
        return <ArrowRightLeft className="h-4 w-4" />;
      case "receive":
        return <CheckCircle className="h-4 w-4" />;
      case "archive":
        return <Archive className="h-4 w-4" />;
      case "sign":
        return <FileSignature className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Get badge variant based on activity type
  const getBadgeVariant = (
    type: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case "create":
        return "default";
      case "delete":
        return "destructive";
      case "transfer":
      case "receive":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleExport = async (format: "pdf" | "csv" | "excel") => {
    if (activities.length === 0) return;

    // Use selected documents or all filtered if none selected
    const dataToExport = entriesToExport;

    if (dataToExport.length === 0) {
      alert("No activities to export. Please select activities or adjust your filters.");
      return;
    }

    try {
      setLoading(true);

      if (format === "csv") {
        // Create CSV content
        let csvContent = `Activity Logs Report\n\n`;

        // Add export info
        csvContent += `Total Entries: ${dataToExport.length}\n`;
        if (selectedEntries.size > 0) {
          csvContent += `Export Type: Selected Entries\n`;
        } else {
          csvContent += `Export Type: All Filtered Entries\n`;
        }
        csvContent += `\n`;

        // Add statistics
        csvContent += "Statistics\n";
        csvContent += `Metric,Value\n`;
        csvContent += `Total Actions,${stats?.totalActions || 0}\n`;
        csvContent += `Today,${stats?.today || 0}\n`;
        csvContent += `This Week,${stats?.thisWeek || 0}\n`;
        csvContent += `Active Users,${stats?.activeUsers || 0}\n\n`;

        // Add activities
        csvContent += "Activities\n";
        csvContent += `Action,Document,Document Code,User,Type,Timestamp,From Department,To Department,Remarks\n`;
        dataToExport.forEach((activity) => {
          csvContent += `"${activity.action}","${activity.document}","${activity.documentCode || ""}","${activity.user}","${activity.type}","${new Date(activity.timestamp).toLocaleString()}","${activity.fromDepartment || ""}","${activity.toDepartment || ""}","${activity.remarks || ""}"\n`;
        });

        // Create and download the CSV file
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);

        link.setAttribute("href", url);
        link.setAttribute(
          "download",
          `activity-logs-report-${new Date().toISOString().split("T")[0]}.csv`,
        );
        link.style.visibility = "hidden";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (format === "excel") {
        // For Excel export, we'll use the dynamic import approach
        const { utils, writeFile } = await import("xlsx");

        // Create worksheets for different data sections
        const statsData = [
          ["Metric", "Value"],
          ["Total Actions", stats?.totalActions || 0],
          ["Today", stats?.today || 0],
          ["This Week", stats?.thisWeek || 0],
          ["Active Users", stats?.activeUsers || 0],
          [],
          ["Export Info", ""],
          ["Total Entries", dataToExport.length],
          [
            "Export Type",
            selectedEntries.size > 0
              ? "Selected Entries"
              : "All Filtered Entries",
          ],
        ];

        const activitiesData = [
          [
            "Action",
            "Document",
            "Document Code",
            "User",
            "Type",
            "Timestamp",
            "From Department",
            "To Department",
            "Remarks",
          ],
        ];
        dataToExport.forEach((activity) => {
          activitiesData.push([
            activity.action,
            activity.document,
            activity.documentCode || "",
            activity.user,
            activity.type,
            new Date(activity.timestamp).toLocaleString(),
            activity.fromDepartment || "",
            activity.toDepartment || "",
            activity.remarks || "",
          ]);
        });

        // Create workbook and add worksheets
        const wb = utils.book_new();
        const statsWs = utils.aoa_to_sheet(statsData);
        const activitiesWs = utils.aoa_to_sheet(activitiesData);

        utils.book_append_sheet(wb, statsWs, "Statistics");
        utils.book_append_sheet(wb, activitiesWs, "Activities");

        // Write the file
        writeFile(
          wb,
          `activity-logs-report-${
            new Date().toISOString().split("T")[0]
          }.xlsx`,
        );
      } else if (format === "pdf") {
        // For PDF export, we'll create a properly styled PDF using jsPDF
        const { jsPDF } = await import("jspdf");
        await import("jspdf-autotable");

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;

        // Add header with logo and title
        try {
          const logoResponse = await fetch("/image/qby.png");
          if (logoResponse.ok) {
            const logoBlob = await logoResponse.blob();
            const logoUrl = URL.createObjectURL(logoBlob);

            const img = new Image();
            img.src = logoUrl;

            await new Promise((resolve) => {
              img.onload = resolve;
            });

            const maxWidth = 40;
            const maxHeight = 20;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }

            doc.addImage(logoUrl, "PNG", margin, margin, width, height);
            URL.revokeObjectURL(logoUrl);
          }
        } catch (error) {
          console.warn("Could not load logo:", error);
        }

        // Add title
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59);
        doc.text("Activity Logs Report", pageWidth / 2, margin + 10, {
          align: "center",
        });

        // Add filter info
        doc.setFontSize(12);
        doc.setTextColor(107, 114, 128);
        doc.text(
          `Filter: ${
            filter === "all"
              ? "All Activities"
              : filter.charAt(0).toUpperCase() + filter.slice(1)
          }`,
          pageWidth / 2,
          margin + 18,
          { align: "center" },
        );

        // Add export type info
        doc.text(
          `Export Type: ${
            selectedEntries.size > 0
              ? `Selected Entries (${dataToExport.length})`
              : `All Filtered Entries (${dataToExport.length})`
          }`,
          pageWidth / 2,
          margin + 24,
          { align: "center" },
        );

        // Add report generation date
        const reportDate = new Date().toLocaleDateString();
        doc.text(`Generated on: ${reportDate}`, pageWidth / 2, margin + 30, {
          align: "center",
        });

        let currentY = margin + 41;

        // Add statistics table
        const statsTableData = [
          ["Total Actions", (stats?.totalActions || 0).toString()],
          ["Today", (stats?.today || 0).toString()],
          ["This Week", (stats?.thisWeek || 0).toString()],
          ["Active Users", (stats?.activeUsers || 0).toString()],
        ];

        (doc as any).autoTable({
          startY: currentY,
          head: [["Metric", "Value"]],
          body: statsTableData,
          theme: "grid",
          headStyles: {
            fillColor: [22, 163, 74],
            textColor: [255, 255, 255],
            fontSize: 12,
            fontStyle: "bold",
          },
          bodyStyles: {
            fontSize: 11,
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251],
          },
          margin: { left: margin, right: margin },
          styles: {
            cellPadding: 5,
          },
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;

        // Add activities table
        if (dataToExport.length > 0) {
          const activitiesTableData = dataToExport.map((activity) => [
            activity.action.substring(0, 20) + (activity.action.length > 20 ? "..." : ""),
            activity.document.substring(0, 25) + (activity.document.length > 25 ? "..." : ""),
            activity.documentCode || "-",
            activity.user.substring(0, 15) + (activity.user.length > 15 ? "..." : ""),
            activity.type,
            new Date(activity.timestamp).toLocaleDateString(),
            activity.remarks ? activity.remarks.substring(0, 20) + (activity.remarks.length > 20 ? "..." : "") : "-",
          ]);

          (doc as any).autoTable({
            startY: currentY,
            head: [
              [
                "Action",
                "Document",
                "Code",
                "User",
                "Type",
                "Date",
                "Remarks",
              ],
            ],
            body: activitiesTableData,
            theme: "grid",
            headStyles: {
              fillColor: [37, 99, 235],
              textColor: [255, 255, 255],
              fontSize: 10,
              fontStyle: "bold",
            },
            bodyStyles: {
              fontSize: 8,
            },
            alternateRowStyles: {
              fillColor: [249, 250, 251],
            },
            margin: { left: margin, right: margin },
            styles: {
              cellPadding: 3,
            },
          });
        }

        // Add footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(10);
          doc.setTextColor(107, 114, 128);
          doc.text(
            `Page ${i} of ${pageCount}`,
            pageWidth - margin - 25,
            doc.internal.pageSize.height - 10,
          );
        }

        // Save the PDF
        doc.save(
          `activity-logs-report-${new Date().toISOString().split("T")[0]}.pdf`,
        );
      }
    } catch (err: any) {
      console.error("Error exporting report:", err);
      alert(
        `Failed to export report as ${format.toUpperCase()}: ${
          err.message || "Unknown error"
        }`,
      );
    } finally {
      setLoading(false);
    }
  };

  if (isLoading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading activity logs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-red-500 text-lg mb-4">
          Error loading activity logs
        </div>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
          <p className="text-muted-foreground">
            User activity tracking and monitoring
            {selectedEntries.size > 0 && (
              <span className="ml-2 text-primary font-medium">
                ({selectedEntries.size} selected)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {activities.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={allSelected ? clearAll : selectAll}
              >
                {allSelected ? (
                  <>
                    <Square className="mr-2 h-4 w-4" />
                    Clear All
                  </>
                ) : (
                  <>
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Select All
                  </>
                )}
              </Button>
            </div>
          )}
          <div className="relative group inline-block">
            <Button
              size="sm"
              disabled={loading || isLoading}
            >
              {loading || isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  Export
                  {selectedEntries.size > 0 && (
                    <Badge className="ml-2" variant="secondary">
                      {selectedEntries.size}
                    </Badge>
                  )}
                </>
              )}
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

      {activities.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
          <p>
            <strong>Export Options:</strong> Select specific entries using the
            checkboxes below, or export all{" "}
            {selectedEntries.size > 0 ? (
              <span>
                (Currently exporting: <strong>{entriesToExport.length}</strong>{" "}
                {selectedEntries.size > 0 ? "selected" : "filtered"}{" "}
                entry/entries)
              </span>
            ) : (
              <span>
                filtered entries (<strong>{activities.length}</strong>)
              </span>
            )}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents, users, or actions..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activities</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats?.totalActions.toLocaleString() || "0"
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats?.today.toLocaleString() || "0"
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats?.thisWeek.toLocaleString() || "0"
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats?.activeUsers.toLocaleString() || "0"
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ReportFilters
              filters={reportFilters}
              onFiltersChange={setReportFilters}
              departments={departments}
              documentTypes={documentTypes}
              showDepartmentFilter={true}
              showClassificationFilter={true}
              showDocumentTypeFilter={true}
              showDocumentCodeFilter={false}
            />

              {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No activity logs found
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 border-b pb-3 last:border-0"
                >
                  <Checkbox
                    checked={selectedEntries.has(activity.id)}
                    onCheckedChange={() => toggleEntry(activity.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {activity.action}: {activity.document}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {activity.user} • {formatTimestamp(activity.timestamp)}
                          {activity.documentCode && (
                            <span className="ml-2">
                              ({activity.documentCode})
                            </span>
                          )}
                        </div>
                        {(activity.fromDepartment || activity.toDepartment) && (
                          <div className="text-xs text-muted-foreground">
                            {activity.fromDepartment &&
                              `From: ${activity.fromDepartment}`}
                            {activity.fromDepartment &&
                              activity.toDepartment &&
                              " → "}
                            {activity.toDepartment &&
                              `To: ${activity.toDepartment}`}
                          </div>
                        )}
                        {activity.remarks && (
                          <div className="text-xs text-muted-foreground italic">
                            {activity.remarks}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={getBadgeVariant(activity.type)}
                      className="shrink-0"
                    >
                      {activity.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
