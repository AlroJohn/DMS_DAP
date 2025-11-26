"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Code } from "lucide-react";

export default function APIDocsPage() {
  const endpoints = [
    { method: "GET", path: "/api/documents", description: "List all documents" },
    { method: "POST", path: "/api/documents", description: "Create a new document" },
    { method: "GET", path: "/api/documents/:id", description: "Get document by ID" },
    { method: "PUT", path: "/api/documents/:id", description: "Update document" },
    { method: "DELETE", path: "/api/documents/:id", description: "Delete document" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API Documentation</h1>
        <p className="text-muted-foreground">RESTful API reference and examples</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" />Authentication</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">All API requests require authentication using an API key in the Authorization header:</p>
          <code className="block bg-muted p-3 rounded text-xs">Authorization: Bearer YOUR_API_KEY</code>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Document Endpoints</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {endpoints.map((endpoint, i) => (
              <div key={i} className="flex items-center gap-4 border-b pb-3 last:border-0">
                <Badge variant={endpoint.method === "GET" ? "secondary" : endpoint.method === "POST" ? "default" : endpoint.method === "DELETE" ? "destructive" : "outline"}>{endpoint.method}</Badge>
                <code className="flex-1 text-sm">{endpoint.path}</code>
                <span className="text-sm text-muted-foreground">{endpoint.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
