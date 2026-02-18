'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ActivityLog {
  id: string;
  user: string;
  userAvatar?: string;
  action: string;
  document: string;
  documentCode: string;
  timestamp: string;
  type: string;
  status: string;
  fromDepartment?: string;
  toDepartment?: string;
  remarks?: string;
}

export interface ActivityStats {
  totalActions: number;
  today: number;
  thisWeek: number;
  activeUsers: number;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
}

interface UseActivityLogsResult {
  activities: ActivityLog[];
  stats: ActivityStats | null;
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseActivityLogsOptions {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  status?: string;
  documentCode?: string;
  autoFetch?: boolean;
}

export function useActivityLogs(options: UseActivityLogsOptions = {}): UseActivityLogsResult {
  const {
    limit = 50,
    offset = 0,
    startDate,
    endDate,
    userId,
    status,
    documentCode,
    autoFetch = true,
  } = options;

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
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

  const fetchActivityLogs = useCallback(async () => {
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
      if (status) params.append('status', status);
      if (documentCode) params.append('documentCode', documentCode);

      const response = await fetch(`/api/reports/activity?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch activity logs');
      }

      const result = await response.json();

      if (!isMountedRef.current) return;

      if (result.success) {
        setActivities(result.data || []);
        setPagination(result.pagination || null);
      } else {
        throw new Error(result.error?.message || 'Failed to fetch activity logs');
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error('Error fetching activity logs:', err);
      setError(err.message || 'An error occurred while fetching activity logs');
      setActivities([]);
      setPagination(null);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [limit, offset, startDate, endDate, userId, status, documentCode, autoFetch]);

  const fetchActivityStats = useCallback(async () => {
    if (!isMountedRef.current || !autoFetch) return;

    try {
      const response = await fetch('/api/reports/activity/stats', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch activity stats');
      }

      const result = await response.json();

      if (!isMountedRef.current) return;

      if (result.success) {
        setStats(result.data);
      } else {
        throw new Error(result.error?.message || 'Failed to fetch activity stats');
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error('Error fetching activity stats:', err);
      // Don't set error for stats failure, as it's not critical
    }
  }, [autoFetch]);

  useEffect(() => {
    if (!autoFetch) return;

    // Fetch both logs and stats in parallel
    Promise.all([fetchActivityLogs(), fetchActivityStats()]);
  }, [fetchActivityLogs, fetchActivityStats, autoFetch]);

  const refetch = useCallback(() => {
    fetchActivityLogs();
    fetchActivityStats();
  }, [fetchActivityLogs, fetchActivityStats]);

  return {
    activities,
    stats,
    pagination,
    isLoading,
    error,
    refetch,
  };
}
