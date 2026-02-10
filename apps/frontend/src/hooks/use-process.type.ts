import { useState, useEffect } from 'react';

export interface ProcessType {
  process_type_id: string;
  code?: string;
  name: string;
  description?: string;
  duration_value?: number | null;
  duration_unit?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  originDepartment?: {
    department_id: string;
    code: string;
    name: string;
    group?: {
      group_id: string;
      name: string;
      code: string;
    };
    center?: {
      center_id: string;
      name: string;
      code: string;
    };
  } | null;
}

export const useProcessType = () => {
  const [processTypes, setProcessTypes] = useState<ProcessType[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProcessTypes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/process-type', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setProcessTypes(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error('Failed to fetch process types', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcessTypes();
  }, []);

  return { processTypes, loading, refetch: fetchProcessTypes };
};
