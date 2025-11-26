import { useState, useEffect, useCallback } from 'react';

export interface Document {
  id: string;
  qrCode: string;
  barcode: string;
  document: string;
  documentId: string;
  contactPerson: string;
  contactOrganization: string;
  currentLocation: string;
  type: string;
  classification: string;
  status: string;
  activity: string;
  activityTime: string;
  checkout?: boolean;
  checkedOutBy?: {
    id: string;
    accountId?: string; // Account ID of the user who checked out the document
    name?: string;
    email?: string;
  } | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UseDocumentsOwnedResult {
  documents: Document[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDocumentsOwned(
  page: number = 1,
  limit: number = 10
): UseDocumentsOwnedResult {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/documents/owned?page=${page}&limit=${limit}`,
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
        throw new Error(errorData.error?.message || 'Failed to fetch documents');
      }

      const data = await response.json();

      if (data.success) {
        setDocuments(data.data || []);
        setPagination(data.meta?.pagination || null);
      } else {
        throw new Error(data.error?.message || 'Failed to fetch documents');
      }
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError(err.message || 'An error occurred while fetching documents');
      setDocuments([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    pagination,
    isLoading,
    error,
    refetch: fetchDocuments,
  };
}
