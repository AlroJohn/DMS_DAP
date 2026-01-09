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
      
      console.log('Fetching signing history from:', url);

      const response = await fetch(url, {
        cache: 'no-store'
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response text:', errorText);
        
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // If parsing fails, create an object with the raw text
          errorData = { message: errorText || `HTTP ${response.status}` };
        }
        
        console.error('Parsed error data:', errorData);
        
        // Extract error message from various possible formats
        const errorMessage = 
          errorData.message || 
          errorData.error?.message || 
          errorData.error || 
          (typeof errorData === 'string' ? errorData : null) ||
          `Failed to fetch signing history (Status: ${response.status})`;
          
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('Result success:', result.success);
      
      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to fetch signing history');
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

