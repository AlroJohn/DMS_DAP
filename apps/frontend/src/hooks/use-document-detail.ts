"use client";

import { useState, useEffect, useCallback } from "react";

export interface DocumentBlockchainMetadata {
  status?: string | null;
  projectUuid?: string | null;
  transactionHash?: string | null;
  redirectUrl?: string | null;
  signedAt?: string | null;
  signedBy?: string | null;
}

export interface DocumentDetail {
  document_id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  updated_at?: string;
  title?: string | null;
  document_code?: string | null;
  classification?: string | null;
  description?: string | null;
  qrCode?: string | null;
  barcode?: string | null;
  detail?: {
    document_code?: string | null;
    document_name?: string | null;
    classification?: string | null;
    origin?: string | null;
    delivery?: string | null;
    document_type?: { name?: string | null } | null;
    department?: { name?: string | null } | null;
    created_by?: string | null;
    created_by_account?: unknown;
  } | null;
  current_department?: { name?: string | null } | null;
  originating_department?: { name?: string | null } | null;
  blockchain?: DocumentBlockchainMetadata | null;
  document_logs?: unknown[];
}

interface UseDocumentDetailResult {
  document: DocumentDetail | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDocumentDetail(documentId: string): UseDocumentDetailResult {
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocument = useCallback(async () => {
    if (!documentId) return;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      setError("Invalid document ID format");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/documents/${documentId}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: { message: "Failed to fetch document" },
        }));
        throw new Error(errorData.error?.message || "Failed to fetch document");
      }

      const result = await response.json();

      if (result.success) {
        setDocument(result.data as DocumentDetail);
      } else {
        throw new Error(result.error?.message || "Failed to fetch document");
      }
    } catch (err: any) {
      console.error("Error fetching document detail:", err);
      setError(err.message || "An error occurred while fetching the document");
      setDocument(null);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (documentId) {
      fetchDocument();
    }
  }, [documentId, fetchDocument]);

  return {
    document,
    isLoading,
    error,
    refetch: fetchDocument,
  };
}
