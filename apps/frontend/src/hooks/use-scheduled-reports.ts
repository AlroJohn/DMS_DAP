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
      
      const response = await fetch('/api/reports/scheduled');
      
      if (!response.ok) {
        throw new Error('Failed to fetch scheduled reports');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch scheduled reports');
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

