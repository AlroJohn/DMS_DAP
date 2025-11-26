"use client";

import { useState } from "react";
import { Database, Download, CheckCircle, AlertCircle, Clock, FileText, ArrowRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DataMigrationReportsPage() {
  const [activeTab, setActiveTab] = useState("completed");
  
  const migrationStats = [
    { label: "Total Migrations", value: "12", icon: Database, color: "text-blue-600" },
    { label: "Documents Migrated", value: "15,234", icon: FileText, color: "text-green-600" },
    { label: "Success Rate", value: "98.5%", icon: CheckCircle, color: "text-purple-600" },
    { label: "Total Data Size", value: "2.4 TB", icon: ArrowRight, color: "text-orange-600" }
  ];

  const completedMigrations = [
    {
      id: 1,
      name: "SharePoint to DMS Migration",
      source: "SharePoint Server 2019",
      startDate: "2024-01-10",
      endDate: "2024-01-12",
      documentsTotal: 5234,
      documentsMigrated: 5234,
      successRate: 100,
      dataSize: "1.2 GB",
      status: "Completed",
      errors: 0
    },
    {
      id: 2,
      name: "Legacy File System Import",
      source: "Network File Share",
      startDate: "2024-01-05",
      endDate: "2024-01-08",
      documentsTotal: 8456,
      documentsMigrated: 8234,
      successRate: 97.4,
      dataSize: "890 MB",
      status: "Completed",
      errors: 222
    },
    {
      id: 3,
      name: "Google Drive Migration",
      source: "Google Workspace",
      startDate: "2024-01-01",
      endDate: "2024-01-03",
      documentsTotal: 1544,
      documentsMigrated: 1544,
      successRate: 100,
      dataSize: "345 MB",
      status: "Completed",
      errors: 0
    }
  ];

  const ongoingMigrations = [
    {
      id: 4,
      name: "Archive System Migration",
      source: "Legacy Archive System",
      startDate: "2024-01-15",
      progress: 65,
      documentsTotal: 12000,
      documentsMigrated: 7800,
      estimatedCompletion: "2024-01-18",
      status: "In Progress"
    }
  ];

  return (
    <div className="flex h-full flex-col gap-6 px-4 pb-4 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Data Migration Reports</h1>
            <p className="text-muted-foreground">Track document migration progress and history</p>
          </div>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Migration Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {migrationStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Migration Details */}
      <div className="flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="completed">Completed Migrations</TabsTrigger>
            <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          </TabsList>
          
          <TabsContent value="completed" className="mt-6">
            <div className="space-y-4">
              {completedMigrations.map((migration) => (
                <Card key={migration.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{migration.name}</h3>
                        <p className="text-muted-foreground text-sm">From: {migration.source}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {migration.status}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Duration</p>
                        <p className="font-medium">{migration.startDate} - {migration.endDate}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Documents</p>
                        <p className="font-medium">{migration.documentsMigrated.toLocaleString()} / {migration.documentsTotal.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Success Rate</p>
                        <p className="font-medium">{migration.successRate}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Data Size</p>
                        <p className="font-medium">{migration.dataSize}</p>
                      </div>
                    </div>
                    
                    {migration.errors > 0 && (
                      <div className="mt-4 p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm text-red-800">
                            {migration.errors} documents failed to migrate
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="ongoing" className="mt-6">
            <div className="space-y-4">
              {ongoingMigrations.map((migration) => (
                <Card key={migration.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{migration.name}</h3>
                        <p className="text-muted-foreground text-sm">From: {migration.source}</p>
                      </div>
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        {migration.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span>Migration Progress</span>
                          <span className="font-medium">{migration.progress}%</span>
                        </div>
                        <Progress value={migration.progress} className="h-2" />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Started</p>
                          <p className="font-medium">{migration.startDate}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Progress</p>
                          <p className="font-medium">{migration.documentsMigrated.toLocaleString()} / {migration.documentsTotal.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Est. Completion</p>
                          <p className="font-medium">{migration.estimatedCompletion}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="scheduled" className="mt-6">
            <div className="text-center py-12">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Scheduled Migrations</h3>
              <p className="text-muted-foreground mb-4">
                Schedule new migrations from the admin panel
              </p>
              <Button variant="outline">
                Schedule Migration
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}