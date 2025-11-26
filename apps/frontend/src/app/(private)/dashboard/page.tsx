"use client";

import { ChartLineDots } from "@/components/reuseable/chart-line-dots";
import { ChartPieLabel } from "@/components/reuseable/chart-pie-label";
import { RecentDocuments } from "@/components/reuseable/recent-documents";
import { DocumentStatsCards } from "@/components/reuseable/document-stats-cards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, FileText, Users, AlertTriangle, Shield, Zap, CheckCircle, TrendingUp, Star } from "lucide-react";
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
          <p className="text-muted-foreground text-sm mt-2">Please try refreshing the page</p>
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
    <div className="flex flex-col gap-4 max-w-dvw">
      {/* Document Statistics Cards */}
      <DocumentStatsCards stats={data.documentStats} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
        <ChartPieLabel documentStats={data.documentStats} />
        <ChartLineDots chartData={data.documentTrends} />
      </div>

      {/* Quick Stats & Metrics - Row 1 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <p className="text-xs text-muted-foreground mt-1">activities this week</p>
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
            <p className="text-xs text-muted-foreground mt-1">awaiting your action</p>
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
            <p className="text-xs text-muted-foreground mt-1">workflows running</p>
          </CardContent>
        </Card>

        {/* Collaborators */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-600" />
              Collaborators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.collaborators}</div>
            <p className="text-xs text-muted-foreground mt-1">team members</p>
          </CardContent>
        </Card>
      </div>

      {/* Storage & Compliance - Row 2 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Storage Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Storage Usage
            </CardTitle>
            <CardDescription>Out of total allocated storage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>{data.storageUsage.used} GB used</span>
                <span className="text-muted-foreground">{data.storageUsage.total} GB</span>
              </div>
              <Progress value={data.storageUsage.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">{data.storageUsage.percentage}% used</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Documents</p>
                <p className="font-semibold">85 GB</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Images</p>
                <p className="font-semibold">32 GB</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Videos</p>
                <p className="font-semibold">11 GB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Compliance Status
            </CardTitle>
            <CardDescription>System compliance score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Compliance Score</span>
                <span className="font-semibold">{data.complianceStatus}%</span>
              </div>
              <Progress value={data.complianceStatus} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Audit Trail</span>
                <Badge variant="outline" className="bg-green-50">Compliant</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Data Security</span>
                <Badge variant="outline" className="bg-green-50">Passed</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Blockchain</span>
                <Badge variant="outline" className="bg-green-50">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Activity & Top Documents - Row 2 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Recent System Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              System Activity
            </CardTitle>
            <CardDescription>Latest user actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-3">
              {data.systemActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.action.includes('signed') ? 'bg-green-500' :
                    activity.action.includes('activated') ? 'bg-blue-500' :
                    activity.action.includes('uploaded') ? 'bg-purple-500' : 'bg-orange-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.timestamp.toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-600" />
              Top Documents
            </CardTitle>
            <CardDescription>Most accessed this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topDocuments.map((doc, index) => (
                <div key={doc.id} className="flex items-center justify-between p-2 rounded hover:bg-accent transition-colors">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText className={`h-4 w-4 flex-shrink-0 ${
                      index === 0 ? 'text-blue-600' :
                      index === 1 ? 'text-green-600' : 'text-purple-600'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.views} views</p>
                    </div>
                  </div>
                  <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Statistics & Key Metrics - Row 3 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Department Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Department Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.departmentPerformance.map((dept, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-2">
                  <span>{dept.name}</span>
                  <span className="text-muted-foreground">{dept.documentsProcessed} docs</span>
                </div>
                <Progress value={dept.efficiency} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Workflow Completion Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Workflow Stats</CardTitle>
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
                  ? Math.round((data.workflowStats.completedWorkflows / data.workflowStats.totalWorkflows) * 100) + '%'
                  : '0%'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Document Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Document Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Contracts</span>
              <span className="font-semibold">285</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Reports</span>
              <span className="font-semibold">412</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Policies</span>
              <span className="font-semibold">156</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Other</span>
              <span className="font-semibold">248</span>
            </div>
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
