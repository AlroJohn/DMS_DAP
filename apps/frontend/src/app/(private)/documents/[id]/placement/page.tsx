"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useDocumentDetail } from "@/hooks/use-document-detail";
import { useDocumentFiles } from "@/hooks/use-document-files";
import { DocumentViewerWithSignatures } from "@/components/reuseable/document-viewer-with-signatures/document-viewer-with-signatures";
import { SignatureCaptureModal } from "@/components/modals/signature-capture-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function DocumentSignaturePlacementPage() {
  const routeParams = useParams<{ id: string }>();
  const documentId = routeParams.id as string;
  const router = useRouter();
  const [activeSignatureData, setActiveSignatureData] = useState<string | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { document, isLoading: docLoading, error: docError } = useDocumentDetail(documentId);
  const {
    files,
    isLoading: filesLoading,
    error: filesError,
  } = useDocumentFiles(documentId);

  // Get all existing signatures for this document
  const [existingSignatures, setExistingSignatures] = useState<any[]>([]);
  const [loadingSignatures, setLoadingSignatures] = useState(true);

  useEffect(() => {
    const fetchSignatures = async () => {
      try {
        setLoadingSignatures(true);
        const response = await fetch(`/api/documents/${documentId}/signatures`);
        if (!response.ok) {
          throw new Error('Failed to fetch signatures');
        }
        const data = await response.json();
        setExistingSignatures(data);
      } catch (error) {
        console.error('Error fetching signatures:', error);
        toast.error('Failed to load signatures');
        setExistingSignatures([]);
      } finally {
        setLoadingSignatures(false);
      }
    };

    if (documentId) {
      fetchSignatures();
    }
  }, [documentId]);

  const handleOpenSignatureModal = () => {
    setIsSignatureModalOpen(true);
  };

  const handleSignatureCapture = (signatureData: string) => {
    setActiveSignatureData(signatureData);
  };

  const handleConfirmSignaturePlacement = async ({
    signatureData,
    x_position,
    y_position,
    width,
    height,
    page_number,
  }: {
    signatureData: string;
    x_position: number;
    y_position: number;
    width: number;
    height: number;
    page_number: number;
  }) => {
    try {
      setIsSaving(true);
      
      // Find the primary document file
      const primaryFile = files?.find(f => f.isPrimary) || files?.[0];
      if (!primaryFile) {
        throw new Error("No document file available for signature");
      }

      // Send the signature placement to the API
      const response = await fetch(`/api/documents/${documentId}/sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          signatureData,
          x_position,
          y_position,
          width,
          height,
          page_number,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save signature placement");
      }

      // Reset active signature data after successful placement
      setActiveSignatureData(null);
      
      toast.success("Signature placement saved successfully!");
      
      // Refetch signatures to update the display
      const signaturesResponse = await fetch(`/api/documents/${documentId}/signatures`);
      if (signaturesResponse.ok) {
        const signaturesData = await signaturesResponse.json();
        setExistingSignatures(signaturesData);
      }
    } catch (error: any) {
      console.error("Error saving signature placement:", error);
      toast.error(error.message || "Error saving signature placement");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSignaturePlacement = () => {
    setActiveSignatureData(null);
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleFinishPlacement = () => {
    router.push(`/documents/${documentId}`);
  };

  if (docLoading || filesLoading || loadingSignatures) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Document Signature Placement</h1>
        </div>
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Loading document for signature placement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (docError || filesError) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading document</AlertTitle>
          <AlertDescription>
            {docError || filesError || "Failed to load document information"}
          </AlertDescription>
        </Alert>
        <Button onClick={handleGoBack} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <Alert>
          <AlertTitle>Document not found</AlertTitle>
          <AlertDescription>
            The requested document could not be located.
          </AlertDescription>
        </Alert>
        <Button onClick={handleGoBack} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  // Convert document files to the format expected by DocumentViewerWithSignatures
  const documentFiles = files?.map(file => ({
    id: file.id,
    name: file.name,
    downloadUrl: `/api/documents/${documentId}/files/${file.id}/stream`,
    isPrimary: file.isPrimary
  })) || [];

  // Format existing signatures to the format expected by DocumentViewerWithSignatures
  const formattedSignatures = existingSignatures.map(sig => ({
    signed_document_id: sig.signed_document_id,
    documentFileFile_id: sig.documentFileFile_id,
    signature_data: sig.signature_data,
    x_position: sig.x_position,
    y_position: sig.y_position,
    width: sig.width,
    height: sig.height,
    page_number: sig.page_number
  }));

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Place Signatures on Document</h1>
          <p className="text-sm text-muted-foreground">
            Document: {document.title || 'Untitled Document'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleGoBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleFinishPlacement}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Finish Placement
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Signature Placement Process</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 p-3 bg-blue-50 rounded-md">
            <div className="text-blue-800">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="font-medium">Step 1</span>
              </div>
            </div>
            <p className="text-sm text-blue-700 flex-1">
              Select signature method (draw or upload)
            </p>
            <Button onClick={handleOpenSignatureModal}>
              Create Signature
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-4 p-3 bg-green-50 rounded-md">
            <div className="text-green-800">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="font-medium">Step 2</span>
              </div>
            </div>
            <p className="text-sm text-green-700 flex-1">
              Place your signature on the document
            </p>
            <span className="text-sm text-green-700">
              {activeSignatureData ? "Signature ready" : "No signature selected"}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <DocumentViewerWithSignatures
          documentFiles={documentFiles}
          signedDocuments={formattedSignatures}
          activeSignatureData={activeSignatureData}
          onConfirmSignaturePlacement={handleConfirmSignaturePlacement}
          onCancelSignaturePlacement={handleCancelSignaturePlacement}
        />
      </div>

      <SignatureCaptureModal
        open={isSignatureModalOpen}
        onOpenChange={setIsSignatureModalOpen}
        onConfirm={handleSignatureCapture}
        documentTitle={document.title || 'Untitled Document'}
      />
    </div>
  );
}
