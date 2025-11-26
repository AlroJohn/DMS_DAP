import { useState, useEffect } from 'react';

interface Document {
  document_id: string;
  title: string;
  description?: string;
  document_code: string;
  document_type: string;
  deleted_at: Date | null;
  restored_at?: Date | null;
  created_at: Date;
  updated_at: Date;
  files: any[];
  // Add other relevant fields as needed
}

interface ArchiveHook {
  archivedDocuments: Document[];
  loading: boolean;
  error: string | null;
  archiveDocument: (documentId: string) => Promise<void>;
  restoreDocument: (documentId: string) => Promise<void>;
  fetchArchivedDocuments: () => Promise<void>;
}

export const useArchive = (): ArchiveHook => {
  const [archivedDocuments, setArchivedDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch archived documents from the API
  const fetchArchivedDocuments = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/archive', { // Use the archive API endpoint
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Include auth token if required
        },
        credentials: 'include', // Include cookies for auth
      });

      if (!response.ok) {
        throw new Error('Failed to fetch archived documents');
      }

      const data = await response.json();
      setArchivedDocuments(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching archived documents:', err);
    } finally {
      setLoading(false);
    }
  };

  // Archive a document
  const archiveDocument = async (documentId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/archive/${documentId}/archive`, { // Use the archive API endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for auth
      });

      if (!response.ok) {
        throw new Error('Failed to archive document');
      }

      // Refresh the list of archived documents
      await fetchArchivedDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error archiving document:', err);
    } finally {
      setLoading(false);
    }
  };

  // Restore a document
  const restoreDocument = async (documentId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/archive/${documentId}/restore`, { // Use the archive API endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for auth
      });

      if (!response.ok) {
        throw new Error('Failed to restore document');
      }

      // Refresh the list of archived documents
      await fetchArchivedDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error restoring document:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch archived documents on initial load
  useEffect(() => {
    fetchArchivedDocuments();
  }, []);

  return {
    archivedDocuments,
    loading,
    error,
    archiveDocument,
    restoreDocument,
    fetchArchivedDocuments,
  };
};