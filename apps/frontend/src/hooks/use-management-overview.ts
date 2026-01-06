import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

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
  departments: Department[];
  documentTypes: DocumentType[];
  documentActions: DocumentAction[];
  users: User[];
  isLoading: boolean;
}

const fetchCount = async (url: string): Promise<CounterData> => {
  const token = localStorage.getItem('accessToken') || document.cookie
    .split(';')
    .find(c => c.trim().startsWith('accessToken='))
    ?.split('=')[1];

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
  const token = localStorage.getItem('accessToken') || document.cookie
    .split(';')
    .find(c => c.trim().startsWith('accessToken='))
    ?.split('=')[1];

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${url}`);
  }
  const data = await response.json();
  return data.data;
};

export const useManagementOverview = (): ManagementOverviewData => {
  // Fetch counts
  const { data: departmentCount, isLoading: isLoadingDepartments } = useQuery<CounterData>({
    queryKey: ['departmentCount'],
    queryFn: () => fetchCount('/api/admin/counts/departments'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: documentTypeCount, isLoading: isLoadingDocumentTypes } = useQuery<CounterData>({
    queryKey: ['documentTypeCount'],
    queryFn: () => fetchCount('/api/admin/counts/document-types'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: documentActionCount, isLoading: isLoadingDocumentActions } = useQuery<CounterData>({
    queryKey: ['documentActionCount'],
    queryFn: () => fetchCount('/api/admin/counts/document-actions'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: userCount, isLoading: isLoadingUsers } = useQuery<CounterData>({
    queryKey: ['userCount'],
    queryFn: () => fetchCount('/api/admin/counts/users'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch lists
  const { data: departments = [], isLoading: isLoadingDepartmentsList } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => fetchList('/api/admin/departments'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: documentTypes = [], isLoading: isLoadingDocumentTypesList } = useQuery<DocumentType[]>({
    queryKey: ['documentTypes'],
    queryFn: () => fetchList('/api/admin/document-types'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: documentActions = [], isLoading: isLoadingDocumentActionsList } = useQuery<DocumentAction[]>({
    queryKey: ['documentActions'],
    queryFn: () => fetchList('/api/admin/document-actions'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: users = [], isLoading: isLoadingUsersList } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => fetchList('/api/admin/users'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Combine loading states
  const isLoading = isLoadingDepartments ||
                   isLoadingDocumentTypes ||
                   isLoadingDocumentActions ||
                   isLoadingUsers ||
                   isLoadingDepartmentsList ||
                   isLoadingDocumentTypesList ||
                   isLoadingDocumentActionsList ||
                   isLoadingUsersList;

  return {
    departmentCount,
    documentTypeCount,
    documentActionCount,
    userCount,
    departments,
    documentTypes,
    documentActions,
    users,
    isLoading,
  };
};