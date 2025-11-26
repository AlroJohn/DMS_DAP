import { useState, useEffect } from "react";
import { useAuth } from './use-auth';

interface User {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id: string;
  department_name?: string;
}

export function useUsers() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser } = useAuth(); // Get current user from auth context

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch users from the backend
      const response = await fetch('/api/users', {
        method: 'GET',
        credentials: 'include', // Include HttpOnly cookies with the request
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch users');
      }

      const result = await response.json().catch(() => ({}));

      if (result.success) {
        setUsers(result.data || []);
      } else {
        // Try to extract message from different error shapes
        const errMsg = result.error?.message || result?.error || result?.message || 'Failed to fetch users';
        throw new Error(errMsg);
      }
    } catch (err: unknown) {
      console.error('Error fetching users:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching users';
      setError(errorMessage);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser]);

  const refetch = () => {
    if (currentUser) {
      fetchUsers();
    }
  };

  return { users, isLoading, error, refetch };
}