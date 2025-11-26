"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Download, CreditCard, Activity } from "lucide-react";

export default function UsageBillingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usage & Billing</h1>
        <p className="text-muted-foreground">Monitor API usage and billing information</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><DollarSign className="h-4 w-4" />Current Bill</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">$248.50</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Activity className="h-4 w-4" />API Calls</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">45,234</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Download className="h-4 w-4" />Storage Used</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">128 GB</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><CreditCard className="h-4 w-4" />Next Billing</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">15 days</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Billing History</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between border-b pb-3 last:border-0">
                <div>
                  <div className="font-medium">January 2025</div>
                  <div className="text-sm text-muted-foreground">Paid on Jan 1, 2025</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">$248.50</div>
                  <div className="text-sm text-muted-foreground">Invoice #INV-001</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
