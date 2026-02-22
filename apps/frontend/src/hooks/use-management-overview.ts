import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { getAccessToken } from '@/lib/token-utils';

interface CounterData {
  count: number;
}

interface Department {
  department_id: string;
  name: string;
  code: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface DocumentType {
  type_id: string;
  name: string;
  description: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface DocumentAction {
  document_action_id: string;
  action_name: string;
  description?: string;
  sender_tag?: string;
  recipient_tag?: string;
  action_date: string;
  status: boolean;
  created_at: string;
  updated_at: string;
}

interface ProcessType {
  process_type_id: string;
  code: string;
  name: string;
  description?: string;
  duration_value?: number;
  duration_unit?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface User {
  user_id: string;
  account_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  user_name?: string;
  title?: string;
  type?: string;
  avatar?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  account: {
    email: string;
    is_active: boolean;
    email_verified: boolean;
    last_login?: string;
  };
  department: {
    department_id: string;
    name: string;
    code: string;
  };
  user_roles?: {
    role: {
      role_id: string;
      name: string;
      code: string;
    };
  }[];
}

interface ManagementOverviewData {
  departmentCount: CounterData | undefined;
  documentTypeCount: CounterData | undefined;
  documentActionCount: CounterData | undefined;
  userCount: CounterData | undefined;
  processTypeCount: CounterData | undefined;
  departments: Department[];
  documentTypes: DocumentType[];
  documentActions: DocumentAction[];
  users: User[];
  processTypes: ProcessType[];
  isLoading: boolean;
}

const fetchCount = async (url: string): Promise<CounterData> => {
  const token = getAccessToken();

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch count');
  }
  const data = await response.json();
  return data.data;
};

const fetchList = async (url: string): Promise<any[]> => {
  const token = getAccessToken();

  // Add pagination parameters to fetch all data
  const urlWithParams = new URL(url, window.location.origin);
  urlWithParams.searchParams.set('page', '1');
  urlWithParams.searchParams.set('limit', '1000'); // Fetch up to 1000 items

  const response = await fetch(urlWithParams.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${url}`);
  }
  const result = await response.json();
  // The API returns { success: true, data: [], pagination: {} }
  return result.data || [];
};

export const useManagementOverview = (): ManagementOverviewData => {
  // Fetch counts
  const { data: departmentCount, isLoading: isLoadingDepartments } = useQuery<CounterData>({
    queryKey: ['departmentCount'],
    queryFn: () => fetchCount('/api/admin/counts/departments'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: false,   // Disable refetch on reconnect
  });

  const { data: documentTypeCount, isLoading: isLoadingDocumentTypes } = useQuery<CounterData>({
    queryKey: ['documentTypeCount'],
    queryFn: () => fetchCount('/api/admin/counts/document-types'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: false,   // Disable refetch on reconnect
  });

  const { data: documentActionCount, isLoading: isLoadingDocumentActions } = useQuery<CounterData>({
    queryKey: ['documentActionCount'],
    queryFn: () => fetchCount('/api/admin/counts/document-actions'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: false,   // Disable refetch on reconnect
  });

  const { data: userCount, isLoading: isLoadingUsers } = useQuery<CounterData>({
    queryKey: ['userCount'],
    queryFn: () => fetchCount('/api/admin/counts/users'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: false,   // Disable refetch on reconnect
  });

  const { data: processTypeCount, isLoading: isLoadingProcessTypes } = useQuery<CounterData>({
    queryKey: ['processTypeCount'],
    queryFn: () => fetchCount('/api/admin/counts/process-types'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: false,   // Disable refetch on reconnect
  });

  // Fetch lists
  const { data: departments = [], isLoading: isLoadingDepartmentsList } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => fetchList('/api/admin/departments'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: false,   // Disable refetch on reconnect
  });

  const { data: documentTypes = [], isLoading: isLoadingDocumentTypesList } = useQuery<DocumentType[]>({
    queryKey: ['documentTypes'],
    queryFn: () => fetchList('/api/admin/document-types'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: false,   // Disable refetch on reconnect
  });

  const { data: documentActions = [], isLoading: isLoadingDocumentActionsList } = useQuery<DocumentAction[]>({
    queryKey: ['documentActions'],
    queryFn: () => fetchList('/api/admin/document-actions'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: false,   // Disable refetch on reconnect
  });

  const { data: users = [], isLoading: isLoadingUsersList } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => fetchList('/api/admin/users'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: false,   // Disable refetch on reconnect
  });

  const { data: processTypes = [], isLoading: isLoadingProcessTypesList } = useQuery<ProcessType[]>({
    queryKey: ['processTypes'],
    queryFn: () => fetchList('/api/process-type'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: false,   // Disable refetch on reconnect
  });

  // Combine loading states
  const isLoading = isLoadingDepartments ||
                   isLoadingDocumentTypes ||
                   isLoadingDocumentActions ||
                   isLoadingUsers ||
                   isLoadingProcessTypes ||
                   isLoadingDepartmentsList ||
                   isLoadingDocumentTypesList ||
                   isLoadingDocumentActionsList ||
                   isLoadingUsersList ||
                   isLoadingProcessTypesList;

  return {
    departmentCount,
    documentTypeCount,
    documentActionCount,
    userCount,
    processTypeCount,
    departments,
    documentTypes,
    documentActions,
    users,
    processTypes,
    isLoading,
  };
};