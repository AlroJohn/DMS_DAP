"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Webhook } from "lucide-react";

export default function WebhooksPage() {
  const webhooks = [
    { id: "1", url: "https://api.example.com/webhook", events: ["document.signed", "document.verified"], status: "Active" },
    { id: "2", url: "https://hooks.slack.com/services/...", events: ["document.created", "document.updated"], status: "Active" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground">Configure webhook endpoints for event notifications</p>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" />New Webhook</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Active Webhooks</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded">{webhook.url}</code>
                    <Badge variant="outline" className="border-green-600 text-green-600">{webhook.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">Events: {webhook.events.join(", ")}</div>
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

      <Card>
        <CardHeader><CardTitle>Add New Webhook</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <Input placeholder="https://api.example.com/webhook" />
          </div>
          <div className="space-y-2">
            <Label>Secret Key (optional)</Label>
            <Input type="password" placeholder="For signing webhook payloads" />
          </div>
          <Button>Create Webhook</Button>
        </CardContent>
      </Card>
    </div>
  );
}
