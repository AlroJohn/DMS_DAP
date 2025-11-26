"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  FileText, 
  Clock, 
  User, 
  Calendar, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowLeft,
  Download,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Mock data - replace with actual API calls
const mockAmendments = [
  {
    id: "1",
    version: "v2.1",
    title: "Updated compliance requirements",
    description: "Modified section 3.2 to align with new regulatory standards",
    status: "approved",
    author: {
      name: "Sarah Johnson",
      email: "sarah.johnson@company.com",
      initials: "SJ"
    },
    createdAt: "2024-01-15T10:30:00Z",
    approvedAt: "2024-01-16T14:20:00Z",
    changes: [
      {
        section: "3.2 Compliance Standards",
        type: "modified",
        summary: "Updated regulatory compliance requirements"
      },
      {
        section: "Appendix B",
        type: "added",
        summary: "Added new compliance checklist"
      }
    ]
  },
  {
    id: "2",
    version: "v2.0",
    title: "Major revision - Process improvements",
    description: "Comprehensive update to workflow processes and approval hierarchy",
    status: "pending",
    author: {
      name: "Michael Chen",
      email: "michael.chen@company.com",
      initials: "MC"
    },
    createdAt: "2024-01-10T09:15:00Z",
    changes: [
      {
        section: "2.1 Workflow Process",
        type: "modified",
        summary: "Streamlined approval process"
      },
      {
        section: "4.3 Authorization Levels",
        type: "modified",
        summary: "Updated authorization matrix"
      }
    ]
  },
  {
    id: "3",
    version: "v1.5",
    title: "Security protocol updates",
    description: "Enhanced security measures and access controls",
    status: "rejected",
    author: {
      name: "Emily Rodriguez",
      email: "emily.rodriguez@company.com",
      initials: "ER"
    },
    createdAt: "2024-01-05T16:45:00Z",
    rejectedAt: "2024-01-08T11:30:00Z",
    rejectionReason: "Conflicts with existing security framework",
    changes: [
      {
        section: "5.1 Access Controls",
        type: "modified",
        summary: "Enhanced multi-factor authentication"
      }
    ]
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "approved":
      return <CheckCircle2 className="h-4 w-4" />;
    case "pending":
      return <Clock className="h-4 w-4" />;
    case "rejected":
      return <XCircle className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

const getChangeTypeColor = (type: string) => {
  switch (type) {
    case "added":
      return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/10 dark:text-green-400";
    case "modified":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/10 dark:text-blue-400";
    case "removed":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/10 dark:text-red-400";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/10 dark:text-gray-400";
  }
};

export default function DocumentAmendmentsPage({
  params,
}: {
  params: { id: string };
}) {
  const [selectedAmendment, setSelectedAmendment] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col gap-6 px-6 py-6 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/documents/${params.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Document Amendments</h1>
            <p className="text-muted-foreground">
              Amendment history and version control for document {params.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Export History
          </Button>
          <Button size="sm">
            <Edit3 className="h-4 w-4" />
            Create Amendment
          </Button>
        </div>
      </div>

      <Tabs defaultValue="timeline" className="flex-1">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
          <TabsTrigger value="versions">Version History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Timeline */}
            <div className="lg:col-span-2 space-y-4">
              <div className="relative">
                {mockAmendments.map((amendment, index) => (
                  <div key={amendment.id} className="relative">
                    {/* Timeline line */}
                    {index !== mockAmendments.length - 1 && (
                      <div className="absolute left-6 top-12 h-full w-px bg-border" />
                    )}
                    
                    <Card className={cn(
                      "relative transition-all duration-200 hover:shadow-md cursor-pointer",
                      selectedAmendment === amendment.id && "ring-2 ring-primary ring-offset-2"
                    )}
                    onClick={() => setSelectedAmendment(amendment.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-4">
                          {/* Status indicator */}
                          <div className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-full border-2 bg-background",
                            amendment.status === "approved" && "border-green-500 bg-green-50 dark:bg-green-900/20",
                            amendment.status === "pending" && "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
                            amendment.status === "rejected" && "border-red-500 bg-red-50 dark:bg-red-900/20"
                          )}>
                            {getStatusIcon(amendment.status)}
                          </div>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">{amendment.title}</CardTitle>
                                <Badge variant="outline" className="text-xs">
                                  {amendment.version}
                                </Badge>
                              </div>
                              <Badge className={cn("text-xs", getStatusColor(amendment.status))}>
                                {amendment.status.charAt(0).toUpperCase() + amendment.status.slice(1)}
                              </Badge>
                            </div>
                            
                            <CardDescription className="text-sm">
                              {amendment.description}
                            </CardDescription>
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {amendment.author.name}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(amendment.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Changes Made:</h4>
                          <div className="space-y-1">
                            {amendment.changes.map((change, changeIndex) => (
                              <div key={changeIndex} className="flex items-center gap-2 text-sm">
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs", getChangeTypeColor(change.type))}
                                >
                                  {change.type}
                                </Badge>
                                <span className="text-muted-foreground">{change.section}:</span>
                                <span>{change.summary}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {amendment.status === "rejected" && amendment.rejectionReason && (
                          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 rounded-md border border-red-200 dark:border-red-800">
                            <p className="text-sm text-red-800 dark:text-red-400">
                              <strong>Rejection Reason:</strong> {amendment.rejectionReason}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>

            {/* Details Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Amendment Details</CardTitle>
                  <CardDescription>
                    {selectedAmendment 
                      ? "Detailed information about the selected amendment"
                      : "Select an amendment to view details"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedAmendment ? (
                    <div className="space-y-4">
                      {(() => {
                        const amendment = mockAmendments.find(a => a.id === selectedAmendment);
                        if (!amendment) return null;
                        
                        return (
                          <>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>{amendment.author.initials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{amendment.author.name}</p>
                                <p className="text-sm text-muted-foreground">{amendment.author.email}</p>
                              </div>
                            </div>
                            
                            <Separator />
                            
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-medium">Created</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(amendment.createdAt).toLocaleString()}
                                </p>
                              </div>
                              
                              {amendment.approvedAt && (
                                <div>
                                  <p className="text-sm font-medium">Approved</p>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(amendment.approvedAt).toLocaleString()}
                                  </p>
                                </div>
                              )}
                              
                              {amendment.rejectedAt && (
                                <div>
                                  <p className="text-sm font-medium">Rejected</p>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(amendment.rejectedAt).toLocaleString()}
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            <Separator />
                            
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="flex-1">
                                <Eye className="h-4 w-4" />
                                View Changes
                              </Button>
                              <Button variant="outline" size="sm" className="flex-1">
                                <Download className="h-4 w-4" />
                                Download
                              </Button>
                            </div>
                          </>
                        );
                      })()
                      }
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      <div className="text-center">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Select an amendment to view details</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Amendments</span>
                    <Badge variant="outline">{mockAmendments.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Approved</span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      {mockAmendments.filter(a => a.status === "approved").length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pending</span>
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                      {mockAmendments.filter(a => a.status === "pending").length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Rejected</span>
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                      {mockAmendments.filter(a => a.status === "rejected").length}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="versions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
              <CardDescription>
                Complete version history with detailed change logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Version history view coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Amendment Analytics</CardTitle>
              <CardDescription>
                Insights and metrics about document amendments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Analytics dashboard coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}