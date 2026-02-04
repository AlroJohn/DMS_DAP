import { useState, useEffect } from 'react';

interface ProcessType {
  process_type_id: string;
  name: string;
  description?: string;
  duration_days?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useProcessType = () => {
  const [processTypes, setProcessTypes] = useState<ProcessType[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProcessTypes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/process-type');
      const data = await response.json();
      setProcessTypes(data);
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