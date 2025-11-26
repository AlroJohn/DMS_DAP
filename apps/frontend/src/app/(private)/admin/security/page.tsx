import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Lock, Eye, Clock, Key, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Security Settings | DMS",
  description: "Configure system security settings",
};

export default function SecuritySettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
          <p className="text-muted-foreground">Configure system security and authentication settings</p>
        </div>
        <Button>
          Save Changes
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Session Management
              </CardTitle>
              <CardDescription>
                Configure user session settings and timeouts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  defaultValue="30"
                  min="5"
                  max="480"
                />
                <p className="text-xs text-muted-foreground">
                  Automatically lock user sessions after inactivity
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max-sessions">Maximum Concurrent Sessions</Label>
                <Input
                  id="max-sessions"
                  type="number"
                  defaultValue="3"
                  min="1"
                  max="10"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="force-logout" defaultChecked />
                <Label htmlFor="force-logout">
                  Force logout on session timeout
                </Label>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Authentication Settings
              </CardTitle>
              <CardDescription>
                Configure authentication and password policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="mfa-required" />
                <Label htmlFor="mfa-required">
                  Require Multi-Factor Authentication
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="strong-passwords" defaultChecked />
                <Label htmlFor="strong-passwords">
                  Enforce strong password policy
                </Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password-expiry">Password Expiry (days)</Label>
                <Input
                  id="password-expiry"
                  type="number"
                  defaultValue="90"
                  min="30"
                  max="365"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="failed-attempts">Failed Login Attempts</Label>
                <Input
                  id="failed-attempts"
                  type="number"
                  defaultValue="5"
                  min="3"
                  max="10"
                />
                <p className="text-xs text-muted-foreground">
                  Lock account after this many failed attempts
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Encryption Settings
              </CardTitle>
              <CardDescription>
                Configure encryption and security protocols
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="encryption-rest">Encryption at Rest</Label>
                <Select defaultValue="aes-256">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aes-256">AES-256</SelectItem>
                    <SelectItem value="aes-128">AES-128</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tls-version">TLS Version</Label>
                <Select defaultValue="tls-1.3">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tls-1.3">TLS 1.3</SelectItem>
                    <SelectItem value="tls-1.2">TLS 1.2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="end-to-end" defaultChecked />
                <Label htmlFor="end-to-end">
                  Enable end-to-end encryption for documents
                </Label>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Audit & Logging
              </CardTitle>
              <CardDescription>
                Configure system logging and audit trails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="log-all-access" defaultChecked />
                <Label htmlFor="log-all-access">
                  Log all document access
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="log-user-actions" defaultChecked />
                <Label htmlFor="log-user-actions">
                  Log all user actions
                </Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="log-retention">Log Retention (days)</Label>
                <Input
                  id="log-retention"
                  type="number"
                  defaultValue="365"
                  min="30"
                  max="2555"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="tamper-evident" defaultChecked />
                <Label htmlFor="tamper-evident">
                  Enable tamper-evident logging
                </Label>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Monitoring
              </CardTitle>
              <CardDescription>
                Configure security monitoring and threat detection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="intrusion-detection" />
                <Label htmlFor="intrusion-detection">
                  Enable intrusion detection
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="anomaly-detection" />
                <Label htmlFor="anomaly-detection">
                  Enable anomaly detection
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="real-time-alerts" defaultChecked />
                <Label htmlFor="real-time-alerts">
                  Send real-time security alerts
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}