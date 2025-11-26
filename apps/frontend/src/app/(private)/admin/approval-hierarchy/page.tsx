"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function ApprovalHierarchyPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Approval Hierarchy</h1>
          <p className="text-muted-foreground">Configure document approval hierarchies</p>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" />New Hierarchy</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Legal Department Hierarchy</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 pl-0">
              <div className="font-medium">1. Legal Assistant</div>
            </div>
            <div className="flex items-center gap-2 pl-8">
              <div className="font-medium">2. Legal Manager</div>
            </div>
            <div className="flex items-center gap-2 pl-16">
              <div className="font-medium">3. Legal Director</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
