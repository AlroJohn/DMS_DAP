"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function VersionHistoryReportPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Version History Reports</h1>
          <p className="text-muted-foreground">System-wide document version tracking</p>
        </div>
        <Button><Download className="mr-2 h-4 w-4" />Export Report</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Versions</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">3,428</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">This Month</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">287</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg Versions/Doc</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">2.4</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Version Changes</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between border-b pb-3 last:border-0">
                <div>
                  <div className="font-medium">Contract Agreement - v{i + 1}.0</div>
                  <div className="text-sm text-muted-foreground">Updated by John Doe • 2 hours ago</div>
                </div>
                <Button variant="outline" size="sm">View Diff</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
