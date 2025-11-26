import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HardDrive, Shield, Clock, Download, Upload, CheckCircle, XCircle, AlertTriangle, Calendar } from "lucide-react";

export const metadata: Metadata = {
  title: "Backup & Recovery | DMS",
  description: "Manage system backups and recovery",
};

export default function BackupRecoveryPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Backup & Recovery</h1>
          <p className="text-muted-foreground">Manage system backups and disaster recovery</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Create Backup
          </Button>
          <Button>
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Backup
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Backup Configuration
              </CardTitle>
              <CardDescription>
                Configure backup settings and storage options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="backup-type">Backup Type</Label>
                <Select defaultValue="full">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Backup (Documents + Metadata + Blockchain Data)</SelectItem>
                    <SelectItem value="documents">Documents Only</SelectItem>
                    <SelectItem value="metadata">Metadata Only</SelectItem>
                    <SelectItem value="incremental">Incremental Backup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="backup-location">Backup Location</Label>
                <Select defaultValue="local">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local Storage</SelectItem>
                    <SelectItem value="s3">AWS S3</SelectItem>
                    <SelectItem value="gcs">Google Cloud Storage</SelectItem>
                    <SelectItem value="azure">Azure Blob Storage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="retention-period">Retention Period</Label>
                <Select defaultValue="90days">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30days">30 Days</SelectItem>
                    <SelectItem value="90days">90 Days</SelectItem>
                    <SelectItem value="1year">1 Year</SelectItem>
                    <SelectItem value="permanent">Permanent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="encrypt-backup" defaultChecked />
                <Label htmlFor="encrypt-backup">
                  Encrypt backup files
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="compress-backup" defaultChecked />
                <Label htmlFor="compress-backup">
                  Compress backup files
                </Label>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Recovery Options
              </CardTitle>
              <CardDescription>
                Restore data from backups
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg space-y-3">
                <h4 className="font-medium">Point-in-Time Recovery</h4>
                <p className="text-sm text-muted-foreground">
                  Restore system to a specific date and time
                </p>
                <div className="flex gap-2">
                  <Input type="datetime-local" className="flex-1" />
                  <Button>
                    Restore
                  </Button>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg space-y-3">
                <h4 className="font-medium">Selective Recovery</h4>
                <p className="text-sm text-muted-foreground">
                  Restore specific documents or departments
                </p>
                <div className="flex gap-2">
                  <Select>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="it">IT Department</SelectItem>
                      <SelectItem value="hr">HR Department</SelectItem>
                      <SelectItem value="finance">Finance Department</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button>
                    Restore
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                System Status
              </CardTitle>
              <CardDescription>
                Current backup system status and metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Last Backup:</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  2 hours ago
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Next Scheduled:</span>
                <span className="text-sm font-medium">Tonight 2:00 AM</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Backup Size:</span>
                <span className="text-sm font-medium">2.4 GB</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Recovery Point Objective:</span>
                <span className="text-sm font-medium">1 hour</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Recovery Time Objective:</span>
                <span className="text-sm font-medium">30 minutes</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Backups</CardTitle>
              <CardDescription>
                History of recent backup operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Full Backup</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Success
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">2.4 GB • 2 hours ago</p>
              </div>
              
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Incremental</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Success
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">156 MB • 1 day ago</p>
              </div>
              
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Full Backup</span>
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Failed
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Storage full • 2 days ago</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Disaster Recovery
              </CardTitle>
              <CardDescription>
                Test and validate recovery procedures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Test disaster recovery procedures monthly to ensure system reliability.
                </AlertDescription>
              </Alert>
              
              <Button variant="outline" className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                Test Recovery Process
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}