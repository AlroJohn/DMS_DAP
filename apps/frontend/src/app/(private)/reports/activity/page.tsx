"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Edit, Trash2, Download } from "lucide-react";

export default function ActivityLogsPage() {
  const activities = [
    { user: "John Doe", action: "Created document", document: "Contract-2024", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), type: "create" },
    { user: "Jane Smith", action: "Updated document", document: "NDA-HR-001", timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), type: "update" },
    { user: "Bob Johnson", action: "Downloaded document", document: "Report-Q4", timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), type: "download" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
        <p className="text-muted-foreground">User activity tracking and monitoring</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Actions</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">15,428</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Today</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">287</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">This Week</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">1,842</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active Users</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">42</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activities.map((activity, i) => (
              <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div className="flex items-center gap-3">
                  {activity.type === "create" ? <FileText className="h-4 w-4" /> : activity.type === "update" ? <Edit className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{activity.action}: {activity.document}</div>
                    <div className="text-xs text-muted-foreground">{activity.user} • {new Date(activity.timestamp).toLocaleString()}</div>
                  </div>
                </div>
                <Badge variant="secondary">{activity.type}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
