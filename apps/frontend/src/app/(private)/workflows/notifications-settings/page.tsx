"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Settings,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  Shield,
  Activity,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NotificationPreference {
  id: string;
  category: string;
  name: string;
  description: string;
  email: boolean;
  inApp: boolean;
  push: boolean;
  sms: boolean;
}

export default function NotificationsSettingsPage() {
  const [globalNotifications, setGlobalNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);

  const [preferences, setPreferences] = useState<NotificationPreference[]>([
    {
      id: "1",
      category: "Documents",
      name: "Document Upload",
      description: "When a new document is uploaded to your department",
      email: true,
      inApp: true,
      push: true,
      sms: false,
    },
    {
      id: "2",
      category: "Documents",
      name: "Document Status Change",
      description: "When a document status is updated",
      email: true,
      inApp: true,
      push: false,
      sms: false,
    },
    {
      id: "3",
      category: "Documents",
      name: "Document Shared",
      description: "When a document is shared with you",
      email: true,
      inApp: true,
      push: true,
      sms: false,
    },
    {
      id: "4",
      category: "Approvals",
      name: "Approval Request",
      description: "When a document requires your approval",
      email: true,
      inApp: true,
      push: true,
      sms: true,
    },
    {
      id: "5",
      category: "Approvals",
      name: "Approval Completed",
      description: "When your approval request is processed",
      email: true,
      inApp: true,
      push: false,
      sms: false,
    },
    {
      id: "6",
      category: "Blockchain",
      name: "Document Signed",
      description: "When a document is signed on blockchain",
      email: true,
      inApp: true,
      push: true,
      sms: false,
    },
    {
      id: "7",
      category: "Blockchain",
      name: "Signature Pending",
      description: "When a document is awaiting your blockchain signature",
      email: true,
      inApp: true,
      push: true,
      sms: true,
    },
    {
      id: "8",
      category: "Security",
      name: "Login Alert",
      description: "When someone logs into your account",
      email: true,
      inApp: true,
      push: true,
      sms: true,
    },
    {
      id: "9",
      category: "Security",
      name: "Permission Change",
      description: "When your permissions are modified",
      email: true,
      inApp: true,
      push: true,
      sms: false,
    },
    {
      id: "10",
      category: "System",
      name: "System Maintenance",
      description: "Scheduled maintenance and downtime notifications",
      email: true,
      inApp: true,
      push: false,
      sms: false,
    },
    {
      id: "11",
      category: "System",
      name: "System Updates",
      description: "New features and system updates",
      email: false,
      inApp: true,
      push: false,
      sms: false,
    },
    {
      id: "12",
      category: "Collaboration",
      name: "Comments & Mentions",
      description: "When someone comments or mentions you",
      email: true,
      inApp: true,
      push: true,
      sms: false,
    },
  ]);

  const togglePreference = (id: string, channel: keyof Omit<NotificationPreference, 'id' | 'category' | 'name' | 'description'>) => {
    setPreferences(preferences.map(pref =>
      pref.id === id ? { ...pref, [channel]: !pref[channel] } : pref
    ));
  };

  const groupedPreferences = preferences.reduce((acc, pref) => {
    if (!acc[pref.category]) {
      acc[pref.category] = [];
    }
    acc[pref.category].push(pref);
    return acc;
  }, {} as Record<string, NotificationPreference[]>);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Documents":
        return <FileText className="h-4 w-4" />;
      case "Approvals":
        return <CheckCircle2 className="h-4 w-4" />;
      case "Blockchain":
        return <Shield className="h-4 w-4" />;
      case "Security":
        return <AlertCircle className="h-4 w-4" />;
      case "System":
        return <Activity className="h-4 w-4" />;
      case "Collaboration":
        return <Users className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const stats = {
    totalNotifications: preferences.length,
    emailEnabled: preferences.filter(p => p.email).length,
    pushEnabled: preferences.filter(p => p.push).length,
    smsEnabled: preferences.filter(p => p.sms).length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification Settings</h1>
          <p className="text-muted-foreground">
            Manage how and when you receive notifications
          </p>
        </div>
        <Button>
          <Settings className="mr-2 h-4 w-4" />
          Save All Settings
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Total Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNotifications}</div>
            <p className="text-xs text-muted-foreground">Notification types</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Enabled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emailEnabled}</div>
            <p className="text-xs text-muted-foreground">Email notifications</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Push Enabled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pushEnabled}</div>
            <p className="text-xs text-muted-foreground">Push notifications</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS Enabled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.smsEnabled}</div>
            <p className="text-xs text-muted-foreground">SMS notifications</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Global Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Enable All Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Master switch for all notification channels
              </p>
            </div>
            <Switch
              checked={globalNotifications}
              onCheckedChange={setGlobalNotifications}
            />
          </div>

          {globalNotifications && (
            <>
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Push Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive browser and mobile push notifications
                  </p>
                </div>
                <Switch
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    SMS Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive critical notifications via SMS (additional charges may apply)
                  </p>
                </div>
                <Switch
                  checked={smsNotifications}
                  onCheckedChange={setSmsNotifications}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Delivery Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="digest-frequency">Email Digest Frequency</Label>
              <Select defaultValue="daily">
                <SelectTrigger id="digest-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time (Immediate)</SelectItem>
                  <SelectItem value="hourly">Hourly Digest</SelectItem>
                  <SelectItem value="daily">Daily Digest</SelectItem>
                  <SelectItem value="weekly">Weekly Digest</SelectItem>
                  <SelectItem value="never">Never (Disable Digest)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quiet-hours">Quiet Hours</Label>
              <Select defaultValue="22-8">
                <SelectTrigger id="quiet-hours">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="22-8">10 PM - 8 AM</SelectItem>
                  <SelectItem value="23-7">11 PM - 7 AM</SelectItem>
                  <SelectItem value="20-9">8 PM - 9 AM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-sound">Notification Sound</Label>
              <Select defaultValue="default">
                <SelectTrigger id="notification-sound">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="chime">Chime</SelectItem>
                  <SelectItem value="ding">Ding</SelectItem>
                  <SelectItem value="none">Silent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-priority">Priority Filter</Label>
              <Select defaultValue="all">
                <SelectTrigger id="notification-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Notifications</SelectItem>
                  <SelectItem value="high">High Priority Only</SelectItem>
                  <SelectItem value="critical">Critical Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {Object.entries(groupedPreferences).map(([category, prefs]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getCategoryIcon(category)}
                {category} Notifications
                <Badge variant="secondary" className="ml-2">
                  {prefs.length} types
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {prefs.map((pref) => (
                  <div key={pref.id} className="border-b pb-4 last:border-0 last:pb-0">
                    <div className="mb-3">
                      <div className="font-medium">{pref.name}</div>
                      <div className="text-sm text-muted-foreground">{pref.description}</div>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          Email
                        </Label>
                        <Switch
                          checked={pref.email && emailNotifications && globalNotifications}
                          onCheckedChange={() => togglePreference(pref.id, 'email')}
                          disabled={!emailNotifications || !globalNotifications}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm flex items-center gap-2">
                          <Bell className="h-3 w-3" />
                          In-App
                        </Label>
                        <Switch
                          checked={pref.inApp && globalNotifications}
                          onCheckedChange={() => togglePreference(pref.id, 'inApp')}
                          disabled={!globalNotifications}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm flex items-center gap-2">
                          <Smartphone className="h-3 w-3" />
                          Push
                        </Label>
                        <Switch
                          checked={pref.push && pushNotifications && globalNotifications}
                          onCheckedChange={() => togglePreference(pref.id, 'push')}
                          disabled={!pushNotifications || !globalNotifications}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm flex items-center gap-2">
                          <MessageSquare className="h-3 w-3" />
                          SMS
                        </Label>
                        <Switch
                          checked={pref.sms && smsNotifications && globalNotifications}
                          onCheckedChange={() => togglePreference(pref.id, 'sms')}
                          disabled={!smsNotifications || !globalNotifications}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { type: "Document Signed", time: "2 minutes ago", channel: "Email, Push" },
              { type: "Approval Request", time: "1 hour ago", channel: "Email, Push, SMS" },
              { type: "Document Upload", time: "3 hours ago", channel: "In-App" },
              { type: "Login Alert", time: "5 hours ago", channel: "Email, Push" },
              { type: "Comment Mention", time: "1 day ago", channel: "Email, In-App" },
            ].map((notification, idx) => (
              <div key={idx} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{notification.type}</div>
                    <div className="text-xs text-muted-foreground">{notification.time}</div>
                  </div>
                </div>
                <Badge variant="outline">{notification.channel}</Badge>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4">
            View All Notifications
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
