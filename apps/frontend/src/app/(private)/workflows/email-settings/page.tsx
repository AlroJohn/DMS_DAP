"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Send,
  Server,
  CheckCircle2,
  AlertCircle,
  Settings,
  Users,
  FileText,
  Clock,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function EmailSettingsPage() {
  const [smtpEnabled, setSmtpEnabled] = useState(true);
  const [tlsEnabled, setTlsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const emailTemplates = [
    {
      id: "1",
      name: "Document Upload Notification",
      category: "Documents",
      subject: "New Document Uploaded: {{document_name}}",
      status: "Active",
      lastModified: "2024-10-15",
      usageCount: 1247,
    },
    {
      id: "2",
      name: "Approval Request",
      category: "Workflows",
      subject: "Action Required: Approve {{document_name}}",
      status: "Active",
      lastModified: "2024-10-20",
      usageCount: 856,
    },
    {
      id: "3",
      name: "Document Signed",
      category: "Blockchain",
      subject: "Document Signed on Blockchain: {{document_name}}",
      status: "Active",
      lastModified: "2024-11-01",
      usageCount: 342,
    },
    {
      id: "4",
      name: "User Invitation",
      category: "Users",
      subject: "You've been invited to join DMS",
      status: "Active",
      lastModified: "2024-09-10",
      usageCount: 89,
    },
    {
      id: "5",
      name: "Password Reset",
      category: "Security",
      subject: "Reset Your DMS Password",
      status: "Active",
      lastModified: "2024-08-25",
      usageCount: 156,
    },
    {
      id: "6",
      name: "Contract Expiry Alert",
      category: "Contracts",
      subject: "Contract Expiring Soon: {{contract_name}}",
      status: "Draft",
      lastModified: "2024-11-02",
      usageCount: 0,
    },
  ];

  const stats = {
    emailsSent: 2847,
    deliveryRate: 98.5,
    activeTemplates: emailTemplates.filter((t) => t.status === "Active").length,
    draftTemplates: emailTemplates.filter((t) => t.status === "Draft").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Settings</h1>
          <p className="text-muted-foreground">
            Configure SMTP server and email notification templates
          </p>
        </div>
        <Button>
          <Send className="mr-2 h-4 w-4" />
          Send Test Email
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Emails Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emailsSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Delivery Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.deliveryRate}%</div>
            <p className="text-xs text-muted-foreground">Success rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Active Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTemplates}</div>
            <p className="text-xs text-muted-foreground">Email templates</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Draft Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draftTemplates}</div>
            <p className="text-xs text-muted-foreground">Pending templates</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              SMTP Server Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable SMTP Server</Label>
                <p className="text-sm text-muted-foreground">
                  Use custom SMTP server for sending emails
                </p>
              </div>
              <Switch checked={smtpEnabled} onCheckedChange={setSmtpEnabled} />
            </div>

            {smtpEnabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP Host</Label>
                  <Input
                    id="smtp-host"
                    placeholder="smtp.gmail.com"
                    defaultValue="smtp.gmail.com"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">SMTP Port</Label>
                    <Input id="smtp-port" placeholder="587" defaultValue="587" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-encryption">Encryption</Label>
                    <Select defaultValue="tls">
                      <SelectTrigger id="smtp-encryption">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tls">TLS</SelectItem>
                        <SelectItem value="ssl">SSL</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-username">Username</Label>
                  <Input
                    id="smtp-username"
                    type="email"
                    placeholder="noreply@dms.com"
                    defaultValue="noreply@dms.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-password">Password</Label>
                  <Input
                    id="smtp-password"
                    type="password"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5">
                    <Label>Enable TLS</Label>
                    <p className="text-sm text-muted-foreground">
                      Use TLS encryption for secure connection
                    </p>
                  </div>
                  <Switch checked={tlsEnabled} onCheckedChange={setTlsEnabled} />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button className="flex-1">
                    <Settings className="mr-2 h-4 w-4" />
                    Save Configuration
                  </Button>
                  <Button variant="outline">
                    <Send className="mr-2 h-4 w-4" />
                    Test Connection
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Email Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send automated email notifications to users
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            {emailNotifications && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="from-name">From Name</Label>
                  <Input
                    id="from-name"
                    placeholder="DMS System"
                    defaultValue="DMS System"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="from-email">From Email</Label>
                  <Input
                    id="from-email"
                    type="email"
                    placeholder="noreply@dms.com"
                    defaultValue="noreply@dms.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reply-to">Reply-To Email</Label>
                  <Input
                    id="reply-to"
                    type="email"
                    placeholder="support@dms.com"
                    defaultValue="support@dms.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batch-size">Batch Size</Label>
                  <Select defaultValue="50">
                    <SelectTrigger id="batch-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 emails/batch</SelectItem>
                      <SelectItem value="50">50 emails/batch</SelectItem>
                      <SelectItem value="100">100 emails/batch</SelectItem>
                      <SelectItem value="500">500 emails/batch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retry-attempts">Retry Attempts</Label>
                  <Select defaultValue="3">
                    <SelectTrigger id="retry-attempts">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 attempt</SelectItem>
                      <SelectItem value="3">3 attempts</SelectItem>
                      <SelectItem value="5">5 attempts</SelectItem>
                      <SelectItem value="10">10 attempts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full mt-4">
                  <Settings className="mr-2 h-4 w-4" />
                  Save Settings
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Email Templates
            </CardTitle>
            <Button>
              <FileText className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {emailTemplates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between border-b pb-3 last:border-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-medium">{template.name}</div>
                    <Badge
                      variant={template.status === "Active" ? "default" : "secondary"}
                    >
                      {template.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-1">
                    {template.subject}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {template.category}
                    </div>
                    <div className="flex items-center gap-1">
                      <Send className="h-3 w-3" />
                      {template.usageCount.toLocaleString()} sent
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Modified: {template.lastModified}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    Preview
                  </Button>
                  <Button variant="outline" size="sm">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Template Variables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">User Variables</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <code className="bg-secondary px-2 py-0.5 rounded">
                    {"{{user_name}}"}
                  </code>
                  <span>User's full name</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-secondary px-2 py-0.5 rounded">
                    {"{{user_email}}"}
                  </code>
                  <span>User's email address</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-secondary px-2 py-0.5 rounded">
                    {"{{user_department}}"}
                  </code>
                  <span>User's department</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Document Variables</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <code className="bg-secondary px-2 py-0.5 rounded">
                    {"{{document_name}}"}
                  </code>
                  <span>Document title</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-secondary px-2 py-0.5 rounded">
                    {"{{document_type}}"}
                  </code>
                  <span>Document type</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-secondary px-2 py-0.5 rounded">
                    {"{{document_url}}"}
                  </code>
                  <span>Link to document</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">System Variables</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <code className="bg-secondary px-2 py-0.5 rounded">
                    {"{{current_date}}"}
                  </code>
                  <span>Current date</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-secondary px-2 py-0.5 rounded">
                    {"{{system_url}}"}
                  </code>
                  <span>DMS system URL</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-secondary px-2 py-0.5 rounded">
                    {"{{support_email}}"}
                  </code>
                  <span>Support email address</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Blockchain Variables</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <code className="bg-secondary px-2 py-0.5 rounded">
                    {"{{transaction_hash}}"}
                  </code>
                  <span>Blockchain TX hash</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-secondary px-2 py-0.5 rounded">
                    {"{{verification_url}}"}
                  </code>
                  <span>Verification link</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-secondary px-2 py-0.5 rounded">
                    {"{{certificate_url}}"}
                  </code>
                  <span>Certificate download link</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
