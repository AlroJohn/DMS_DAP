import { useState, useEffect } from 'react';

export interface Department {
  department_id: string;
  name: string;
  code: string;
  active: boolean;
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/admin/departments', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to fetch departments');
        }

        const result = await response.json();

        if (result.success) {
          setDepartments(result.data || []);
        } else {
          throw new Error(result.error?.message || 'Failed to fetch departments');
        }
      } catch (err: any) {
        console.error('Error fetching departments:', err);
        setError(err.message || 'An error occurred while fetching departments');
        setDepartments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  return { departments, isLoading, error };
}