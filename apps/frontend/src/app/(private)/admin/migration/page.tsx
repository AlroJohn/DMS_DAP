import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Database, Upload, FileText, CheckCircle, XCircle, Clock, Play } from "lucide-react";

export const metadata: Metadata = {
  title: "Data Migration | DMS",
  description: "Manage document migration and data transfer",
};

export default function DataMigrationPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Migration</h1>
          <p className="text-muted-foreground">Migrate documents from external sources</p>
        </div>
        <Button>
          <Play className="h-4 w-4 mr-2" />
          Start Migration
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Migration Source
              </CardTitle>
              <CardDescription>
                Configure the source system for document migration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="source-type">Source Type</Label>
                <Select defaultValue="filesystem">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="filesystem">File System</SelectItem>
                    <SelectItem value="sharepoint">SharePoint</SelectItem>
                    <SelectItem value="googledrive">Google Drive</SelectItem>
                    <SelectItem value="dms">Another DMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="source-path">Source Path</Label>
                <Input
                  id="source-path"
                  placeholder="Enter source path or URL"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Authentication</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Username" />
                  <Input type="password" placeholder="Password" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Migration Settings
              </CardTitle>
              <CardDescription>
                Configure migration policies and options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="preserve-metadata" defaultChecked />
                <Label htmlFor="preserve-metadata">
                  Preserve original metadata
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="selective-migration" />
                <Label htmlFor="selective-migration">
                  Enable selective migration based on policies
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="audit-trail" defaultChecked />
                <Label htmlFor="audit-trail">
                  Maintain audit trail of transfers
                </Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="retention-policy">Retention Policy</Label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Migrate All Documents</SelectItem>
                    <SelectItem value="1year">Last 1 Year Only</SelectItem>
                    <SelectItem value="2years">Last 2 Years Only</SelectItem>
                    <SelectItem value="custom">Custom Date Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="target-department">Target Department</Label>
                <Select defaultValue="auto">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect from metadata</SelectItem>
                    <SelectItem value="it">IT Department</SelectItem>
                    <SelectItem value="hr">HR Department</SelectItem>
                    <SelectItem value="finance">Finance Department</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Migration Status
              </CardTitle>
              <CardDescription>
                Current migration progress and statistics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-2">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No active migration</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Documents Scanned:</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Documents Migrated:</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Errors:</span>
                  <span className="font-medium text-red-600">0</span>
                </div>
                <Progress value={0} className="w-full" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Migrations</CardTitle>
              <CardDescription>
                History of recent migration activities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">SharePoint Migration</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">1,234 documents • 2 days ago</p>
              </div>
              
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">File System Import</span>
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Failed
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Authentication error • 1 week ago</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Chain of Custody</CardTitle>
              <CardDescription>
                Compliance and audit trail information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                All migration activities are logged and tracked for compliance.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                View Migration Logs →
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}