"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Shield,
  Clock,
  Search,
  AlertCircle,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { usePendingSignatures } from "@/hooks/usePendingSignatures";
import { format } from "date-fns";

export default function PendingSignaturesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const { documents, isLoading, error } = usePendingSignatures();

  const filteredDocuments = documents.filter((doc) =>
    doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleViewAndSign = (documentId: string) => {
    router.push(
      `/documents/${documentId}?mode=sign&returnTo=/workflows/pending-signatures`,
    );
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">
          Failed to load pending signatures
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 gap-6">
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
            <p className="text-muted-foreground">
              Loading pending signatures...
            </p>
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
        <div className="grid">
          {filteredDocuments.map((doc) => (
            <Card
              key={doc.document_id}
              className="hover:shadow-md transition-shadow py-2 flex flex-col gap-2"
            >
              <CardHeader className="px-2 flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg ">
                    {doc.document_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground ">
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
              </CardHeader>
              <CardContent className=" flex items-center justify-between">
                <div className="flex flex-1 items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Created: {format(new Date(doc.created_at), "MMM dd, yyyy")}
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    {doc.pending_signatures} Signature
                    {doc.pending_signatures !== 1 ? "s" : ""} Required
                    {doc.is_signed ? (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Signed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
                <Button 
                  onClick={() => handleViewAndSign(doc.document_id)}
                  variant={doc.is_signed ? "secondary" : "default"}
                >
                  {doc.is_signed ? "View Document" : "View & Sign"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
