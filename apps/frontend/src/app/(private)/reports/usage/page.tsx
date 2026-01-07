"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Users, FileText, TrendingUp, Download, Calendar, Activity, Loader2, RefreshCw, FileTextIcon, FileSpreadsheet, FileImage } from "lucide-react";
import React, { useState } from 'react';
import { UsageReportData } from '@/types/usage-report';

export default function UsageReportsPage() {
  const [dateRange, setDateRange] = React.useState<string>('30days');
  const [reportData, setReportData] = React.useState<UsageReportData | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/reports/usage?dateRange=${dateRange}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          setReportData(result.data as UsageReportData);
        } else {
          throw new Error(result.error || 'Failed to fetch usage report');
        }
      } catch (err: any) {
        console.error('Error fetching usage report:', err);
        setError(err.message || 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [dateRange]);

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
  };

  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/reports/usage?dateRange=${dateRange}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        const reportData: UsageReportData = result.data;

        if (format === 'csv') {
          // Create CSV content
          let csvContent = `Usage Report - ${dateRange}\n\n`;

          // Add statistics
          csvContent += 'Statistics\n';
          csvContent += `Metric,Value\n`;
          csvContent += `Total Documents,${reportData.statistics.totalDocuments?.toString() || '0'}\n`;
          csvContent += `Active Users,${reportData.statistics.activeUsers?.toString() || '0'}\n`;
          csvContent += `Storage Used,${reportData.statistics.storageUsed || '0 GB'}\n`;
          csvContent += `API Calls,${reportData.statistics.apiCalls?.toString() || '0'}\n\n`;

          // Add department usage
          csvContent += 'Department Usage\n';
          csvContent += `Department,Documents,Users,Storage,Activity\n`;
          if (reportData.departmentUsage) {
            reportData.departmentUsage.forEach((dept) => {
              csvContent += `"${dept.name}",${dept.documents?.toString()},${dept.users?.toString()},"${dept.storage}",${dept.activity}%\n`;
            });
          }
          csvContent += '\n';

          // Add recent activity
          csvContent += 'Recent Activity\n';
          csvContent += `Action,User,Time\n`;
          if (reportData.recentActivity) {
            reportData.recentActivity.forEach((activity) => {
              csvContent += `"${activity.action}","${activity.user}","${activity.time}"\n`;
            });
          }

          // Create and download the CSV file
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);

          link.setAttribute('href', url);
          link.setAttribute('download', `usage-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`);
          link.style.visibility = 'hidden';

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if (format === 'excel') {
          // For Excel export, we'll use the dynamic import approach
          const { utils, writeFile } = await import('xlsx');

          // Create worksheets for different data sections
          const statsData = [
            ['Metric', 'Value'],
            ['Total Documents', reportData.statistics.totalDocuments?.toString() || '0'],
            ['Active Users', reportData.statistics.activeUsers?.toString() || '0'],
            ['Storage Used', reportData.statistics.storageUsed || '0 GB'],
            ['API Calls', reportData.statistics.apiCalls?.toString() || '0'],
          ];

          const deptData = [
            ['Department', 'Documents', 'Users', 'Storage', 'Activity']
          ];
          if (reportData.departmentUsage) {
            reportData.departmentUsage.forEach((dept) => {
              deptData.push([dept.name, dept.documents?.toString(), dept.users?.toString(), dept.storage, `${dept.activity}%`]);
            });
          }

          const activityData = [
            ['Action', 'User', 'Time']
          ];
          if (reportData.recentActivity) {
            reportData.recentActivity.forEach((activity) => {
              activityData.push([activity.action, activity.user, activity.time]);
            });
          }

          // Create workbook and add worksheets
          const wb = utils.book_new();
          const statsWs = utils.aoa_to_sheet(statsData);
          const deptWs = utils.aoa_to_sheet(deptData);
          const activityWs = utils.aoa_to_sheet(activityData);

          utils.book_append_sheet(wb, statsWs, 'Statistics');
          utils.book_append_sheet(wb, deptWs, 'Department Usage');
          utils.book_append_sheet(wb, activityWs, 'Recent Activity');

          // Write the file
          writeFile(wb, `usage-report-${dateRange}-${new Date().toISOString().split('T')[0]}.xlsx`);
        } else if (format === 'pdf') {
          // For PDF export, we'll create a properly styled PDF using jsPDF
          const { jsPDF } = await import('jspdf');
          await import('jspdf-autotable');

          const doc = new jsPDF();
          const pageWidth = doc.internal.pageSize.width;
          const margin = 20;

          // Add header with logo and title
          try {
            const logoResponse = await fetch('/image/qby.png');
            if (logoResponse.ok) {
              const logoBlob = await logoResponse.blob();
              const logoUrl = URL.createObjectURL(logoBlob);

              // Get the original dimensions of the logo
              const img = new Image();
              img.src = logoUrl;

              // Wait for the image to load to get its dimensions
              await new Promise((resolve) => {
                img.onload = resolve;
              });

              // Calculate the scaled dimensions to maintain aspect ratio
              const maxWidth = 40; // Maximum width for the logo
              const maxHeight = 20; // Maximum height for the logo
              let width = img.width;
              let height = img.height;

              // Scale down if the image is too large
              if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
              }
              if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
              }

              // Add logo to the top left with original aspect ratio
              doc.addImage(logoUrl, 'PNG', margin, margin, width, height);

              // Clean up the object URL
              URL.revokeObjectURL(logoUrl);
            }
          } catch (error) {
            console.warn('Could not load logo:', error);
          }

          // Add title
          doc.setFontSize(22);
          doc.setTextColor(30, 41, 59); // gray-900
          doc.text('Usage Report', pageWidth / 2, margin + 10, { align: 'center' });

          // Add date range
          doc.setFontSize(12);
          doc.setTextColor(107, 114, 128); // gray-500
          doc.text(`Date Range: ${dateRange}`, pageWidth / 2, margin + 18, { align: 'center' });

          // Add report generation date
          const reportDate = new Date().toLocaleDateString();
          doc.text(`Generated on: ${reportDate}`, pageWidth / 2, margin + 24, { align: 'center' });

          // Add spacing after header
          let currentY = margin + 35;

          // Add statistics table with improved styling
          const statsData = [
            ['Total Documents', reportData.statistics.totalDocuments?.toLocaleString() || '0'],
            ['Active Users', reportData.statistics.activeUsers?.toLocaleString() || '0'],
            ['Storage Used', reportData.statistics.storageUsed || '0 GB'],
            ['API Calls', reportData.statistics.apiCalls?.toLocaleString() || '0'],
          ];

          (doc as any).autoTable({
            startY: currentY,
            head: [['Metric', 'Value']],
            body: statsData,
            theme: 'grid',
            headStyles: {
              fillColor: [22, 163, 74], // green-600
              textColor: [255, 255, 255],
              fontSize: 12,
              fontStyle: 'bold'
            },
            bodyStyles: {
              fontSize: 11
            },
            alternateRowStyles: {
              fillColor: [249, 250, 251] // gray-50
            },
            margin: { left: margin, right: margin },
            styles: {
              cellPadding: 5
            }
          });

          currentY = (doc as any).lastAutoTable.finalY + 10;

          // Add department usage table with improved styling
          if (reportData.departmentUsage && reportData.departmentUsage.length > 0) {
            const deptData = reportData.departmentUsage.map((dept) => [
              dept.name,
              dept.documents?.toString() || '0',
              dept.users?.toString() || '0',
              dept.storage,
              `${dept.activity}%`
            ]);

            (doc as any).autoTable({
              startY: currentY,
              head: [['Department', 'Documents', 'Users', 'Storage', 'Activity']],
              body: deptData,
              theme: 'grid',
              headStyles: {
                fillColor: [37, 99, 235], // blue-600
                textColor: [255, 255, 255],
                fontSize: 12,
                fontStyle: 'bold'
              },
              bodyStyles: {
                fontSize: 10
              },
              alternateRowStyles: {
                fillColor: [249, 250, 251] // gray-50
              },
              margin: { left: margin, right: margin },
              styles: {
                cellPadding: 4
              }
            });

            currentY = (doc as any).lastAutoTable.finalY + 10;
          }

          // Add recent activity table with improved styling
          if (reportData.recentActivity && reportData.recentActivity.length > 0) {
            const activityData = reportData.recentActivity.map((activity) => [
              activity.action,
              activity.user,
              activity.time
            ]);

            (doc as any).autoTable({
              startY: currentY,
              head: [['Action', 'User', 'Time']],
              body: activityData,
              theme: 'grid',
              headStyles: {
                fillColor: [107, 114, 128], // gray-500
                textColor: [255, 255, 255],
                fontSize: 12,
                fontStyle: 'bold'
              },
              bodyStyles: {
                fontSize: 10
              },
              alternateRowStyles: {
                fillColor: [249, 250, 251] // gray-50
              },
              margin: { left: margin, right: margin },
              styles: {
                cellPadding: 4
              }
            });
          }

          // Add footer
          const pageCount = doc.getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(107, 114, 128); // gray-500
            doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 25, doc.internal.pageSize.height - 10);
          }

          // Save the PDF
          doc.save(`usage-report-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`);
        }
      } else {
        throw new Error(result.error || 'Failed to fetch report data for export');
      }
    } catch (err: any) {
      console.error('Error exporting report:', err);
      setError(err.message || 'An unknown error occurred');
      alert(`Failed to export report as ${format.toUpperCase()}: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !reportData) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading usage report...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-red-500 text-lg mb-4">Error loading usage report</div>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button onClick={() => {
          // Refetch by triggering the useEffect again
          const fetchReportData = async () => {
            try {
              setLoading(true);
              setError(null);

              const response = await fetch(`/api/reports/usage?dateRange=${dateRange}`);

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
              }

              const result = await response.json();

              if (result.success) {
                setReportData(result.data as UsageReportData);
              } else {
                throw new Error(result.error || 'Failed to fetch usage report');
              }
            } catch (err: any) {
              console.error('Error fetching usage report:', err);
              setError(err.message || 'An unknown error occurred');
            } finally {
              setLoading(false);
            }
          };

          fetchReportData();
        }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const usageStats = [
    { label: "Total Documents", value: reportData?.statistics.totalDocuments?.toLocaleString() || "0", change: reportData?.statistics.storageChange || "+0%", trend: reportData?.statistics.storageChange?.startsWith('+') ? "up" : "down" },
    { label: "Active Users", value: reportData?.statistics.activeUsers?.toLocaleString() || "0", change: "+8%", trend: "up" },
    { label: "Storage Used", value: reportData?.statistics.storageUsed || "0 GB", change: reportData?.statistics.storageChange || "+0%", trend: reportData?.statistics.storageChange?.startsWith('+') ? "up" : "down" },
    { label: "API Calls", value: reportData?.statistics.apiCalls?.toLocaleString() || "0", change: reportData?.statistics.apiCallChange || "+0%", trend: reportData?.statistics.apiCallChange?.startsWith('+') ? "up" : "down" }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usage Reports</h1>
          <p className="text-muted-foreground">System utilization and performance analytics</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative group inline-block">
            <Button disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export Report
            </Button>
            {/* Dropdown menu for export options */}
            <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-background ring-1 ring-black ring-opacity-5 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="py-1" role="menu">
                <button
                  onClick={() => handleExport('csv')}
                  className="block px-4 py-2 text-sm text-foreground hover:bg-accent w-full text-left rounded-t-md"
                  role="menuitem"
                >
                  <div className="flex items-center">
                    <FileTextIcon className="mr-2 h-4 w-4" />
                    Export as CSV
                  </div>
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="block px-4 py-2 text-sm text-foreground hover:bg-accent w-full text-left"
                  role="menuitem"
                >
                  <div className="flex items-center">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export as Excel
                  </div>
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="block px-4 py-2 text-sm text-foreground hover:bg-accent w-full text-left rounded-b-md"
                  role="menuitem"
                >
                  <div className="flex items-center">
                    <FileImage className="mr-2 h-4 w-4" />
                    Export as PDF
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {usageStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className={`h-3 w-3 ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`} />
                    <span className={`text-xs ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  {index === 0 && <FileText className="h-6 w-6 text-blue-600" />}
                  {index === 1 && <Users className="h-6 w-6 text-blue-600" />}
                  {index === 2 && <BarChart3 className="h-6 w-6 text-blue-600" />}
                  {index === 3 && <Activity className="h-6 w-6 text-blue-600" />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Department Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData?.departmentUsage?.map((dept, index: number) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{dept.name}</h4>
                    <Badge variant="outline">{dept.activity}% active</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">{dept.documents}</span> documents
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{dept.users}</span> users
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{dept.storage}</span> storage
                    </div>
                  </div>
                  <Progress value={dept.activity} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData?.recentActivity?.map((activity, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.user}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Usage trend chart would be displayed here</p>
              <p className="text-sm text-gray-500">Integration with charting library needed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}