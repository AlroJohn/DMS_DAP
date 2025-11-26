"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Shield, Clock, Search, AlertCircle } from "lucide-react";

export default function PendingSignaturesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  const pendingDocuments = [
    { id: "1", title: "Contract Agreement Q4-2024", department: "Legal", dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), priority: "High" },
    { id: "2", title: "Employee NDA - John Doe", department: "HR", dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), priority: "Medium" },
    { id: "3", title: "Vendor Agreement - ABC Corp", department: "Procurement", dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), priority: "Low" },
    { id: "4", title: "Project Proposal - Alpha Project", department: "Operations", dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), priority: "High" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pending Signatures</h1>
          <p className="text-muted-foreground">Documents awaiting blockchain signature</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {pendingDocuments.length} Pending
        </Badge>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search documents..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4">
        {pendingDocuments.map((doc) => (
          <Card key={doc.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{doc.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{doc.department} Department</p>
                </div>
                <Badge variant={doc.priority === "High" ? "destructive" : doc.priority === "Medium" ? "default" : "secondary"}>
                  {doc.priority} Priority
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Due: {new Date(doc.dueDate).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    Blockchain Signature Required
                  </div>
                </div>
                <Button onClick={() => router.push(`/documents/${doc.id}`)}>
                  View & Sign
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
