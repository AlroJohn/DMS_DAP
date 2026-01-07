import { useState, useEffect } from 'react';
import { getUsageReport as apiGetUsageReport } from '@/lib/api-client';
import { UsageReportData } from '@/types/usage-report';

export const useUsageReport = (dateRange: string = '30days') => {
  const [data, setData] = useState<UsageReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      // The authentication will be handled via cookies
      const response = await apiGetUsageReport(dateRange);

      if (response.success) {
        setData(response.data);
      } else {
        setError(response.message || 'Failed to fetch usage report');
      }
    } catch (err) {
      console.error('Error fetching usage report:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred while fetching the usage report');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [dateRange]);

  return { data, loading, error, refetch: fetchReport };
};