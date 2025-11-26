"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Copy, Plus, Trash2, Activity } from "lucide-react";

export default function APIManagementPage() {
  const apiKeys = [
    { id: "1", name: "Production API Key", key: "pk_live_51H...xN3Z", created: "2024-01-15", lastUsed: "2 hours ago", requests: "15,428" },
    { id: "2", name: "Development API Key", key: "pk_test_51H...yM2A", created: "2024-01-10", lastUsed: "5 minutes ago", requests: "8,234" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Management</h1>
          <p className="text-muted-foreground">Manage API keys and rate limits</p>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" />New API Key</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total API Keys</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{apiKeys.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Requests (30d)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">23,662</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Rate Limit</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">1,000/15min</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Manage your API authentication keys</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {apiKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                <div className="space-y-1">
                  <div className="font-medium">{key.name}</div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded">{key.key}</code>
                    <Button size="icon" variant="ghost" className="h-6 w-6"><Copy className="h-3 w-3" /></Button>
                  </div>
                  <div className="text-xs text-muted-foreground">Created: {key.created} • Last used: {key.lastUsed} • {key.requests} requests</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">View Usage</Button>
                  <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rate Limiting</CardTitle>
          <CardDescription>Configure API rate limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Requests per window</Label>
              <Input type="number" defaultValue="1000" />
            </div>
            <div className="space-y-2">
              <Label>Window duration (minutes)</Label>
              <Input type="number" defaultValue="15" />
            </div>
          </div>
          <Button>Save Rate Limit</Button>
        </CardContent>
      </Card>
    </div>
  );
}
