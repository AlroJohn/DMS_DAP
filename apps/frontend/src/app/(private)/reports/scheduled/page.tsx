"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Clock } from "lucide-react";

export default function ScheduledReportsPage() {
  const schedules = [
    { id: "1", name: "Monthly Compliance Report", frequency: "Monthly", nextRun: "2025-02-01", recipients: ["admin@example.com"], status: "Active" },
    { id: "2", name: "Weekly Usage Report", frequency: "Weekly", nextRun: "2025-01-15", recipients: ["manager@example.com"], status: "Active" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scheduled Reports</h1>
          <p className="text-muted-foreground">Manage automated report delivery</p>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" />New Schedule</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Active Schedules</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{schedule.name}</span>
                    <Badge variant="outline" className="border-green-600 text-green-600">{schedule.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1"><Clock className="h-3 w-3" />Frequency: {schedule.frequency}</div>
                    <div>Next run: {schedule.nextRun}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Recipients: {schedule.recipients.join(", ")}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Edit</Button>
                  <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
