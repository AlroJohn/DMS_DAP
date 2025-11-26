"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, User, Calendar } from "lucide-react";

export default function AccessHistoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Access History Reports</h1>
        <p className="text-muted-foreground">Track who accessed documents and when</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Accesses</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">45,234</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Unique Users</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">156</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg Access/Day</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">1,508</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Access Events</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 border-b pb-3 last:border-0">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 space-y-1">
                  <div className="text-sm font-medium">Contract Agreement Q4-2024</div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1"><User className="h-3 w-3" />John Doe</div>
                    <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(Date.now() - i * 60 * 60 * 1000).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
