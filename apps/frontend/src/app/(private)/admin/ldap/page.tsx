"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LDAPConfigPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">LDAP Configuration</h1>
          <p className="text-muted-foreground">Configure LDAP/Active Directory authentication</p>
        </div>
        <Badge variant="secondary">Disabled</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>Connection Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>LDAP Server URL</Label>
            <Input placeholder="ldap://ldap.example.com:389" />
          </div>
          <div className="space-y-2">
            <Label>Base DN</Label>
            <Input placeholder="dc=example,dc=com" />
          </div>
          <div className="space-y-2">
            <Label>Bind DN</Label>
            <Input placeholder="cn=admin,dc=example,dc=com" />
          </div>
          <div className="space-y-2">
            <Label>Bind Password</Label>
            <Input type="password" />
          </div>
          <Button>Test Connection</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>User Mapping</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Username Attribute</Label>
              <Input defaultValue="uid" />
            </div>
            <div className="space-y-2">
              <Label>Email Attribute</Label>
              <Input defaultValue="mail" />
            </div>
            <div className="space-y-2">
              <Label>First Name Attribute</Label>
              <Input defaultValue="givenName" />
            </div>
            <div className="space-y-2">
              <Label>Last Name Attribute</Label>
              <Input defaultValue="sn" />
            </div>
          </div>
          <Button>Save Configuration</Button>
        </CardContent>
      </Card>
    </div>
  );
}
