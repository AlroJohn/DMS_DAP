"use client";

import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { SigningPdfViewer } from "@/app/(private)/documents/[id]/components/signing-pdf-viewer";
import { useDocumentFiles } from "@/hooks/use-document-files";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface PDFSignatureComponentProps {
  pdfUrl?: string;
  documentId: string;
  onComplete: () => void;
}

export default function PDFSignatureComponent({
  documentId,
  onComplete,
}: PDFSignatureComponentProps) {
  const router = useRouter();
  const { files, isLoading, error } = useDocumentFiles(documentId);

  const handleExit = () => {
    router.push(`/documents/${documentId}`);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between gap-2">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={handleExit}>
            Go back
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <SigningPdfViewer
      documentId={documentId}
      files={files}
      isLoadingFiles={isLoading}
      onExit={handleExit}
      onSigned={onComplete}
    />
  );
}
