"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Link2 } from "lucide-react";

export default function ContractRelationshipsPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = use(paramsPromise);
  const router = useRouter();

  const relationships = [
    { type: "Parent Contract", document: "Master Service Agreement 2024", relation: "Parent" },
    { type: "Annex", document: "Service Level Agreement", relation: "Child" },
    { type: "Annex", document: "Data Processing Agreement", relation: "Child" },
    { type: "Amendment", document: "Amendment #1 - Pricing Update", relation: "Amendment" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push(`/contracts/${params.id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Relationships</h1>
          <p className="text-muted-foreground">View related documents and annexes</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" />Related Documents</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {relationships.map((rel, i) => (
              <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{rel.document}</div>
                    <div className="text-sm text-muted-foreground">{rel.type}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
