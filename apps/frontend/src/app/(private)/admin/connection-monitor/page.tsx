"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Activity } from "lucide-react";

export default function ConnectionMonitorPage() {
  const connections = [
    { name: "DocOnChain API", status: "Connected", latency: "142ms", uptime: "99.9%" },
    { name: "Database", status: "Connected", latency: "12ms", uptime: "100%" },
    { name: "File Storage", status: "Connected", latency: "45ms", uptime: "99.8%" },
    { name: "Email Service", status: "Connected", latency: "89ms", uptime: "99.5%" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Connection Monitor</h1>
        <p className="text-muted-foreground">Monitor external service connections</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Service Connections</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {connections.map((conn) => (
              <div key={conn.name} className="flex items-center justify-between border-b pb-4 last:border-0">
                <div className="space-y-1">
                  <div className="font-medium">{conn.name}</div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1"><Activity className="h-3 w-3" />Latency: {conn.latency}</div>
                    <div>Uptime: {conn.uptime}</div>
                  </div>
                </div>
                <Badge variant="outline" className="border-green-600 text-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />{conn.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
