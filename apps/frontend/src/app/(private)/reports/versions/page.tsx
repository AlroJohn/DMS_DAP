"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  Loader2,
  FileText,
  Calendar,
  User,
  History,
  FileSpreadsheet,
  FileImage,
} from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export default function VersionHistoryReportPage() {
  const [reportData, setReportData] = useState<VersionHistoryReport | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChange, setSelectedChange] = useState<any>(null);
  const [showDiffModal, setShowDiffModal] = useState<boolean>(false);
  const [selectedVersionB, setSelectedVersionB] = useState<string>("");
  const [comparisonResult, setComparisonResult] = useState<any>(null);

  useEffect(() => {
    const fetchVersionHistoryReport = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/reports/version");

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`
          );
        }

        const result = await response.json();

        if (result.success) {
          setReportData(result.data);
        } else {
          throw new Error(
            result.error || "Failed to fetch version history report"
          );
        }
      } catch (err: any) {
        console.error("Error fetching version history report:", err);
        setError(err.message || "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchVersionHistoryReport();
  }, []);

  const exportReport = async (format: "csv" | "excel" | "pdf") => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/reports/version");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const result = await response.json();

      if (result.success) {
        if (format === "csv") {
          // Create CSV content
          let csvContent =
            "Document Title,Document Code,File Name,Version,Uploaded By,Uploaded At\n";

          result.data.recentChanges.forEach((change: any) => {
            csvContent += `"${change.documentTitle}","${
              change.documentCode
            }","${change.fileName}","${change.version}","${
              change.uploadedBy
            }","${new Date(change.uploadedAt).toLocaleString()}"\n`;
          });

          // Create and download the CSV file
          const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
          });
          const link = document.createElement("a");
          const url = URL.createObjectURL(blob);

          link.setAttribute("href", url);
          link.setAttribute(
            "download",
            `version-history-report-${
              new Date().toISOString().split("T")[0]
            }.csv`
          );
          link.style.visibility = "hidden";

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if (format === "excel") {
          // For Excel export, we'll create a CSV and let the user open it in Excel
          let csvContent =
            "Document Title,Document Code,File Name,Version,Uploaded By,Uploaded At\n";

          result.data.recentChanges.forEach((change: any) => {
            csvContent += `"${change.documentTitle}","${
              change.documentCode
            }","${change.fileName}","${change.version}","${
              change.uploadedBy
            }","${new Date(change.uploadedAt).toLocaleString()}"\n`;
          });

          // Create and download the Excel file
          const blob = new Blob([csvContent], {
            type: "application/vnd.ms-excel",
          });
          const link = document.createElement("a");
          const url = URL.createObjectURL(blob);

          link.setAttribute("href", url);
          link.setAttribute(
            "download",
            `version-history-report-${
              new Date().toISOString().split("T")[0]
            }.xls`
          );
          link.style.visibility = "hidden";

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if (format === "pdf") {
          // For PDF export, we'll create a proper PDF using jsPDF if available
          // First, let's try to load the image and convert it to base64
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.src = "/image/qby.png";

          img.onload = function () {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            try {
              // If jsPDF is available in the project, use it
              // @ts-ignore - checking if jsPDF exists
              if (typeof window !== "undefined" && window.jsPDF) {
                // @ts-ignore
                const { jsPDF } = window;
                const pdf = new jsPDF();

                // Add the logo
                const imgData = canvas.toDataURL("image/png");
                pdf.addImage(imgData, "PNG", 85, 10, 40, 15); // Position logo at top center

                // Add title
                pdf.setFontSize(22);
                pdf.text(
                  "Version History Report",
                  105,
                  35,
                  null,
                  null,
                  "center"
                );

                // Add subtitle
                pdf.setFontSize(16);
                pdf.text(
                  "System-wide document version tracking",
                  105,
                  43,
                  null,
                  null,
                  "center"
                );

                // Add generation date
                pdf.setFontSize(12);
                pdf.text(
                  `Generated on: ${new Date().toLocaleString()}`,
                  105,
                  50,
                  null,
                  null,
                  "center"
                );

                // Prepare data for table
                const headers = [
                  "Document Title",
                  "Document Code",
                  "File Name",
                  "Version",
                  "Uploaded By",
                  "Uploaded At",
                ];
                const data = result.data.recentChanges.map((change: any) => [
                  change.documentTitle,
                  change.documentCode,
                  change.fileName,
                  change.version,
                  change.uploadedBy,
                  new Date(change.uploadedAt).toLocaleString(),
                ]);

                // Add table using autoTable plugin if available
                // @ts-ignore
                if (pdf.autoTable) {
                  // @ts-ignore
                  pdf.autoTable({
                    head: [headers],
                    body: data,
                    startY: 55,
                    margin: { horizontal: 10 },
                    styles: { fontSize: 10 },
                  });

                  // Add footer
                  const pageCount = pdf.getNumberOfPages();
                  for (let i = 1; i <= pageCount; i++) {
                    pdf.setPage(i);
                    pdf.text(
                      `Page ${i} of ${pageCount}`,
                      200,
                      290,
                      null,
                      null,
                      "right"
                    );
                  }

                  pdf.save(
                    `version-history-report-${
                      new Date().toISOString().split("T")[0]
                    }.pdf`
                  );
                } else {
                  // Fallback: add data manually
                  let yPosition = 55;
                  headers.forEach((header, index) => {
                    pdf.setFont(undefined, "bold");
                    pdf.text(header, 15 + index * 30, yPosition);
                  });

                  yPosition += 10;
                  data.forEach((row: string[]) => {
                    pdf.setFont(undefined, "normal");
                    row.forEach((cell: string, index: number) => {
                      pdf.text(cell.toString(), 15 + index * 30, yPosition);
                    });
                    yPosition += 10;

                    // Add new page if needed
                    if (yPosition > 280) {
                      pdf.addPage();
                      yPosition = 20;
                    }
                  });

                  pdf.save(
                    `version-history-report-${
                      new Date().toISOString().split("T")[0]
                    }.pdf`
                  );
                }
              } else {
                // If jsPDF is not available, create a styled HTML file that can be printed as PDF
                let htmlContent = `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Version History Report</title>
                      <style>
                        body {
                          font-family: Arial, sans-serif;
                          margin: 20px;
                          color: #333;
                          max-width: 210mm; /* A4 width */
                          margin: 0 auto;
                        }
                        .header {
                          text-align: center;
                          margin-bottom: 20px;
                          padding-bottom: 15px;
                          border-bottom: 2px solid #e5e7eb;
                        }
                        .logo {
                          max-width: 150px;
                          margin: 0 auto 10px;
                          display: block;
                        }
                        table {
                          width: 100%;
                          border-collapse: collapse;
                          margin-top: 20px;
                          font-size: 14px;
                        }
                        th, td {
                          border: 1px solid #ddd;
                          padding: 10px;
                          text-align: left;
                        }
                        th {
                          background-color: #f9fafb;
                          font-weight: bold;
                        }
                        .footer {
                          margin-top: 30px;
                          text-align: center;
                          font-size: 12px;
                          color: #666;
                          padding-top: 15px;
                          border-top: 1px solid #e5e7eb;
                        }
                        .report-title {
                          font-size: 24px;
                          font-weight: bold;
                          margin: 10px 0;
                        }
                        .report-subtitle {
                          font-size: 16px;
                          color: #6b7280;
                          margin-bottom: 20px;
                        }
                        @media print {
                          body { -webkit-print-color-adjust: exact; color-adjust: exact; }
                        }
                      </style>
                    </head>
                    <body>
                      <div class="header">
                        <img src="${canvas.toDataURL(
                          "image/png"
                        )}" alt="QBY Logo" class="logo"/>
                        <div class="report-title">Version History Report</div>
                        <div class="report-subtitle">System-wide document version tracking</div>
                        <p>Generated on: ${new Date().toLocaleString()}</p>
                      </div>
                      <table>
                        <thead>
                          <tr>
                            <th>Document Title</th>
                            <th>Document Code</th>
                            <th>File Name</th>
                            <th>Version</th>
                            <th>Uploaded By</th>
                            <th>Uploaded At</th>
                          </tr>
                        </thead>
                        <tbody>
                `;

                result.data.recentChanges.forEach((change: any) => {
                  htmlContent += `
                    <tr>
                      <td>${change.documentTitle}</td>
                      <td>${change.documentCode}</td>
                      <td>${change.fileName}</td>
                      <td>${change.version}</td>
                      <td>${change.uploadedBy}</td>
                      <td>${new Date(change.uploadedAt).toLocaleString()}</td>
                    </tr>
                  `;
                });

                htmlContent += `
                        </tbody>
                      </table>
                      <div class="footer">
                        <p>Version History Report - System-wide document version tracking</p>
                        <p>Generated on: ${new Date().toLocaleString()}</p>
                      </div>
                    </body>
                  </html>
                `;

                // Create a Blob with the HTML content
                const blob = new Blob([htmlContent], { type: "text/html" });
                const url = URL.createObjectURL(blob);

                // Create a temporary link to download the file
                const link = document.createElement("a");
                link.href = url;
                link.download = `version-history-report-${
                  new Date().toISOString().split("T")[0]
                }.pdf.html`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Revoke the object URL to free up memory
                URL.revokeObjectURL(url);
              }
            } catch (e) {
              console.error("Error generating PDF:", e);
              // Fallback to HTML file if PDF generation fails
              let htmlContent = `
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Version History Report</title>
                    <style>
                      body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        color: #333;
                        max-width: 210mm; /* A4 width */
                        margin: 0 auto;
                      }
                      .header {
                        text-align: center;
                        margin-bottom: 20px;
                        padding-bottom: 15px;
                        border-bottom: 2px solid #e5e7eb;
                      }
                      .logo {
                        max-width: 150px;
                        margin: 0 auto 10px;
                        display: block;
                      }
                      table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                        font-size: 14px;
                      }
                      th, td {
                        border: 1px solid #ddd;
                        padding: 10px;
                        text-align: left;
                      }
                      th {
                        background-color: #f9fafb;
                        font-weight: bold;
                      }
                      .footer {
                        margin-top: 30px;
                        text-align: center;
                        font-size: 12px;
                        color: #666;
                        padding-top: 15px;
                        border-top: 1px solid #e5e7eb;
                      }
                      .report-title {
                        font-size: 24px;
                        font-weight: bold;
                        margin: 10px 0;
                      }
                      .report-subtitle {
                        font-size: 16px;
                        color: #6b7280;
                        margin-bottom: 20px;
                      }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <img src="${canvas.toDataURL(
                        "image/png"
                      )}" alt="QBY Logo" class="logo"/>
                      <div class="report-title">Version History Report</div>
                      <div class="report-subtitle">System-wide document version tracking</div>
                      <p>Generated on: ${new Date().toLocaleString()}</p>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Document Title</th>
                          <th>Document Code</th>
                          <th>File Name</th>
                          <th>Version</th>
                          <th>Uploaded By</th>
                          <th>Uploaded At</th>
                        </tr>
                      </thead>
                      <tbody>
              `;

              result.data.recentChanges.forEach((change: any) => {
                htmlContent += `
                  <tr>
                    <td>${change.documentTitle}</td>
                    <td>${change.documentCode}</td>
                    <td>${change.fileName}</td>
                    <td>${change.version}</td>
                    <td>${change.uploadedBy}</td>
                    <td>${new Date(change.uploadedAt).toLocaleString()}</td>
                  </tr>
                `;
              });

              htmlContent += `
                      </tbody>
                    </table>
                    <div class="footer">
                      <p>Version History Report - System-wide document version tracking</p>
                      <p>Generated on: ${new Date().toLocaleString()}</p>
                    </div>
                  </body>
                </html>
              `;

              // Create a Blob with the HTML content
              const blob = new Blob([htmlContent], { type: "text/html" });
              const url = URL.createObjectURL(blob);

              // Create a temporary link to download the file
              const link = document.createElement("a");
              link.href = url;
              link.download = `version-history-report-${
                new Date().toISOString().split("T")[0]
              }.html`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              // Revoke the object URL to free up memory
              URL.revokeObjectURL(url);
            }
          };

          // Handle image loading error
          img.onerror = function () {
            // If image fails to load, generate PDF without logo
            // @ts-ignore - checking if jsPDF exists
            if (typeof window !== "undefined" && window.jsPDF) {
              // @ts-ignore
              const { jsPDF } = window;
              const pdf = new jsPDF();

              // Add title
              pdf.setFontSize(22);
              pdf.text("Version History Report", 105, 20, null, null, "center");

              // Add subtitle
              pdf.setFontSize(16);
              pdf.text(
                "System-wide document version tracking",
                105,
                28,
                null,
                null,
                "center"
              );

              // Add generation date
              pdf.setFontSize(12);
              pdf.text(
                `Generated on: ${new Date().toLocaleString()}`,
                105,
                35,
                null,
                null,
                "center"
              );

              // Prepare data for table
              const headers = [
                "Document Title",
                "Document Code",
                "File Name",
                "Version",
                "Uploaded By",
                "Uploaded At",
              ];
              const data = result.data.recentChanges.map((change: any) => [
                change.documentTitle,
                change.documentCode,
                change.fileName,
                change.version,
                change.uploadedBy,
                new Date(change.uploadedAt).toLocaleString(),
              ]);

              // Add table using autoTable plugin if available
              // @ts-ignore
              if (pdf.autoTable) {
                // @ts-ignore
                pdf.autoTable({
                  head: [headers],
                  body: data,
                  startY: 40,
                  margin: { horizontal: 10 },
                  styles: { fontSize: 10 },
                });

                // Add footer
                const pageCount = pdf.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                  pdf.setPage(i);
                  pdf.text(
                    `Page ${i} of ${pageCount}`,
                    200,
                    290,
                    null,
                    null,
                    "right"
                  );
                }

                pdf.save(
                  `version-history-report-${
                    new Date().toISOString().split("T")[0]
                  }.pdf`
                );
              } else {
                // Fallback: add data manually
                let yPosition = 40;
                headers.forEach((header, index) => {
                  pdf.setFont(undefined, "bold");
                  pdf.text(header, 15 + index * 30, yPosition);
                });

                yPosition += 10;
                data.forEach((row: string[]) => {
                  pdf.setFont(undefined, "normal");
                  row.forEach((cell: string, index: number) => {
                    pdf.text(cell.toString(), 15 + index * 30, yPosition);
                  });
                  yPosition += 10;

                  // Add new page if needed
                  if (yPosition > 280) {
                    pdf.addPage();
                    yPosition = 20;
                  }
                });

                pdf.save(
                  `version-history-report-${
                    new Date().toISOString().split("T")[0]
                  }.pdf`
                );
              }
            } else {
              // Fallback to HTML without logo
              let htmlContent = `
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Version History Report</title>
                    <style>
                      body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        color: #333;
                        max-width: 210mm; /* A4 width */
                        margin: 0 auto;
                      }
                      .header {
                        text-align: center;
                        margin-bottom: 20px;
                        padding-bottom: 15px;
                        border-bottom: 2px solid #e5e7eb;
                      }
                      table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                        font-size: 14px;
                      }
                      th, td {
                        border: 1px solid #ddd;
                        padding: 10px;
                        text-align: left;
                      }
                      th {
                        background-color: #f9fafb;
                        font-weight: bold;
                      }
                      .footer {
                        margin-top: 30px;
                        text-align: center;
                        font-size: 12px;
                        color: #666;
                        padding-top: 15px;
                        border-top: 1px solid #e5e7eb;
                      }
                      .report-title {
                        font-size: 24px;
                        font-weight: bold;
                        margin: 10px 0;
                      }
                      .report-subtitle {
                        font-size: 16px;
                        color: #6b7280;
                        margin-bottom: 20px;
                      }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <div class="report-title">Version History Report</div>
                      <div class="report-subtitle">System-wide document version tracking</div>
                      <p>Generated on: ${new Date().toLocaleString()}</p>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Document Title</th>
                          <th>Document Code</th>
                          <th>File Name</th>
                          <th>Version</th>
                          <th>Uploaded By</th>
                          <th>Uploaded At</th>
                        </tr>
                      </thead>
                      <tbody>
              `;

              result.data.recentChanges.forEach((change: any) => {
                htmlContent += `
                  <tr>
                    <td>${change.documentTitle}</td>
                    <td>${change.documentCode}</td>
                    <td>${change.fileName}</td>
                    <td>${change.version}</td>
                    <td>${change.uploadedBy}</td>
                    <td>${new Date(change.uploadedAt).toLocaleString()}</td>
                  </tr>
                `;
              });

              htmlContent += `
                      </tbody>
                    </table>
                    <div class="footer">
                      <p>Version History Report - System-wide document version tracking</p>
                      <p>Generated on: ${new Date().toLocaleString()}</p>
                    </div>
                  </body>
                </html>
              `;

              // Create a Blob with the HTML content
              const blob = new Blob([htmlContent], { type: "text/html" });
              const url = URL.createObjectURL(blob);

              // Create a temporary link to download the file
              const link = document.createElement("a");
              link.href = url;
              link.download = `version-history-report-${
                new Date().toISOString().split("T")[0]
              }.html`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              // Revoke the object URL to free up memory
              URL.revokeObjectURL(url);
            }
          };
        }
      } else {
        throw new Error(result.error || "Failed to export report");
      }
    } catch (err: any) {
      console.error("Error exporting report:", err);
      setError(err.message || "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDiff = async (change: any) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch the document's version history to get all versions for comparison
      // We need to determine if we have a document ID or document code
      // Since the recent changes list has documentCode, we'll use that
      const identifier = change.documentCode; // or change.documentId if available

      const response = await fetch(
        `/api/reports/version?documentId=${identifier}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const result = await response.json();

      if (result.success) {
        // Set the document version history for comparison
        // Find the specific file in the versions list that matches the change
        const allVersions = result.data.versions || [];
        const matchingFile = allVersions.find(
          (v: any) =>
            v.version === change.version &&
            new Date(v.uploadedAt).getTime() ===
              new Date(change.uploadedAt).getTime()
        );

        setSelectedChange({
          ...change,
          fileId: matchingFile ? matchingFile.fileId : null,
          versions: allVersions,
        });
        setShowDiffModal(true);
      } else {
        throw new Error(
          result.error || "Failed to fetch document version history"
        );
      }
    } catch (err: any) {
      console.error("Error viewing diff:", err);
      setError(err.message || "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const performComparison = async () => {
    if (!selectedVersionB) return;

    try {
      setLoading(true);
      setError(null);

      // Use the fileId from the selectedChange
      const fileIdA = selectedChange.fileId;

      if (!fileIdA) {
        throw new Error("Could not identify the first version for comparison");
      }

      // Call the compare API endpoint
      const response = await fetch("/api/reports/version/compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId1: fileIdA,
          fileId2: selectedVersionB,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const result = await response.json();

      if (result.success) {
        // Process the comparison result
        setComparisonResult({
          summary: `Compared version ${result.data.version1.version} with ${result.data.version2.version}`,
          changes: [
            {
              type: "Metadata Change",
              description: `File size changed from ${result.data.version1.fileSize} to ${result.data.version2.fileSize}`,
              location: "File Properties",
            },
            {
              type: "Timestamp Change",
              description: `Uploaded at different times: ${result.data.version1.uploadedAt} vs ${result.data.version2.uploadedAt}`,
              location: "Timestamp",
            },
          ],
        });
      } else {
        throw new Error(result.error || "Failed to compare document versions");
      }
    } catch (err: any) {
      console.error("Error comparing versions:", err);
      setError(err.message || "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Error Loading Report</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button
          onClick={() => {
            // Only allow retry if not already loading
            if (!loading) {
              const fetchVersionHistoryReport = async () => {
                try {
                  setLoading(true);
                  setError(null);

                  const response = await fetch("/api/reports/version");

                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(
                      errorData.error ||
                        `HTTP error! status: ${response.status}`
                    );
                  }

                  const result = await response.json();

                  if (result.success) {
                    setReportData(result.data);
                  } else {
                    throw new Error(
                      result.error || "Failed to fetch version history report"
                    );
                  }
                } catch (err: any) {
                  console.error("Error fetching version history report:", err);
                  setError(err.message || "An unknown error occurred");
                } finally {
                  setLoading(false);
                }
              };

              fetchVersionHistoryReport();
            }
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Version History Reports
            </h1>
          </div>
          <p className="text-muted-foreground">
            System-wide document version tracking and audit trail
          </p>
        </div>
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
                onClick={() => exportReport("csv")}
                className="block px-4 py-2 text-sm text-foreground hover:bg-accent w-full text-left rounded-t-md"
                role="menuitem"
              >
                <div className="flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  Export as CSV
                </div>
              </button>
              <button
                onClick={() => exportReport("excel")}
                className="block px-4 py-2 text-sm text-foreground hover:bg-accent w-full text-left"
                role="menuitem"
              >
                <div className="flex items-center">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export as Excel
                </div>
              </button>
              <button
                onClick={() => exportReport("pdf")}
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

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Versions
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData?.statistics.totalVersions?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All document versions in the system
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData?.statistics.versionsThisMonth?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Versions created this month
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Versions/Doc
            </CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData?.statistics.avgVersionsPerDoc?.toFixed(1) || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average versions per document
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Version Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reportData?.recentChanges && reportData.recentChanges.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Uploaded At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.recentChanges.map((change) => (
                  <TableRow key={change.fileId} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {change.documentTitle}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {change.documentCode}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {change.version}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {change.uploadedBy}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(
                          new Date(change.uploadedAt),
                          "MMM d, yyyy h:mm a"
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDiff(change)}
                      >
                        View Diff
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium mb-1">No recent changes</h3>
              <p className="text-muted-foreground">
                No version history changes found in the system.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diff Modal */}
      {showDiffModal && selectedChange && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">Version Comparison</h3>
                  <p className="text-muted-foreground mt-1">
                    Document: {selectedChange.documentTitle} (
                    {selectedChange.documentCode})
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    // Reset state when closing
                    setSelectedVersionB("");
                    setComparisonResult(null);
                    setShowDiffModal(false);
                  }}
                  className="rounded-full"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span className="sr-only">Close</span>
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Version A
                    </h4>
                    <div className="border rounded-lg p-4 bg-muted/20 flex-1">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            File:
                          </span>
                          <span className="truncate max-w-[60%] text-right">
                            {selectedChange.fileName || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            Version:
                          </span>
                          <span className="font-medium">
                            {selectedChange.version}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            Uploaded by:
                          </span>
                          <span className="truncate max-w-[60%] text-right">
                            {selectedChange.uploadedBy}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            Date:
                          </span>
                          <span>
                            {format(
                              new Date(selectedChange.uploadedAt),
                              "MMM d, yyyy h:mm a"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Version B
                    </h4>
                    <div className="border rounded-lg p-4 bg-muted/20 flex-1">
                      <p className="text-muted-foreground text-center py-4">
                        Select a version to compare
                      </p>
                      <div className="mt-4">
                        <label className="text-sm font-medium mb-2 block">
                          Select Version
                        </label>
                        <select
                          className="w-full p-2 border rounded-md bg-background"
                          value={selectedVersionB}
                          onChange={(e) => setSelectedVersionB(e.target.value)}
                        >
                          <option value="">Choose a version</option>
                          {selectedChange.versions &&
                            selectedChange.versions.map(
                              (version: any, idx: number) => (
                                <option key={idx} value={version.fileId}>
                                  {version.version} -{" "}
                                  {format(
                                    new Date(version.uploadedAt),
                                    "MMM d, yyyy"
                                  )}
                                </option>
                              )
                            )}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Differences
                  </h4>
                  <div className="border rounded-lg p-4 bg-muted/20 min-h-[200px]">
                    {comparisonResult ? (
                      <div className="space-y-4">
                        <div>
                          <h5 className="font-medium mb-2">Summary</h5>
                          <p className="text-sm">
                            {comparisonResult.summary ||
                              "Comparison summary will appear here."}
                          </p>
                        </div>
                        <div>
                          <h5 className="font-medium mb-2">Changes</h5>
                          <div className="text-sm space-y-2 max-h-60 overflow-y-auto">
                            {comparisonResult.changes &&
                            comparisonResult.changes.length > 0 ? (
                              comparisonResult.changes.map(
                                (change: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="p-2 bg-background rounded border-l-4 border-primary"
                                  >
                                    <div className="font-medium">
                                      {change.type}: {change.description}
                                    </div>
                                    <div className="text-muted-foreground text-xs mt-1">
                                      Location: {change.location}
                                    </div>
                                  </div>
                                )
                              )
                            ) : (
                              <p>No significant differences detected.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        Differences between versions will be highlighted here
                        after selecting both versions and clicking "Compare
                        Versions"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Reset state when closing
                      setSelectedVersionB("");
                      setComparisonResult(null);
                      setShowDiffModal(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={!selectedVersionB}
                    onClick={performComparison}
                  >
                    Compare Versions
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
