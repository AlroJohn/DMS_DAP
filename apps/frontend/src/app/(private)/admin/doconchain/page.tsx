"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertCircle, Shield, Key, Network, DollarSign, Activity } from "lucide-react";

export default function DocOnChainConfigPage() {
  const [connectionStatus, setConnectionStatus] = useState("connected");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">DocOnChain Configuration</h1>
        <p className="text-muted-foreground">Manage blockchain signing service settings</p>
      </div>

      <Card className={connectionStatus === "connected" ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {connectionStatus === "connected" ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-red-600" />}
              <CardTitle className={connectionStatus === "connected" ? "text-green-900 dark:text-green-100" : "text-red-900 dark:text-red-100"}>
                Connection Status
              </CardTitle>
            </div>
            <Badge variant={connectionStatus === "connected" ? "outline" : "destructive"}>
              {connectionStatus === "connected" ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{connectionStatus === "connected" ? "Successfully connected to DocOnChain API" : "Unable to connect to DocOnChain API"}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="credentials" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />API Credentials</CardTitle>
              <CardDescription>Configure DocOnChain API authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-key">Client Key</Label>
                <Input id="client-key" type="password" defaultValue="U2FsdGVkX19dxrNafE8249..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-secret">Client Secret</Label>
                <Input id="client-secret" type="password" defaultValue="5sd07WmZyXJft2jEP8LOJyfGH" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Account Email</Label>
                <Input id="email" type="email" defaultValue="stg_quanby@maildrop.cc" />
              </div>
              <Button>Test Connection</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Network className="h-5 w-5" />Blockchain Network</CardTitle>
              <CardDescription>Select blockchain network for document signing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Environment</Label>
                <Select defaultValue="staging">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staging">Staging (Test Network)</SelectItem>
                    <SelectItem value="production">Production (Main Network)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>API Base URL</Label>
                <Input defaultValue="https://stg-api2.doconchain.com" />
              </div>
              <Button>Save Network Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Usage & Billing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>This Month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">248</div>
                    <p className="text-xs text-muted-foreground">Documents Signed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Cost</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$124.00</div>
                    <p className="text-xs text-muted-foreground">$0.50 per signature</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>API Calls</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">1,542</div>
                    <p className="text-xs text-muted-foreground">Requests made</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Service Monitoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>API Status</Label>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Operational</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Response Time</Label>
                  <div className="text-sm">142ms (avg)</div>
                </div>
                <div className="space-y-2">
                  <Label>Success Rate</Label>
                  <div className="text-sm">99.8%</div>
                </div>
                <div className="space-y-2">
                  <Label>Last Check</Label>
                  <div className="text-sm">{new Date().toLocaleTimeString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
