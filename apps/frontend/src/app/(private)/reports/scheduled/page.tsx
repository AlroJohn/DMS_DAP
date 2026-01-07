"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Clock, Download, Loader2, RefreshCw, FileText, Calendar, CheckCircle, XCircle } from "lucide-react";
import { useScheduledReports } from "@/hooks/use-scheduled-reports";
import { toast } from "sonner";
import { useState } from "react";

export default function ScheduledReportsPage() {
  const { data: schedules, loading, error, refetch } = useScheduledReports();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  const handleDownload = async (reportId: string, fileName: string | null) => {
    try {
      setDownloadingId(reportId);
      
      const response = await fetch(`/api/reports/scheduled/${reportId}/download`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to download report');
      }
      
      // Get the blob
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Report downloaded successfully');
    } catch (err: any) {
      console.error('Error downloading report:', err);
      toast.error(err.message || 'Failed to download report');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading scheduled reports...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <XCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading Scheduled Reports</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={refetch}>Retry</Button>
      </div>
    );
  }

  const activeSchedules = schedules.filter(s => s.isActive);
  const inactiveSchedules = schedules.filter(s => !s.isActive);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scheduled Reports</h1>
          <p className="text-muted-foreground">Manage automated report delivery and download generated reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {schedules.length === 0 && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            No scheduled reports found. Create a schedule from the Compliance Reports page.
          </AlertDescription>
        </Alert>
      )}

      {activeSchedules.length > 0 && (
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
                    {schedule.reportFileName && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleDownload(schedule.id, schedule.reportFileName)}
                        disabled={downloadingId === schedule.id}
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
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {inactiveSchedules.length > 0 && (
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
  );
}
