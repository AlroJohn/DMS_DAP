"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Users,
  FileText,
  Activity,
} from "lucide-react";

export default function WorkflowPerformancePage() {
  const performanceData = {
    avgCompletionTime: "4.2 hours",
    onTimeCompletion: "87%",
    totalWorkflows: 1847,
    activeWorkflows: 243,
  };

  const workflowMetrics = [
    {
      id: "1",
      name: "Document Approval",
      avgTime: "3.5 hours",
      completionRate: 92,
      totalRuns: 456,
      activeRuns: 34,
      trend: "up",
      bottleneck: "Legal Review",
    },
    {
      id: "2",
      name: "Contract Signing",
      avgTime: "6.2 hours",
      completionRate: 85,
      totalRuns: 189,
      activeRuns: 18,
      trend: "down",
      bottleneck: "Stakeholder Approval",
    },
    {
      id: "3",
      name: "Blockchain Verification",
      avgTime: "1.8 hours",
      completionRate: 98,
      totalRuns: 342,
      activeRuns: 12,
      trend: "up",
      bottleneck: null,
    },
    {
      id: "4",
      name: "Invoice Processing",
      avgTime: "5.1 hours",
      completionRate: 79,
      totalRuns: 523,
      activeRuns: 67,
      trend: "down",
      bottleneck: "Finance Approval",
    },
    {
      id: "5",
      name: "HR Onboarding",
      avgTime: "4.8 hours",
      completionRate: 88,
      totalRuns: 234,
      activeRuns: 28,
      trend: "stable",
      bottleneck: "Document Collection",
    },
    {
      id: "6",
      name: "Compliance Check",
      avgTime: "2.3 hours",
      completionRate: 95,
      totalRuns: 678,
      activeRuns: 45,
      trend: "up",
      bottleneck: null,
    },
  ];

  const departmentPerformance = [
    { name: "Legal", avgTime: "5.2h", completionRate: 89, workloads: 145 },
    { name: "Finance", avgTime: "4.8h", completionRate: 83, workloads: 198 },
    { name: "HR", avgTime: "3.9h", completionRate: 92, workloads: 112 },
    { name: "IT", avgTime: "2.1h", completionRate: 96, workloads: 87 },
    { name: "Operations", avgTime: "4.5h", completionRate: 85, workloads: 156 },
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 90) return "text-green-600";
    if (rate >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workflow Performance</h1>
        <p className="text-muted-foreground">
          Monitor workflow efficiency and identify bottlenecks
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Completion Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.avgCompletionTime}</div>
            <p className="text-xs text-muted-foreground">Across all workflows</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              On-Time Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.onTimeCompletion}</div>
            <p className="text-xs text-muted-foreground">Meeting SLA targets</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Workflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.totalWorkflows.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Active Workflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.activeWorkflows}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Workflow Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workflowMetrics.map((workflow) => (
              <div
                key={workflow.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{workflow.name}</h3>
                      {getTrendIcon(workflow.trend)}
                    </div>
                    {workflow.bottleneck && (
                      <div className="flex items-center gap-2 mt-1">
                        <AlertCircle className="h-3 w-3 text-yellow-500" />
                        <span className="text-xs text-muted-foreground">
                          Bottleneck: {workflow.bottleneck}
                        </span>
                      </div>
                    )}
                  </div>
                  <Badge
                    variant={workflow.completionRate >= 90 ? "default" : "secondary"}
                  >
                    {workflow.completionRate}% Complete
                  </Badge>
                </div>

                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">Avg Time</div>
                    <div className="font-medium">{workflow.avgTime}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">Total Runs</div>
                    <div className="font-medium">{workflow.totalRuns.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">Active Runs</div>
                    <div className="font-medium">{workflow.activeRuns}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">Completion Rate</div>
                    <div className={`font-medium ${getCompletionRateColor(workflow.completionRate)}`}>
                      {workflow.completionRate}%
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t">
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        workflow.completionRate >= 90
                          ? "bg-green-500"
                          : workflow.completionRate >= 75
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${workflow.completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Department Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {departmentPerformance.map((dept) => (
              <div key={dept.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{dept.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {dept.workloads} active workflows
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <div className="text-muted-foreground text-xs">Avg Time</div>
                      <div className="font-medium">{dept.avgTime}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-muted-foreground text-xs">Completion</div>
                      <div className={`font-medium ${getCompletionRateColor(dept.completionRate)}`}>
                        {dept.completionRate}%
                      </div>
                    </div>
                  </div>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      dept.completionRate >= 90
                        ? "bg-green-500"
                        : dept.completionRate >= 75
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${dept.completionRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Bottlenecks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workflowMetrics
                .filter((w) => w.bottleneck)
                .sort((a, b) => a.completionRate - b.completionRate)
                .map((workflow) => (
                  <div
                    key={workflow.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div>
                      <div className="font-medium">{workflow.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {workflow.bottleneck}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">{workflow.avgTime}</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">Blockchain workflows performing well</div>
                  <div className="text-xs text-muted-foreground">
                    98% completion rate with 1.8h average time
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">Invoice processing needs attention</div>
                  <div className="text-xs text-muted-foreground">
                    79% completion rate - Finance approval bottleneck
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">IT department leads in efficiency</div>
                  <div className="text-xs text-muted-foreground">
                    96% completion rate with 2.1h average time
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
