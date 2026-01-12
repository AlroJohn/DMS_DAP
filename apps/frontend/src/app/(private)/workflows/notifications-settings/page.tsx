"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  Mail,
  Settings,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  Shield,
  Activity,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NotificationPreference {
  id: string;
  category: string;
  name: string;
  description: string;
  email: boolean;
  inApp: boolean;
}

export default function NotificationsSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [globalNotifications, setGlobalNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);

  // Fetch notification preferences on mount
  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notification-preferences');
      const result = await response.json();

      if (result.success && result.data) {
        setGlobalNotifications(result.data.settings.globalNotifications);
        setEmailNotifications(result.data.settings.emailNotifications);
        setPreferences(result.data.preferences);
      } else {
        toast({
          title: "Error",
          description: result.error?.message || "Failed to load notification preferences",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load notification preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalNotificationsChange = async (checked: boolean) => {
    setGlobalNotifications(checked);
    await saveSettings(checked, emailNotifications);
  };

  const handleEmailNotificationsChange = async (checked: boolean) => {
    setEmailNotifications(checked);
    await saveSettings(globalNotifications, checked);
  };

  const saveSettings = async (global: boolean, email: boolean) => {
    try {
      const response = await fetch('/api/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          globalNotifications: global,
          emailNotifications: email,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error?.message || "Failed to save settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  const togglePreference = (id: string, channel: 'email' | 'inApp') => {
    setPreferences(preferences.map(pref =>
      pref.id === id ? { ...pref, [channel]: !pref[channel] } : pref
    ));
  };

  const saveAllPreferences = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Notification preferences saved successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.error?.message || "Failed to save preferences",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
    inAppEnabled: preferences.filter(p => p.inApp).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification Settings</h1>
          <p className="text-muted-foreground">
            Manage how and when you receive notifications
          </p>
        </div>
        <Button onClick={saveAllPreferences} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Settings className="mr-2 h-4 w-4" />
              Save All Settings
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Preferences</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNotifications}</div>
            <p className="text-xs text-muted-foreground">Notification types</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Email Enabled</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emailEnabled}</div>
            <p className="text-xs text-muted-foreground">Email notifications</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">In-App Enabled</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inAppEnabled}</div>
            <p className="text-xs text-muted-foreground">In-app notifications</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Notification Settings</CardTitle>
          <CardDescription>
            Master controls for all notification channels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="global-notifications">Enable All Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Master switch to enable or disable all notifications
              </p>
            </div>
            <Switch
              id="global-notifications"
              checked={globalNotifications}
              onCheckedChange={handleGlobalNotificationsChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <div>
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={handleEmailNotificationsChange}
              disabled={!globalNotifications}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {Object.entries(groupedPreferences).map(([category, prefs]) => (
          <Card key={category}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {getCategoryIcon(category)}
                <CardTitle>{category}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {prefs.map((pref) => (
                  <div key={pref.id} className="border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-1">
                        <div className="font-medium">{pref.name}</div>
                        <p className="text-sm text-muted-foreground">{pref.description}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Email</span>
                        </div>
                        <Switch
                          checked={pref.email}
                          onCheckedChange={() => togglePreference(pref.id, 'email')}
                          disabled={!globalNotifications || !emailNotifications}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">In-App</span>
                        </div>
                        <Switch
                          checked={pref.inApp}
                          onCheckedChange={() => togglePreference(pref.id, 'inApp')}
                          disabled={!globalNotifications}
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
          <CardTitle>Notification Delivery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 text-sm">
              <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium">In-App Notifications</div>
                <p className="text-muted-foreground">
                  Notifications appear in the notification center within the application.
                  They're instant and don't require any additional setup.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium">Email Notifications</div>
                <p className="text-muted-foreground">
                  Notifications are sent to your registered email address. Email delivery
                  may take a few minutes depending on your email provider.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
