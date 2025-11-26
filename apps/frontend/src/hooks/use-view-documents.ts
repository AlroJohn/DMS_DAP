'use client';

import { useState, useEffect, useCallback } from 'react';

export interface DocumentLog {
  log_id: string;
  action: string;
  performed_by: string;
  performed_at: string;
  remarks?: string;
  from_department?: string;
  to_department?: string;
  performed_by_user?: {
    first_name: string;
    last_name: string;
    user_name?: string;
  };
}

export interface DocumentDetailView {
  document_id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  detail: {
    document_code: string;
    document_name: string;
    classification: string;
    origin: string;
    delivery: string;
    created_by: string;
    document_type: {
      name: string;
    };
    department: {
      name: string;
    };
    created_by_account: {
      email: string;
      user?: {
        first_name: string;
        last_name: string;
      };
    };
  };
  current_department: {
    name: string;
  };
  originating_department: {
    name: string;
  };
  document_logs: DocumentLog[];
  qrCode?: string;
  barcode?: string;
  blockchain?: {
    status?: string | null;
    projectUuid?: string | null;
    transactionHash?: string | null;
    redirectUrl?: string | null;
    signedAt?: string | null;
    signedBy?: string | null;
  };
  title?: string;
  document_code?: string;
  classification?: string;
  description?: string;
}

interface UseViewDocumentResult {
  document: DocumentDetailView | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useViewDocument(documentId: string | null): UseViewDocumentResult {
  const [document, setDocument] = useState<DocumentDetailView | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocument = useCallback(async () => {
    if (!documentId) {
      setDocument(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/documents/${documentId}`,
        {
          method: 'GET',
          credentials: 'include', // Include HttpOnly cookies with the request
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch document');
      }

      const result = await response.json();

      if (result.success) {
        setDocument(result.data);
      } else {
        throw new Error(result.error?.message || 'Failed to fetch document');
      }
    } catch (err: unknown) {
      console.error('Error fetching document:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching document';
      setError(errorMessage);
      setDocument(null);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  return {
    document,
    isLoading,
    error,
    refetch: fetchDocument,
  };
}

