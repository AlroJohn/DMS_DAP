"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

export default function QueryReportsPage() {
  const queries = [
    { query: "SELECT * FROM documents WHERE status='completed'", executions: 1247, avgTime: "45ms" },
    { query: "SELECT * FROM users WHERE active=true", executions: 892, avgTime: "12ms" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Query Reports</h1>
        <p className="text-muted-foreground">Database query performance and analytics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Activity className="h-4 w-4" />Total Queries</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">15,428</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg Response Time</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">28ms</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Slow Queries</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">12</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Top Queries</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {queries.map((q, i) => (
              <div key={i} className="border-b pb-3 last:border-0">
                <code className="text-xs bg-muted px-2 py-1 rounded block mb-2">{q.query}</code>
                <div className="text-xs text-muted-foreground">Executions: {q.executions} • Avg time: {q.avgTime}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
