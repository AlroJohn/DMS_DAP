import { getApiUrl } from './utils';

/**
 * Fetch usage report data
 */
export const getUsageReport = async (dateRange: string = '30days') => {
  const response = await fetch(getApiUrl(`/reports/usage?dateRange=${dateRange}`), {
    headers: {
      'Content-Type': 'application/json',
      // The authentication will be handled via cookies
    },
    credentials: 'include', // Include cookies in the request
  });

  if (!response.ok) {
    // Check if it's an authentication error
    if (response.status === 401) {
      throw new Error('Authentication required. Please log in.');
    } else if (response.status === 403) {
      // Show permission error toast and throw error
      const { showPermissionErrorToast } = await import('@/utils/permission-errors');
      showPermissionErrorToast('report_view', 'You do not have permission to access this resource.');
      throw new Error('Access forbidden. You do not have permission to access this resource.');
    } else if (response.status === 404) {
      throw new Error('Usage report endpoint not found. Please check if the backend server is running.');
    } else {
      throw new Error(`Failed to fetch usage report: ${response.status} ${response.statusText}`);
    }
  }

  return response.json();
};

/**
 * Fetch version history report
 */
export const getVersionHistoryReport = async (accessToken: string) => {
  const response = await fetch(getApiUrl('/reports/version-history'), {
    headers: {
      'Content-Type': 'application/json',
      // The authentication will be handled via cookies
    },
    credentials: 'include', // Include cookies in the request
  });

  if (!response.ok) {
    if (response.status === 403) {
      // Show permission error toast and throw error
      const { showPermissionErrorToast } = await import('@/utils/permission-errors');
      showPermissionErrorToast('report_view', 'You do not have permission to access this resource.');
      throw new Error('Access forbidden. You do not have permission to access this resource.');
    } else {
      throw new Error(`Failed to fetch version history report: ${response.status} ${response.statusText}`);
    }
  }

  return response.json();
};

/**
 * Fetch document version history
 */
export const getDocumentVersionHistory = async (accessToken: string, documentId: string) => {
  const response = await fetch(getApiUrl(`/reports/version-history/${documentId}`), {
    headers: {
      'Content-Type': 'application/json',
      // The authentication will be handled via cookies
    },
    credentials: 'include', // Include cookies in the request
  });

  if (!response.ok) {
    if (response.status === 403) {
      // Show permission error toast and throw error
      const { showPermissionErrorToast } = await import('@/utils/permission-errors');
      showPermissionErrorToast('report_view', 'You do not have permission to access this resource.');
      throw new Error('Access forbidden. You do not have permission to access this resource.');
    } else {
      throw new Error(`Failed to fetch document version history: ${response.status} ${response.statusText}`);
    }
  }

  return response.json();
};