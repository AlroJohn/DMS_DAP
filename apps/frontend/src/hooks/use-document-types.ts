import { useState, useEffect } from 'react';

export interface DocumentType {
  type_id: string;
  name: string;
  description?: string;
  active: boolean;
}

export function useDocumentTypes() {
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocumentTypes = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/documents/types', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error?.message || 'Failed to fetch document types';
          
          // If it's a permission error, silently fail and return empty array
          // This allows the UI to continue working without document types
          if (response.status === 403 || errorMessage.includes('Insufficient permissions')) {
            console.warn('User does not have permission to view document types');
            setDocumentTypes([]);
            setError(null); // Don't set error for permission issues
            return;
          }
          
          throw new Error(errorMessage);
        }

        const result = await response.json();

        if (result.success) {
          setDocumentTypes(result.data || []);
        } else {
          throw new Error(result.error?.message || 'Failed to fetch document types');
        }
      } catch (err: any) {
        console.error('Error fetching document types:', err);
        setError(err.message || 'An error occurred while fetching document types');
        setDocumentTypes([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocumentTypes();
  }, []);

  return { documentTypes, isLoading, error };
}