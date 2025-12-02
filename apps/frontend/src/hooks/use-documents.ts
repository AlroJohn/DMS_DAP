'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';

export interface DocumentListItem {
  id: string;
  qrCode: string;
  barcode: string;
  document: string;
  documentId: string;
  contactPerson: string;
  contactOrganization: string;
  currentLocation?: string;
  type: string;
  classification: string;
  status: string;
  activity: string;
  activityTime: string;
  isOwned?: boolean;
  blockchainStatus?: string | null;
  blockchainProjectUuid?: string | null;
  blockchainTxHash?: string | null;
  blockchainRedirectUrl?: string | null;
  signedAt?: string | null;
  lockStatus?: 'locked' | 'available' | 'locked_by_you';
  lockedBy?: { id: string; name: string } | null;
  lockedAt?: string | null;
  ocrStatus?: 'processing' | 'completed' | 'failed' | 'not_started' | 'searchable';
  ocrProgress?: number | null;
  integrityStatus?: 'verified' | 'corrupted' | 'unknown' | 'checking';
  checksum?: string | null;
  encryptionStatus?: 'encrypted' | 'unencrypted' | 'transit_only' | 'encrypting';
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface UseDocumentsResult {
  documents: DocumentListItem[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDocuments(page: number = 1, limit: number = 10): UseDocumentsResult {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Start with false and set to true when fetching
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchDocuments = useCallback(async () => {
    if (!isMountedRef.current) return;

    // Only set loading to true if component is still mounted
    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const response = await fetch(
        `/api/documents?page=${page}&limit=${limit}`,
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

      const result = await response.json().catch(() => ({}));

      if (!isMountedRef.current) return;

      if (result.success) {
        if (isMountedRef.current) {
          setDocuments((result.data || []) as DocumentListItem[]);
          setPagination((result.pagination || null) as Pagination | null);
          // Only set loading to false if component is still mounted after successful fetch
          if (isMountedRef.current) {
            setIsLoading(false);
          }
        }
      } else {
        // Try to extract message from different error shapes
        const errMsg = result.error?.message || result?.error || result?.message || 'Failed to fetch documents';
        throw new Error(errMsg);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error('Error fetching documents:', err);
      setError(err.message || 'An error occurred while fetching documents');
      if (isMountedRef.current) {
        setDocuments([]);
        setPagination(null);
        // Only set loading to false if component is still mounted after error
        setIsLoading(false);
      }
    } finally {
      // In the finally block, only set loading to false if component is mounted
      // This is safe as finally will execute but we check mount status
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [page, limit]);

  // Set initial loading state when user becomes available
  useEffect(() => {
    // Ensure component is mounted before any state updates
    if (!isMountedRef.current) return;

    // If auth is still loading, keep loading state
    if (isAuthLoading) {
      setIsLoading(true);
      return;
    }

    // If user is not authenticated, set error and stop loading
    if (!isAuthenticated) {
      if (isMountedRef.current) {
        setError('Authentication required to access documents');
        setIsLoading(false);
        setDocuments([]);
        setPagination(null);
      }
      return;
    }

    // If user is authenticated, fetch documents
    fetchDocuments();
  }, [isAuthenticated, isAuthLoading, page, limit, fetchDocuments]);

  return {
    documents,
    pagination,
    isLoading,
    error,
    refetch: fetchDocuments,
  };
}

