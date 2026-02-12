import { format } from "date-fns";

// Dynamic imports will be used inside functions to keep bundle small

export interface UsageStatistics {
  totalDocuments?: number;
  activeUsers?: number;
  storageUsed?: string;
  apiCalls?: number;
  storageChange?: string;
  apiCallChange?: string;
}

export interface DepartmentUsageItem {
  name: string;
  documents?: number;
  users?: number;
  storage?: string;
  activity?: number; // percent
}

export interface RecentActivityItem {
  action: string;
  user: string;
  time: string;
}

export interface UsageReportData {
  statistics: UsageStatistics;
  departmentUsage?: DepartmentUsageItem[];
  recentActivity?: RecentActivityItem[];
}

export interface TopItem {
  name: string;
  count: number;
}

export interface DocumentTypeStatistic {
  typeName: string;
  typeDescription?: string;
  totalDocuments?: number;
  recentDocuments?: number;
  storageUsed?: string;
  storageBytes?: number;
  avgProcessingTime?: string;
  mostCommonStatus?: string;
  completedCount?: number;
}

export interface ProcessTypeStatistic {
  actionName: string;
  actionDescription?: string;
  senderTag?: string;
  recipientTag?: string;
  totalOccurrences?: number;
  recentOccurrences?: number;
  uniqueUsers?: number;
  uniqueDocuments?: number;
  avgFrequency?: string;
}

export interface StatsReportData {
  summary?: any;
  documentTypeStatistics?: DocumentTypeStatistic[];
  processTypeStatistics?: ProcessTypeStatistic[];
  topDocumentTypes?: TopItem[];
  topProcessActions?: TopItem[];
}

function safe(value: any, fallback = "-") {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

export async function exportUsageReportCSV(
  report: UsageReportData,
  stats?: StatsReportData,
  filename?: string
): Promise<void> {
  let csv = `Usage Report\n`;
  csv += `Generated: ${format(new Date(), "MMM d, yyyy h:mm a")}\n`;
  csv += `\nSummary:\n`;
  csv += `Metric,Value\n`;
  csv += `Total Documents,${safe(report.statistics.totalDocuments, "0")}\n`;
  csv += `Active Users,${safe(report.statistics.activeUsers, "0")}\n`;
  csv += `Storage Used,${safe(report.statistics.storageUsed, "0 GB")}\n`;
  csv += `API Calls,${safe(report.statistics.apiCalls, "0")}\n`;
  csv += `\n`;

  csv += `Department Usage\n`;
  csv += `Department,Documents,Users,Storage,Activity\n`;
  (report.departmentUsage || []).forEach((d) => {
    csv += `"${(d.name || "").replace(/"/g, '""')}",${safe(d.documents, "0")},${safe(
      d.users,
      "0"
    )},"${safe(d.storage, "0 GB")}",${safe(d.activity, "0")}%\n`;
  });
  csv += `\n`;

  csv += `Recent Activity\n`;
  csv += `Action,User,Time\n`;
  (report.recentActivity || []).forEach((a) => {
    csv += `"${(a.action || "").replace(/"/g, '""')}","${(a.user || "").replace(/"/g, '""')}","${(
      a.time || ""
    ).replace(/"/g, '""')}"\n`;
  });

  // Stats section if provided
  if (stats) {
    csv += `\nDocument & Process Stats\n`;
    if (stats.topDocumentTypes && stats.topDocumentTypes.length) {
      csv += `Top Document Types\nName,Count\n`;
      stats.topDocumentTypes.forEach((t) => {
        csv += `"${t.name}",${t.count}\n`;
      });
      csv += `\n`;
    }
    if (stats.topProcessActions && stats.topProcessActions.length) {
      csv += `Top Process Actions\nName,Count\n`;
      stats.topProcessActions.forEach((t) => {
        csv += `"${t.name}",${t.count}\n`;
      });
      csv += `\n`;
    }
    if (stats.documentTypeStatistics && stats.documentTypeStatistics.length) {
      csv += `Document Type Statistics\nType,Description,Total,Recent,Storage,Avg Processing,Most Common Status,Completed\n`;
      stats.documentTypeStatistics.forEach((d) => {
        csv += `"${safe(d.typeName)}","${(d.typeDescription || "").replace(/"/g, '""')}",${safe(
          d.totalDocuments,
          "0"
        )},${safe(d.recentDocuments, "0")},"${safe(d.storageUsed, "0 GB")} ",${safe(d.avgProcessingTime, "-")},${safe(
          d.mostCommonStatus,
          "-"
        )},${safe(d.completedCount, "0")}\n`;
      });
      csv += `\n`;
    }
    if (stats.processTypeStatistics && stats.processTypeStatistics.length) {
      csv += `Process Type Statistics\nAction,Description,Sender,Recipient,Total,Recent,Unique Users,Unique Documents,Avg Frequency\n`;
      stats.processTypeStatistics.forEach((p) => {
        csv += `"${safe(p.actionName)}","${(p.actionDescription || "").replace(/"/g, '""')}","${safe(
          p.senderTag,
          "-"
        )}","${safe(p.recipientTag, "-")}",${safe(p.totalOccurrences, "0")},${safe(
          p.recentOccurrences,
          "0"
        )},${safe(p.uniqueUsers, "0")},${safe(p.uniqueDocuments, "0")},${safe(p.avgFrequency, "-")}\n`;
      });
      csv += `\n`;
    }
  }

  const out = filename || `usage-report-${new Date().toISOString().split("T")[0]}.csv`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", out);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportUsageReportExcel(
  report: UsageReportData,
  stats?: StatsReportData,
  filename?: string
): Promise<void> {
  const { utils, writeFile } = await import("xlsx");

  const summary = [
    ["Usage Report"],
    ["Generated", format(new Date(), "MMM d, yyyy h:mm a")],
    [],
    ["Metric", "Value"],
    ["Total Documents", safe(report.statistics.totalDocuments, "0")],
    ["Active Users", safe(report.statistics.activeUsers, "0")],
    ["Storage Used", safe(report.statistics.storageUsed, "0 GB")],
    ["API Calls", safe(report.statistics.apiCalls, "0")],
  ];

  const dept = [["Department", "Documents", "Users", "Storage", "Activity"]];
  (report.departmentUsage || []).forEach((d) => {
    dept.push([d.name, safe(d.documents, "0"), safe(d.users, "0"), safe(d.storage, "0 GB"), `${safe(d.activity, "0")}%`]);
  });

  const activity = [["Action", "User", "Time"]];
  (report.recentActivity || []).forEach((a) => activity.push([a.action, a.user, a.time]));

  const wb = utils.book_new();
  const s1 = utils.aoa_to_sheet(summary);
  utils.book_append_sheet(wb, s1, "Summary");

  const s2 = utils.aoa_to_sheet(dept);
  utils.book_append_sheet(wb, s2, "Department Usage");

  const s3 = utils.aoa_to_sheet(activity);
  utils.book_append_sheet(wb, s3, "Recent Activity");

  if (stats) {
    if (stats.topDocumentTypes && stats.topDocumentTypes.length) {
      const topDoc: (string | number)[][] = [["Name", "Count"]];
      stats.topDocumentTypes.forEach((t) => topDoc.push([t.name, t.count]));
      utils.book_append_sheet(wb, utils.aoa_to_sheet(topDoc), "Top Document Types");
    }
    if (stats.topProcessActions && stats.topProcessActions.length) {
      const topAct: (string | number)[][] = [["Name", "Count"]];
      stats.topProcessActions.forEach((t) => topAct.push([t.name, t.count]));
      utils.book_append_sheet(wb, utils.aoa_to_sheet(topAct), "Top Process Actions");
    }
    if (stats.documentTypeStatistics && stats.documentTypeStatistics.length) {
      const dt: (string | number)[][] = [["Type", "Description", "Total", "Recent", "Storage", "Avg Processing", "Most Common Status", "Completed"]];
      stats.documentTypeStatistics.forEach((d) => dt.push([d.typeName, d.typeDescription || "", d.totalDocuments || 0, d.recentDocuments || 0, d.storageUsed || "", d.avgProcessingTime || "", d.mostCommonStatus || "", d.completedCount || 0]));
      utils.book_append_sheet(wb, utils.aoa_to_sheet(dt), "Document Types");
    }
    if (stats.processTypeStatistics && stats.processTypeStatistics.length) {
      const pt: (string | number)[][] = [["Action", "Description", "Sender", "Recipient", "Total", "Recent", "Unique Users", "Unique Docs", "Avg Frequency"]];
      stats.processTypeStatistics.forEach((p) => pt.push([p.actionName, p.actionDescription || "", p.senderTag || "", p.recipientTag || "", p.totalOccurrences || 0, p.recentOccurrences || 0, p.uniqueUsers || 0, p.uniqueDocuments || 0, p.avgFrequency || ""]));
      utils.book_append_sheet(wb, utils.aoa_to_sheet(pt), "Process Types");
    }
  }

  const out = filename || `usage-report-${new Date().toISOString().split("T")[0]}.xlsx`;
  writeFile(wb, out);
}

export async function exportUsageReportPDF(
  report: UsageReportData,
  stats?: StatsReportData,
  filename?: string
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  await import("jspdf-autotable");

  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Load logo similar to document-trails export
  let logoDataUrl: string | null = null;
  try {
    const logoRes = await fetch("/image/LOGO_BLUE.png");
    if (logoRes.ok) {
      const blob = await logoRes.blob();
      logoDataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    }
  } catch (e) {
    // ignore
  }

  // Draw centered logo if available, preserving aspect ratio with sensible caps
  const maxLogoW = pageWidth - 28;
  const maxLogoH = 40;
  let logoH = 0;
  let logoW = 0;
  let logoY = 6;
  if (logoDataUrl) {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = logoDataUrl as string;
      });
      const aspect = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
      logoW = Math.min(100, maxLogoW);
      logoH = logoW / aspect;
      if (logoH > maxLogoH) {
        logoH = maxLogoH;
        logoW = Math.min(logoH * aspect, maxLogoW);
      }
      const logoX = (pageWidth - logoW) / 2;
      doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoW, logoH);
    } catch {
      logoW = 0;
      logoH = 0;
    }
  }

  // Title
  const titleY = logoW ? logoY + logoH + 8 : 22;
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text("Usage Report", pageWidth / 2, titleY, { align: "center" });

  // Generated date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text(`Generated: ${format(new Date(), "MMM d, yyyy h:mm a")}`, pageWidth / 2, titleY + 6, { align: "center" });

  // Start Y for content
  let y = titleY + 12;

  // Summary (styled autotable)
  const summaryBody = [
    ["Total Documents", safe(report.statistics.totalDocuments, "0")],
    ["Active Users", safe(report.statistics.activeUsers, "0")],
    ["Storage Used", safe(report.statistics.storageUsed, "0 GB")],
    ["API Calls", safe(report.statistics.apiCalls, "0")],
  ];

  (doc as any).autoTable({
    startY: y,
    head: [["Metric", "Value"]],
    body: summaryBody,
    theme: "grid",
    headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontSize: 11 },
    bodyStyles: { fontSize: 10 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin },
    styles: { cellPadding: 4 },
  });

  y = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : y + 28;

  // Department Usage
  if (report.departmentUsage && report.departmentUsage.length) {
    const body = report.departmentUsage.map((d) => [d.name, safe(d.documents, "0"), safe(d.users, "0"), safe(d.storage, "0 GB"), `${safe(d.activity, "0")}%`]);
    (doc as any).autoTable({
      startY: y,
      head: [["Department", "Documents", "Users", "Storage", "Activity"]],
      body,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 11 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: margin, right: margin },
      styles: { cellPadding: 4 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Recent Activity
  if (report.recentActivity && report.recentActivity.length) {
    const body = report.recentActivity.map((a) => [a.action, a.user, a.time]);
    (doc as any).autoTable({
      startY: y,
      head: [["Action", "User", "Time"]],
      body,
      theme: "grid",
      headStyles: { fillColor: [107, 114, 128], textColor: [255, 255, 255], fontSize: 11 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: margin, right: margin },
      styles: { cellPadding: 4 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Stats tables (keep compact)
  if (stats) {
    if (stats.topDocumentTypes && stats.topDocumentTypes.length) {
      const body = stats.topDocumentTypes.map((t) => [t.name, t.count]);
      (doc as any).autoTable({ startY: y, head: [["Top Document Type", "Count"]], body, margin: { left: margin, right: margin }, styles: { fontSize: 9 } });
      y = (doc as any).lastAutoTable.finalY + 8;
    }
    if (stats.topProcessActions && stats.topProcessActions.length) {
      const body = stats.topProcessActions.map((t) => [t.name, t.count]);
      (doc as any).autoTable({ startY: y, head: [["Top Process Action", "Count"]], body, margin: { left: margin, right: margin }, styles: { fontSize: 9 } });
      y = (doc as any).lastAutoTable.finalY + 8;
    }
    if (stats.documentTypeStatistics && stats.documentTypeStatistics.length) {
      const body = stats.documentTypeStatistics.map((d) => [d.typeName, d.typeDescription || "", d.totalDocuments || 0, d.recentDocuments || 0, d.storageUsed || "", d.avgProcessingTime || "-"]);
      (doc as any).autoTable({ startY: y, head: [["Type", "Description", "Total", "Recent", "Storage", "Avg Processing"]], body, margin: { left: margin, right: margin }, styles: { fontSize: 8 } });
      y = (doc as any).lastAutoTable.finalY + 8;
    }
    if (stats.processTypeStatistics && stats.processTypeStatistics.length) {
      const body = stats.processTypeStatistics.map((p) => [p.actionName, p.actionDescription || "", p.totalOccurrences || 0, p.uniqueUsers || 0, p.uniqueDocuments || 0]);
      (doc as any).autoTable({ startY: y, head: [["Action", "Description", "Total", "Users", "Docs"]], body, margin: { left: margin, right: margin }, styles: { fontSize: 8 } });
      y = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // Footer across pages - draw blue footer, gold stripe above it, and page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerHeight = 18;
    const footerY = pageHeight - footerHeight;

    // Blue footer band
    doc.setFillColor(30, 58, 138);
    doc.rect(0, footerY, pageWidth, footerHeight, "F");

    // Thin gold stripe directly above the blue footer
    const stripeH = 2;
    const stripeY = footerY - stripeH;
    doc.setFillColor(218, 165, 32);
    doc.rect(0, stripeY, pageWidth, stripeH, "F");

    // A subtle dark hairline at the very bottom
    doc.setFillColor(30, 30, 30);
    doc.rect(0, pageHeight - 0.5, pageWidth, 0.5, "F");

    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${format(new Date(), "M/d/yyyy, h:mm:ss a")}`, pageWidth / 2, footerY + 6, { align: "center" });
    doc.text("Document Tracking Management System", pageWidth / 2, footerY + 11, { align: "center" });

    // page number (right aligned)
    doc.text(`${i} / ${pageCount}`, pageWidth - margin, footerY + 11, { align: "right" });
  }

  const out = filename || `usage-report-${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(out);
}

export default {
  exportUsageReportCSV,
  exportUsageReportExcel,
  exportUsageReportPDF,
};
