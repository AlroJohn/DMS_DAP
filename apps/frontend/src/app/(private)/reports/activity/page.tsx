"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  });

  const { activities, stats, isLoading, error, refetch } = useActivityLogs({
    startDate: reportFilters.dateRange.from,
    endDate: reportFilters.dateRange.to,
  });

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

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
        <p className="text-muted-foreground">
          User activity tracking and monitoring
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
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
                    className="flex-shrink-0"
                  >
                    {activity.type}
                  </Badge>
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
