"use client";

import { useState } from "react";
import { Activity, Filter, Download, Calendar, User, FileText, Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AuditTrailPage() {
  const [actionType, setActionType] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [dateRange, setDateRange] = useState("");

  const auditLogs = [
    {
      id: 1,
      timestamp: "2024-01-15 14:30:25",
      user: "John Smith",
      action: "Document Signed",
      resource: "Contract ABC-123",
      details: "Document signed using blockchain verification",
      ipAddress: "192.168.1.100",
      status: "Success",
      severity: "Medium"
    },
    {
      id: 2,
      timestamp: "2024-01-15 14:25:10",
      user: "Sarah Johnson",
      action: "Document Created",
      resource: "Annual Report 2024",
      details: "New document created in Finance department",
      ipAddress: "192.168.1.101",
      status: "Success",
      severity: "Low"
    },
    {
      id: 3,
      timestamp: "2024-01-15 14:20:45",
      user: "Mike Davis",
      action: "Login Failed",
      resource: "User Authentication",
      details: "Failed login attempt - invalid credentials",
      ipAddress: "192.168.1.102",
      status: "Failed",
      severity: "High"
    },
    {
      id: 4,
      timestamp: "2024-01-15 14:15:30",
      user: "Lisa Chen",
      action: "Document Downloaded",
      resource: "Policy Manual v2.1",
      details: "Document downloaded by authorized user",
      ipAddress: "192.168.1.103",
      status: "Success",
      severity: "Low"
    },
    {
      id: 5,
      timestamp: "2024-01-15 14:10:15",
      user: "Admin User",
      action: "User Role Changed",
      resource: "Tom Wilson",
      details: "User role changed from User to Manager",
      ipAddress: "192.168.1.104",
      status: "Success",
      severity: "Medium"
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  return (
    <div className="flex h-full flex-col gap-6 px-4 pb-4 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Audit Trail</h1>
            <p className="text-muted-foreground">View detailed system activity and user actions</p>
          </div>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search logs..."
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="action-type">Action Type</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="login">Login/Logout</SelectItem>
                  <SelectItem value="document">Document Actions</SelectItem>
                  <SelectItem value="user">User Management</SelectItem>
                  <SelectItem value="system">System Changes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="user-filter">User</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="john">John Smith</SelectItem>
                  <SelectItem value="sarah">Sarah Johnson</SelectItem>
                  <SelectItem value="mike">Mike Davis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date-range">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Last 7 days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last 30 days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Activity Log ({auditLogs.length} entries)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-6 hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{log.user.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{log.action}</h4>
                        <Badge className={getSeverityColor(log.severity)}>
                          {log.severity}
                        </Badge>
                        <Badge className={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{log.details}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{log.user}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>{log.resource}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{log.timestamp}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          <span>{log.ipAddress}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}