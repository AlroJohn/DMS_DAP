"use client";

import { ChartLineDots } from "@/components/reuseable/chart-line-dots";
import { ChartPieLabel } from "@/components/reuseable/chart-pie-label";
import { RecentDocuments } from "@/components/reuseable/recent-documents";
import { DocumentStatsCards } from "@/components/reuseable/document-stats-cards";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Activity,
  Clock,
  FileText,
  Users,
  AlertTriangle,
  Shield,
  Zap,
  CheckCircle,
  TrendingUp,
  Star,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function Page() {
  const { data, loading, error } = useDashboardData();

  if (loading) {
    return (
      <div className="flex flex-col gap-4 max-w-dvw p-4">
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 max-w-dvw p-4">
        <div className="text-center py-10">
          <div className="text-red-500 mb-4">
            <AlertTriangle className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-red-500">Error loading dashboard data: {error}</p>
          <p className="text-muted-foreground text-sm mt-2">
            Please try refreshing the page
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-4 max-w-dvw p-4">
        <div className="text-center py-10">
          <p className="text-muted-foreground">No dashboard data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-2 max-w-dvw">
      {/* Document Statistics Cards */}
      <DocumentStatsCards stats={data.documentStats} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
        <ChartPieLabel documentStats={data.documentStats} />
        <ChartLineDots chartData={data.documentTrends} />
      </div>

      {/* Quick Stats & Metrics - Row 1 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.recentActivity}</div>
            <p className="text-xs text-muted-foreground mt-1">
              activities this week
            </p>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground mt-1">
              awaiting your action
            </p>
          </CardContent>
        </Card>

        {/* Active Workflows */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-600" />
              Active Workflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeWorkflows}</div>
            <p className="text-xs text-muted-foreground mt-1">
              workflows running
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Department Statistics & Key Metrics - Row 3 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Department Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Department Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.departmentPerformance.map((dept, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-2">
                  <span>{dept.name}</span>
                  <span className="text-muted-foreground">
                    {dept.documentsProcessed} docs
                  </span>
                </div>
                <Progress value={dept.efficiency} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Workflow Completion Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Workflow Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Completed</span>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">
                {data.workflowStats.completedWorkflows}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">In Progress</span>
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                {data.workflowStats.inProgressWorkflows}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Pending</span>
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
                {data.workflowStats.pendingWorkflows}
              </Badge>
            </div>
            <div className="mt-4 p-2 bg-muted rounded">
              <p className="text-xs text-muted-foreground">Success Rate</p>
              <p className="text-lg font-bold">
                {data.workflowStats.totalWorkflows > 0
                  ? Math.round(
                      (data.workflowStats.completedWorkflows /
                        data.workflowStats.totalWorkflows) *
                        100
                    ) + "%"
                  : "0%"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Document Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Document Types
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.documentTypes && data.documentTypes.length > 0 ? (
              data.documentTypes.map((docType, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{docType.type}</span>
                  <span className="font-semibold">{docType.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No document types available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents Section */}
      <div className="grid grid-cols-1 gap-4">
        <RecentDocuments documents={data.recentDocuments} />
      </div>

      {/* System Alerts & Notifications removed */}

      {/* Bottom Section */}
      <div className="flex flex-row gap-4 w-full">
        {/* Additional space for future components */}
      </div>
    </div>
  );
}
