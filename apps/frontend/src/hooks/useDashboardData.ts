"use client";

import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';

interface DocumentStats {
  owned: number;
  inTransit: number;
  shared: number;
  archive: number;
  recycleBin: number;
  total: number;
}

interface StorageUsage {
  used: number;
  total: number;
  percentage: number;
}

interface SystemActivity {
  id: string;
  action: string;
  timestamp: Date;
  user?: string;
}

interface TopDocument {
  id: string;
  title: string;
  views: number;
}

interface DepartmentPerformance {
  name: string;
  documentsProcessed: number;
  efficiency: number;
}

interface WorkflowStats {
  totalWorkflows: number;
  completedWorkflows: number;
  pendingWorkflows: number;
  inProgressWorkflows: number;
}

interface RecentDocument {
  id: string;
  title: string;
  sender: {
    name: string;
    initials: string;
  };
  timeAgo: string;
}

interface DashboardStats {
  documentStats: DocumentStats;
  recentActivity: number;
  pendingApprovals: number;
  activeWorkflows: number;
  collaborators: number;
  storageUsage: StorageUsage;
  complianceStatus: number;
  systemActivity: SystemActivity[];
  topDocuments: TopDocument[];
  departmentPerformance: DepartmentPerformance[];
  workflowStats: WorkflowStats;
  recentDocuments: RecentDocument[];
  documentTrends: Array<{
    month: string;
    active: number;
    archived: number;
  }>;
}

export const useDashboardData = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if user is authenticated
        if (!isAuthenticated) {
          throw new Error('Authentication required. Please log in.');
        }

        const response = await fetch('/api/dashboard/dashboard-stats', {
          credentials: 'include', // Include cookies for authentication
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch dashboard data: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success) {
          // Format the data to match expected types
          const formattedData: DashboardStats = {
            documentStats: result.data.documentStats,
            recentActivity: result.data.recentActivity,
            pendingApprovals: result.data.pendingApprovals,
            activeWorkflows: result.data.activeWorkflows,
            collaborators: result.data.collaborators,
            storageUsage: result.data.storageUsage,
            complianceStatus: result.data.complianceStatus,
            systemActivity: result.data.systemActivity.map((activity: any) => ({
              ...activity,
              timestamp: new Date(activity.timestamp),
            })),
            topDocuments: result.data.topDocuments,
            departmentPerformance: result.data.departmentPerformance,
            workflowStats: result.data.workflowStats,
            recentDocuments: result.data.recentDocuments,
            documentTrends: result.data.documentTrends,
          };

          setData(formattedData);
        } else {
          throw new Error(result.error || 'Failed to fetch dashboard data');
        }
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message || 'An error occurred while fetching dashboard data');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if authentication is loaded and user is authenticated
    if (!authLoading) {
      if (isAuthenticated) {
        fetchDashboardData();
      } else {
        setError('Authentication required. Please log in.');
        setLoading(false);
      }
    }
  }, [isAuthenticated, authLoading]);

  return { data, loading, error };
};