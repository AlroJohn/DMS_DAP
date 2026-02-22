"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Search,
  Calendar,
  User,
  FileText,
  Loader2,
  RefreshCw,
  CheckSquare,
  Square,
} from "lucide-react";
import { useSigningHistory } from "@/hooks/use-singing.history";

export default function SigningHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(
    new Set(),
  );

  const {
    data,
    loading: dataLoading,
    error,
    refetch,
  } = useSigningHistory(undefined, filter);

  // Filter signing history based on search term
  const filteredHistory = useMemo(() => {
    if (!data?.signingHistory) return [];

    let result = data.signingHistory;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (entry) =>
          (entry.document || "").toLowerCase().includes(term) ||
          (entry.signer || "").toLowerCase().includes(term) ||
          (entry.documentCode || "").toLowerCase().includes(term) ||
          (entry.department || "").toLowerCase().includes(term),
      );
    }

    return result;
  }, [data?.signingHistory, searchTerm]);

  // Get entries to export (selected ones or all if none selected)
  const entriesToExport = useMemo(() => {
    if (selectedEntries.size === 0) return filteredHistory;
    return filteredHistory.filter((entry) =>
      selectedEntries.has(entry.id),
    );
  }, [filteredHistory, selectedEntries]);

  // Toggle entry selection
  const toggleEntry = (entryId: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  // Select all visible entries
  const selectAll = () => {
    const allIds = new Set(
      filteredHistory.map((entry) => entry.id),
    );
    setSelectedEntries(allIds);
  };

  // Clear all selections
  const clearAll = () => {
    setSelectedEntries(new Set());
  };

  // Check if all visible entries are selected
  const allSelected =
    filteredHistory.length > 0 &&
    filteredHistory.every((entry) => selectedEntries.has(entry.id));

  const handleExport = async (format: "pdf" | "csv" | "excel") => {
    if (!data) return;

    // Use selected documents or all filtered if none selected
    const dataToExport = entriesToExport;

    if (dataToExport.length === 0) {
      alert("No documents to export. Please select documents or adjust your filters.");
      return;
    }

    try {
      setLoading(true);

      if (format === "csv") {
        // Create CSV content
        let csvContent = `Signing History Report\n\n`;

        // Add export info
        csvContent += `Total Entries: ${dataToExport.length}\n`;
        if (selectedEntries.size > 0) {
          csvContent += `Export Type: Selected Entries\n`;
        } else {
          csvContent += `Export Type: All Filtered Entries\n`;
        }
        csvContent += `\n`;

        // Add statistics
        csvContent += "Statistics\n";
        csvContent += `Metric,Value\n`;
        csvContent += `Total Signatures,${data.statistics.totalSignatures}\n`;
        csvContent += `This Week,${data.statistics.thisWeek}\n`;
        csvContent += `Success Rate,${data.statistics.successRate}\n\n`;

        // Add signing history
        csvContent += "Signing History\n";
        csvContent += `Document,Document Code,Signer,Department,Timestamp,Transaction Hash,Status\n`;
        dataToExport.forEach((entry) => {
          csvContent += `"${entry.document}","${entry.documentCode}","${
            entry.signer
          }","${entry.department}","${new Date(
            entry.timestamp,
          ).toLocaleString()}","${entry.txHash}","${entry.status}"\n`;
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
          `signing-history-report-${new Date().toISOString().split("T")[0]}.csv`,
        );
        link.style.visibility = "hidden";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (format === "excel") {
        // For Excel export, we'll use the dynamic import approach
        const { utils, writeFile } = await import("xlsx");

        // Create worksheets for different data sections
        const statsData = [
          ["Metric", "Value"],
          ["Total Signatures", data.statistics.totalSignatures],
          ["This Week", data.statistics.thisWeek],
          ["Success Rate", data.statistics.successRate],
          [],
          ["Export Info", ""],
          ["Total Entries", dataToExport.length],
          [
            "Export Type",
            selectedEntries.size > 0
              ? "Selected Entries"
              : "All Filtered Entries",
          ],
        ];

        const historyData = [
          [
            "Document",
            "Document Code",
            "Signer",
            "Department",
            "Timestamp",
            "Transaction Hash",
            "Status",
          ],
        ];
        dataToExport.forEach((entry) => {
          historyData.push([
            entry.document,
            entry.documentCode,
            entry.signer,
            entry.department,
            new Date(entry.timestamp).toLocaleString(),
            entry.txHash,
            entry.status,
          ]);
        });

        // Create workbook and add worksheets
        const wb = utils.book_new();
        const statsWs = utils.aoa_to_sheet(statsData);
        const historyWs = utils.aoa_to_sheet(historyData);

        utils.book_append_sheet(wb, statsWs, "Statistics");
        utils.book_append_sheet(wb, historyWs, "Signing History");

        // Write the file
        writeFile(
          wb,
          `signing-history-report-${
            new Date().toISOString().split("T")[0]
          }.xlsx`,
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

            const img = new Image();
            img.src = logoUrl;

            await new Promise((resolve) => {
              img.onload = resolve;
            });

            const maxWidth = 40;
            const maxHeight = 20;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }

            doc.addImage(logoUrl, "PNG", margin, margin, width, height);
            URL.revokeObjectURL(logoUrl);
          }
        } catch (error) {
          console.warn("Could not load logo:", error);
        }

        // Add title
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59);
        doc.text("Signing History Report", pageWidth / 2, margin + 10, {
          align: "center",
        });

        // Add filter info
        doc.setFontSize(12);
        doc.setTextColor(107, 114, 128);
        doc.text(
          `Filter: ${
            filter === "all"
              ? "All Signatures"
              : filter.charAt(0).toUpperCase() + filter.slice(1)
          }`,
          pageWidth / 2,
          margin + 18,
          { align: "center" },
        );

        // Add export type info
        doc.text(
          `Export Type: ${
            selectedEntries.size > 0
              ? `Selected Entries (${dataToExport.length})`
              : `All Filtered Entries (${dataToExport.length})`
          }`,
          pageWidth / 2,
          margin + 24,
          { align: "center" },
        );

        // Add report generation date
        const reportDate = new Date().toLocaleDateString();
        doc.text(`Generated on: ${reportDate}`, pageWidth / 2, margin + 30, {
          align: "center",
        });

        let currentY = margin + 41;

        // Add statistics table
        const statsData = [
          ["Total Signatures", data.statistics.totalSignatures.toString()],
          ["This Week", data.statistics.thisWeek.toString()],
          ["Success Rate", data.statistics.successRate],
        ];

        (doc as any).autoTable({
          startY: currentY,
          head: [["Metric", "Value"]],
          body: statsData,
          theme: "grid",
          headStyles: {
            fillColor: [22, 163, 74],
            textColor: [255, 255, 255],
            fontSize: 12,
            fontStyle: "bold",
          },
          bodyStyles: {
            fontSize: 11,
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251],
          },
          margin: { left: margin, right: margin },
          styles: {
            cellPadding: 5,
          },
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;

        // Add signing history table
        if (dataToExport.length > 0) {
          const historyData = dataToExport.map((entry) => [
            entry.document.substring(0, 30) +
              (entry.document.length > 30 ? "..." : ""),
            entry.documentCode,
            entry.signer,
            entry.department,
            new Date(entry.timestamp).toLocaleDateString(),
            entry.txHash.substring(0, 20) + "...",
            entry.status,
          ]);

          (doc as any).autoTable({
            startY: currentY,
            head: [
              [
                "Document",
                "Code",
                "Signer",
                "Department",
                "Date",
                "TX Hash",
                "Status",
              ],
            ],
            body: historyData,
            theme: "grid",
            headStyles: {
              fillColor: [37, 99, 235],
              textColor: [255, 255, 255],
              fontSize: 10,
              fontStyle: "bold",
            },
            bodyStyles: {
              fontSize: 8,
            },
            alternateRowStyles: {
              fillColor: [249, 250, 251],
            },
            margin: { left: margin, right: margin },
            styles: {
              cellPadding: 3,
            },
          });
        }

        // Add footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(10);
          doc.setTextColor(107, 114, 128);
          doc.text(
            `Page ${i} of ${pageCount}`,
            pageWidth - margin - 25,
            doc.internal.pageSize.height - 10,
          );
        }

        // Save the PDF
        doc.save(
          `signing-history-report-${new Date().toISOString().split("T")[0]}.pdf`,
        );
      }
    } catch (err: any) {
      console.error("Error exporting report:", err);
      alert(
        `Failed to export report as ${format.toUpperCase()}: ${
          err.message || "Unknown error"
        }`,
      );
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading signing history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-red-500 text-lg mb-4">
          Error loading signing history
        </div>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Signing History</h1>
          <p className="text-muted-foreground">
            Complete history of document signed
            {selectedEntries.size > 0 && (
              <span className="ml-2 text-primary font-medium">
                ({selectedEntries.size} selected)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {filteredHistory.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={allSelected ? clearAll : selectAll}
              >
                {allSelected ? (
                  <>
                    <Square className="mr-2 h-4 w-4" />
                    Clear All
                  </>
                ) : (
                  <>
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Select All
                  </>
                )}
              </Button>
            </div>
          )}
          <div className="relative group inline-block">
            <Button
              size="sm"
              disabled={loading || dataLoading}
            >
              {loading || dataLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  Export
                  {selectedEntries.size > 0 && (
                    <Badge className="ml-2" variant="secondary">
                      {selectedEntries.size}
                    </Badge>
                  )}
                </>
              )}
            </Button>
            <div className="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-background border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="py-1">
                <button
                  onClick={() => handleExport("pdf")}
                  className="w-full px-4 py-2 text-sm hover:bg-accent transition-colors"
                >
                  Export as PDF
                </button>
                <button
                  onClick={() => handleExport("excel")}
                  className="w-full px-4 py-2 text-sm hover:bg-accent transition-colors"
                >
                  Export as Excel
                </button>
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full px-4 py-2 text-sm hover:bg-accent transition-colors"
                >
                  Export as CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {filteredHistory.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
          <p>
            <strong>Export Options:</strong> Select specific entries using the
            checkboxes below, or export all{" "}
            {selectedEntries.size > 0 ? (
              <span>
                (Currently exporting: <strong>{entriesToExport.length}</strong>{" "}
                {selectedEntries.size > 0 ? "selected" : "filtered"}{" "}
                entry/entries)
              </span>
            ) : (
              <span>
                filtered entries (<strong>{filteredHistory.length}</strong>)
              </span>
            )}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents, codes, or signers..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Signatures</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Signatures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.statistics.totalSignatures || 0}
            </div>
            <p className="text-xs text-muted-foreground">All time signatures</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.statistics.thisWeek || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Signatures in the last 7 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.statistics.successRate || "100%"}
            </div>
            <p className="text-xs text-muted-foreground">
              All signatures verified
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Signatures</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No signing history found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 border-b pb-4 last:border-0"
                >
                  <Checkbox
                    checked={selectedEntries.has(entry.id)}
                    onCheckedChange={() => toggleEntry(entry.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{entry.document}</span>
                        <Badge variant="secondary" className="text-xs">
                          {entry.documentCode}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {entry.signer}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                        <div className="text-xs">{entry.department}</div>
                      </div>
                      <code className="text-xs text-muted-foreground break-all">
                        {entry.txHash}
                      </code>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-green-600 text-green-600"
                    >
                      <Shield className="mr-1 h-3 w-3" />
                      {entry.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
