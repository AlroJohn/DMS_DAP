import { useState, useEffect } from 'react';

interface ComplianceMetric {
  documentsSigned: number;
  totalDocuments: number;
  complianceRate: string;
  pendingSignatures: number;
  failedVerifications: number;
  status: 'excellent' | 'good' | 'needs_attention';
}

interface PendingSignature {
  document: string;
  documentCode: string;
  daysOverdue: number;
  priority: 'high' | 'medium' | 'normal';
}

interface RecentSignature {
  document: string;
  signer: string;
  date: string;
  status: 'verified' | 'pending';
}

interface TimelineEvent {
  id: string;
  icon: 'check-circle' | 'file-text' | 'alert-triangle';
  title: string;
  description: string;
  date: string;
  color: 'green' | 'blue' | 'yellow';
}

interface ComplianceReport {
  complianceMetrics: ComplianceMetric;
  pendingSignatures: PendingSignature[];
  recentSignatures: RecentSignature[];
  timeline: TimelineEvent[];
}

export const useComplianceReport = () => {
  const [data, setData] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComplianceReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching compliance report from /api/reports/compliance');
      
      const response = await fetch('/api/reports/compliance', {
        cache: 'no-store'
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: `HTTP ${response.status}: ${errorText}` };
        }
        console.error('Error response:', errorData);
        throw new Error(errorData.message || errorData.error || 'Failed to fetch compliance report');
      }
      
      const result = await response.json();
      console.log('Result success:', result.success);
      
      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to fetch compliance report');
      }
      
      setData(result.data);
    } catch (err) {
      console.error('Error fetching compliance report:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplianceReport();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchComplianceReport
  };
};