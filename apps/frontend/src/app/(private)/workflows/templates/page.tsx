"use client";

import { useState } from "react";
import { Plus, FileText, CheckCircle, Edit, Play, Clock, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export default function WorkflowTemplatesPage() {
  const router = useRouter();
  
  const templates = [
    {
      id: 1,
      name: "Standard Document Approval",
      description: "Basic approval workflow for standard documents",
      stages: 3,
      status: "Active",
      category: "Document Review",
      lastUpdated: "2 days ago",
      usageCount: 45
    },
    {
      id: 2,
      name: "Contract Review Process",
      description: "Multi-stage review process for contracts with legal approval",
      stages: 5,
      status: "Active",
      category: "Approval Process",
      lastUpdated: "1 week ago",
      usageCount: 23
    },
    {
      id: 3,
      name: "Emergency Document Processing",
      description: "Fast-track workflow for urgent documents",
      stages: 2,
      status: "Draft",
      category: "Emergency",
      lastUpdated: "3 days ago",
      usageCount: 8
    }
  ];

  const categories = [
    { name: "Document Review", icon: FileText, count: 5, color: "bg-blue-100 text-blue-600" },
    { name: "Approval Process", icon: CheckCircle, count: 3, color: "bg-green-100 text-green-600" },
    { name: "Signature Required", icon: Edit, count: 4, color: "bg-purple-100 text-purple-600" },
    { name: "Emergency", icon: Clock, count: 2, color: "bg-orange-100 text-orange-600" }
  ];

  return (
    <div className="flex h-full flex-col gap-6 px-4 pb-4 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Workflow Templates</h1>
            <p className="text-muted-foreground">Pre-built workflow templates for common processes</p>
          </div>
        </div>
        <Button onClick={() => router.push('/workflows/builder')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Template Categories */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((category, index) => {
          const Icon = category.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <div className={`w-12 h-12 ${category.color} rounded-full flex items-center justify-center mx-auto mb-3`}>
                  <Icon className="h-6 w-6" />
                </div>
                <p className="font-medium text-sm">{category.name}</p>
                <p className="text-xs text-muted-foreground">{category.count} templates</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Templates Grid */}
      <div className="flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <Badge 
                    variant={template.status === 'Active' ? 'default' : 'secondary'}
                    className={template.status === 'Active' ? 'bg-green-100 text-green-800' : ''}
                  >
                    {template.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">{template.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Stages</p>
                    <p className="font-medium">{template.stages}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Used</p>
                    <p className="font-medium">{template.usageCount}x</p>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p>Category: {template.category}</p>
                  <p>Last updated: {template.lastUpdated}</p>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1">
                    <Play className="h-3 w-3 mr-1" />
                    Use Template
                  </Button>
                  <Button size="sm" variant="outline">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}