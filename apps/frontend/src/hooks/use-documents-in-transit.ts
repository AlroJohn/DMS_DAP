import { useState, useEffect } from 'react';

export interface InTransitDocument {
  id: string;
  qrCode: string;
  barcode: string;
  document: string;
  documentId: string;
  contactPerson: string;
  contactOrganization: string;
  type: string;
  classification: string;
  status: string;
  activity: string;
  activityTime: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UseInTransitDocumentsResult {
  documents: InTransitDocument[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetch incoming in-transit documents
 */
export function useIncomingDocuments(
  page: number = 1,
  limit: number = 10
): UseInTransitDocumentsResult {
  const [documents, setDocuments] = useState<InTransitDocument[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/documents/in-transit/incoming?page=${page}&limit=${limit}`,
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
        throw new Error(errorData.error?.message || 'Failed to fetch incoming documents');
      }

      const data = await response.json();

      if (data.success) {
        setDocuments(data.data || []);
        setPagination(data.meta?.pagination || null);
      } else {
        throw new Error(data.error?.message || 'Failed to fetch incoming documents');
      }
    } catch (err: any) {
      console.error('Error fetching incoming documents:', err);
      setError(err.message || 'An error occurred while fetching incoming documents');
      setDocuments([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [page, limit]);

  return {
    documents,
    pagination,
    isLoading,
    error,
    refetch: fetchDocuments,
  };
}

/**
 * Fetch outgoing in-transit documents
 */
export function useOutgoingDocuments(
  page: number = 1,
  limit: number = 10
): UseInTransitDocumentsResult {
  const [documents, setDocuments] = useState<InTransitDocument[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/documents/in-transit/outgoing?page=${page}&limit=${limit}`,
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
        throw new Error(errorData.error?.message || 'Failed to fetch outgoing documents');
      }

      const data = await response.json();

      if (data.success) {
        setDocuments(data.data || []);
        setPagination(data.meta?.pagination || null);
      } else {
        throw new Error(data.error?.message || 'Failed to fetch outgoing documents');
      }
    } catch (err: any) {
      console.error('Error fetching outgoing documents:', err);
      setError(err.message || 'An error occurred while fetching outgoing documents');
      setDocuments([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [page, limit]);

  return {
    documents,
    pagination,
    isLoading,
    error,
    refetch: fetchDocuments,
  };
}

