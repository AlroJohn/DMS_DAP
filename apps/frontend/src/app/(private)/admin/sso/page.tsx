"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Key } from "lucide-react";

export default function SSOSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SSO Settings</h1>
        <p className="text-muted-foreground">Configure Single Sign-On integrations</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Google OAuth</CardTitle>
            <Badge variant="outline" className="border-green-600 text-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />Active</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Client ID</Label>
            <Input defaultValue="1234567890-abcdefg..." />
          </div>
          <div className="space-y-2">
            <Label>Client Secret</Label>
            <Input type="password" defaultValue="GOCSPX-..." />
          </div>
          <div className="space-y-2">
            <Label>Callback URL</Label>
            <Input defaultValue="http://localhost:3001/api/auth/google/callback" />
          </div>
          <Button>Save Settings</Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="saml" className="w-full">
        <TabsList>
          <TabsTrigger value="saml">SAML 2.0</TabsTrigger>
          <TabsTrigger value="oidc">OpenID Connect</TabsTrigger>
        </TabsList>
        <TabsContent value="saml">
          <Card>
            <CardHeader>
              <CardTitle>SAML Configuration</CardTitle>
              <CardDescription>Configure SAML 2.0 authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Identity Provider URL</Label>
                <Input placeholder="https://idp.example.com/sso" />
              </div>
              <div className="space-y-2">
                <Label>Entity ID</Label>
                <Input placeholder="https://app.example.com" />
              </div>
              <div className="space-y-2">
                <Label>X.509 Certificate</Label>
                <textarea className="w-full min-h-[100px] rounded border p-2 text-sm" placeholder="-----BEGIN CERTIFICATE-----..." />
              </div>
              <Button>Enable SAML</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="oidc">
          <Card>
            <CardHeader>
              <CardTitle>OpenID Connect</CardTitle>
              <CardDescription>Configure OpenID Connect provider</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Issuer URL</Label>
                <Input placeholder="https://accounts.example.com" />
              </div>
              <div className="space-y-2">
                <Label>Client ID</Label>
                <Input />
              </div>
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <Input type="password" />
              </div>
              <Button>Enable OIDC</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
