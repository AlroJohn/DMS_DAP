"use client";

import { useState } from "react";
import { BarChart3, FileText, Users, Activity, Download, Calendar, TrendingUp, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export default function ReportsPage() {
  const router = useRouter();
  
  const reportCategories = [
    {
      title: "Audit Trail",
      description: "View detailed audit logs and user activity",
      icon: Activity,
      color: "bg-blue-100 text-blue-600",
      route: "/reports/audit-trail",
      count: "1,234 entries"
    },
    {
      title: "Usage Reports",
      description: "System utilization and performance metrics",
      icon: BarChart3,
      color: "bg-green-100 text-green-600",
      route: "/reports/usage",
      count: "15 reports"
    },
    {
      title: "Data Migration",
      description: "Document migration and transfer reports",
      icon: FileText,
      color: "bg-purple-100 text-purple-600",
      route: "/reports/data-migration",
      count: "8 migrations"
    }
  ];

  const recentReports = [
    {
      id: 1,
      name: "Monthly Document Activity",
      type: "Usage Report",
      generated: "2024-01-15",
      size: "2.4 MB",
      status: "Ready"
    },
    {
      id: 2,
      name: "User Access Audit",
      type: "Audit Trail",
      generated: "2024-01-14",
      size: "1.8 MB",
      status: "Ready"
    },
    {
      id: 3,
      name: "System Migration Log",
      type: "Data Migration",
      generated: "2024-01-13",
      size: "5.2 MB",
      status: "Processing"
    }
  ];

  const stats = [
    { label: "Total Reports", value: "156", icon: FileText, color: "text-blue-600" },
    { label: "This Month", value: "23", icon: Calendar, color: "text-green-600" },
    { label: "Active Users", value: "89", icon: Users, color: "text-purple-600" },
    { label: "Growth Rate", value: "+12%", icon: TrendingUp, color: "text-orange-600" }
  ];

  return (
    <div className="flex h-full flex-col gap-6 px-4 pb-4 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">Generate and view system reports and analytics</p>
          </div>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export All
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Report Categories */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Report Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {reportCategories.map((category, index) => {
                  const Icon = category.icon;
                  return (
                    <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(category.route)}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${category.color}`}>
                              <Icon className="h-6 w-6" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{category.title}</h3>
                              <p className="text-muted-foreground text-sm">{category.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">{category.count}</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reports */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentReports.map((report) => (
                <div key={report.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm">{report.name}</h4>
                    <Badge 
                      variant={report.status === 'Ready' ? 'default' : 'secondary'}
                      className={report.status === 'Ready' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {report.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Type: {report.type}</p>
                    <p>Generated: {report.generated}</p>
                    <p>Size: {report.size}</p>
                  </div>
                  {report.status === 'Ready' && (
                    <Button size="sm" variant="outline" className="w-full mt-3">
                      <Download className="h-3 w-3 mr-2" />
                      Download
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}