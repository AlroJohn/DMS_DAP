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
          throw new Error(errorData.error?.message || 'Failed to fetch document types');
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