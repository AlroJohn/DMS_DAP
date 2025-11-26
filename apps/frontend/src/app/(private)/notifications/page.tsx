"use client";

import { useState, useEffect } from "react";
import { Bell, Settings, CheckCheck, Eye, FileText, CheckCircle, PenTool, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { extractDocumentInfo } from "@/lib/utils";

export default function NotificationsPage() {
  const [frequency, setFrequency] = useState("immediate");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications from API
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/notifications');
        if (!response.ok) {
          throw new Error('Failed to fetch notifications');
        }
        const data = await response.json();
        setNotifications(data.data || []);
      } catch (err) {
        console.error('Error fetching notifications:', err);
        setError('Failed to load notifications');
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const notificationTypes = [
    { icon: FileText, title: "Document Updates", description: "New, edited, or deleted documents", color: "bg-blue-50" },
    { icon: CheckCircle, title: "Workflow Events", description: "Approvals, rejections, and routing", color: "bg-green-50" },
    { icon: PenTool, title: "Signature Events", description: "Document signing and verification", color: "bg-purple-50" },
    { icon: AlertTriangle, title: "System Alerts", description: "Security and system notifications", color: "bg-orange-50" }
  ];

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
      });
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true }))
        );
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'document_signed':
      case 'document':
        return PenTool;
      case 'document_received':
        return FileText;
      case 'workflow_approved':
        return CheckCircle;
      default:
        return AlertTriangle;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'document_signed':
      case 'document':
        return 'text-purple-600';
      case 'document_received':
        return 'text-blue-600';
      case 'workflow_approved':
        return 'text-green-600';
      default:
        return 'text-orange-600';
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 px-4 pb-4 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">Manage your notifications and preferences</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={markAllAsRead}
            disabled={notifications.every(n => n.is_read)}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Notifications List */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {loading ? (
                  <div className="p-8 text-center">
                    <p>Loading notifications...</p>
                  </div>
                ) : error ? (
                  <div className="p-8 text-center">
                    <p className="text-red-500">{error}</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h3 className="mt-4 font-semibold">No notifications</h3>
                    <p className="text-muted-foreground text-sm">You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map((notification) => {
                    const Icon = getNotificationIcon(notification.type);
                    const color = getNotificationColor(notification.type);

                    return (
                      <div
                        key={notification.notification_id || notification.id}
                        className={`p-6 hover:bg-accent/50 transition-colors ${
                          !notification.is_read ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-lg bg-background ${color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold">{notification.title}</h4>
                                <div className="text-muted-foreground text-sm mt-1">
                                  {(() => {
                                    const { name: documentName, code: documentCode } = extractDocumentInfo(notification.message);
                                    return (
                                      <>
                                        {documentName && (
                                          <span className="font-medium block">{documentName}</span>
                                        )}
                                        {documentCode && (
                                          <span className="inline-block mt-1 px-2 py-0.5 bg-muted rounded text-xs font-mono">
                                            {documentCode}
                                          </span>
                                        )}
                                        {!documentName && !documentCode && (
                                          <span>{notification.message}</span>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                              {!notification.is_read && (
                                <Badge variant="default" className="ml-2">
                                  New
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-xs text-muted-foreground">
                                {new Date(notification.created_at || notification.timestamp).toLocaleString()}
                              </span>
                              <div className="flex gap-2">
                                {!notification.is_read && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        const response = await fetch(`/api/notifications/${notification.notification_id}/read`, {
                                          method: 'PATCH',
                                        });
                                        if (response.ok) {
                                          // Update the notification in the UI
                                          setNotifications(prev => 
                                            prev.map(n => 
                                              n.notification_id === notification.notification_id 
                                                ? { ...n, is_read: true } 
                                                : n
                                            )
                                          );
                                        }
                                      } catch (err) {
                                        console.error('Error marking notification as read:', err);
                                      }
                                    }}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    Mark as read
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(`/api/notifications/${notification.notification_id}`, {
                                        method: 'DELETE',
                                      });
                                      if (response.ok) {
                                        // Remove the notification from the UI
                                        setNotifications(prev => 
                                          prev.filter(n => 
                                            n.notification_id !== notification.notification_id
                                          )
                                        );
                                      }
                                    } catch (err) {
                                      console.error('Error deleting notification:', err);
                                    }
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Email Notifications</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="email-signed" defaultChecked />
                    <Label htmlFor="email-signed" className="text-sm">Document signed</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="email-received" defaultChecked />
                    <Label htmlFor="email-received" className="text-sm">Document received</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="email-workflow" />
                    <Label htmlFor="email-workflow" className="text-sm">Workflow updates</Label>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Push Notifications</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="push-signed" defaultChecked />
                    <Label htmlFor="push-signed" className="text-sm">Document signed</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="push-received" defaultChecked />
                    <Label htmlFor="push-received" className="text-sm">Document received</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="push-workflow" defaultChecked />
                    <Label htmlFor="push-workflow" className="text-sm">Workflow updates</Label>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Notification Frequency</h4>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="daily">Daily digest</SelectItem>
                    <SelectItem value="weekly">Weekly digest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notification Types */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationTypes.map((type, index) => {
                const Icon = type.icon;
                return (
                  <div key={index} className={`${type.color} rounded-lg p-4 flex items-start gap-3`}>
                    <Icon className="h-5 w-5 mt-0.5" />
                    <div>
                      <h4 className="font-medium">{type.title}</h4>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}