"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Server, Database, Cpu, HardDrive, Activity } from "lucide-react";

export default function SystemHealthPage() {
  const services = [
    { name: "API Server", status: "Operational", uptime: "99.9%", responseTime: "45ms" },
    { name: "Database", status: "Operational", uptime: "99.8%", responseTime: "12ms" },
    { name: "File Storage", status: "Operational", uptime: "100%", responseTime: "23ms" },
    { name: "Socket.IO", status: "Operational", uptime: "99.7%", responseTime: "8ms" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
        <p className="text-muted-foreground">Monitor system status and performance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Server className="h-4 w-4" />CPU Usage</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">42%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><HardDrive className="h-4 w-4" />Memory</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">68%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Database className="h-4 w-4" />Disk Space</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">55%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Activity className="h-4 w-4" />Uptime</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">99.9%</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Service Status</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services.map((service) => (
              <div key={service.name} className="flex items-center justify-between border-b pb-4 last:border-0">
                <div className="space-y-1">
                  <div className="font-medium">{service.name}</div>
                  <div className="text-sm text-muted-foreground">Uptime: {service.uptime} • Response: {service.responseTime}</div>
                </div>
                <Badge variant="outline" className="border-green-600 text-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />{service.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
