import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ReceiveDocumentPayload {
  documentId: string;
}

export const useReceiveDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId }: ReceiveDocumentPayload) => {
      const response = await fetch(`/api/documents/${documentId}/receive`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to receive document');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to receive document');
      }

      return data.data;
    },
    onSuccess: () => {
      toast.success('Document received successfully');
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['documents', 'in-transit'] });
      queryClient.invalidateQueries({ queryKey: ['documents', 'received'] });
      queryClient.invalidateQueries({ queryKey: ['incoming-documents'] });
    },
    onError: (error: any) => {
      console.error('Error receiving document:', error);
      toast.error(error.message || 'Failed to receive document');
    },
  });
};