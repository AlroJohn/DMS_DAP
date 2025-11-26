"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, XCircle, CheckCircle2 } from "lucide-react";

export default function SecurityAlertsPage() {
  const alerts = [
    { id: "1", type: "Warning", message: "Unusual login activity detected from IP 192.168.1.105", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), severity: "Medium" },
    { id: "2", type: "Critical", message: "Failed blockchain verification for document ID: DOC-1234", timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), severity: "High" },
    { id: "3", type: "Info", message: "System security scan completed successfully", timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), severity: "Low" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security Alerts</h1>
        <p className="text-muted-foreground">Monitor security events and tamper detection</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Critical Alerts</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">1</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Warnings</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-yellow-600">1</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Resolved</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">45</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Alerts</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-4 border-b pb-4 last:border-0">
                {alert.severity === "High" ? <XCircle className="h-5 w-5 text-red-600 mt-0.5" /> : alert.severity === "Medium" ? <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" /> : <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{alert.message}</span>
                    <Badge variant={alert.severity === "High" ? "destructive" : alert.severity === "Medium" ? "default" : "secondary"}>{alert.severity}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(alert.timestamp).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
