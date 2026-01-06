'use client';

import { useState, useEffect } from 'react';

interface VersionHistoryReport {
  statistics: {
    totalVersions: number;
    versionsThisMonth: number;
    avgVersionsPerDoc: number;
  };
  recentChanges: Array<{
    fileId: string;
    fileName: string;
    documentTitle: string;
    documentCode: string;
    version: string;
    uploadedAt: string;
    uploadedBy: string;
  }>;
}

interface DocumentVersion {
  fileId: string;
  fileName: string;
  version: string;
  fileSize: bigint;
  uploadedAt: string;
  uploadedBy: string;
  mimeType: string;
  metadata: any;
}

interface DocumentVersionHistory {
  documentId: string;
  documentTitle: string;
  documentCode: string;
  versions: DocumentVersion[];
}

export const useVersionReport = () => {
  const [reportData, setReportData] = useState<VersionHistoryReport | null>(null);
  const [versionHistory, setVersionHistory] = useState<DocumentVersionHistory | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the version history report
  const fetchVersionHistoryReport = async () => {
    try {
      // Don't proceed if already loading
      if (loading) {
        return;
      }

      setLoading(true);
      setError(null);

      const response = await fetch('/api/reports/version');

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many requests. Please try again later.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setReportData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch version history report');
      }
    } catch (err) {
      console.error('Error fetching version history report:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch version history for a specific document
  const fetchDocumentVersionHistory = async (documentId: string) => {
    try {
      // Don't proceed if already loading
      if (loading) {
        return;
      }

      setLoading(true);
      setError(null);

      const response = await fetch(`/api/reports/version?documentId=${documentId}`);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many requests. Please try again later.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setVersionHistory(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch document version history');
      }
    } catch (err) {
      console.error('Error fetching document version history:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Compare two document versions
  const compareDocumentVersions = async (fileId1: string, fileId2: string) => {
    try {
      // Don't proceed if already loading
      if (loading) {
        return Promise.reject(new Error('Request already in progress'));
      }

      const response = await fetch('/api/reports/version', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId1, fileId2 })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many requests. Please try again later.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to compare document versions');
      }

      return result.data;
    } catch (err) {
      console.error('Error comparing document versions:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      throw err;
    }
  };

  // Export report as CSV
  const exportReport = async () => {
    try {
      // Don't proceed if already loading
      if (loading) {
        return;
      }

      setLoading(true);
      setError(null);

      const response = await fetch('/api/reports/version');

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many requests. Please try again later.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Create CSV content
        let csvContent = 'Document Title,Document Code,File Name,Version,Uploaded By,Uploaded At\n';

        result.data.recentChanges.forEach((change: any) => {
          csvContent += `"${change.documentTitle}","${change.documentCode}","${change.fileName}","${change.version}","${change.uploadedBy}","${new Date(change.uploadedAt).toLocaleString()}"\n`;
        });

        // Create and download the CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `version-history-report-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error(result.error || 'Failed to export report');
      }
    } catch (err) {
      console.error('Error exporting report:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return {
    reportData,
    versionHistory,
    loading,
    error,
    fetchVersionHistoryReport,
    fetchDocumentVersionHistory,
    compareDocumentVersions,
    exportReport
  };
};