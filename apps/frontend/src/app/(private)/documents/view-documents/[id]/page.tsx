'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useDocumentDetail } from '@/hooks/use-document-detail';
import { useDocumentFiles } from '@/hooks/use-document-files';
import { DocumentViewerWithSignatures } from '@/components/reuseable/document-viewer-with-signatures/document-viewer-with-signatures';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { AlertCircle, ArrowLeft, Save, X, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

export default function DocumentSignatureViewerPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const documentId = Array.isArray(id) ? id[0] : id;
  const fileIdFromUrl = searchParams?.get('fileId');
  
  const [activeSignatureData, setActiveSignatureData] = useState<string | null>(null);
  const [isPlacingSignature, setIsPlacingSignature] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'view' | 'place'>('view');
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [signatureRecords, setSignatureRecords] = useState<any[]>([]);
  
  const { document, isLoading: docLoading, error: docError } = useDocumentDetail(documentId);
  const { 
    files, 
    isLoading: filesLoading, 
    error: filesError,
    refetch 
  } = useDocumentFiles(documentId);

  const parseVersion = useCallback((value?: string | null) => {
    if (!value) return null;
    const parts = value.split('.').map((part) => Number(part));
    if (parts.some((part) => Number.isNaN(part))) return null;
    return parts;
  }, []);

  const compareDocumentFilesByVersionDesc = useCallback(
    (left: { version?: string | null; uploadDate?: string | Date | null; name: string },
     right: { version?: string | null; uploadDate?: string | Date | null; name: string }) => {
      const leftParts = parseVersion(left.version);
      const rightParts = parseVersion(right.version);

      if (leftParts && rightParts) {
        const length = Math.max(leftParts.length, rightParts.length);
        for (let index = 0; index < length; index += 1) {
          const leftValue = leftParts[index] ?? 0;
          const rightValue = rightParts[index] ?? 0;
          if (leftValue !== rightValue) {
            return rightValue - leftValue;
          }
        }
      } else if (leftParts) {
        return -1;
      } else if (rightParts) {
        return 1;
      }

      const leftDate = left.uploadDate ? new Date(left.uploadDate).getTime() : 0;
      const rightDate = right.uploadDate ? new Date(right.uploadDate).getTime() : 0;
      if (leftDate !== rightDate) {
        return rightDate - leftDate;
      }

      return left.name.localeCompare(right.name);
    },
    [parseVersion]
  );

  const sortedFiles = useMemo(() => {
    if (!files?.length) return [];
    return [...files].sort(compareDocumentFilesByVersionDesc);
  }, [compareDocumentFilesByVersionDesc, files]);

  useEffect(() => {
    if (!sortedFiles || sortedFiles.length === 0) {
      setActiveFileId(null);
      return;
    }

    const hasFileFromUrl = fileIdFromUrl
      ? sortedFiles.some((file) => file.id === fileIdFromUrl)
      : false;
    const nextFileId = hasFileFromUrl ? fileIdFromUrl : sortedFiles[0].id;
    setActiveFileId(nextFileId);
  }, [fileIdFromUrl, sortedFiles]);

  // Check if this is coming from release with signature requirements
  const releaseDepartmentId = searchParams?.get('releaseDepartmentId');
  const releaseActions = searchParams?.get('releaseActions');
  const releaseRemarks = searchParams?.get('releaseRemarks');

  // Get user's signature from the user profile
  useEffect(() => {
    if (user?.signature) {
      setActiveSignatureData(user.signature);
    }
  }, [user]);

  const fetchSignatures = useCallback(async () => {
    if (!documentId) return;
    try {
      const response = await fetch(
        `/api/document-signatures/documents/${documentId}/signatures`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch signatures');
      }

      const result = await response.json();
      setSignatureRecords(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Error fetching signatures:', error);
      setSignatureRecords([]);
    }
  }, [documentId]);

  useEffect(() => {
    fetchSignatures();
  }, [fetchSignatures]);

  useEffect(() => {
    const refreshData = () => {
      refetch();
      fetchSignatures();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshData();
      }
    };

    window.addEventListener('focus', refreshData);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refreshData);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchSignatures, refetch]);

  const handleConfirmSignaturePlacement = async (coords: {
    signatureData: string;
    x_position: number;
    y_position: number;
    width: number;
    height: number;
    page_number: number;
  }) => {
    try {
      // Use the API to place the signature at the specified coordinates
      // We need to get the document file ID to use for the signature placement
      const primaryFile =
        (activeFileId ? files.find((file) => file.id === activeFileId) : null) ||
        files.find((file) => file.isPrimary) ||
        files[0];

      if (!primaryFile) {
        toast.error('No document file available for signature');
        return;
      }

      const response = await fetch(`/api/document-signatures/documents/${documentId}/place-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          signee_id: user?.user_id,  // Using user_id instead of id
          document_file_id: primaryFile.id,
          page_number: coords.page_number,
          x_position: coords.x_position,
          y_position: coords.y_position,
          width: coords.width,
          height: coords.height,
          signature_data: coords.signatureData
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to place signature');
      }

      toast.success('Signature placed successfully!');
      setSignatureMode('view'); // Return to view mode after placing signature
      refetch(); // Refresh document data
      fetchSignatures();
    } catch (error: any) {
      console.error('Error placing signature:', error);
      toast.error(error.message || 'Failed to place signature');
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleReleaseWithSignatures = async () => {
    if (!releaseDepartmentId || !releaseActions) {
      toast.error('Missing release information');
      return;
    }

    try {
      // Release the document to the specified department with signature requirements
      const response = await fetch(`/api/documents/${documentId}/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          departmentId: releaseDepartmentId,
          requestActions: releaseActions.split(','),
          remarks: releaseRemarks || undefined
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to release document');
      }

      toast.success('Document released with signatures successfully!');
      router.push(`/documents/${documentId}`);
    } catch (error: any) {
      console.error('Error releasing document:', error);
      toast.error(error.message || 'Failed to release document');
    }
  };

  if (docLoading || filesLoading) {
    return (
      <div className="container mx-auto py-6">
        <Skeleton className="h-12 w-3/4 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Skeleton className="h-[600px] w-full" />
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (docError || filesError) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading document: {docError?.message || filesError?.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertDescription>
            Document not found.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Get any existing signatures for the document
  const signedDocuments = signatureRecords.length
    ? signatureRecords
    : (document.signedDocuments || []);

  const mappedSignedDocuments = signedDocuments.map((sig: any, index: number) => ({
    signed_document_id:
      sig.signed_document_id ||
      `${sig.document_file_id || sig.documentFileFile_id || sig.documentFile?.file_id || 'sig'}-${sig.page_number}-${sig.x_position}-${sig.y_position}-${index}`,
    documentFileFile_id:
      sig.document_file_id ||
      sig.documentFileFile_id ||
      sig.documentFile?.file_id ||
      '',
    signature_data: sig.signature_data || user?.signature || '',
    x_position: sig.x_position,
    y_position: sig.y_position,
    width: sig.width,
    height: sig.height,
    page_number: sig.page_number,
  }));

  const documentFiles = (sortedFiles || []).map((file) => {
    const cacheKey = file.uploadDate
      ? new Date(file.uploadDate).getTime().toString()
      : file.version || file.id;

    return {
    id: file.id,
    name: file.name,
    downloadUrl: `/api/documents/${documentId}/files/${file.id}/stream?download=1&v=${encodeURIComponent(
      cacheKey
    )}`,
    isPrimary: activeFileId ? file.id === activeFileId : !!file.isPrimary,
    };
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">{document.title}</h1>
          <p className="text-muted-foreground">Document ID: {document.document_id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {releaseDepartmentId && (
            <Button onClick={handleReleaseWithSignatures}>
              <Save className="h-4 w-4 mr-2" />
              Release with Signatures
            </Button>
          )}
        </div>
      </div>

      {releaseDepartmentId && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>For Signature:</strong> This document will be released to department{' '}
            <span className="font-medium">
              {document.current_department?.name || releaseDepartmentId}
            </span>{' '}
            for signature.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                  <span>Document Viewer</span>
                  {documentFiles.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">File version:</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded border bg-background px-2 text-xs flex justify-between items-center w-48"
                          >
                            <span className="truncate max-w-[100px]">
                              {documentFiles.find(f => f.id === activeFileId)?.name ||
                               documentFiles[0]?.name ||
                               'Select file'}
                              {documentFiles.find(f => f.id === activeFileId)?.isPrimary && ' (Primary)'}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 max-h-64 overflow-y-auto">
                          {documentFiles.map((file, index) => (
                            <DropdownMenuItem
                              key={file.id}
                              onSelect={() => setActiveFileId(file.id)}
                              className="cursor-pointer"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium truncate max-w-[160px]">
                                  {file.name || `File ${index + 1}`}
                                </span>
                                {file.isPrimary && (
                                  <span className="text-xs text-muted-foreground">Primary</span>
                                )}
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {signatureMode === 'view' && user?.signature ? (
                    <Button 
                      size="sm" 
                      onClick={() => setSignatureMode('place')}
                    >
                      Add Signature
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSignatureMode('view')}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentViewerWithSignatures
                documentFiles={documentFiles}
                signedDocuments={mappedSignedDocuments}
                activeSignatureData={signatureMode === 'place' ? user?.signature || null : null}
                onConfirmSignaturePlacement={signatureMode === 'place' ? handleConfirmSignaturePlacement : undefined}
                onCancelSignaturePlacement={() => setSignatureMode('view')}
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Document Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">{document.status}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{document.detail?.document_type?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Classification</p>
                <p className="font-medium">{document.classification}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-medium">{document.current_department?.name || 'N/A'}</p>
              </div>
              {releaseDepartmentId && (
                <>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Release To</p>
                    <p className="font-medium">
                      {document.current_department?.name || releaseDepartmentId}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Actions Required</p>
                    <p className="font-medium">
                      {releaseActions?.split(',').join(', ') || 'N/A'}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
