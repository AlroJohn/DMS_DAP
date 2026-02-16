import { useQuery } from "@tanstack/react-query";

export interface PendingSignatureDocument {
  document_id: string;
  document_name: string;
  classification: string;
  status: string;
  created_at: string;
  type: {
    type_id: string;
    type_name: string;
  };
  files: Array<{
    file_id: string;
    file_name: string;
    file_path: string;
  }>;
  is_signed: boolean;
  pending_signatures: number;
}

export function usePendingSignatures() {
  const { data, isLoading, error, refetch } = useQuery<PendingSignatureDocument[]>({
    queryKey: ["pending-signatures"],
    queryFn: async () => {
      const response = await fetch("/api/pending-signatures", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch pending signatures");
      }

      const result = await response.json();
      return result.data;
    },
  });

  return {
    documents: data || [],
    isLoading,
    error,
    refetch,
  };
}
