"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, Download, Loader2, RefreshCw, FileText, Calendar, CheckCircle, XCircle, X, RotateCw } from "lucide-react";
import { useScheduledReports } from "@/hooks/use-scheduled-reports";
import { toast } from "sonner";
import { useState } from "react";

interface ScheduledReportsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduledReportsModal({ open, onOpenChange }: ScheduledReportsModalProps) {
  const { data: schedules, loading, error, refetch } = useScheduledReports();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatFrequency = (schedule: { frequency: string; day?: number; time: string } | null) => {
    if (!schedule) return 'Not set';
    
    const frequencyMap: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly'
    };
    
    let freq = frequencyMap[schedule.frequency] || schedule.frequency;
    
    if (schedule.frequency === 'weekly' && schedule.day !== undefined) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      freq += ` (${days[schedule.day]})`;
    } else if (schedule.frequency === 'monthly' && schedule.day !== undefined) {
      freq += ` (Day ${schedule.day})`;
    }
    
    return `${freq} at ${schedule.time}`;
  };

  const getReportTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      compliance: 'Compliance Report',
      usage: 'Usage Report',
      version: 'Version History Report'
    };
    return typeMap[type] || type;
  };

  const handleRegenerate = async (reportId: string) => {
    try {
      setRegeneratingId(reportId);
      
      const response = await fetch(`/api/reports/scheduled/${reportId}/regenerate`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to regenerate report');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to regenerate report');
      }
      
      toast.success('Report regenerated successfully! Refreshing...');
      
      // Refresh the list to get updated report info
      setTimeout(() => {
        refetch();
      }, 1000);
    } catch (err: any) {
      console.error('Error regenerating report:', err);
      toast.error(err.message || 'Failed to regenerate report');
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleDownload = async (reportId: string, fileName: string | null) => {
    try {
      setDownloadingId(reportId);
      
      const response = await fetch(`/api/reports/scheduled/${reportId}/download`);
      
      if (!response.ok) {
        // Try to parse error message
        let errorMessage = 'Failed to download report';
        const contentType = response.headers.get('Content-Type');
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
            
            // If file is empty/corrupted, suggest regeneration
            if (errorData.details && (errorData.details.includes('empty') || errorData.details.includes('corrupted'))) {
              errorMessage += '. Please use the "Regenerate" button to create a new report.';
            }
          } catch (e) {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
        } else {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }
      
      // Check if response is actually a file
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Unexpected response from server');
      }
      
      // Get the blob
      const blob = await response.blob();
      
      // Check if blob is actually an error (small size and might be JSON)
      if (blob.size < 100) {
        const text = await blob.text();
        try {
          const errorData = JSON.parse(text);
          if (errorData.message || errorData.error) {
            throw new Error(errorData.message || errorData.error);
          }
        } catch (e) {
          // Not JSON, continue with download
        }
      }
      
      // Get filename from Content-Disposition header or use provided/default
      const contentDisposition = response.headers.get('Content-Disposition');
      let downloadFileName = fileName || `report-${reportId}.pdf`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          downloadFileName = filenameMatch[1].replace(/['"]/g, '');
          try {
            downloadFileName = decodeURIComponent(downloadFileName);
          } catch (e) {
            // Use as is if decoding fails
          }
        }
      }
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Report downloaded successfully');
    } catch (err: any) {
      console.error('Error downloading report:', err);
      const errorMessage = err.message || 'Failed to download report. Please check if the report file exists on the server.';
      toast.error(errorMessage);
    } finally {
      setDownloadingId(null);
    }
  };

  const activeSchedules = schedules?.filter(s => s.isActive) || [];
  const inactiveSchedules = schedules?.filter(s => !s.isActive) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Scheduled Reports
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-end">
            <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading scheduled reports...</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                <Button variant="outline" size="sm" className="ml-2" onClick={refetch}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!loading && !error && schedules && schedules.length === 0 && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                No scheduled reports found. Create a schedule from the Compliance Reports page.
              </AlertDescription>
            </Alert>
          )}

          {!loading && !error && activeSchedules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Active Schedules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeSchedules.map((schedule) => (
                    <div key={schedule.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getReportTypeName(schedule.type)}</span>
                          <Badge variant="outline" className="border-green-600 text-green-600">
                            Active
                          </Badge>
                          {schedule.reportFileName && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Generated
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatFrequency(schedule.schedule)}
                          </div>
                          {schedule.nextRun && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Next: {formatDate(schedule.nextRun)}
                            </div>
                          )}
                        </div>
                        {schedule.lastRun && (
                          <div className="text-xs text-muted-foreground">
                            Last run: {formatDate(schedule.lastRun)}
                          </div>
                        )}
                        {schedule.reportGeneratedAt && (
                          <div className="text-xs text-muted-foreground">
                            Generated: {formatDate(schedule.reportGeneratedAt)}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerate(schedule.id)}
                          disabled={regeneratingId === schedule.id}
                          title="Regenerate report with latest data"
                        >
                          {regeneratingId === schedule.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Regenerating...
                            </>
                          ) : (
                            <>
                              <RotateCw className="h-4 w-4 mr-1" />
                              Regenerate
                            </>
                          )}
                        </Button>
                        {schedule.reportFileName ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleDownload(schedule.id, schedule.reportFileName)}
                            disabled={downloadingId === schedule.id}
                            title={`Download ${schedule.reportFileName}`}
                          >
                            {downloadingId === schedule.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </>
                            )}
                          </Button>
                        ) : (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Waiting for generation
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && !error && inactiveSchedules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Inactive Schedules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {inactiveSchedules.map((schedule) => (
                    <div key={schedule.id} className="flex items-center justify-between border-b pb-4 last:border-0 opacity-60">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getReportTypeName(schedule.type)}</span>
                          <Badge variant="outline" className="border-gray-400 text-gray-600">
                            Inactive
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Created: {formatDate(schedule.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

