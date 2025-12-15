'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import PDFSignatureComponent from '@/components/signature/PDFSignatureComponent';
import { getDocumentById } from '@/lib/documents';

const DocumentSignaturePage = () => {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSigning, setIsSigning] = useState(false);
  const [signingSuccess, setSigningSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch document details
  const { data: document, isLoading, error: fetchError } = useQuery({
    queryKey: ['document', id],
    queryFn: () => getDocumentById(id as string),
    enabled: !!id
  });

  if (fetchError) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading document: {fetchError.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleCompleteSignature = async () => {
    setIsSigning(true);
    setError(null);
    
    try {
      // In a real implementation, this would trigger the signature process
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSigningSuccess(true);
      
      // Refresh document data
      await queryClient.invalidateQueries({ queryKey: ['document', id] });
      
      // Redirect after a delay
      setTimeout(() => {
        router.push(`/documents/${id}`);
      }, 2000);
    } catch (err) {
      setError('Failed to complete document signature. Please try again.');
      console.error('Error completing signature:', err);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Sign Document</h1>
        <p className="text-muted-foreground">
          Add signatures to document: {document?.title || 'Loading...'}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : !document ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Document not found.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          {signingSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Document signed successfully! Redirecting...
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Document Signature Setup</CardTitle>
            </CardHeader>
            <CardContent>
              <PDFSignatureComponent 
                pdfUrl={document.files?.[0]?.storage_path || ''} 
                documentId={document.document_id} 
                onComplete={handleCompleteSignature} 
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DocumentSignaturePage;