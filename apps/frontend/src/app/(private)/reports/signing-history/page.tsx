"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Download, Search, Calendar, User, FileText } from "lucide-react";

export default function SigningHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");

  const signingHistory = [
    { id: "1", document: "Contract Agreement Q4-2024", signer: "John Doe", department: "Legal", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), txHash: `0x${Math.random().toString(36).substring(2, 15)}...`, status: "Verified" },
    { id: "2", document: "Employee NDA - Jane Smith", signer: "Jane Smith", department: "HR", timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), txHash: `0x${Math.random().toString(36).substring(2, 15)}...`, status: "Verified" },
    { id: "3", document: "Vendor Agreement - ABC Corp", signer: "Bob Johnson", department: "Procurement", timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), txHash: `0x${Math.random().toString(36).substring(2, 15)}...`, status: "Verified" },
    { id: "4", document: "Project Proposal - Alpha", signer: "Alice Williams", department: "Operations", timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), txHash: `0x${Math.random().toString(36).substring(2, 15)}...`, status: "Verified" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Signing History</h1>
          <p className="text-muted-foreground">Complete history of blockchain signatures</p>
        </div>
        <Button><Download className="mr-2 h-4 w-4" />Export Report</Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search documents or signers..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Signatures</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Signatures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">248</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">+8% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.8%</div>
            <p className="text-xs text-muted-foreground">All signatures verified</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Signatures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {signingHistory.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{entry.document}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {entry.signer}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <code className="text-xs text-muted-foreground">{entry.txHash}</code>
                </div>
                <Badge variant="outline" className="border-green-600 text-green-600">
                  <Shield className="mr-1 h-3 w-3" />
                  {entry.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
