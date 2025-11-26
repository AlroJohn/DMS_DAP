"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Calendar, Shield, Hash, CheckCircle2, Clock } from "lucide-react";

export default function SignatureHistoryPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = use(paramsPromise);
  const router = useRouter();

  const signatures = [
    {
      id: 1,
      signer: "John Doe",
      email: "john.doe@example.com",
      role: "Legal Manager",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      txHash: `0x${Math.random().toString(36).substring(2, 15)}...`,
      status: "Verified",
    },
    {
      id: 2,
      signer: "Jane Smith",
      email: "jane.smith@example.com",
      role: "Department Head",
      timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      txHash: `0x${Math.random().toString(36).substring(2, 15)}...`,
      status: "Verified",
    },
    {
      id: 3,
      signer: "Bob Johnson",
      email: "bob.johnson@example.com",
      role: "Compliance Officer",
      timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
      txHash: `0x${Math.random().toString(36).substring(2, 15)}...`,
      status: "Verified",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push(`/documents/${params.id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Signature History</h1>
            <p className="text-muted-foreground">Complete signing timeline for this document</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Signing Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-8">
            {signatures.map((sig, index) => (
              <div key={sig.id} className="relative flex gap-4">
                <div className="absolute left-5 top-12 h-full w-px bg-border" style={{ display: index === signatures.length - 1 ? "none" : "block" }} />
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-3 pb-8">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{sig.signer}</h3>
                      <p className="text-sm text-muted-foreground">{sig.role}</p>
                    </div>
                    <Badge variant="outline" className="border-green-600 text-green-600">
                      <Shield className="mr-1 h-3 w-3" />
                      {sig.status}
                    </Badge>
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{sig.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{new Date(sig.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <code className="text-xs text-muted-foreground">{sig.txHash}</code>
                    </div>
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
