'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

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

      if (result.success) {
        setDocuments((result.data || []) as DocumentListItem[]);
        setPagination((result.pagination || null) as Pagination | null);
      } else {
        // Try to extract message from different error shapes
        const errMsg = result.error?.message || result?.error || result?.message || 'Failed to fetch documents';
        throw new Error(errMsg);
      }
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError(err.message || 'An error occurred while fetching documents');
      setDocuments([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, page, limit]);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user, page, limit]);

  return {
    documents,
    pagination,
    isLoading,
    error,
    refetch: fetchDocuments,
  };
}

