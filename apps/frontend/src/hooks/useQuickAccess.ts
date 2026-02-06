import { useQuery } from "@tanstack/react-query";

export interface QuickAccessSummary {
  pendingSignatures: number;
  incomingDocuments: number;
  documentsToRelease: number;
  recentActivity: number;
  completedSharedToDepartment: number;
  completedSharedToUser: number;
  sharedToDepartment: number;
  sharedToUser: number;
}

export function useQuickAccess() {
  const { data, isLoading, error, refetch } = useQuery<QuickAccessSummary>({
    queryKey: ["quick-access"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/quick-access", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch quick access data");
      }

      const result = await response.json();
      return result.data;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
