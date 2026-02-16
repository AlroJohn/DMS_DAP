import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";

// Define types for jspdf-autotable hooks
interface AutoTableHookData {
  section: 'head' | 'body' | 'foot';
  cell: any;
  row: any;
  column: any;
  table: any;
  pageCount: number;
  pageNumber: number;
  settings: any;
}

export interface DocumentTrailDetail {
  id: string;
  documentId: string;
  actionDate: string;
  createdAt?: string;
  updatedAt?: string;
  user: string;
  fromDepartment: string;
  toDepartment: string;
  status: string;
  remarks: string;
  durationMs?: number | null;
}

export interface DocumentInfo {
  id: string;
  title: string;
  code: string;
  type: string;
  classification: string;
  status: string;
  createdAt: string;
  processType?: {
    id: string;
    code: string;
    name: string;
    description: string;
    durationValue: number | null;
    durationUnit: string | null;
  } | null;
}

/**
 * Format duration in milliseconds to a readable string
 */
function formatDuration(durationMs: number | null | undefined): string {
  if (!durationMs || durationMs <= 0) return "-";
  
  const durationInSeconds = Math.floor(durationMs / 1000);
  const days = Math.floor(durationInSeconds / (24 * 60 * 60));
  const hours = Math.floor((durationInSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((durationInSeconds % (60 * 60)) / 60);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  
  return parts.join(', ');
}

/**
 * Calculate total duration from document creation to now
 */
function calculateTotalDuration(createdAt: string): string {
  try {
    const created = new Date(createdAt);
    const now = new Date();
    const durationMs = now.getTime() - created.getTime();
    return formatDuration(durationMs);
  } catch {
    return "-";
  }
}

export function getStatusText(status: string) {
  switch (status) {
    case "pending":
      return "Pending";
    case "intransit":
      return "In Transit";
    case "received":
      return "Received";
    case "completed":
      return "Completed";
    case "deleted":
      return "Deleted";
    case "archive":
      return "Archived";
    case "placeholder_added":
      return "Signature Placeholder Added";
    case "signed":
      return "Document Signed";
    case "checkout":
      return "Check Out";
    case "checkin":
      return "Check In";
    default:
      return status;
  }
}

/**
 * Generate and save a Document Trails PDF using jspdf + autotable.
 * Mirrors the visual design from the document trails page.
 */
export async function exportDocumentTrailsPDF(
  documentInfo: DocumentInfo,
  trails: DocumentTrailDetail[],
  filename?: string
): Promise<void> {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Load header images (logo left and ribbon/top-right)
  let logoDataUrl: string | null = null;
  const ribbonDataUrl: string | null = null;
  try {
    const [logoRes] = await Promise.all([
      fetch("/image/qby.png"),
    ]);

    if (logoRes.ok) {
      const blob = await logoRes.blob();
      logoDataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    }
  } catch (error) {
    console.error("Error loading logo image:", error);
  }

  // place logo centered at top — preserve aspect ratio and cap size to avoid blur
  const maxLogoW = pageWidth - 28; // leave 14mm side margins
  const maxLogoH = 60; // mm max height (increased to allow larger logos)
  let logoW = 70; // fallback width (mm) — larger default
  let logoH = 35; // fallback height (mm)
  const logoY = 6;
  if (logoDataUrl) {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = logoDataUrl as string;
      });
      const aspect = (img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : 1;
      // preferred width but not wider than page margins (allow larger maximum)
      logoW = Math.min(110, maxLogoW);
      logoH = logoW / aspect;
      // if computed height exceeds max, clamp by height instead
      if (logoH > maxLogoH) {
        logoH = maxLogoH;
        logoW = Math.min(logoH * aspect, maxLogoW);
      }
    } catch (e) {
      // keep fallback sizes if image load fails
      logoW = Math.min(70, maxLogoW);
      logoH = logoW * 0.5;
    }
    const logoX = (pageWidth - logoW) / 2;
    doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoW, logoH);
  }

  // Main title (positioned closer to top; below logo when present)
  const titleY = logoDataUrl ? logoY + logoH + 10 : 18;
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Document Trail History Report", 14, titleY);

  // Document info
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  let yPos = titleY + 8;
  const labelWidth = 56;
  const labelX = 14;
  const valueX = labelX + labelWidth + 4;

  // Document Title (allow wrapping)
  doc.text("Document Title:", labelX, yPos);
  doc.setFont("helvetica", "normal");
  const titleLines = doc.splitTextToSize(documentInfo.title || "-", pageWidth - valueX - 14);
  doc.text(titleLines, valueX, yPos);
  yPos += Math.max(6, titleLines.length * 5);

  // Other metadata pairs
  const metaPairs: Array<[string, string]> = [
    ["Document Code:", documentInfo.code || "-"],
    ["Document Type:", documentInfo.type || "-"],
    ["Classification:", documentInfo.classification || "-"],
    ["Status:", getStatusText(documentInfo.status || "-")],
  ];

  for (const [label, value] of metaPairs) {
    doc.setFont("helvetica", "bold");
    doc.text(label, labelX, yPos);
    doc.setFont("helvetica", "normal");
    const valLines = doc.splitTextToSize(value, pageWidth - valueX - 14);
    doc.text(valLines, valueX, yPos);
    yPos += Math.max(6, valLines.length * 5);
  }

  // Created
  doc.setFont("helvetica", "bold");
  doc.text("Created:", labelX, yPos);
  doc.setFont("helvetica", "normal");
  try {
    const createdStr = format(new Date(documentInfo.createdAt), "MMMM d, yyyy h:mm a");
    doc.text(createdStr, valueX, yPos);
  } catch {
    doc.text("-", valueX, yPos);
  }
  yPos += 7;

  // Total Duration
  doc.setFont("helvetica", "bold");
  doc.text("Total Duration:", labelX, yPos);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(29, 78, 216); // Blue color
  doc.text(calculateTotalDuration(documentInfo.createdAt), valueX, yPos);
  doc.setTextColor(0, 0, 0); // Reset to black
  yPos += 9;

  // Process Type Information (boxed spacing)
  if (documentInfo.processType) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Process Information:", labelX, yPos);
    yPos += 6;
    doc.setFontSize(9);

    const proc = documentInfo.processType;
    const procPairs: Array<[string, string]> = [
      ["Name:", proc.name || "-"],
    ];
    if (proc.code) procPairs.push(["Code:", proc.code]);
    if (proc.durationValue && proc.durationUnit) procPairs.push(["Duration:", `${proc.durationValue} ${proc.durationUnit}`]);

    // Use same label/value columns as the main document metadata for visual consistency
    for (const [label, value] of procPairs) {
      doc.setFont("helvetica", "bold");
      doc.text(label, labelX, yPos);
      doc.setFont("helvetica", "normal");
      const valLines = doc.splitTextToSize(value, pageWidth - valueX - 14);
      doc.text(valLines, valueX, yPos);
      yPos += Math.max(6, valLines.length * 5);
    }

    if (proc.description) {
      doc.setFont("helvetica", "bold");
      doc.text("Description:", labelX, yPos);
      doc.setFont("helvetica", "normal");
      const descLines = doc.splitTextToSize(proc.description, pageWidth - valueX - 14);
      doc.text(descLines, valueX, yPos);
      yPos += Math.max(6, descLines.length * 5);
    }

    yPos += 1; // reduced breathing room after process info
    doc.setFontSize(9);
  }

  // Separator
  yPos += 2;
  doc.setDrawColor(218, 165, 32);
  doc.setLineWidth(1);
  doc.line(14, yPos, pageWidth - 14, yPos);

  // Table
  const tableColumn = [
    "Action Date",
    "Created At",
    "Updated At",
    "User",
    "From\nDept.",
    "To\nDept.",
    "Status",
    "Duration\nHeld",
    "Remarks",
  ];

  const tableRows = (trails || []).map((trail) => [
    (() => {
      try {
        return format(new Date(trail.actionDate), "MMMM d, yyyy\nh:mm a");
      } catch {
        return trail.actionDate || "-";
      }
    })(),
    (() => {
      try {
        return trail.createdAt ? format(new Date(trail.createdAt), "MMMM d, yyyy\nh:mm a") : "-";
      } catch {
        return "-";
      }
    })(),
    (() => {
      try {
        return trail.updatedAt ? format(new Date(trail.updatedAt), "MMMM d, yyyy\nh:mm a") : "-";
      } catch {
        return "-";
      }
    })(),
    trail.user || "-",
    trail.fromDepartment || "-",
    trail.toDepartment || "-",
    getStatusText(trail.status || "-"),
    formatDuration(trail.durationMs),
    trail.remarks || "",
  ]);

  // Render table in chunks so each page shows up to N rows (here N = 5)
  const rowsPerPage = 5;
  const chunks: any[][] = [];
  for (let i = 0; i < tableRows.length; i += rowsPerPage) {
    chunks.push(tableRows.slice(i, i + rowsPerPage));
  }

  const commonAutoTableOptions = {
    head: [tableColumn],
    margin: { left: 14, right: 14 },
    styles: {
      fontSize: 7,
      cellPadding: 3,
      lineColor: [180, 180, 180],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [255, 235, 156],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      lineColor: [180, 180, 180],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 16, halign: "center", valign: "top" }, // Action Date
      1: { cellWidth: 16, halign: "center", valign: "top" }, // Created At
      2: { cellWidth: 16, halign: "center", valign: "top" }, // Updated At
      3: { cellWidth: 16, valign: "top" }, // User
      4: { cellWidth: 18, valign: "top" }, // From Dept
      5: { cellWidth: 18, valign: "top" }, // To Dept
      6: { cellWidth: 14, halign: "center", valign: "top" }, // Status
      7: { cellWidth: 12, halign: "center", valign: "top" }, // Duration Held
      8: { cellWidth: 56, valign: "top", cellPadding: 3, overflow: 'linebreak' }, // Remarks (wider) - same font/padding as others
    },
    didParseCell: function(data: AutoTableHookData) {
      // Footer settings
      const footerHeight = 20; // mm
      const footerY = pageHeight - footerHeight;

      // footer background (blue) - #1e3a8a
      doc.setFillColor(30, 58, 138);
      doc.rect(0, footerY, pageWidth, footerHeight, "F");

      // thin gold bottom stripe: make thinner and leave a small gap below (~6px)
      doc.setFillColor(218, 165, 32);
      const stripeHeightMm = 1; // mm (thin)
      const gapBelowPx = 12; // pixels (user requested)
      const pxToMm = 25.4 / 96; // convert px (96dpi) to mm
      const gapBelowMm = gapBelowPx * pxToMm;
      const stripeY = pageHeight - gapBelowMm - stripeHeightMm;
      // ensure stripe doesn't go off-page
      const stripeYClamped = Math.max(0, stripeY);
      doc.rect(0, stripeYClamped, pageWidth, stripeHeightMm, "F");

      // footer text (white)
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "normal");
      const generatedDate = format(new Date(), "MMMM d, yyyy");
      const generatedTime = format(new Date(), "h:mm:ss a");
      const generatedText = `Generated on: ${generatedDate}, ${generatedTime}`;
      const systemText = "Document Tracking Management System";
      doc.text(generatedText, pageWidth / 2, footerY + 8, { align: "center" });
      doc.text(systemText, pageWidth / 2, footerY + 13, { align: "center" });

      // Page number (bottom right)
      const pageNumber = `${data.pageNumber}/${doc.getNumberOfPages()}`;
      doc.text(pageNumber, pageWidth - 14, footerY + 13, { align: "right" });
    },
  } as any;

  // Render each chunk as its own table; start first at current yPos, subsequent ones on new pages
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (i === 0) {
      (doc as any).autoTable({
        ...commonAutoTableOptions,
        body: chunk,
        startY: yPos + 2,
      });
    } else {
      doc.addPage();
      (doc as any).autoTable({
        ...commonAutoTableOptions,
        body: chunk,
        startY: 18, // near top on subsequent pages
      });
    }
  }

  const outName = filename || `document-trail-${documentInfo.code || documentInfo.id}.pdf`;
  doc.save(outName);
}

// Export CSV and Excel helpers so other UI code can reuse the same formatting
export async function exportDocumentTrailsCSV(
  documentInfo: DocumentInfo,
  trails: DocumentTrailDetail[],
  filename?: string
): Promise<void> {
  let csvContent = `Document Trail History Report\n`;
  csvContent += `Document: ${documentInfo.title}\n`;
  csvContent += `Code: ${documentInfo.code}\n`;
  csvContent += `Type: ${documentInfo.type}\n`;
  csvContent += `Classification: ${documentInfo.classification}\n`;
  csvContent += `Status: ${getStatusText(documentInfo.status)}\n`;
  try {
    csvContent += `Created: ${format(new Date(documentInfo.createdAt), "MMMM d, yyyy h:mm a")}\n`;
  } catch {
    csvContent += `Created: -\n`;
  }
  csvContent += `Total Duration: ${calculateTotalDuration(documentInfo.createdAt)}\n`;
  
  if (documentInfo.processType) {
    csvContent += `\nProcess Information:\n`;
    csvContent += `Process Name: ${documentInfo.processType.name || "-"}\n`;
    csvContent += `Process Code: ${documentInfo.processType.code || "-"}\n`;
    if (documentInfo.processType.durationValue && documentInfo.processType.durationUnit) {
      csvContent += `Process Duration: ${documentInfo.processType.durationValue} ${documentInfo.processType.durationUnit}\n`;
    }
    if (documentInfo.processType.description) {
      csvContent += `Process Description: ${documentInfo.processType.description}\n`;
    }
  }
  csvContent += `\n`;

  csvContent += `Action Date,Created At,Updated At,User,From Department,To Department,Status,Duration Held,Remarks\n`;
  trails.forEach((trail) => {
    let actionDate = trail.actionDate || "-";
    let createdAt = "-";
    let updatedAt = "-";
    try {
      actionDate = format(new Date(trail.actionDate), "MMMM d, yyyy h:mm a");
    } catch {}
    try {
      if (trail.createdAt) {
        createdAt = format(new Date(trail.createdAt), "MMMM d, yyyy h:mm a");
      }
    } catch {}
    try {
      if (trail.updatedAt) {
        updatedAt = format(new Date(trail.updatedAt), "MMMM d, yyyy h:mm a");
      }
    } catch {}
    const remarks = (trail.remarks || "").replace(/"/g, '""').replace(/\n/g, " ");
    const durationHeld = formatDuration(trail.durationMs);
    csvContent += `"${actionDate}","${createdAt}","${updatedAt}","${trail.user || "-"}","${trail.fromDepartment || "-"}","${trail.toDepartment || "-"}","${getStatusText(trail.status || "-")}","${durationHeld}","${remarks}"\n`;
  });

  const outName = filename || `document-trail-${documentInfo.code || documentInfo.id}-${new Date().toISOString().split("T")[0]}.csv`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", outName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportDocumentTrailsExcel(
  documentInfo: DocumentInfo,
  trails: DocumentTrailDetail[],
  filename?: string
): Promise<void> {
  const { utils, writeFile } = await import("xlsx");

  const infoData: any[] = [
    ["Document Trail History Report"],
    [""],
    ["Document Title", documentInfo.title],
    ["Document Code", documentInfo.code],
    ["Document Type", documentInfo.type],
    ["Classification", documentInfo.classification],
    ["Status", getStatusText(documentInfo.status)],
  ];
  try {
    infoData.push(["Created", format(new Date(documentInfo.createdAt), "MMMM d, yyyy h:mm a")]);
  } catch {
    infoData.push(["Created", "-"]);
  }
  infoData.push(["Total Duration", calculateTotalDuration(documentInfo.createdAt)]);
  
  if (documentInfo.processType) {
    infoData.push([""]);
    infoData.push(["Process Information"]);
    infoData.push(["Process Name", documentInfo.processType.name || "-"]);
    infoData.push(["Process Code", documentInfo.processType.code || "-"]);
    if (documentInfo.processType.durationValue && documentInfo.processType.durationUnit) {
      infoData.push(["Process Duration", `${documentInfo.processType.durationValue} ${documentInfo.processType.durationUnit}`]);
    }
    if (documentInfo.processType.description) {
      infoData.push(["Process Description", documentInfo.processType.description]);
    }
  }
  
  infoData.push([""]); // spacer
  infoData.push(["Trail History"]);
  infoData.push(["Action Date", "Created At", "Updated At", "User", "From Department", "To Department", "Status", "Duration Held", "Remarks"]);

  trails.forEach((trail) => {
    let actionDate = trail.actionDate || "-";
    let createdAt = "-";
    let updatedAt = "-";
    try {
      actionDate = format(new Date(trail.actionDate), "MMMM d, yyyy h:mm a");
    } catch {}
    try {
      if (trail.createdAt) {
        createdAt = format(new Date(trail.createdAt), "MMMM d, yyyy h:mm a");
      }
    } catch {}
    try {
      if (trail.updatedAt) {
        updatedAt = format(new Date(trail.updatedAt), "MMMM d, yyyy h:mm a");
      }
    } catch {}
    infoData.push([
      actionDate,
      createdAt,
      updatedAt,
      trail.user || "",
      trail.fromDepartment || "",
      trail.toDepartment || "",
      getStatusText(trail.status || ""),
      formatDuration(trail.durationMs),
      trail.remarks || "",
    ]);
  });

  const wb = utils.book_new();
  const ws = utils.aoa_to_sheet(infoData);

  // Auto column width: compute max length per column across all rows
  const colCount = Math.max(...infoData.map((r) => r.length));
  const colWidths: { wch: number }[] = [];
  for (let c = 0; c < colCount; c++) {
    let maxLen = 10; // default minimum
    for (let r = 0; r < infoData.length; r++) {
      const cell = infoData[r][c];
      if (cell == null) continue;
      const len = String(cell).length;
      if (len > maxLen) maxLen = len;
    }
    // add small padding
    colWidths.push({ wch: Math.min(Math.max(maxLen + 2, 10), 100) });
  }
  ws["!cols"] = colWidths;

  utils.book_append_sheet(wb, ws, "Document Trail");

  const outName = filename || `document-trail-${documentInfo.code || documentInfo.id}-${new Date().toISOString().split("T")[0]}.xlsx`;
  writeFile(wb, outName);
}

export default exportDocumentTrailsPDF;
