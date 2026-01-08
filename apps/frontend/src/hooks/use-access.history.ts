'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface AccessHistoryLog {
  id: string;
  user: string;
  userAvatar?: string;
  document: string;
  documentCode: string;
  action: string;
  timestamp: string;
  department: string;
  ipAddress?: string;
}

export interface AccessHistoryStats {
  totalAccesses: number;
  uniqueUsers: number;
  avgAccessPerDay: number;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
}

interface UseAccessHistoryResult {
  accessLogs: AccessHistoryLog[];
  stats: AccessHistoryStats | null;
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseAccessHistoryOptions {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  documentId?: string;
  autoFetch?: boolean;
}

export function useAccessHistory(options: UseAccessHistoryOptions = {}): UseAccessHistoryResult {
  const {
    limit = 50,
    offset = 0,
    startDate,
    endDate,
    userId,
    documentId,
    autoFetch = true,
  } = options;

  const [accessLogs, setAccessLogs] = useState<AccessHistoryLog[]>([]);
  const [stats, setStats] = useState<AccessHistoryStats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchAccessHistory = useCallback(async () => {
    if (!isMountedRef.current || !autoFetch) return;

    setIsLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());
      
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      if (userId) params.append('userId', userId);
      if (documentId) params.append('documentId', documentId);

      const response = await fetch(`/api/reports/access-history?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch access history');
      }

      const result = await response.json();

      if (!isMountedRef.current) return;

      if (result.success) {
        setAccessLogs(result.data || []);
        setPagination(result.pagination || null);
      } else {
        throw new Error(result.error?.message || 'Failed to fetch access history');
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error('Error fetching access history:', err);
      setError(err.message || 'An error occurred while fetching access history');
      setAccessLogs([]);
      setPagination(null);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [limit, offset, startDate, endDate, userId, documentId, autoFetch]);

  const fetchAccessHistoryStats = useCallback(async () => {
    if (!isMountedRef.current || !autoFetch) return;

    try {
      const response = await fetch('/api/reports/access-history/stats', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch access history stats');
      }

      const result = await response.json();

      if (!isMountedRef.current) return;

      if (result.success) {
        setStats(result.data);
      } else {
        throw new Error(result.error?.message || 'Failed to fetch access history stats');
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error('Error fetching access history stats:', err);
      // Don't set error for stats failure, as it's not critical
    }
  }, [autoFetch]);

  useEffect(() => {
    if (!autoFetch) return;

    // Fetch both logs and stats in parallel
    Promise.all([fetchAccessHistory(), fetchAccessHistoryStats()]);
  }, [fetchAccessHistory, fetchAccessHistoryStats, autoFetch]);

  const refetch = useCallback(() => {
    fetchAccessHistory();
    fetchAccessHistoryStats();
  }, [fetchAccessHistory, fetchAccessHistoryStats]);

  return {
    accessLogs,
    stats,
    pagination,
    isLoading,
    error,
    refetch,
  };
}
