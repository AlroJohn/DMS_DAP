import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Link2, Shield, Key, Settings, Plus, CheckCircle, XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Integration Settings | DMS",
  description: "Configure system integrations and APIs",
};

export default function IntegrationSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integration Settings</h1>
          <p className="text-muted-foreground">Configure system integrations and API connections</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Integration
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  DocOnChain Integration
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              </CardTitle>
              <CardDescription>
                Blockchain document signing and verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-endpoint">API Endpoint</Label>
                <Input
                  id="api-endpoint"
                  type="url"
                  defaultValue="https://api.doconchain.com/v1"
                  readOnly
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="network">Network</Label>
                <Select defaultValue="mainnet">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mainnet">Mainnet</SelectItem>
                    <SelectItem value="testnet">Testnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type="password"
                    defaultValue="••••••••••••••••"
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm">
                    Update
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  LDAP Authentication
                </div>
                <Badge variant="outline" className="text-gray-600">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Configured
                </Badge>
              </CardTitle>
              <CardDescription>
                Connect to your LDAP directory for user authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ldap-server">LDAP Server</Label>
                <Input
                  id="ldap-server"
                  placeholder="ldap://your-server.com:389"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="base-dn">Base DN</Label>
                <Input
                  id="base-dn"
                  placeholder="dc=company,dc=com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bind-dn">Bind DN</Label>
                <Input
                  id="bind-dn"
                  placeholder="cn=admin,dc=company,dc=com"
                />
              </div>
              
              <Button variant="outline" className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Setup LDAP
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Single Sign-On (SSO)</CardTitle>
              <CardDescription>
                Configure SSO providers for seamless authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-sm font-semibold">
                      G
                    </div>
                    <span className="font-medium">Google Workspace</span>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Allow users to sign in with their Google Workspace accounts
                </p>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white text-sm font-semibold">
                      M
                    </div>
                    <span className="font-medium">Microsoft Azure AD</span>
                  </div>
                  <Badge variant="outline" className="text-gray-600">
                    <XCircle className="h-3 w-3 mr-1" />
                    Inactive
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Enable Azure Active Directory integration
                </p>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Setup
                </Button>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center text-white text-sm font-semibold">
                      S
                    </div>
                    <span className="font-medium">SAML 2.0</span>
                  </div>
                  <Badge variant="outline" className="text-gray-600">
                    <XCircle className="h-3 w-3 mr-1" />
                    Inactive
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Configure SAML 2.0 for enterprise SSO
                </p>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Setup
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Management
              </CardTitle>
              <CardDescription>
                Manage API access and rate limiting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="api-access">API Access</Label>
                <Switch id="api-access" defaultChecked />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rate-limit">Rate Limiting (requests/minute)</Label>
                <Input
                  id="rate-limit"
                  type="number"
                  defaultValue="1000"
                />
              </div>
              
              <div className="space-y-2">
                <Label>API Keys</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm font-mono">api_key_1234...5678</span>
                    <Button variant="destructive" size="sm">
                      Revoke
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Generate New API Key
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}