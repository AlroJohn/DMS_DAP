"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Calendar,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import { useComplianceReport } from "@/hooks/use-compliance.report";
import { useScheduledReports } from "@/hooks/use-scheduled-reports";
import { ScheduledReportsModal } from "@/components/scheduled-reports-modal";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ComplianceReportsPage() {
  const { data, loading, error, refetch } = useComplianceReport();
  const { data: scheduledReports, refetch: refetchScheduled } =
    useScheduledReports();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showScheduledReportsModal, setShowScheduledReportsModal] =
    useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv" | "excel">(
    "pdf"
  );
  const [scheduleFrequency, setScheduleFrequency] = useState<
    "daily" | "weekly" | "monthly"
  >("weekly");
  const [scheduleDay, setScheduleDay] = useState<number>(1);
  const [scheduleTime, setScheduleTime] = useState<string>("09:00");
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading compliance report...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <XCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          Error Loading Compliance Report
        </h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={refetch}>Retry</Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <XCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          No Compliance Data Available
        </h2>
        <p className="text-muted-foreground">
          There is no compliance data to display at this time.
        </p>
      </div>
    );
  }

  const { complianceMetrics, pendingSignatures, recentSignatures } = data;

  const complianceMetricItems = [
    {
      label: "Documents Signed",
      value: complianceMetrics.documentsSigned.toString(),
      total: complianceMetrics.totalDocuments.toString(),
      percentage: Math.round(
        Number(complianceMetrics.complianceRate.replace("%", ""))
      ),
    },
    {
      label: "Pending Signatures",
      value: complianceMetrics.pendingSignatures.toString(),
      total: complianceMetrics.totalDocuments.toString(),
      percentage: Math.round(
        (complianceMetrics.pendingSignatures /
          complianceMetrics.totalDocuments) *
          100
      ),
    },
    {
      label: "Compliance Rate",
      value: complianceMetrics.complianceRate,
      status: complianceMetrics.status,
    },
    {
      label: "Failed Verifications",
      value: complianceMetrics.failedVerifications.toString(),
      status:
        complianceMetrics.failedVerifications > 0 ? "warning" : "excellent",
    },
  ];

  const handleExport = async (format: "pdf" | "csv" | "excel") => {
    try {
      setIsExporting(true);
      setExportError(null);

      // Get the current report data
      const currentData = data;

      if (!currentData) {
        throw new Error("No data available to export");
      }

      if (format === "csv") {
        // Create CSV content
        let csvContent = "Compliance Report\n\n";

        // Add statistics
        csvContent += "Statistics\n";
        csvContent += `Metric,Value\n`;
        csvContent += `Documents Signed,${
          currentData.complianceMetrics.documentsSigned?.toString() || "0"
        }\n`;
        csvContent += `Total Documents,${
          currentData.complianceMetrics.totalDocuments?.toString() || "0"
        }\n`;
        csvContent += `Compliance Rate,${
          currentData.complianceMetrics.complianceRate || "0%"
        }\n`;
        csvContent += `Pending Signatures,${
          currentData.complianceMetrics.pendingSignatures?.toString() || "0"
        }\n`;
        csvContent += `Failed Verifications,${
          currentData.complianceMetrics.failedVerifications?.toString() || "0"
        }\n\n`;

        // Add pending signatures
        csvContent += "Pending Signatures\n";
        csvContent += `Document,Document Code,Days Overdue,Priority\n`;
        if (currentData.pendingSignatures) {
          currentData.pendingSignatures.forEach((sig) => {
            csvContent += `"${sig.document}","${sig.documentCode}",${sig.daysOverdue},"${sig.priority}"\n`;
          });
        }
        csvContent += "\n";

        // Add recent signatures
        csvContent += "Recent Signatures\n";
        csvContent += `Document,Signer,Date,Status\n`;
        if (currentData.recentSignatures) {
          currentData.recentSignatures.forEach((sig) => {
            csvContent += `"${sig.document}","${sig.signer}","${sig.date}","${sig.status}"\n`;
          });
        }

        // Create and download the CSV file
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);

        link.setAttribute("href", url);
        link.setAttribute(
          "download",
          `compliance-report-${new Date().toISOString().split("T")[0]}.csv`
        );
        link.style.visibility = "hidden";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (format === "excel") {
        // For Excel export, we'll use the xlsx library
        const { utils, writeFile } = await import("xlsx");

        // Create worksheets for different data sections
        const statsData = [
          ["Metric", "Value"],
          [
            "Documents Signed",
            currentData.complianceMetrics.documentsSigned?.toString() || "0",
          ],
          [
            "Total Documents",
            currentData.complianceMetrics.totalDocuments?.toString() || "0",
          ],
          [
            "Compliance Rate",
            currentData.complianceMetrics.complianceRate || "0%",
          ],
          [
            "Pending Signatures",
            currentData.complianceMetrics.pendingSignatures?.toString() || "0",
          ],
          [
            "Failed Verifications",
            currentData.complianceMetrics.failedVerifications?.toString() ||
              "0",
          ],
        ];

        const pendingSignaturesData = [
          ["Document", "Document Code", "Days Overdue", "Priority"],
        ];
        if (currentData.pendingSignatures) {
          currentData.pendingSignatures.forEach((sig) => {
            pendingSignaturesData.push([
              sig.document,
              sig.documentCode,
              sig.daysOverdue.toString(),
              sig.priority,
            ]);
          });
        }

        const recentSignaturesData = [["Document", "Signer", "Date", "Status"]];
        if (currentData.recentSignatures) {
          currentData.recentSignatures.forEach((sig) => {
            recentSignaturesData.push([
              sig.document,
              sig.signer,
              sig.date,
              sig.status,
            ]);
          });
        }

        // Create workbook and add worksheets
        const wb = utils.book_new();
        const statsWs = utils.aoa_to_sheet(statsData);
        const pendingWs = utils.aoa_to_sheet(pendingSignaturesData);
        const recentWs = utils.aoa_to_sheet(recentSignaturesData);

        utils.book_append_sheet(wb, statsWs, "Statistics");
        utils.book_append_sheet(wb, pendingWs, "Pending Signatures");
        utils.book_append_sheet(wb, recentWs, "Recent Signatures");

        // Write the file
        writeFile(
          wb,
          `compliance-report-${new Date().toISOString().split("T")[0]}.xlsx`
        );
      } else if (format === "pdf") {
        // For PDF export, we'll create a properly styled PDF using jsPDF
        const { jsPDF } = await import("jspdf");
        await import("jspdf-autotable");

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;

        // Add header with logo and title
        try {
          const logoResponse = await fetch("/image/qby.png");
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
            doc.addImage(logoUrl, "PNG", margin, margin, width, height);

            // Clean up the object URL
            URL.revokeObjectURL(logoUrl);
          }
        } catch (error) {
          console.warn("Could not load logo:", error);
        }

        // Add title
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59); // gray-900
        doc.text("Compliance Report", pageWidth / 2, margin + 10, {
          align: "center",
        });

        // Add subtitle
        doc.setFontSize(12);
        doc.setTextColor(107, 114, 128); // gray-500
        doc.text(
          "Digital signature compliance and audit metrics",
          pageWidth / 2,
          margin + 18,
          { align: "center" }
        );

        // Add report generation date
        const reportDate = new Date().toLocaleDateString();
        doc.text(`Generated on: ${reportDate}`, pageWidth / 2, margin + 24, {
          align: "center",
        });

        // Add spacing after header
        let currentY = margin + 35;

        // Add statistics table with improved styling
        const statsData = [
          [
            "Documents Signed",
            currentData.complianceMetrics.documentsSigned?.toLocaleString() ||
              "0",
          ],
          [
            "Total Documents",
            currentData.complianceMetrics.totalDocuments?.toLocaleString() ||
              "0",
          ],
          [
            "Compliance Rate",
            currentData.complianceMetrics.complianceRate || "0%",
          ],
          [
            "Pending Signatures",
            currentData.complianceMetrics.pendingSignatures?.toLocaleString() ||
              "0",
          ],
          [
            "Failed Verifications",
            currentData.complianceMetrics.failedVerifications?.toLocaleString() ||
              "0",
          ],
        ];

        (doc as any).autoTable({
          startY: currentY,
          head: [["Metric", "Value"]],
          body: statsData,
          theme: "grid",
          headStyles: {
            fillColor: [22, 163, 74], // green-600
            textColor: [255, 255, 255],
            fontSize: 12,
            fontStyle: "bold",
          },
          bodyStyles: {
            fontSize: 11,
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251], // gray-50
          },
          margin: { left: margin, right: margin },
          styles: {
            cellPadding: 5,
          },
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;

        // Add pending signatures table with improved styling
        if (
          currentData.pendingSignatures &&
          currentData.pendingSignatures.length > 0
        ) {
          const pendingData = currentData.pendingSignatures.map((sig) => [
            sig.document,
            sig.documentCode,
            sig.daysOverdue.toString(),
            sig.priority,
          ]);

          (doc as any).autoTable({
            startY: currentY,
            head: [["Document", "Document Code", "Days Overdue", "Priority"]],
            body: pendingData,
            theme: "grid",
            headStyles: {
              fillColor: [37, 99, 235], // blue-600
              textColor: [255, 255, 255],
              fontSize: 12,
              fontStyle: "bold",
            },
            bodyStyles: {
              fontSize: 10,
            },
            alternateRowStyles: {
              fillColor: [249, 250, 251], // gray-50
            },
            margin: { left: margin, right: margin },
            styles: {
              cellPadding: 4,
            },
          });

          currentY = (doc as any).lastAutoTable.finalY + 10;
        }

        // Add recent signatures table with improved styling
        if (
          currentData.recentSignatures &&
          currentData.recentSignatures.length > 0
        ) {
          const recentData = currentData.recentSignatures.map((sig) => [
            sig.document,
            sig.signer,
            sig.date,
            sig.status,
          ]);

          (doc as any).autoTable({
            startY: currentY,
            head: [["Document", "Signer", "Date", "Status"]],
            body: recentData,
            theme: "grid",
            headStyles: {
              fillColor: [107, 114, 128], // gray-500
              textColor: [255, 255, 255],
              fontSize: 12,
              fontStyle: "bold",
            },
            bodyStyles: {
              fontSize: 10,
            },
            alternateRowStyles: {
              fillColor: [249, 250, 251], // gray-50
            },
            margin: { left: margin, right: margin },
            styles: {
              cellPadding: 4,
            },
          });
        }

        // Add footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(10);
          doc.setTextColor(107, 114, 128); // gray-500
          doc.text(
            `Page ${i} of ${pageCount}`,
            pageWidth - margin - 25,
            doc.internal.pageSize.height - 10
          );
        }

        // Save the PDF
        doc.save(
          `compliance-report-${new Date().toISOString().split("T")[0]}.pdf`
        );
      }
    } catch (err: any) {
      console.error("Error exporting report:", err);
      const errorMessage = err.message || "An unknown error occurred";
      setExportError(errorMessage);
      toast.error(
        `Failed to export report as ${format.toUpperCase()}: ${errorMessage}`
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleSchedule = async () => {
    setIsScheduling(true);
    setScheduleError(null);

    try {
      const response = await fetch("/api/reports/compliance/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          frequency: scheduleFrequency,
          day: scheduleFrequency !== "daily" ? scheduleDay : undefined,
          time: scheduleTime,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Schedule response not ok:", response.status, result);
        throw new Error(
          result.message || `Failed to schedule report: ${response.status}`
        );
      }

      console.log("Schedule response:", result);
      toast.success(result.message || "Report scheduled successfully!");
      setShowScheduleDialog(false);
      // Refresh scheduled reports list
      refetchScheduled();
    } catch (err: any) {
      console.error("Schedule error:", err);
      setScheduleError(
        err.message || "Failed to schedule report. Please try again."
      );
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Compliance Reports
          </h1>
          <p className="text-muted-foreground">
            Digital signature compliance and audit metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowScheduledReportsModal(true)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            View Scheduled Reports
          </Button>
          <Button variant="outline" onClick={() => setShowScheduleDialog(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Report
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={isExporting}>
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => handleExport("pdf")}
                disabled={isExporting}
              >
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport("csv")}
                disabled={isExporting}
              >
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport("excel")}
                disabled={isExporting}
              >
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {complianceMetricItems.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </p>
                <p className="text-2xl font-bold">{metric.value}</p>
                {metric.percentage !== undefined && (
                  <div className="space-y-1">
                    <Progress value={metric.percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {metric.value} of {metric.total}
                    </p>
                  </div>
                )}
                {metric.status && (
                  <Badge
                    variant={
                      metric.status === "excellent"
                        ? "default"
                        : metric.status === "warning"
                        ? "destructive"
                        : "secondary"
                    }
                    className={
                      metric.status === "excellent"
                        ? "bg-green-100 text-green-800"
                        : metric.status === "warning"
                        ? "bg-red-100 text-red-800"
                        : ""
                    }
                  >
                    {metric.status === "excellent"
                      ? "Excellent"
                      : metric.status === "good"
                      ? "Good"
                      : "Needs Attention"}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pendingSignatures.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{pendingSignatures.length} documents</strong> are pending
            digital signatures. Review overdue items to maintain compliance.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Pending Signatures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingSignatures.length > 0 ? (
                pendingSignatures.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{item.document}</p>
                      <p className="text-sm text-muted-foreground">
                        Code: {item.documentCode}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          item.priority === "high"
                            ? "destructive"
                            : item.priority === "medium"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {item.daysOverdue > 0
                          ? `${item.daysOverdue}d overdue`
                          : "Due today"}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Priority: {item.priority}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No pending signatures
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Recent Digital Signatures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSignatures.length > 0 ? (
                recentSignatures.map((signature, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{signature.document}</p>
                      <p className="text-sm text-muted-foreground">
                        Signed by {signature.signer} • {signature.date}
                      </p>
                    </div>
                    <div className="text-right">
                      {signature.status === "verified" ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <XCircle className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No recent signatures
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compliance Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.timeline && data.timeline.length > 0 ? (
              data.timeline.map((event) => {
                const getIcon = () => {
                  switch (event.icon) {
                    case "check-circle":
                      return <CheckCircle className="h-5 w-5 text-green-600" />;
                    case "alert-triangle":
                      return (
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      );
                    default:
                      return <FileText className="h-5 w-5 text-blue-600" />;
                  }
                };

                const getBorderColor = () => {
                  switch (event.color) {
                    case "green":
                      return "border-green-500 bg-green-50";
                    case "yellow":
                      return "border-yellow-500 bg-yellow-50";
                    default:
                      return "border-blue-500 bg-blue-50";
                  }
                };

                return (
                  <div
                    key={event.id}
                    className={`flex items-center gap-4 p-3 border-l-4 rounded ${getBorderColor()}`}
                  >
                    {getIcon()}
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.description}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground ml-auto">
                      {event.date}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No compliance events to display
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Reports Section */}
      {scheduledReports &&
        scheduledReports.filter((r) => r.type === "compliance" && r.isActive)
          .length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Scheduled Compliance Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scheduledReports
                  .filter((r) => r.type === "compliance" && r.isActive)
                  .map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Compliance Report</span>
                          <Badge
                            variant="outline"
                            className="border-green-600 text-green-600"
                          >
                            Active
                          </Badge>
                          {schedule.reportFileName && (
                            <Badge
                              variant="secondary"
                              className="bg-blue-100 text-blue-800"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Available
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {schedule.schedule && (
                            <>
                              {schedule.schedule.frequency === "daily" &&
                                "Daily"}
                              {schedule.schedule.frequency === "weekly" &&
                                `Weekly (${
                                  [
                                    "Sunday",
                                    "Monday",
                                    "Tuesday",
                                    "Wednesday",
                                    "Thursday",
                                    "Friday",
                                    "Saturday",
                                  ][schedule.schedule.day || 0]
                                })`}
                              {schedule.schedule.frequency === "monthly" &&
                                `Monthly (Day ${
                                  schedule.schedule.day || 1
                                })`}{" "}
                              at {schedule.schedule.time}
                            </>
                          )}
                        </div>
                        {schedule.nextRun && (
                          <div className="text-xs text-muted-foreground">
                            Next run:{" "}
                            {new Date(schedule.nextRun).toLocaleString()}
                          </div>
                        )}
                        {schedule.reportGeneratedAt && (
                          <div className="text-xs text-muted-foreground">
                            Generated:{" "}
                            {new Date(
                              schedule.reportGeneratedAt
                            ).toLocaleString()}
                          </div>
                        )}
                      </div>
                      {schedule.reportFileName && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await fetch(
                                `/api/reports/scheduled/${schedule.id}/download`
                              );
                              if (!response.ok)
                                throw new Error("Failed to download");
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download =
                                schedule.reportFileName ||
                                `compliance-report-${schedule.id}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                              toast.success("Report downloaded successfully");
                            } catch (err: any) {
                              toast.error(
                                err.message || "Failed to download report"
                              );
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      )}
                    </div>
                  ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScheduledReportsModal(true)}
                >
                  View All Scheduled Reports
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Schedule Compliance Report
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowScheduleDialog(false)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={scheduleFrequency}
                  onValueChange={(value: "daily" | "weekly" | "monthly") =>
                    setScheduleFrequency(value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(scheduleFrequency === "weekly" ||
                scheduleFrequency === "monthly") && (
                <div>
                  <Label htmlFor="day">
                    {scheduleFrequency === "weekly"
                      ? "Day of Week"
                      : "Day of Month"}
                  </Label>
                  <Input
                    type="number"
                    id="day"
                    value={scheduleDay}
                    onChange={(e) =>
                      setScheduleDay(parseInt(e.target.value) || 1)
                    }
                    min={scheduleFrequency === "weekly" ? 0 : 1}
                    max={scheduleFrequency === "weekly" ? 6 : 31}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {scheduleFrequency === "weekly"
                      ? "0 = Sunday, 1 = Monday, etc."
                      : "Enter day of the month (1-31)"}
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="time">Time (24-hour format)</Label>
                <Input
                  type="time"
                  id="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>

              {scheduleError && (
                <div className="text-sm text-destructive">{scheduleError}</div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowScheduleDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSchedule} disabled={isScheduling}>
              {isScheduling ? "Scheduling..." : "Schedule"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scheduled Reports Modal */}
      <ScheduledReportsModal
        open={showScheduledReportsModal}
        onOpenChange={setShowScheduledReportsModal}
      />
    </div>
  );
}
