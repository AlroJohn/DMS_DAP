import { useState, useEffect } from 'react';

export interface SigningHistoryEntry {
  id: string;
  document: string;
  documentCode: string;
  signer: string;
  department: string;
  timestamp: string;
  txHash: string;
  status: string;
}

export interface SigningHistoryStatistics {
  totalSignatures: number;
  thisWeek: number;
  successRate: string;
}

export interface SigningHistoryData {
  statistics: SigningHistoryStatistics;
  signingHistory: SigningHistoryEntry[];
}

interface UseSigningHistoryResult {
  data: SigningHistoryData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useSigningHistory = (dateRange?: string, filter?: string): UseSigningHistoryResult => {
  const [data, setData] = useState<SigningHistoryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSigningHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (dateRange) queryParams.append('dateRange', dateRange);
      if (filter) queryParams.append('filter', filter);

      const queryString = queryParams.toString();
      const url = `/api/reports/signing${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch signing history');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch signing history');
      }
      
      setData(result.data);
    } catch (err) {
      console.error('Error fetching signing history:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSigningHistory();
  }, [dateRange, filter]);

  return {
    data,
    loading,
    error,
    refetch: fetchSigningHistory
  };
};

