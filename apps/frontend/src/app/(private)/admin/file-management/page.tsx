"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FileManagementPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">File Management</h1>
        <p className="text-muted-foreground">Configure file upload settings and storage limits</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Upload Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Maximum File Size (MB)</Label>
            <Input type="number" defaultValue="50" />
          </div>
          <div className="space-y-2">
            <Label>Maximum Files Per Upload</Label>
            <Input type="number" defaultValue="10" />
          </div>
          <div className="space-y-2">
            <Label>Allowed File Types</Label>
            <Select defaultValue="all">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="documents">Documents Only (PDF, DOCX, XLS)</SelectItem>
                <SelectItem value="custom">Custom List</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button>Save Settings</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Storage Limits</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Storage Quota (GB)</Label>
            <Input type="number" defaultValue="1000" />
          </div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Current Usage: 128 GB (12.8%)</div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: "12.8%" }} />
            </div>
          </div>
          <Button>Update Quota</Button>
        </CardContent>
      </Card>
    </div>
  );
}
