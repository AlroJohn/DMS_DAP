"use client";

import { useState } from "react";
import { Plus, Workflow, Play, Pause, Settings, MoreHorizontal, Users, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";

export default function WorkflowsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("active");

  const workflows = [
    {
      id: 1,
      name: "Document Approval Process",
      description: "Standard approval workflow for all document types",
      status: "active",
      stages: 4,
      documentsInProgress: 12,
      avgCompletionTime: "2.5 days",
      lastModified: "2 days ago"
    },
    {
      id: 2,
      name: "Contract Review Workflow",
      description: "Multi-stage review process for contracts with legal approval",
      status: "active",
      stages: 6,
      documentsInProgress: 8,
      avgCompletionTime: "5.2 days",
      lastModified: "1 week ago"
    },
    {
      id: 3,
      name: "Emergency Document Processing",
      description: "Fast-track workflow for urgent documents",
      status: "paused",
      stages: 2,
      documentsInProgress: 3,
      avgCompletionTime: "4 hours",
      lastModified: "3 days ago"
    }
  ];

  const stats = [
    { label: "Active Workflows", value: "2", icon: Play, color: "text-green-600" },
    { label: "Documents in Progress", value: "23", icon: Clock, color: "text-blue-600" },
    { label: "Completed This Month", value: "156", icon: CheckCircle, color: "text-purple-600" },
    { label: "Average Completion", value: "3.2 days", icon: Users, color: "text-orange-600" }
  ];

  return (
    <div className="flex h-full flex-col gap-6 px-4 pb-4 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Workflow className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Workflows</h1>
            <p className="text-muted-foreground">Manage document approval workflows and processes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/workflows/templates')}>
            Templates
          </Button>
          <Button onClick={() => router.push('/workflows/builder')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Workflow
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
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

      {/* Workflows List */}
      <div className="flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active">Active Workflows</TabsTrigger>
            <TabsTrigger value="paused">Paused</TabsTrigger>
            <TabsTrigger value="draft">Drafts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-6">
            <div className="grid gap-4">
              {workflows.filter(w => w.status === 'active').map((workflow) => (
                <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{workflow.name}</h3>
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-4">{workflow.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Stages</p>
                            <p className="font-medium">{workflow.stages}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">In Progress</p>
                            <p className="font-medium">{workflow.documentsInProgress} docs</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Avg. Time</p>
                            <p className="font-medium">{workflow.avgCompletionTime}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Last Modified</p>
                            <p className="font-medium">{workflow.lastModified}</p>
                          </div>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/workflows/${workflow.id}`)}>
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Users className="h-4 w-4 mr-2" />
                            View Analytics
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="paused" className="mt-6">
            <div className="grid gap-4">
              {workflows.filter(w => w.status === 'paused').map((workflow) => (
                <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{workflow.name}</h3>
                          <Badge variant="secondary">
                            Paused
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-4">{workflow.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Stages</p>
                            <p className="font-medium">{workflow.stages}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">In Progress</p>
                            <p className="font-medium">{workflow.documentsInProgress} docs</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Avg. Time</p>
                            <p className="font-medium">{workflow.avgCompletionTime}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Last Modified</p>
                            <p className="font-medium">{workflow.lastModified}</p>
                          </div>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Play className="h-4 w-4 mr-2" />
                            Resume
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/workflows/${workflow.id}`)}>
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="draft" className="mt-6">
            <div className="text-center py-12">
              <Workflow className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Draft Workflows</h3>
              <p className="text-muted-foreground mb-4">Create a new workflow to get started</p>
              <Button onClick={() => router.push('/workflows/builder')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}