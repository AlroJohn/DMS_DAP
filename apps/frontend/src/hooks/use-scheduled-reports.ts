import { useState, useEffect } from 'react';

export interface ScheduledReport {
  id: string;
  userId: string;
  type: 'compliance' | 'usage' | 'version';
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    day?: number;
    time: string;
  } | null;
  nextRun: string | null;
  lastRun: string | null;
  isActive: boolean;
  reportFileName: string | null;
  reportGeneratedAt: string | null;
  createdAt: string;
}

export const useScheduledReports = () => {
  const [data, setData] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScheduledReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching scheduled reports from /api/reports/scheduled');
      
      const response = await fetch('/api/reports/scheduled', {
        cache: 'no-store'
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: `HTTP ${response.status}: ${errorText}` };
        }
        console.error('Error response:', errorData);
        throw new Error(errorData.message || errorData.error || 'Failed to fetch scheduled reports');
      }
      
      const result = await response.json();
      console.log('Result success:', result.success);
      
      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to fetch scheduled reports');
      }
      
      setData(result.data);
    } catch (err) {
      console.error('Error fetching scheduled reports:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduledReports();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchScheduledReports
  };
};

