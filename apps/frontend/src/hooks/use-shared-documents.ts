import { useState, useEffect } from 'react'
import { SharedDocument, Pagination, UseSharedDocumentsResult } from '@dms/types/document.types';

/**
 * Fetch documents that are shared to the current user
 * Uses the existing /api/documents endpoint (returns documents available to the user)
 */
export function useSharedDocuments(page: number = 1, limit: number = 10): UseSharedDocumentsResult {
  const [documents, setDocuments] = useState<SharedDocument[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/documents/shared?page=${page}&limit=${limit}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        let err;
        try {
          err = await response.json();
        } catch (parseError) {
          // If JSON parsing fails, create a default error object
          err = {
            error: {
              message: `HTTP Error: ${response.status} - ${response.statusText}`
            }
          };
        }
        throw new Error(err.error?.message || err.message || 'Failed to fetch shared documents')
      }

      const data = await response.json()

      if (data.success) {
        // Ensure data is an array and pagination is properly structured
        const documentsData = Array.isArray(data.data) ? data.data : [];
        const paginationData = data.meta?.pagination || null;

        setDocuments(documentsData)
        setPagination(paginationData)
      } else {
        throw new Error(data.error?.message || data.message || 'Failed to fetch shared documents')
      }
    } catch (err: any) {
      console.error('Error fetching shared documents:', err)
      // Handle case where err is an object but not an Error instance
      const errorMessage = err?.message || (typeof err === 'string' ? err : 'An error occurred while fetching shared documents')
      setError(errorMessage)
      setDocuments([])
      setPagination(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit])

  return {
    documents,
    pagination,
    isLoading,
    error,
    refetch: fetchDocuments
  }
}
