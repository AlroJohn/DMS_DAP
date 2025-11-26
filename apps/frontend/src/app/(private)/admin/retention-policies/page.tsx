"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Clock } from "lucide-react";

export default function RetentionPoliciesPage() {
  const policies = [
    { id: "1", name: "Legal Documents", retention: "7 years", autoDelete: "Yes", documentTypes: ["Contract", "Agreement"] },
    { id: "2", name: "HR Records", retention: "5 years", autoDelete: "No", documentTypes: ["Employee", "NDA"] },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Retention Policies</h1>
          <p className="text-muted-foreground">Configure document retention and deletion rules</p>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" />New Policy</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Active Retention Policies</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {policies.map((policy) => (
              <div key={policy.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                <div className="space-y-1">
                  <div className="font-medium">{policy.name}</div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1"><Clock className="h-3 w-3" />Retention: {policy.retention}</div>
                    <div>Auto-delete: {policy.autoDelete}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Document types: {policy.documentTypes.join(", ")}</div>
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
        <CardHeader>
          <CardTitle>Recycle Bin Policy</CardTitle>
          <CardDescription>Configure auto-purge settings for deleted documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Auto-purge after (days)</Label>
            <Select defaultValue="30">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button>Save Policy</Button>
        </CardContent>
      </Card>
    </div>
  );
}
