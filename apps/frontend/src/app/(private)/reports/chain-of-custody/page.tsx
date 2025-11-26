"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, User, Building } from "lucide-react";

export default function ChainOfCustodyPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chain of Custody Reports</h1>
        <p className="text-muted-foreground">Document transfer and custody tracking</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Document Transfer History</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <div className="font-medium">Contract Agreement - DOC-{1000 + i}</div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>John Doe</span>
                    <span className="text-muted-foreground">(Legal Dept)</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Jane Smith</span>
                    <span className="text-muted-foreground">(Finance Dept)</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Bob Johnson</span>
                    <span className="text-muted-foreground">(CEO Office)</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">Last transfer: {new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
