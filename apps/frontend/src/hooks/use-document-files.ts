"use client";

import { useState, useEffect, useCallback } from "react";

export interface DocumentFileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  version?: string | null;
  isPrimary: boolean;
  checksum?: string | null;
  uploadDate?: string | Date | null;
  downloadUrl?: string | null;
  versionGroupId?: string | null;
}

interface UseDocumentFilesResult {
  files: DocumentFileMetadata[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDocumentFiles(documentId: string): UseDocumentFilesResult {
  const [files, setFiles] = useState<DocumentFileMetadata[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
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

      const response = await fetch(`/api/documents/${documentId}/files`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: { message: "Failed to fetch document files" },
        }));
        throw new Error(errorData.error?.message || "Failed to fetch document files");
      }

      const result = await response.json();

      if (result.success) {
        const mapped = (result.data ?? result ?? []) as DocumentFileMetadata[];
        setFiles(Array.isArray(mapped) ? mapped : []);
      } else {
        throw new Error(result.error?.message || "Failed to fetch document files");
      }
    } catch (err: any) {
      console.error("Error fetching document files:", err);
      setError(err.message || "An error occurred while fetching document files");
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (documentId) {
      fetchFiles();
    }
  }, [documentId, fetchFiles]);

  return {
    files,
    isLoading,
    error,
    refetch: fetchFiles,
  };
}
