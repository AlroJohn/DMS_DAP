"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Monitor, Smartphone, LogOut } from "lucide-react";

export default function SessionManagementPage() {
  const sessions = [
    { id: "1", device: "Chrome on Windows", ip: "192.168.1.100", location: "New York, US", lastActive: "Just now", current: true },
    { id: "2", device: "Safari on iPhone", ip: "192.168.1.101", location: "New York, US", lastActive: "2 hours ago", current: false },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Session Management</h1>
        <p className="text-muted-foreground">Manage active sessions and timeout settings</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Session Timeout Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Inactivity Timeout (minutes)</Label>
              <Input type="number" defaultValue="30" />
            </div>
            <div className="space-y-2">
              <Label>Maximum Session Duration (hours)</Label>
              <Input type="number" defaultValue="24" />
            </div>
          </div>
          <Button>Save Settings</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Active Sessions</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                <div className="flex items-center gap-3">
                  {session.device.includes("iPhone") ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{session.device}</span>
                      {session.current && <Badge>Current</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">{session.ip} • {session.location} • {session.lastActive}</div>
                  </div>
                </div>
                {!session.current && <Button variant="destructive" size="sm"><LogOut className="mr-2 h-4 w-4" />Revoke</Button>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
