import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Users, FileText, TrendingUp, Download, Calendar, Activity } from "lucide-react";

export const metadata: Metadata = {
  title: "Usage Reports | DMS",
  description: "System utilization and performance metrics",
};

export default function UsageReportsPage() {
  const usageStats = [
    { label: "Total Documents", value: "2,847", change: "+12%", trend: "up" },
    { label: "Active Users", value: "156", change: "+8%", trend: "up" },
    { label: "Storage Used", value: "45.2 GB", change: "+15%", trend: "up" },
    { label: "API Calls", value: "18,429", change: "-3%", trend: "down" }
  ];

  const departmentUsage = [
    { name: "Finance", documents: 847, users: 23, storage: "12.4 GB", activity: 95 },
    { name: "HR", documents: 623, users: 18, storage: "8.7 GB", activity: 78 },
    { name: "IT", documents: 445, users: 15, storage: "15.2 GB", activity: 82 },
    { name: "Legal", documents: 332, users: 12, storage: "6.8 GB", activity: 67 }
  ];

  const recentActivity = [
    { action: "Document Upload", user: "John Smith", time: "2 minutes ago", department: "Finance" },
    { action: "Workflow Completed", user: "Sarah Johnson", time: "5 minutes ago", department: "HR" },
    { action: "Document Signed", user: "Mike Davis", time: "8 minutes ago", department: "Legal" },
    { action: "User Login", user: "Lisa Chen", time: "12 minutes ago", department: "IT" }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usage Reports</h1>
          <p className="text-muted-foreground">System utilization and performance analytics</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="30days">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {usageStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className={`h-3 w-3 ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`} />
                    <span className={`text-xs ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  {index === 0 && <FileText className="h-6 w-6 text-blue-600" />}
                  {index === 1 && <Users className="h-6 w-6 text-blue-600" />}
                  {index === 2 && <BarChart3 className="h-6 w-6 text-blue-600" />}
                  {index === 3 && <Activity className="h-6 w-6 text-blue-600" />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Department Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departmentUsage.map((dept, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{dept.name}</h4>
                    <Badge variant="outline">{dept.activity}% active</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">{dept.documents}</span> documents
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{dept.users}</span> users
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{dept.storage}</span> storage
                    </div>
                  </div>
                  <Progress value={dept.activity} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.user} • {activity.department}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Usage trend chart would be displayed here</p>
              <p className="text-sm text-gray-500">Integration with charting library needed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}