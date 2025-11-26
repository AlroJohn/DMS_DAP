"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight } from "lucide-react";

export default function RoutingRulesPage() {
  const rules = [
    { id: "1", name: "Legal Contracts", condition: "Document Type = Contract", route: ["Legal Dept", "Finance Dept", "CEO Office"] },
    { id: "2", name: "HR Documents", condition: "Department = HR", route: ["HR Manager", "HR Director"] },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Routing Rules</h1>
          <p className="text-muted-foreground">Configure automatic document routing</p>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" />New Rule</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Active Routing Rules</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.id} className="border-b pb-4 last:border-0">
                <div className="font-medium mb-2">{rule.name}</div>
                <div className="text-sm text-muted-foreground mb-2">Condition: {rule.condition}</div>
                <div className="flex items-center gap-2 text-sm">
                  {rule.route.map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span>{step}</span>
                      {i < rule.route.length - 1 && <ArrowRight className="h-3 w-3" />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
