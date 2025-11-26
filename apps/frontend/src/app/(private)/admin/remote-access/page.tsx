"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function RemoteAccessPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Remote Access</h1>
        <p className="text-muted-foreground">Configure secure remote access settings</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Remote Access Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Remote Access</Label>
              <div className="text-sm text-muted-foreground">Allow users to access the system remotely</div>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require VPN</Label>
              <div className="text-sm text-muted-foreground">Require VPN connection for remote access</div>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Mobile Access</Label>
              <div className="text-sm text-muted-foreground">Allow access from mobile devices</div>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>IP Whitelist</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Allowed IP Ranges</Label>
            <Input placeholder="192.168.1.0/24" />
          </div>
          <Button>Add IP Range</Button>
        </CardContent>
      </Card>
    </div>
  );
}
