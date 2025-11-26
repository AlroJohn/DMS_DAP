"use client";

import { useState } from "react";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  User,
  Calendar,
  MoreHorizontal,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState("pending");

  const pendingApprovals = [
    {
      id: 1,
      documentTitle: "Annual Budget Report 2024",
      documentType: "Financial Report",
      submittedBy: "John Smith",
      submittedDate: "2024-01-15",
      priority: "High",
      department: "Finance",
      dueDate: "2024-01-20",
      description:
        "Comprehensive annual budget analysis and projections for fiscal year 2024",
    },
    {
      id: 2,
      documentTitle: "Software License Agreement",
      documentType: "Contract",
      submittedBy: "Sarah Johnson",
      submittedDate: "2024-01-14",
      priority: "Medium",
      department: "IT",
      dueDate: "2024-01-18",
      description:
        "Enterprise software licensing contract with Microsoft for Office 365 services",
    },
    {
      id: 3,
      documentTitle: "Employee Policy Update",
      documentType: "Policy",
      submittedBy: "Mike Davis",
      submittedDate: "2024-01-13",
      priority: "Low",
      department: "HR",
      dueDate: "2024-01-25",
      description:
        "Updated remote work policies and guidelines for all employees",
    },
  ];

  const completedApprovals = [
    {
      id: 4,
      documentTitle: "Q4 Marketing Campaign",
      documentType: "Proposal",
      submittedBy: "Lisa Chen",
      approvedDate: "2024-01-12",
      status: "Approved",
      department: "Marketing",
    },
    {
      id: 5,
      documentTitle: "Security Audit Report",
      documentType: "Report",
      submittedBy: "Tom Wilson",
      approvedDate: "2024-01-10",
      status: "Rejected",
      department: "Security",
    },
  ];

  const stats = [
    {
      label: "Pending Approvals",
      value: pendingApprovals.length,
      icon: Clock,
      color: "text-orange-600",
    },
    {
      label: "Approved Today",
      value: "5",
      icon: CheckCircle,
      color: "text-green-600",
    },
    { label: "Overdue", value: "2", icon: AlertCircle, color: "text-red-600" },
    {
      label: "This Month",
      value: "28",
      icon: FileText,
      color: "text-blue-600",
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 px-4 pb-4 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <CheckCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Approvals</h1>
            <p className="text-muted-foreground">
              Review and approve pending documents
            </p>
          </div>
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
                    <p className="text-xs font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Approvals List */}
      <div className="flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingApprovals.length})
            </TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            <div className="space-y-4">
              {pendingApprovals.map((approval) => (
                <Card
                  key={approval.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">
                              {approval.documentTitle}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {approval.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={getPriorityColor(approval.priority)}
                            >
                              {approval.priority}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <FileText className="h-4 w-4 mr-2" />
                                  View Document
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <User className="h-4 w-4 mr-2" />
                                  Contact Submitter
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground">Type</p>
                              <p className="font-medium">
                                {approval.documentType}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground">
                                Submitted by
                              </p>
                              <p className="font-medium">
                                {approval.submittedBy}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground">Submitted</p>
                              <p className="font-medium">
                                {approval.submittedDate}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground">Due</p>
                              <p className="font-medium">{approval.dueDate}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive">
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <div className="space-y-4">
              {completedApprovals.map((approval) => (
                <Card
                  key={approval.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {approval.submittedBy
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">
                            {approval.documentTitle}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {approval.documentType} • Submitted by{" "}
                            {approval.submittedBy}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            approval.status === "Approved"
                              ? "default"
                              : "destructive"
                          }
                          className={
                            approval.status === "Approved"
                              ? "bg-green-100 text-green-800"
                              : ""
                          }
                        >
                          {approval.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {approval.approvedDate}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
