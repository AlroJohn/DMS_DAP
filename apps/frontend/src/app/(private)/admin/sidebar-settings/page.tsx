"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/document-permissions";

interface SidebarSetting {
  setting_id: string;
  section_key: string;
  section_name: string;
  is_enabled: boolean;
}

export default function SidebarSettingsPage() {
  const [settings, setSettings] = useState<SidebarSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usingDefaults, setUsingDefaults] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if user is superadmin
  const isSuperAdmin = user && hasPermission(user, "system_settings_write");

  useEffect(() => {
    if (!isSuperAdmin) {
      toast({
        title: "Access Denied",
        description: "Only users with system settings permissions can access this page",
        variant: "destructive",
      });
      return;
    }
    fetchSettings();
  }, [isSuperAdmin]);

  const fetchSettings = async () => {
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/sidebar-settings`;
      console.log("Fetching sidebar settings from:", apiUrl);
      
      const response = await fetch(apiUrl, {
        credentials: "include",
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        console.error("Failed to fetch settings, status:", response.status);
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error("Failed to fetch settings");
      }

      const data = await response.json();
      console.log("Fetched settings:", data);
      if (data.success) {
        setSettings(data.data);
      } else {
        throw new Error(data.message || "Invalid response");
      }
    } catch (error) {
      console.error("Fetch settings error:", error);
      toast({
        title: "Error",
        description: "Failed to load sidebar settings. Using defaults.",
        variant: "destructive",
      });
      
      // Set default settings if fetch fails
      setUsingDefaults(true);
      const defaultSettings = [
        { setting_id: "default-1", section_key: "home", section_name: "Home", is_enabled: true },
        { setting_id: "default-2", section_key: "dashboard", section_name: "Dashboard", is_enabled: true },
        { setting_id: "default-3", section_key: "documents", section_name: "Documents", is_enabled: true },
        { setting_id: "default-4", section_key: "management", section_name: "Management", is_enabled: true },
        { setting_id: "default-5", section_key: "search", section_name: "Search", is_enabled: true },
        { setting_id: "default-6", section_key: "notifications", section_name: "Notifications", is_enabled: true },
        { setting_id: "default-7", section_key: "sidebar settings", section_name: "Sidebar Settings", is_enabled: true },
        { setting_id: "default-8", section_key: "reports", section_name: "Reports", is_enabled: true },
      ];
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (settingId: string, isEnabled: boolean) => {
    setSettings((prev) =>
      prev.map((setting) =>
        setting.setting_id === settingId ? { ...setting, is_enabled: isEnabled } : setting
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/sidebar-settings/bulk`;
      console.log("Saving settings to:", apiUrl);
      console.log("Settings payload:", settings);
      
      const response = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ settings }),
      });

      console.log("Save response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Save failed. Status:", response.status, "Response:", errorText);
        throw new Error(`Failed to save settings: ${response.status}`);
      }

      const data = await response.json();
      console.log("Save response data:", data);
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Sidebar settings updated successfully. Users will see changes after refreshing their page.",
        });
        setUsingDefaults(false); // Clear the defaults flag after successful save
      }
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save sidebar settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only users with system settings permissions can access sidebar settings
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto w-full p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            <CardTitle>Sidebar Settings</CardTitle>
          </div>
          <CardDescription>
            Control which sidebar sections are visible to all users across all departments. 
            Disabled sections will be hidden from everyone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settings.map((setting) => (
              <div
                key={setting.setting_id}
                className="flex items-center justify-between p-4 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="space-y-1">
                  <Label htmlFor={setting.section_key} className="text-base font-medium cursor-pointer">
                    {setting.section_name}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {getSettingDescription(setting.section_key)}
                  </p>
                </div>
                <Switch
                  id={setting.section_key}
                  checked={setting.is_enabled}
                  onCheckedChange={(checked) => handleToggle(setting.setting_id, checked)}
                  disabled={saving}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-6 border-t">
            <Button onClick={handleSave} disabled={saving || usingDefaults}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {usingDefaults ? "Migration Required" : "Save Changes"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-1">
            <li>Changes apply globally to all users in all departments</li>
            <li>Users need to refresh their page to see the changes</li>
            <li>Permission-based filtering still applies within enabled sections</li>
            <li>Disabling a section only hides it from the sidebar, not the functionality</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function getSettingDescription(sectionKey: string): string {
  const descriptions: Record<string, string> = {
    home: "Main landing page with CMS content and overview",
    dashboard: "Analytics and statistics dashboard",
    documents: "Document management including owned, shared, and archived documents",
    management: "System management for document types, actions, departments, users, and roles",
    search: "Document search and saved searches",
    notifications: "System notifications and alerts",
    "sidebar settings": "Control sidebar section visibility (superadmin only)",
    reports: "Audit trails, usage reports, and compliance reports",
  };
  return descriptions[sectionKey] || "Sidebar section";
}
