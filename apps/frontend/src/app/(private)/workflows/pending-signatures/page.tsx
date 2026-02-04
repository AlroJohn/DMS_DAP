"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Shield, Clock, Search, AlertCircle, Loader2 } from "lucide-react";
import { usePendingSignatures } from "@/hooks/usePendingSignatures";
import { format } from "date-fns";

export default function PendingSignaturesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const { documents, isLoading, error } = usePendingSignatures();

  const filteredDocuments = documents.filter((doc) =>
    doc.document_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewAndSign = (documentId: string) => {
    router.push(`/documents/${documentId}?mode=sign&returnTo=/workflows/pending-signatures`);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">Failed to load pending signatures</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pending Signatures</h1>
          <p className="text-muted-foreground">Documents awaiting your signature</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {filteredDocuments.length} {filteredDocuments.length === 1 ? "Document" : "Documents"}
        </Badge>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading pending signatures...</p>
          </div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No pending signatures</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm
                ? "No documents match your search"
                : "You don't have any documents waiting for your signature"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((doc) => (
            <Card key={doc.document_id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{doc.document_name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Type: {doc.type?.type_name || "N/A"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      doc.classification === "Highly Confidential"
                        ? "destructive"
                        : doc.classification === "Confidential"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {doc.classification}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Created: {format(new Date(doc.created_at), "MMM dd, yyyy")}
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      {doc.pending_signatures} Signature{doc.pending_signatures !== 1 ? "s" : ""} Required
                    </div>
                  </div>
                  <Button onClick={() => handleViewAndSign(doc.document_id)}>
                    View & Sign
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
